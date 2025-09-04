/**
 * DSLExecutionService
 *
 * This service executes an input DSL command and performs geometry operations.
 * Expected DSL command formats:
 *   CREATE BOX ORIGIN x y z SIZE dx dy HEIGHT dz
 *   CREATE ARC CENTER x y z START x y z NORMAL x y z ANGLE a
 *   CREATE CIRCLE CENTER x y z RADIUS r NORMAL x y z
 *   CREATE LINE FROM x y z TO x y z
 *   CREATE POLYGON POINTS x1 y1 z1 x2 y2 z2 ... xn yn zn
 *   CREATE RECTANGLE ORIGIN x y z SIZE dx dy
 *   CREATE FOLDER [NAME folderName]
 *   CREATE FUSE BOTTOM <bottom-dsl-command> TOP <top-dsl-command>
 *
 * Examples:
 *   "CREATE BOX ORIGIN 0 0 0 SIZE 100 50 HEIGHT 75"
 *   "CREATE ARC CENTER 0 0 0 START 100 0 0 NORMAL 0 0 1 ANGLE 90"
 *   "CREATE CIRCLE CENTER 0 0 0 RADIUS 50 NORMAL 0 0 1"
 *   "CREATE LINE FROM 0 0 0 TO 100 0 0"
 *   "CREATE POLYGON POINTS 0 0 0 100 0 0 100 100 0 0 100 0"
 *   "CREATE RECTANGLE ORIGIN 0 0 0 SIZE 100 50"
 *   "CREATE FOLDER" or "CREATE FOLDER NAME My Custom Folder"
 *   "CREATE FUSE BOTTOM CREATE BOX ORIGIN 0 0 0 SIZE 100 50 HEIGHT 75 TOP CREATE BOX ORIGIN 50 50 0 SIZE 100 50 HEIGHT 75"
 *
 * When executed, the service parses the parameters, creates the corresponding
 * geometry node, adds it to the active document, and returns the new node.
 */

import {
    I18n,
    IApplication,
    IEdge,
    IService,
    IShape,
    Plane,
    PubSub,
    Result,
    Transaction,
    XYZ,
} from "luminicad-core";

import { EditableShapeNode, FolderNode, Ray } from "luminicad-core";
import { ArcNode } from "../../../luminicad/src/bodys/arc";
import { BooleanNode } from "../../../luminicad/src/bodys/boolean";
import { BoxNode } from "../../../luminicad/src/bodys/box";
import { CircleNode } from "../../../luminicad/src/bodys/circle";
import { FaceNode } from "../../../luminicad/src/bodys/face";
import { FuseNode } from "../../../luminicad/src/bodys/fuse";
import { LineNode } from "../../../luminicad/src/bodys/line";
import { PolygonNode } from "../../../luminicad/src/bodys/polygon";
import { PrismNode } from "../../../luminicad/src/bodys/prism";
import { RectNode } from "../../../luminicad/src/bodys/rect";
import { RevolvedNode } from "../../../luminicad/src/bodys/revolve";
import { SweepedNode } from "../../../luminicad/src/bodys/sweep";
import { WireNode } from "../../../luminicad/src/bodys/wire";

import { MaterialLibrary } from "luminicad-core";

export class DSLExecutionService implements IService {
    private app!: IApplication;
    private variableCommands: Map<string, string> = new Map();
    private variableResults: Map<string, any> = new Map();
    private lastNodeResult: any = null;
    private folderCounter: number = 1;

    constructor() {}

    register(app: IApplication): void {
        this.app = app;
    }

    start(): void {
        console.info(`${DSLExecutionService.name} started`);
    }

    stop(): void {}

    /**
     * @param dsl The DSL command string or sequence of commands.
     * @returns
     */
    async executeDsl(dsl: string): Promise<Result<any>> {
        try {
            const doc = this.app.activeView?.document;
            if (!doc) {
                return Result.err("No active document");
            }

            const commands = dsl
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith("//"));

            let lastResult: Result<any> = Result.err("No valid commands found");

            for (const command of commands) {
                const result = await this.executeCommand(command.trim());
                if (!result.isOk) {
                    return result;
                }
                lastResult = result;
            }

            return lastResult;
        } catch (error) {
            console.error("Error executing DSL:", error);
            return Result.err(`Error executing DSL: ${error}`);
        }
    }

    /**
     * @param dsl A single DSL command string.
     * @returns
     */
    private async executeCommand(dsl: string): Promise<Result<any>> {
        try {
            const doc = this.app.activeView?.document;
            if (!doc) {
                return Result.err("No active document");
            }

            const trimmedDsl = dsl.trim();
            const assignmentMatch = trimmedDsl.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
            if (assignmentMatch) {
                const [_, variableName, command] = assignmentMatch;
                const result = await this.executeCommand(command);
                if (!result.isOk) {
                    return result;
                }

                this.variableCommands.set(variableName, command);
                this.variableResults.set(variableName, result.value);
                this.lastNodeResult = result.value;
                return result;
            }

            if (trimmedDsl.includes("$")) {
                const resolvedDslResult = this.resolveVariables(trimmedDsl);
                if (!resolvedDslResult.isOk) {
                    return Result.err(resolvedDslResult.error);
                }
                return this.executeCommand(resolvedDslResult.value);
            }

            const materialMatch = trimmedDsl.match(/^(.+?)\s+WITH\s+MATERIAL\s+([A-Z]+)\.([A-Z_]+)$/i);

            if (materialMatch) {
                const [_, shapeCommand, category, materialName] = materialMatch;
                const shapeResult = await this.executeCommand(shapeCommand);
                if (!shapeResult.isOk) {
                    return shapeResult;
                }

                let materialPresets;
                switch (category.toUpperCase()) {
                    case "METALS":
                        materialPresets = MaterialLibrary.METALS;
                        break;
                    case "PLASTICS":
                        materialPresets = MaterialLibrary.PLASTICS;
                        break;
                    case "WOOD":
                        materialPresets = MaterialLibrary.WOOD;
                        break;
                    case "GLASS":
                        materialPresets = MaterialLibrary.GLASS;
                        break;
                    default:
                        return Result.err(
                            `Unknown material category: ${category}. Available categories: METALS, PLASTICS, WOOD, GLASS`,
                        );
                }

                const materialKey = Object.keys(materialPresets).find(
                    (key) => key.toUpperCase() === materialName.toUpperCase(),
                );

                if (!materialKey) {
                    const availableMaterials = Object.keys(materialPresets).join(", ");
                    return Result.err(
                        `Unknown material: ${materialName} in category ${category}. Available materials: ${availableMaterials}`,
                    );
                }

                const materialPreset = materialPresets[materialKey as keyof typeof materialPresets];

                const material = MaterialLibrary.createMaterial(doc, materialPreset);
                doc.materials.push(material);

                shapeResult.value.materialId = material.id;

                doc.visual.update();

                return shapeResult;
            }

            if (trimmedDsl.toUpperCase().startsWith("CREATE BOX")) {
                const parseResult = this.parseBoxCommand(trimmedDsl);
                if (!parseResult.isOk) {
                    return Result.err(parseResult.error);
                }

                const { origin, dx, dy, dz } = parseResult.value;
                const plane = this.createDefaultPlane(origin);

                const node = new BoxNode(doc, plane, dx, dy, dz);

                doc.addNode(node);

                this.lastNodeResult = node;
                return Result.ok(node);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE ARC")) {
                const parseResult = this.parseArcCommand(trimmedDsl);
                if (!parseResult.isOk) {
                    return Result.err(parseResult.error);
                }

                const { center, start, normal, angle } = parseResult.value;
                const node = new ArcNode(doc, normal, center, start, angle);

                doc.addNode(node);

                this.lastNodeResult = node;
                return Result.ok(node);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE CIRCLE")) {
                const parseResult = this.parseCircleCommand(trimmedDsl);
                if (!parseResult.isOk) {
                    return Result.err(parseResult.error);
                }

                const { center, radius, normal } = parseResult.value;
                const node = new CircleNode(doc, normal, center, radius);
                doc.addNode(node);
                this.lastNodeResult = node;
                return Result.ok(node);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE LINE")) {
                const parseResult = this.parseLineCommand(trimmedDsl);
                if (!parseResult.isOk) {
                    return Result.err(parseResult.error);
                }

                const { from, to } = parseResult.value;
                const node = new LineNode(doc, from, to);
                doc.addNode(node);
                this.lastNodeResult = node;
                return Result.ok(node);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE POLYGON")) {
                const parseResult = this.parsePolygonCommand(trimmedDsl);
                if (!parseResult.isOk) {
                    return Result.err(parseResult.error);
                }

                const { points } = parseResult.value;

                const node = new PolygonNode(doc, points);

                doc.addNode(node);
                this.lastNodeResult = node;
                return Result.ok(node);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE RECTANGLE")) {
                const parseResult = this.parseRectangleCommand(trimmedDsl);
                if (!parseResult.isOk) {
                    return Result.err(parseResult.error);
                }
                const { origin, dx, dy } = parseResult.value;
                const plane = this.createDefaultPlane(origin);
                const node = new RectNode(doc, plane, dx, dy);

                doc.addNode(node);
                this.lastNodeResult = node;
                return Result.ok(node);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE FUSE")) {
                const tokens = trimmedDsl.split(/\s+/);
                if (tokens.length < 6) {
                    return Result.err(
                        "Invalid DSL format for FUSE. Expected format: CREATE FUSE BOTTOM <bottom-dsl-command> TOP <top-dsl-command>",
                    );
                }
                if (
                    tokens[0].toUpperCase() !== "CREATE" ||
                    tokens[1].toUpperCase() !== "FUSE" ||
                    tokens[2].toUpperCase() !== "BOTTOM"
                ) {
                    return Result.err("Invalid DSL FUSE command structure. Please check the keywords.");
                }
                const topIndex = tokens.findIndex((token, idx) => idx > 2 && token.toUpperCase() === "TOP");
                if (topIndex === -1) {
                    return Result.err("Invalid DSL FUSE command: missing TOP keyword");
                }
                const bottomDsl = tokens.slice(3, topIndex).join(" ");
                const topDsl = tokens.slice(topIndex + 1).join(" ");
                const bottomResult = await this.executeDsl(bottomDsl);
                if (!bottomResult.isOk) {
                    return Result.err(`Error in bottom shape DSL: ${bottomResult.error}`);
                }
                const bottomShapeResult = bottomResult.value.generateShape();
                if (!bottomShapeResult.isOk) {
                    return Result.err(`Bottom shape generation failed: ${bottomShapeResult.error}`);
                }
                const topResult = await this.executeDsl(topDsl);
                if (!topResult.isOk) {
                    return Result.err(`Error in top shape DSL: ${topResult.error}`);
                }
                const topShapeResult = topResult.value.generateShape();
                if (!topShapeResult.isOk) {
                    return Result.err(`Top shape generation failed: ${topShapeResult.error}`);
                }

                const fuseNode = new FuseNode(doc, bottomShapeResult.value, topShapeResult.value);
                doc.addNode(fuseNode);
                this.lastNodeResult = fuseNode;
                return Result.ok(fuseNode);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE FOLDER")) {
                const parseResult = this.parseFolderCommand(trimmedDsl);
                if (!parseResult.isOk) {
                    return Result.err(parseResult.error);
                }
                const { name } = parseResult.value;
                const folder = new FolderNode(doc, name);
                doc.addNode(folder);
                this.lastNodeResult = folder;
                return Result.ok(folder);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE PRISM")) {
                const tokens = trimmedDsl.split(/\s+/);
                if (tokens.length < 6) {
                    return Result.err(
                        "Invalid DSL format for PRISM. Expected format: CREATE PRISM SECTION <section-dsl-command> LENGTH <length>",
                    );
                }
                if (
                    tokens[0].toUpperCase() !== "CREATE" ||
                    tokens[1].toUpperCase() !== "PRISM" ||
                    tokens[2].toUpperCase() !== "SECTION"
                ) {
                    return Result.err(
                        "Invalid DSL PRISM command structure. Ensure proper keywords: CREATE PRISM SECTION ...",
                    );
                }
                const lengthIdx = tokens.findIndex(
                    (token, idx) => idx > 2 && token.toUpperCase() === "LENGTH",
                );
                if (lengthIdx === -1 || lengthIdx === tokens.length - 1) {
                    return Result.err("Invalid DSL PRISM command. Missing LENGTH keyword or length value.");
                }
                const sectionDsl = tokens.slice(3, lengthIdx).join(" ");
                const parseLength = parseFloat(tokens[lengthIdx + 1]);
                if (isNaN(parseLength)) {
                    return Result.err("Invalid length value in PRISM command. Expected a number.");
                }
                const sectionResult = await this.executeDsl(sectionDsl);
                if (!sectionResult.isOk) {
                    return Result.err(`Error in section DSL command: ${sectionResult.error}`);
                }
                const sectionShapeResult = sectionResult.value.generateShape();
                if (!sectionShapeResult.isOk) {
                    return Result.err(`Section shape generation failed: ${sectionShapeResult.error}`);
                }
                const prismNode = new PrismNode(doc, sectionShapeResult.value, parseLength);
                doc.addNode(prismNode);
                this.lastNodeResult = prismNode;
                return Result.ok(prismNode);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE REVOLVE")) {
                const tokens = trimmedDsl.split(/\s+/);
                const axisIndex = tokens.findIndex(
                    (token, idx) => idx > 2 && token.toUpperCase() === "AXIS",
                );
                if (axisIndex === -1) {
                    return Result.err("Invalid DSL REVOLVE command. Missing AXIS keyword.");
                }
                const profileDsl = tokens.slice(3, axisIndex).join(" ");

                if (tokens.length < axisIndex + 11) {
                    return Result.err("Invalid DSL REVOLVE command. Incomplete axis definition.");
                }
                if (tokens[axisIndex + 1].toUpperCase() !== "ORIGIN") {
                    return Result.err("Invalid DSL REVOLVE command. Expected ORIGIN keyword after AXIS.");
                }
                const ox = parseFloat(tokens[axisIndex + 2]);
                const oy = parseFloat(tokens[axisIndex + 3]);
                const oz = parseFloat(tokens[axisIndex + 4]);
                if (isNaN(ox) || isNaN(oy) || isNaN(oz)) {
                    return Result.err("Invalid origin coordinates in DSL REVOLVE command.");
                }
                if (tokens[axisIndex + 5].toUpperCase() !== "DIRECTION") {
                    return Result.err(
                        "Invalid DSL REVOLVE command. Expected DIRECTION keyword after origin.",
                    );
                }
                const dx = parseFloat(tokens[axisIndex + 6]);
                const dy = parseFloat(tokens[axisIndex + 7]);
                const dz = parseFloat(tokens[axisIndex + 8]);
                if (isNaN(dx) || isNaN(dy) || isNaN(dz)) {
                    return Result.err("Invalid direction vector in DSL REVOLVE command.");
                }
                if (tokens[axisIndex + 9].toUpperCase() !== "ANGLE") {
                    return Result.err(
                        "Invalid DSL REVOLVE command. Expected ANGLE keyword after direction.",
                    );
                }
                const angle = parseFloat(tokens[axisIndex + 10]);
                if (isNaN(angle)) {
                    return Result.err("Invalid angle value in DSL REVOLVE command.");
                }
                const profileResult = await this.executeDsl(profileDsl);
                if (!profileResult.isOk) {
                    return Result.err(`Error in profile DSL command: ${profileResult.error}`);
                }
                const profileShapeResult = profileResult.value.generateShape();
                if (!profileShapeResult.isOk) {
                    return Result.err(`Profile shape generation failed: ${profileShapeResult.error}`);
                }
                const origin = new XYZ(ox, oy, oz);
                const direction = new XYZ(dx, dy, dz);
                const axisRay = new Ray(origin, direction);
                const revolvedNode = new RevolvedNode(doc, profileShapeResult.value, axisRay, angle);
                doc.addNode(revolvedNode);
                this.lastNodeResult = revolvedNode;
                return Result.ok(revolvedNode);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE SWEEP")) {
                const tokens = trimmedDsl.split(/\s+/);
                if (tokens.length < 6) {
                    return Result.err(
                        "Invalid DSL format for SWEEP. Expected format: CREATE SWEEP PROFILE <profile-dsl-command> PATH <path-dsl-command>",
                    );
                }
                if (
                    tokens[0].toUpperCase() !== "CREATE" ||
                    tokens[1].toUpperCase() !== "SWEEP" ||
                    tokens[2].toUpperCase() !== "PROFILE"
                ) {
                    return Result.err(
                        "Invalid DSL SWEEP command structure. Ensure the command starts with: CREATE SWEEP PROFILE ...",
                    );
                }
                const pathIndex = tokens.findIndex(
                    (token, idx) => idx > 2 && token.toUpperCase() === "PATH",
                );
                if (pathIndex === -1) {
                    return Result.err("Invalid DSL SWEEP command: missing PATH keyword");
                }
                const profileDsl = tokens.slice(3, pathIndex).join(" ");
                const pathDsl = tokens.slice(pathIndex + 1).join(" ");
                const profileResult = await this.executeDsl(profileDsl);
                if (!profileResult.isOk) {
                    return Result.err(`Error in profile DSL command: ${profileResult.error}`);
                }
                const profileShapeResult = profileResult.value.generateShape();
                if (!profileShapeResult.isOk) {
                    return Result.err(`Profile shape generation failed: ${profileShapeResult.error}`);
                }

                const pathResult = await this.executeDsl(pathDsl);
                if (!pathResult.isOk) {
                    return Result.err(`Error in path DSL command: ${pathResult.error}`);
                }
                const pathShapeResult = pathResult.value.generateShape();
                if (!pathShapeResult.isOk) {
                    return Result.err(`Path shape generation failed: ${pathShapeResult.error}`);
                }

                const sweepedNode = new SweepedNode(doc, profileShapeResult.value, pathShapeResult.value);
                doc.addNode(sweepedNode);
                this.lastNodeResult = sweepedNode;
                return Result.ok(sweepedNode);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE WIRE")) {
                const tokens = trimmedDsl.split(/\s+/);
                if (tokens.length < 4 || tokens[2].toUpperCase() !== "EDGES") {
                    return Result.err(
                        "Invalid DSL format for WIRE. Expected format: CREATE WIRE EDGES <edge-dsl-command> [AND <edge-dsl-command> ...]",
                    );
                }

                const edgesCommandStr = trimmedDsl.substring("CREATE WIRE EDGES".length).trim();
                if (!edgesCommandStr) {
                    return Result.err("No edge DSL command provided for WIRE.");
                }

                const edgeCommands = edgesCommandStr.split(/\s+AND\s+/i);
                const edges: IEdge[] = [];

                for (const cmd of edgeCommands) {
                    const edgeResult = await this.executeDsl(cmd.trim());
                    if (!edgeResult.isOk) {
                        return Result.err(`Error in edge DSL command: ${edgeResult.error}`);
                    }

                    const edgeShapeResult = edgeResult.value.generateShape();
                    if (!edgeShapeResult.isOk) {
                        return Result.err(`Edge shape generation failed: ${edgeShapeResult.error}`);
                    }

                    edges.push(edgeShapeResult.value);
                }

                const wireNode = new WireNode(doc, edges);
                doc.addNode(wireNode);
                this.lastNodeResult = wireNode;
                return Result.ok(wireNode);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE BOOLEAN")) {
                const booleanRegex = /^CREATE BOOLEAN\s+(COMMON|CUT|FUSE)\s+FIRST\s+(.+?)\s+SECOND\s+(.+)$/i;
                const match = trimmedDsl.match(booleanRegex);
                if (!match) {
                    return Result.err(
                        "Invalid DSL BOOLEAN command format. Expected: CREATE BOOLEAN <OPERATION> FIRST <first-shape> SECOND <second-shape>",
                    );
                }

                const operation = match[1].toUpperCase();
                let firstShapeDsl = match[2].trim();
                let secondShapeDsl = match[3].trim();

                if (firstShapeDsl.startsWith("$")) {
                    const varName = firstShapeDsl.substring(1);
                    const varValue = this.variableCommands.get(varName);
                    if (!varValue) {
                        return Result.err(`Variable '${varName}' not found`);
                    }
                    firstShapeDsl = varValue;
                }

                if (secondShapeDsl.startsWith("$")) {
                    const varName = secondShapeDsl.substring(1);
                    const varValue = this.variableCommands.get(varName);
                    if (!varValue) {
                        return Result.err(`Variable '${varName}' not found`);
                    }
                    secondShapeDsl = varValue;
                }

                const firstResult = await this.executeDsl(firstShapeDsl);
                if (!firstResult.isOk) {
                    return Result.err(`Error in first shape DSL command: ${firstResult.error}`);
                }
                const firstNode = firstResult.value;
                const firstShapeResult = firstNode.generateShape();
                if (!firstShapeResult.isOk) {
                    return Result.err(`First shape generation failed: ${firstShapeResult.error}`);
                }

                const secondResult = await this.executeDsl(secondShapeDsl);
                if (!secondResult.isOk) {
                    return Result.err(`Error in second shape DSL command: ${secondResult.error}`);
                }
                const secondNode = secondResult.value;
                const secondShapeResult = secondNode.generateShape();
                if (!secondShapeResult.isOk) {
                    return Result.err(`Second shape generation failed: ${secondShapeResult.error}`);
                }

                let booleanResult: Result<IShape>;
                switch (operation) {
                    case "COMMON":
                        booleanResult = this.app.shapeFactory.booleanCommon(
                            firstShapeResult.value,
                            secondShapeResult.value,
                        );
                        break;
                    case "CUT":
                        booleanResult = this.app.shapeFactory.booleanCut(
                            firstShapeResult.value,
                            secondShapeResult.value,
                        );
                        break;
                    case "FUSE":
                        booleanResult = this.app.shapeFactory.booleanFuse(
                            firstShapeResult.value,
                            secondShapeResult.value,
                        );
                        break;
                    default:
                        return Result.err("Unexpected boolean operation type");
                }

                if (!booleanResult.isOk) {
                    return Result.err(`Boolean operation failed: ${booleanResult.error}`);
                }

                const booleanNode = new BooleanNode(doc, booleanResult.value);
                doc.addNode(booleanNode);
                firstNode.parent?.remove(firstNode);
                secondNode.parent?.remove(secondNode);

                this.lastNodeResult = booleanNode;
                return Result.ok(booleanNode);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE BEZIER")) {
                const tokens = trimmedDsl.split(/\s+/);

                if (tokens.length < 8) {
                    return Result.err(
                        "Invalid DSL format for BEZIER. Expected format: CREATE BEZIER POINTS x1 y1 z1 x2 y2 z2 ... xn yn zn",
                    );
                }

                if (
                    tokens[0].toUpperCase() !== "CREATE" ||
                    tokens[1].toUpperCase() !== "BEZIER" ||
                    tokens[2].toUpperCase() !== "POINTS"
                ) {
                    return Result.err("Invalid DSL BEZIER command structure. Please check the keywords.");
                }

                const coordinates = tokens.slice(3).map(Number);
                if (coordinates.some(isNaN)) {
                    return Result.err("Invalid coordinates in BEZIER command. All values must be numbers.");
                }

                if (coordinates.length % 3 !== 0) {
                    return Result.err(
                        "Invalid number of coordinates. Each point must have x, y, and z values.",
                    );
                }

                const points: XYZ[] = [];
                for (let i = 0; i < coordinates.length; i += 3) {
                    points.push(new XYZ(coordinates[i], coordinates[i + 1], coordinates[i + 2]));
                }

                if (points.length < 2) {
                    return Result.err("At least 2 points are required to create a Bezier curve.");
                }
                const bezierResult = this.app.shapeFactory.bezier(points);
                if (!bezierResult.isOk) {
                    return Result.err(`Failed to create Bezier curve: ${bezierResult.error}`);
                }

                const node = new EditableShapeNode(
                    doc,
                    I18n.translate("command.bezier"),
                    bezierResult.value,
                );

                doc.addNode(node);
                this.lastNodeResult = node;
                return Result.ok(node);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE FACE")) {
                const tokens = trimmedDsl.split(/\s+/);
                if (tokens.length < 4) {
                    return Result.err(
                        "Invalid DSL format for FACE. Expected format: CREATE FACE WIRE <wire-dsl> or CREATE FACE EDGES <edge-dsl> [AND <edge-dsl> ...]",
                    );
                }

                if (tokens[2].toUpperCase() === "WIRE") {
                    const wireDsl = tokens.slice(3).join(" ");
                    const wireResult = await this.executeDsl(wireDsl);
                    if (!wireResult.isOk) {
                        return Result.err(`Error in wire DSL command: ${wireResult.error}`);
                    }
                    const wireShapeResult = wireResult.value.generateShape();
                    if (!wireShapeResult.isOk) {
                        return Result.err(`Wire shape generation failed: ${wireShapeResult.error}`);
                    }

                    const faceNode = new FaceNode(doc, [wireShapeResult.value]);
                    doc.addNode(faceNode);

                    wireResult.value.parent?.remove(wireResult.value);

                    this.lastNodeResult = faceNode;
                    return Result.ok(faceNode);
                } else if (tokens[2].toUpperCase() === "EDGES") {
                    const edgesCommandStr = trimmedDsl.substring("CREATE FACE EDGES".length).trim();
                    if (!edgesCommandStr) {
                        return Result.err("No edge DSL commands provided for FACE.");
                    }
                    const edgeCommands = edgesCommandStr.split(/\s+AND\s+/i);
                    const edges: IEdge[] = [];

                    for (const cmd of edgeCommands) {
                        const edgeResult = await this.executeDsl(cmd.trim());
                        if (!edgeResult.isOk) {
                            return Result.err(`Error in edge DSL command: ${edgeResult.error}`);
                        }
                        const edgeShapeResult = edgeResult.value.generateShape();
                        if (!edgeShapeResult.isOk) {
                            return Result.err(`Edge shape generation failed: ${edgeShapeResult.error}`);
                        }

                        edges.push(edgeShapeResult.value as IEdge);

                        edgeResult.value.parent?.remove(edgeResult.value);
                    }

                    const faceNode = new FaceNode(doc, edges);
                    doc.addNode(faceNode);
                    this.lastNodeResult = faceNode;
                    return Result.ok(faceNode);
                } else {
                    return Result.err(
                        "Invalid DSL FACE command. Expected 'WIRE' or 'EDGES' keyword after 'CREATE FACE'",
                    );
                }
            } else if (trimmedDsl.toUpperCase().startsWith("DELETE")) {
                const doc = this.app.activeView?.document;
                if (!doc) {
                    return Result.err("No active document");
                }

                const nodesToDelete = doc.selection.getSelectedNodes();
                const count = nodesToDelete.length;

                Transaction.execute(doc, "delete", () => {
                    if (doc.currentNode && nodesToDelete.includes(doc.currentNode)) {
                        doc.currentNode = doc.rootNode;
                    }
                    doc.selection.clearSelection();
                    nodesToDelete.forEach((model) => model.parent?.remove(model));
                    doc.visual.update();
                    PubSub.default.pub("showToast", "toast.delete{0}Objects", count);
                });

                return Result.ok({ message: `Deleted ${count} object${count === 1 ? "" : "s"}` });
            } else if (trimmedDsl.toUpperCase().startsWith("SELECT SHAPE")) {
                const tokens = trimmedDsl.split(/\s+/);
                let targetNode;
                if (tokens.length === 2) {
                    if (!this.lastNodeResult) {
                        return Result.err("No shape available to select.");
                    }
                    targetNode = this.lastNodeResult;
                } else {
                    let variableName: string;
                    if (tokens[2].toUpperCase() === "VARIABLE") {
                        if (tokens.length < 4)
                            return Result.err("No variable name provided for SELECT SHAPE.");
                        variableName = tokens[3];
                    } else {
                        variableName = tokens[2];
                    }
                    targetNode = this.variableResults.get(variableName);
                    if (!targetNode) {
                        return Result.err(`No shape stored in variable: ${variableName}`);
                    }
                }
                doc.selection.setSelection([targetNode], false);
                doc.visual.update();
                return Result.ok(targetNode);
            } else if (trimmedDsl.toUpperCase().startsWith("CREATE THICKSOLID")) {
                const tokens = trimmedDsl.split(/\s+/);
                const thicknessIndex = tokens.findIndex((token) => token.toUpperCase() === "THICKNESS");
                if (thicknessIndex === -1 || thicknessIndex === tokens.length - 1) {
                    return Result.err(
                        "Invalid DSL format for THICKSOLID. Expected format: CREATE THICKSOLID <base-shape-dsl> THICKNESS <thickness>",
                    );
                }

                const baseDsl = tokens.slice(2, thicknessIndex).join(" ");
                if (!baseDsl) {
                    return Result.err(
                        "Invalid DSL format for THICKSOLID. Missing base shape command before THICKNESS.",
                    );
                }

                const thicknessValue = parseFloat(tokens[thicknessIndex + 1]);
                if (isNaN(thicknessValue)) {
                    return Result.err("Invalid thickness value in THICKSOLID command. Expected a number.");
                }

                const baseResult = await this.executeCommand(baseDsl);
                if (!baseResult.isOk) {
                    return Result.err(`Error in base shape DSL command: ${baseResult.error}`);
                }

                const baseShapeResult = baseResult.value.generateShape();
                if (!baseShapeResult.isOk) {
                    return Result.err(`Base shape generation failed: ${baseShapeResult.error}`);
                }

                const thickSolidResult = this.app.shapeFactory.makeThickSolidBySimple(
                    baseShapeResult.value,
                    thicknessValue,
                );
                if (!thickSolidResult.isOk) {
                    return Result.err(`Thick solid generation failed: ${thickSolidResult.error}`);
                }

                const thickSolidNode = new EditableShapeNode(
                    doc,
                    I18n.translate("command.thickSolid"),
                    thickSolidResult.value,
                );
                doc.addNode(thickSolidNode);
                this.lastNodeResult = thickSolidNode;
                return Result.ok(thickSolidNode);
            } else {
                return Result.err("Unknown DSL command");
            }
        } catch (error) {
            console.error("Error executing command:", error);
            return Result.err(`Error executing command: ${error}`);
        }
    }

    /**
     * @param dsl The DSL command string.
     * @returns A Result containing the parsed box parameters, or an error message.
     */
    private parseBoxCommand(dsl: string): Result<{ origin: XYZ; dx: number; dy: number; dz: number }> {
        const tokens = dsl.split(/\s+/);
        if (tokens.length !== 11) {
            return Result.err(
                "Invalid DSL format. Expected format: CREATE BOX ORIGIN x y z SIZE dx dy HEIGHT dz",
            );
        }
        if (
            tokens[0].toUpperCase() !== "CREATE" ||
            tokens[1].toUpperCase() !== "BOX" ||
            tokens[2].toUpperCase() !== "ORIGIN" ||
            tokens[6].toUpperCase() !== "SIZE" ||
            tokens[9].toUpperCase() !== "HEIGHT"
        ) {
            return Result.err("Invalid DSL BOX command structure. Please check the keywords.");
        }
        const parseNumber = (str: string): number | null => {
            const num = parseFloat(str);
            return isNaN(num) ? null : num;
        };
        const x = parseNumber(tokens[3]);
        const y = parseNumber(tokens[4]);
        const z = parseNumber(tokens[5]);
        if (x === null || y === null || z === null) {
            return Result.err("Invalid origin coordinates. Expected numbers for x, y, and z.");
        }
        const dx = parseNumber(tokens[7]);
        const dy = parseNumber(tokens[8]);
        if (dx === null || dy === null) {
            return Result.err("Invalid size parameters. Expected numbers for dx and dy.");
        }
        const dz = parseNumber(tokens[10]);
        if (dz === null) {
            return Result.err("Invalid height parameter. Expected a number for dz.");
        }
        return Result.ok({ origin: new XYZ(x, y, z), dx, dy, dz });
    }

    /**
     * @param dsl The DSL command string.
     * @returns A Result containing the parsed arc parameters, or an error message.
     */
    private parseArcCommand(dsl: string): Result<{ center: XYZ; start: XYZ; normal: XYZ; angle: number }> {
        const tokens = dsl.split(/\s+/);
        if (tokens.length !== 16) {
            return Result.err(
                "Invalid DSL format for ARC. Expected format: CREATE ARC CENTER x y z START x y z NORMAL x y z ANGLE a",
            );
        }
        if (
            tokens[0].toUpperCase() !== "CREATE" ||
            tokens[1].toUpperCase() !== "ARC" ||
            tokens[2].toUpperCase() !== "CENTER" ||
            tokens[6].toUpperCase() !== "START" ||
            tokens[10].toUpperCase() !== "NORMAL" ||
            tokens[14].toUpperCase() !== "ANGLE"
        ) {
            return Result.err("Invalid DSL ARC command structure. Please check the keywords.");
        }
        const parseNumber = (str: string): number | null => {
            const num = parseFloat(str);
            return isNaN(num) ? null : num;
        };
        const cx = parseNumber(tokens[3]);
        const cy = parseNumber(tokens[4]);
        const cz = parseNumber(tokens[5]);
        if (cx === null || cy === null || cz === null) {
            return Result.err("Invalid center coordinates. Expected numbers for x, y, and z.");
        }
        const sx = parseNumber(tokens[7]);
        const sy = parseNumber(tokens[8]);
        const sz = parseNumber(tokens[9]);
        if (sx === null || sy === null || sz === null) {
            return Result.err("Invalid start coordinates. Expected numbers for x, y, and z.");
        }
        const nx = parseNumber(tokens[11]);
        const ny = parseNumber(tokens[12]);
        const nz = parseNumber(tokens[13]);
        if (nx === null || ny === null || nz === null) {
            return Result.err("Invalid normal coordinates. Expected numbers for x, y, and z.");
        }
        const angle = parseNumber(tokens[15]);
        if (angle === null) {
            return Result.err("Invalid angle value. Expected a number for angle.");
        }
        return Result.ok({
            center: new XYZ(cx, cy, cz),
            start: new XYZ(sx, sy, sz),
            normal: new XYZ(nx, ny, nz),
            angle: angle,
        });
    }

    /**
     * @param dsl The DSL command string.
     * @returns A Result containing the parsed circle parameters, or an error message.
     */
    private parseCircleCommand(dsl: string): Result<{ center: XYZ; radius: number; normal: XYZ }> {
        const tokens = dsl.split(/\s+/);
        if (tokens.length !== 12) {
            return Result.err(
                "Invalid DSL format. Expected format: CREATE CIRCLE CENTER x y z RADIUS r NORMAL x y z",
            );
        }
        if (
            tokens[0].toUpperCase() !== "CREATE" ||
            tokens[1].toUpperCase() !== "CIRCLE" ||
            tokens[2].toUpperCase() !== "CENTER" ||
            tokens[6].toUpperCase() !== "RADIUS" ||
            tokens[8].toUpperCase() !== "NORMAL"
        ) {
            return Result.err("Invalid DSL CIRCLE command structure. Please check the keywords.");
        }
        const parseNumber = (str: string): number | null => {
            const num = parseFloat(str);
            return isNaN(num) ? null : num;
        };
        const cx = parseNumber(tokens[3]);
        const cy = parseNumber(tokens[4]);
        const cz = parseNumber(tokens[5]);
        if (cx === null || cy === null || cz === null) {
            return Result.err("Invalid center coordinates. Expected numbers for x, y, and z.");
        }
        const radius = parseNumber(tokens[7]);
        if (radius === null) {
            return Result.err("Invalid radius value. Expected a number.");
        }
        const nx = parseNumber(tokens[9]);
        const ny = parseNumber(tokens[10]);
        const nz = parseNumber(tokens[11]);
        if (nx === null || ny === null || nz === null) {
            return Result.err("Invalid normal coordinates. Expected numbers for x, y, and z.");
        }
        return Result.ok({
            center: new XYZ(cx, cy, cz),
            radius: radius,
            normal: new XYZ(nx, ny, nz),
        });
    }

    /**
     * @param dsl The DSL command string.
     * @returns A Result containing the parsed line parameters, or an error message.
     */
    private parseLineCommand(dsl: string): Result<{ from: XYZ; to: XYZ }> {
        const tokens = dsl.split(/\s+/);
        if (tokens.length !== 10) {
            return Result.err(
                "Invalid DSL format for LINE. Expected format: CREATE LINE FROM x y z TO x y z",
            );
        }
        if (
            tokens[0].toUpperCase() !== "CREATE" ||
            tokens[1].toUpperCase() !== "LINE" ||
            tokens[2].toUpperCase() !== "FROM" ||
            tokens[6].toUpperCase() !== "TO"
        ) {
            return Result.err("Invalid DSL LINE command structure. Please check the keywords.");
        }
        const parseNumber = (str: string): number | null => {
            const num = parseFloat(str);
            return isNaN(num) ? null : num;
        };
        const fx = parseNumber(tokens[3]);
        const fy = parseNumber(tokens[4]);
        const fz = parseNumber(tokens[5]);
        if (fx === null || fy === null || fz === null) {
            return Result.err("Invalid start coordinates. Expected numbers for x, y, and z.");
        }
        const tx = parseNumber(tokens[7]);
        const ty = parseNumber(tokens[8]);
        const tz = parseNumber(tokens[9]);
        if (tx === null || ty === null || tz === null) {
            return Result.err("Invalid end coordinates. Expected numbers for x, y, and z.");
        }
        return Result.ok({ from: new XYZ(fx, fy, fz), to: new XYZ(tx, ty, tz) });
    }

    /**
     * @param dsl The DSL command string.
     * @returns A Result containing the parsed polygon points, or an error message.
     */
    private parsePolygonCommand(dsl: string): Result<{ points: XYZ[] }> {
        const tokens = dsl.split(/\s+/);
        if (tokens.length < 12) {
            return Result.err(
                "Invalid DSL format for POLYGON. Expected format: CREATE POLYGON POINTS x y z [x y z ...]. At least three points are required.",
            );
        }

        if (
            tokens[0].toUpperCase() !== "CREATE" ||
            tokens[1].toUpperCase() !== "POLYGON" ||
            tokens[2].toUpperCase() !== "POINTS"
        ) {
            return Result.err("Invalid DSL POLYGON command structure. Please check the keywords.");
        }

        const coordinateTokens = tokens.slice(3);
        if (coordinateTokens.length % 3 !== 0) {
            return Result.err(
                "Invalid DSL format for POLYGON. Coordinates must be in groups of three: x y z.",
            );
        }

        const numPoints = coordinateTokens.length / 3;
        if (numPoints < 3) {
            return Result.err("A polygon must have at least three points.");
        }

        const parseNumber = (str: string): number | null => {
            const num = parseFloat(str);
            return isNaN(num) ? null : num;
        };

        const points: XYZ[] = [];
        for (let i = 0; i < coordinateTokens.length; i += 3) {
            const x = parseNumber(coordinateTokens[i]);
            const y = parseNumber(coordinateTokens[i + 1]);
            const z = parseNumber(coordinateTokens[i + 2]);
            if (x === null || y === null || z === null) {
                return Result.err("Invalid polygon point coordinates. Expected numbers for x, y, and z.");
            }
            points.push(new XYZ(x, y, z));
        }
        return Result.ok({ points });
    }

    /**
     * @param dsl The DSL command string.
     * @returns A Result containing the parsed rectangle parameters, or an error message.
     */
    private parseRectangleCommand(dsl: string): Result<{ origin: XYZ; dx: number; dy: number }> {
        const tokens = dsl.split(/\s+/);
        if (tokens.length !== 9) {
            return Result.err(
                "Invalid DSL format for RECTANGLE. Expected format: CREATE RECTANGLE ORIGIN x y z SIZE dx dy",
            );
        }
        if (
            tokens[0].toUpperCase() !== "CREATE" ||
            tokens[1].toUpperCase() !== "RECTANGLE" ||
            tokens[2].toUpperCase() !== "ORIGIN" ||
            tokens[6].toUpperCase() !== "SIZE"
        ) {
            return Result.err("Invalid DSL RECTANGLE command structure. Please check the keywords.");
        }
        const parseNumber = (str: string): number | null => {
            const num = parseFloat(str);
            return isNaN(num) ? null : num;
        };
        const ox = parseNumber(tokens[3]);
        const oy = parseNumber(tokens[4]);
        const oz = parseNumber(tokens[5]);
        if (ox === null || oy === null || oz === null) {
            return Result.err("Invalid origin coordinates. Expected numbers for x, y, and z.");
        }
        const dx = parseNumber(tokens[7]);
        const dy = parseNumber(tokens[8]);
        if (dx === null || dy === null) {
            return Result.err("Invalid size parameters. Expected numbers for dx and dy.");
        }
        return Result.ok({ origin: new XYZ(ox, oy, oz), dx, dy });
    }

    /**
     * @param dsl The DSL command string.
     * @returns
     */
    private parseFolderCommand(dsl: string): Result<{ name: string }> {
        const tokens = dsl.split(/\s+/);
        let name: string;

        if (tokens.length === 2) {
            name = `Folder${this.folderCounter++}`;
        } else {
            if (tokens[2].toUpperCase() === "NAME") {
                if (tokens.length < 4) {
                    return Result.err("Folder name not specified after NAME keyword.");
                }
                name = tokens.slice(3).join(" ");
            } else {
                name = tokens.slice(2).join(" ");
            }
        }
        return Result.ok({ name });
    }

    private createDefaultPlane(origin: XYZ): Plane {
        return new Plane(origin, XYZ.unitZ, XYZ.unitX);
    }

    private resolveVariables(dsl: string): Result<string> {
        try {
            const resolvedDsl = dsl.replace(/\$([a-zA-Z][a-zA-Z0-9_]*)/g, (match, variableName) => {
                const storedCommand = this.variableCommands.get(variableName);
                if (!storedCommand) {
                    throw new Error(`Unknown variable: ${variableName}`);
                }
                return storedCommand;
            });
            return Result.ok(resolvedDsl);
        } catch (error) {
            return Result.err(`Error resolving variables: ${error}`);
        }
    }

    public clearVariables(): void {
        this.variableCommands.clear();
    }

    public getVariableCommand(name: string): string | undefined {
        return this.variableCommands.get(name);
    }
}
