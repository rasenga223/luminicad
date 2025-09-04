import {
    GroupNode,
    IApplication,
    IDocument,
    INodeLinkedList,
    IService,
    Logger,
    Result,
    Serialized,
    Serializer,
} from "luminicad-core";

/**
 * JsonExecutionService
 *
 * Executes a JSON payload in the same structure as the app's DB serialization,
 * and merges the geometry/materials into the current active document.
 *
 * Supported inputs:
 * - Full Document serialization (classKey: "Document") with properties { id, name, nodes, materials }
 * - A lightweight object: { name?, nodes: Serialized[], materials?: Serialized[] }
 */
export class JsonExecutionService implements IService {
    private app!: IApplication;

    register(app: IApplication): void {
        this.app = app;
    }

    start(): void {
        Logger.info(`${JsonExecutionService.name} started`);
    }

    stop(): void {}

    async executeJson(
        json: string | unknown,
        options: {
            wrapInGroup?: boolean;
            groupName?: string;
            dedupeMaterialsById?: boolean;
            parentNode?: INodeLinkedList;
            allowMultipleRoots?: boolean;
            onRootError?: "skip" | "fail";
            yieldEvery?: number;
        } = {},
    ): Promise<
        Result<{
            root: INodeLinkedList;
            group?: GroupNode;
            stats: {
                rootCount: number;
                importedNodesCount: number;
                materialAddedCount: number;
                materialSkippedCount: number;
                errors: string[];
            };
        }>
    > {
        const doc = this.app.activeView?.document;
        if (!doc) return Result.err("No active document found.");

        let payload: any;
        try {
            payload = typeof json === "string" ? JSON.parse(json) : json;
        } catch (e: any) {
            return Result.err(`Invalid JSON: ${e?.message ?? e}`);
        }

        if (!payload || typeof payload !== "object") {
            return Result.err("JSON payload must be an object.");
        }

        const isFullDocument = payload.classKey === "Document" && payload.properties;
        const name: string | undefined = isFullDocument ? payload.properties.name : payload.name;
        const materials: Serialized[] | undefined = isFullDocument
            ? payload.properties.materials
            : payload.materials;
        const nodes: Serialized[] | undefined = isFullDocument ? payload.properties.nodes : payload.nodes;

        if (!Array.isArray(nodes) || nodes.length === 0) {
            return Result.err("JSON payload must include a non-empty 'nodes' array.");
        }

        const yieldEvery = Math.max(1, options.yieldEvery ?? 50);
        const maybeYield = async (i: number) => {
            if ((i + 1) % yieldEvery === 0) await Promise.resolve();
        };

        const errors: string[] = [];

        let materialAddedCount = 0;
        let materialSkippedCount = 0;
        if (Array.isArray(materials)) {
            for (let i = 0; i < materials.length; i++) {
                const m = materials[i];
                try {
                    const material = Serializer.deserializeObject(doc as IDocument, m);
                    if (options.dedupeMaterialsById) {
                        const exists = doc.materials.find((x) => (x as any).id === (material as any).id);
                        if (exists) {
                            materialSkippedCount++;
                            await maybeYield(i);
                            continue;
                        }
                    }
                    doc.materials.push(material);
                    materialAddedCount++;
                } catch (err: any) {
                    const msg = `Failed to deserialize material: ${err?.message ?? err}`;
                    Logger.warn(msg);
                    errors.push(msg);
                }
                await maybeYield(i);
            }
        }

        const roots = computeRoots(nodes);
        const allowMultiple = options.allowMultipleRoots ?? true;
        const perRootNodeLists = allowMultiple && roots.length > 1 ? buildSubtrees(nodes, roots) : [nodes];

        const { NodeSerializer } = await import("luminicad-core");
        const attachedRoots: INodeLinkedList[] = [];
        const parent: INodeLinkedList =
            options.parentNode ?? (doc.currentNode as INodeLinkedList) ?? (doc.rootNode as INodeLinkedList);

        let wrapperGroup: GroupNode | undefined;
        if (options.wrapInGroup || perRootNodeLists.length > 1) {
            wrapperGroup = new GroupNode(doc, options.groupName || name || "Imported");
            doc.addNode(wrapperGroup);
        }

        for (let r = 0; r < perRootNodeLists.length; r++) {
            const sub = perRootNodeLists[r];
            try {
                const rootNode = (await NodeSerializer.deserialize(doc as IDocument, sub))!;
                if (wrapperGroup) {
                    wrapperGroup.add(rootNode);
                } else {
                    parent.add(rootNode);
                }
                attachedRoots.push(rootNode);
            } catch (e: any) {
                const msg = `Failed to deserialize root[${r}] nodes: ${e?.message ?? e}`;
                Logger.warn(msg);
                errors.push(msg);
                if ((options.onRootError ?? "skip") === "fail") {
                    return Result.err(msg);
                }
                continue;
            }
            await maybeYield(r);
        }
        if (attachedRoots.length === 0) {
            return Result.err(errors[0] ?? "No nodes could be deserialized");
        }

        try {
            doc.visual.update();
            await doc.save();
        } catch (e) {
            Logger.warn("JsonExecutionService: update/save failed after import", e);
        }

        const importedNodesCount = nodes.length;

        if (errors.length > 0) {
            return Result.err(
                `JsonExecutionService encountered ${errors.length} error(s): ${errors.join(" | ")}`,
            );
        }

        return Result.ok({
            root: attachedRoots[0],
            group: wrapperGroup,
            stats: {
                rootCount: attachedRoots.length,
                importedNodesCount,
                materialAddedCount,
                materialSkippedCount,
                errors,
            },
        });
    }
}

function computeRoots(nodes: Serialized[]): string[] {
    const roots: string[] = [];
    for (const n of nodes as any[]) {
        if (n && typeof n === "object" && !("parentId" in n)) {
            const id = n.properties?.id;
            if (typeof id === "string") roots.push(id);
        }
    }
    return roots.length > 0 ? roots : ([nodes[0]?.properties?.["id"]].filter(Boolean) as string[]);
}

function buildSubtrees(nodes: Serialized[], rootIds: string[]): Serialized[][] {
    type S = any;
    const byId = new Map<string, S>();
    const children = new Map<string, S[]>();
    for (const n of nodes as S[]) {
        const id = n?.properties?.id;
        if (typeof id === "string") byId.set(id, n);
        const pid = (n as any)["parentId"];
        if (typeof pid === "string") {
            const arr = children.get(pid) ?? [];
            arr.push(n);
            children.set(pid, arr);
        }
    }

    const results: Serialized[][] = [];
    for (const rootId of rootIds) {
        const list: S[] = [];
        const visit = (id: string) => {
            const node = byId.get(id);
            if (!node) return;
            list.push(node);
            const kids = children.get(id) ?? [];
            for (const k of kids) {
                const cid = k?.properties?.["id"] as string | undefined;
                if (typeof cid === "string") visit(cid);
            }
        };
        visit(rootId);
        if (list.length > 0) results.push(list as Serialized[]);
    }
    return results.length > 0 ? results : [nodes];
}
