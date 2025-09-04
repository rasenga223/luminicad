import {
    AsyncController,
    CancelableCommand,
    EditableShapeNode,
    GeometryNode,
    IDocument,
    IEdge,
    IFace,
    INode,
    IShape,
    IShapeFilter,
    IShell,
    PubSub,
    Result,
    ShapeNode,
    ShapeType,
    Transaction,
    command,
} from "luminicad-core";
import { FaceNode } from "../../bodys/face";
import { WireNode } from "../../bodys/wire";
import { SelectShapeNodeStep } from "../../step";

abstract class ConvertCommand extends CancelableCommand {
    async executeAsync(): Promise<void> {
        const models = await this.getOrPickModels(this.document);
        if (!models) {
            PubSub.default.pub("showToast", "toast.select.noSelected");
            return;
        }
        Transaction.execute(this.document, `excute ${Object.getPrototypeOf(this).data.name}`, () => {
            const node = this.create(this.document, models);
            if (!node.isOk) {
                PubSub.default.pub("showToast", "toast.converter.error");
            } else {
                this.document.addNode(node.value);
                this.document.visual.update();
                PubSub.default.pub("showToast", "toast.success");
            }

            models.forEach((x) => x.parent?.remove(x));
        });
    }

    protected abstract create(document: IDocument, models: INode[]): Result<GeometryNode>;
    protected shapeFilter(): IShapeFilter {
        return {
            allow: (shape: IShape) =>
                shape.shapeType === ShapeType.Edge || shape.shapeType === ShapeType.Wire,
        };
    }

    async getOrPickModels(document: IDocument) {
        const filter = this.shapeFilter();
        let models = this._getSelectedModels(document, filter);
        document.selection.clearSelection();
        if (models.length > 0) return models;

        const step = new SelectShapeNodeStep("prompt.select.models", { filter, multiple: true });
        this.controller = new AsyncController();
        const data = await step.execute(document, this.controller);
        document.selection.clearSelection();
        return data?.nodes;
    }

    private _getSelectedModels(document: IDocument, filter?: IShapeFilter) {
        return document.selection
            .getSelectedNodes()
            .map((x) => x as ShapeNode)
            .filter((x) => {
                if (x === undefined) return false;
                let shape = x.shape.value;
                if (shape === undefined) return false;
                if (filter !== undefined && !filter.allow(shape)) return false;
                return true;
            });
    }
}

@command({
    name: "convert.toWire",
    display: "command.toWire",
    icon: `<svg viewBox="0 0 512 512" fill="#808080">
        <path d="m139.351 395.112-78.228-69.592c-2.063-1.835-2.248-4.995-.412-7.059 1.833-2.063 4.994-2.248 7.059-.412l78.228 69.592c2.063 1.835 2.248 4.995.412 7.059-1.834 2.063-4.994 2.249-7.059.412zm30.193-5.727c-2.698-.586-4.411-3.248-3.826-5.946l23.167-106.789c.586-2.7 3.254-4.411 5.946-3.827 2.699.586 4.412 3.248 3.827 5.947l-23.167 106.788c-.584 2.689-3.235 4.412-5.947 3.827zm189.414-115.008-135.875-16.854c-2.74-.34-4.687-2.837-4.347-5.577.339-2.74 2.835-4.695 5.577-4.347l135.875 16.854c2.74.34 4.687 2.837 4.347 5.577-.341 2.759-2.862 4.689-5.577 4.347zm36.241-25.314c-2.476-1.223-3.491-4.222-2.268-6.697l58.711-118.84c1.224-2.476 4.223-3.491 6.697-2.268 2.476 1.223 3.491 4.222 2.268 6.698l-58.711 118.84c-1.227 2.485-4.234 3.487-6.697 2.267z"></path>
        <circle cx="46.11" cy="304.88" r="19.951" fill="#1F77B4"/>
        <circle cx="162.861" cy="408.204" r="19.952" fill="#1F77B4"/>
        <circle cx="198.576" cy="253.216" r="19.951" fill="#1F77B4"/>
        <circle cx="384.498" cy="271.094" r="19.951" fill="#1F77B4"/>
        <circle cx="465.888" cy="103.796" r="19.951" fill="#1F77B4"/>
    </svg>`,
})
export class ConvertToWire extends ConvertCommand {
    protected override create(document: IDocument, models: ShapeNode[]): Result<GeometryNode> {
        const edges = models.map((x) => x.shape.value.copy()) as IEdge[];
        const wireBody = new WireNode(document, edges);
        const shape = wireBody.generateShape();
        if (!shape.isOk) return Result.err(shape.error);

        return Result.ok(wireBody);
    }
}

@command({
    name: "convert.toFace",
    display: "command.toFace",
    icon: `<svg viewBox="0 0 512 512" fill="none">
        <path d="m52.7 71.4h406.7c29.1 0 52.6 23.6 52.6 52.7v263.9c0 29.1-23.6 52.7-52.6 52.7h-406.7c-29.1-.1-52.7-23.7-52.7-52.8v-263.8c0-29.1 23.6-52.7 52.7-52.7z" fill="#808080"/>
        <path d="m10 124.1c0-23.6 19.1-42.6 42.7-42.7h406.7c23.6 0 42.6 19.1 42.6 42.7v263.9c0 23.6-19.1 42.6-42.6 42.6h-406.7c-23.6 0-42.6-19.1-42.7-42.6z" fill="#1F77B4" opacity="0.7"/>
    </svg>`,
})
export class ConvertToFace extends ConvertCommand {
    protected override create(document: IDocument, models: ShapeNode[]): Result<GeometryNode> {
        const edges = models.map((x) => x.shape.value.copy()) as IEdge[];
        const wireBody = new FaceNode(document, edges);
        const shape = wireBody.generateShape();
        if (!shape.isOk) return Result.err(shape.error);

        return Result.ok(wireBody);
    }
}

@command({
    name: "convert.toShell",
    display: "command.toShell",
    icon: "icon-toShell",
})
export class ConvertToShell extends ConvertCommand {
    protected override shapeFilter(): IShapeFilter {
        return {
            allow: (shape: IShape) => shape.shapeType === ShapeType.Face,
        };
    }

    protected override create(document: IDocument, models: ShapeNode[]): Result<GeometryNode> {
        const faces = models.map((x) => x.shape.value.copy()) as IFace[];
        const shape = this.application.shapeFactory.shell(faces);
        if (!shape.isOk) return Result.err(shape.error);

        const shell = new EditableShapeNode(document, "shell", shape);
        return Result.ok(shell);
    }
}

@command({
    name: "convert.toSolid",
    display: "command.toSolid",
    icon: "icon-toSolid",
})
export class ConvertToSolid extends ConvertCommand {
    protected override shapeFilter(): IShapeFilter {
        return {
            allow: (shape: IShape) => shape.shapeType === ShapeType.Shell,
        };
    }

    protected override create(document: IDocument, models: ShapeNode[]): Result<GeometryNode> {
        const faces = models.map((x) => x.shape.value.copy()) as IShell[];
        const shape = this.application.shapeFactory.solid(faces);
        if (!shape.isOk) return Result.err(shape.error);

        const solid = new EditableShapeNode(document, "solid", shape);
        return Result.ok(solid);
    }
}
