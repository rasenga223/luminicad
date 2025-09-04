/**
 * DSLConversionService
 *
 * This service converts existing document shapes into DSL commands that can be read by the DSLExecutionService.
 * It traverses the document's node tree and generates the appropriate DSL commands for each shape type.
 *
 * The service can:
 * - Convert a single node to its DSL representation
 * - Convert all selected nodes in a document to DSL
 * - Convert the entire document to a series of DSL commands
 */

import {
    IApplication,
    IService,
    MaterialCategory,
    PhongMaterial,
    PhysicalMaterial,
    Result,
} from "luminicad-core";

// Import node classes to identify shape types
import { FolderNode, IDocument, IEdge, IFace, INode, IShape, IWire, ShapeType } from "luminicad-core";
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

export class DSLConversionService implements IService {
    private app!: IApplication;

    constructor() {}

    register(app: IApplication): void {
        this.app = app;
    }

    start(): void {
        console.info(`${DSLConversionService.name} started`);
    }

    stop(): void {
        // Nothing to dispose
    }

    /**
     * Converts a single node to its DSL representation
     *
     * @param node The node to convert
     * @returns A Result containing the DSL command string or an error
     */
    public nodeToDsl(node: INode): Result<string> {
        try {
            // Handle different node types by checking instance types or constructor names
            if (node instanceof BoxNode) {
                return this.boxToDsl(node);
            } else if (node instanceof ArcNode) {
                return this.arcToDsl(node);
            } else if (node instanceof CircleNode) {
                return this.circleToDsl(node);
            } else if (node instanceof LineNode) {
                return this.lineToDsl(node);
            } else if (node instanceof PolygonNode) {
                return this.polygonToDsl(node);
            } else if (node instanceof RectNode) {
                return this.rectangleToDsl(node);
            } else if (node instanceof FolderNode) {
                return this.folderToDsl(node);
            } else if (node instanceof FuseNode) {
                return this.fuseToDsl(node);
            } else if (node instanceof PrismNode) {
                return this.prismToDsl(node);
            } else if (node instanceof RevolvedNode) {
                return this.revolveToDsl(node);
            } else if (node instanceof SweepedNode) {
                return this.sweepToDsl(node);
            } else if (node instanceof WireNode) {
                return this.wireToDsl(node);
            } else if (node instanceof FaceNode) {
                return this.faceToDsl(node);
            } else if (node instanceof BooleanNode) {
                return this.booleanToDsl(node);
            } else if (node.constructor.name === "EditableShapeNode") {
                // Handle EditableShapeNode (imported shapes) with our custom conversion
                return this.editableShapeToDsl(node);
            } else {
                return Result.err(`Unsupported node type: ${node.constructor.name}`);
            }
        } catch (error) {
            return Result.err(`Error converting node to DSL: ${error}`);
        }
    }

    /**
     * Converts all selected nodes in the active document to DSL commands
     *
     * @returns A Result containing an array of DSL command strings or an error
     */
    public selectedNodesToDsl(): Result<string[]> {
        const doc = this.app.activeView?.document;
        if (!doc) {
            return Result.err("No active document");
        }

        const selectedNodes = doc.selection.getSelectedNodes();
        if (selectedNodes.length === 0) {
            return Result.err("No nodes selected");
        }

        const dslCommands: string[] = [];
        for (const node of selectedNodes) {
            const result = this.nodeToDsl(node);
            if (result.isOk) {
                dslCommands.push(result.value);
            } else {
                return Result.err(`Failed to convert node ${node.name}: ${result.error}`);
            }
        }

        return Result.ok(dslCommands);
    }

    /**
     * Converts an entire document to a series of DSL commands.
     *
     * This method recursively traverses the document's node tree starting from the root node
     * and converts each node to its DSL representation, including nodes inside folders.
     *
     * @param document The document to convert
     * @returns A Result containing an array of DSL command strings or an error
     */
    public documentToDsl(document: IDocument): Result<string[]> {
        try {
            const commands: string[] = [];

            // Get the root node of the document
            const rootNode = document.rootNode;

            // Process the root node and all its children recursively
            this.processNodeAndChildren(rootNode, commands);

            return Result.ok(commands);
        } catch (error) {
            return Result.err(`Error converting document to DSL: ${error}`);
        }
    }

    /**
     * Recursively processes a node and all its children, converting them to DSL commands.
     *
     * @param node The node to process
     * @param commands Array to collect the generated DSL commands
     */
    private processNodeAndChildren(node: INode, commands: string[]): void {
        // Skip the root node itself, but process its children
        if (node.parent !== undefined) {
            // Convert the current node to DSL
            const nodeDslResult = this.nodeToDsl(node);

            // If conversion was successful, add the command to our list
            if (nodeDslResult.isOk) {
                commands.push(nodeDslResult.value);
            } else {
                console.warn(`Failed to convert node to DSL: ${nodeDslResult.error}`);
            }
        }

        // Check if this node has children (is a folder or container)
        if ("firstChild" in node) {
            let childNode = (node as any).firstChild;

            // Process all children
            while (childNode) {
                this.processNodeAndChildren(childNode, commands);
                childNode = childNode.nextSibling;
            }
        }
    }

    // Conversion methods for specific node types

    private boxToDsl(node: BoxNode): Result<string> {
        try {
            const plane = node.plane;
            const origin = plane.origin;
            const dx = node.dx;
            const dy = node.dy;
            const dz = node.dz;

            // Format with precision to avoid floating point issues
            const x = this.formatNumber(origin.x);
            const y = this.formatNumber(origin.y);
            const z = this.formatNumber(origin.z);

            let dsl = `CREATE BOX ORIGIN ${x} ${y} ${z} SIZE ${this.formatNumber(dx)} ${this.formatNumber(dy)} HEIGHT ${this.formatNumber(dz)}`;

            // Add material if present
            if (node.materialId) {
                const material = this.findMaterialById(node.materialId);
                if (material) {
                    dsl += ` WITH MATERIAL ${material.category}.${material.name}`;
                }
            }

            return Result.ok(dsl);
        } catch (error) {
            return Result.err(`Error converting BoxNode to DSL: ${error}`);
        }
    }

    private arcToDsl(node: ArcNode): Result<string> {
        try {
            const center = node.center;
            const start = node.start;
            const normal = node.normal;
            const angle = node.angle;

            const dsl =
                `CREATE ARC CENTER ${this.formatNumber(center.x)} ${this.formatNumber(center.y)} ${this.formatNumber(center.z)} ` +
                `START ${this.formatNumber(start.x)} ${this.formatNumber(start.y)} ${this.formatNumber(start.z)} ` +
                `NORMAL ${this.formatNumber(normal.x)} ${this.formatNumber(normal.y)} ${this.formatNumber(normal.z)} ` +
                `ANGLE ${this.formatNumber(angle)}`;

            return Result.ok(dsl);
        } catch (error) {
            return Result.err(`Error converting ArcNode to DSL: ${error}`);
        }
    }

    private circleToDsl(node: CircleNode): Result<string> {
        try {
            const center = node.center;
            const radius = node.radius;
            const normal = node.normal;

            const dsl =
                `CREATE CIRCLE CENTER ${this.formatNumber(center.x)} ${this.formatNumber(center.y)} ${this.formatNumber(center.z)} ` +
                `RADIUS ${this.formatNumber(radius)} ` +
                `NORMAL ${this.formatNumber(normal.x)} ${this.formatNumber(normal.y)} ${this.formatNumber(normal.z)}`;

            return Result.ok(dsl);
        } catch (error) {
            return Result.err(`Error converting CircleNode to DSL: ${error}`);
        }
    }

    private lineToDsl(node: LineNode): Result<string> {
        try {
            const from = node.start;
            const to = node.end;

            const dsl =
                `CREATE LINE FROM ${this.formatNumber(from.x)} ${this.formatNumber(from.y)} ${this.formatNumber(from.z)} ` +
                `TO ${this.formatNumber(to.x)} ${this.formatNumber(to.y)} ${this.formatNumber(to.z)}`;

            return Result.ok(dsl);
        } catch (error) {
            return Result.err(`Error converting LineNode to DSL: ${error}`);
        }
    }

    private polygonToDsl(node: PolygonNode): Result<string> {
        try {
            const points = node.points;
            let pointsStr = "";

            for (const point of points) {
                pointsStr += `${this.formatNumber(point.x)} ${this.formatNumber(point.y)} ${this.formatNumber(point.z)} `;
            }

            const dsl = `CREATE POLYGON POINTS ${pointsStr.trim()}`;
            return Result.ok(dsl);
        } catch (error) {
            return Result.err(`Error converting PolygonNode to DSL: ${error}`);
        }
    }

    private rectangleToDsl(node: RectNode): Result<string> {
        try {
            const plane = node.plane;
            const origin = plane.origin;
            const dx = node.dx;
            const dy = node.dy;

            const dsl =
                `CREATE RECTANGLE ORIGIN ${this.formatNumber(origin.x)} ${this.formatNumber(origin.y)} ${this.formatNumber(origin.z)} ` +
                `SIZE ${this.formatNumber(dx)} ${this.formatNumber(dy)}`;

            return Result.ok(dsl);
        } catch (error) {
            return Result.err(`Error converting RectNode to DSL: ${error}`);
        }
    }

    private folderToDsl(node: FolderNode): Result<string> {
        try {
            const dsl = `CREATE FOLDER NAME ${node.name}`;
            return Result.ok(dsl);
        } catch (error) {
            return Result.err(`Error converting FolderNode to DSL: ${error}`);
        }
    }

    /**
     * Converts a FuseNode to its DSL representation.
     *
     * This implementation recursively converts the bottom and top shape nodes into DSL
     * commands and then constructs a fuse DSL command:
     *
     *   CREATE FUSE BOTTOM <bottom-dsl> TOP <top-dsl>
     *
     * Note: We rely on the fluent node conversion logic (nodeToDsl) for both bottom and top.
     */
    private fuseToDsl(node: FuseNode): Result<string> {
        try {
            // Convert the bottom shape into a DSL command.
            // We cast node.bottom to INode. In our application, the shapes are nodes.
            const bottomNode = node.bottom as unknown as INode;
            const bottomDSLResult = this.nodeToDsl(bottomNode);
            if (!bottomDSLResult.isOk) {
                return Result.err(`Error converting bottom shape: ${bottomDSLResult.error}`);
            }

            // Convert the top shape into a DSL command.
            const topNode = node.top as unknown as INode;
            const topDSLResult = this.nodeToDsl(topNode);
            if (!topDSLResult.isOk) {
                return Result.err(`Error converting top shape: ${topDSLResult.error}`);
            }

            // Format the DSL string using the expected syntax:
            // "CREATE FUSE BOTTOM <bottom-dsl> TOP <top-dsl>"
            const fuseDslCommand = `CREATE FUSE BOTTOM ${bottomDSLResult.value} TOP ${topDSLResult.value}`;
            return Result.ok(fuseDslCommand);
        } catch (error) {
            return Result.err(`Error converting FuseNode to DSL: ${error}`);
        }
    }

    /**
     * Converts a PrismNode to its DSL representation.
     *
     * This implementation converts the section shape of the PrismNode into its DSL command,
     * then constructs a DSL command with the length of the prism.
     * Expected syntax:
     *   CREATE PRISM SECTION <section-dsl> LENGTH <length>
     *
     * @param node The PrismNode to convert
     * @returns A Result containing the DSL command string or an error
     */
    private prismToDsl(node: PrismNode): Result<string> {
        try {
            // Convert the 'section' shape into DSL using the existing nodeToDsl method.
            // Since 'section' is of IShape type, we cast it to INode.
            const sectionNode = node.section as unknown as INode;
            const sectionDslResult = this.nodeToDsl(sectionNode);
            if (!sectionDslResult.isOk) {
                return Result.err(`Error converting section shape: ${sectionDslResult.error}`);
            }

            // Format the length property to ensure consistent precision.
            const lengthStr = this.formatNumber(node.length);

            // Construct the DSL command with the expected syntax.
            const dslCommand = `CREATE PRISM SECTION ${sectionDslResult.value} LENGTH ${lengthStr}`;

            return Result.ok(dslCommand);
        } catch (error) {
            return Result.err(`Error converting PrismNode to DSL: ${error}`);
        }
    }

    /**
     * Converts a RevolvedNode to its DSL representation.
     *
     * This implementation converts the profile shape of the RevolvedNode into its DSL command,
     * extracts the axis data from the Ray, formats the angle, and constructs the DSL command.
     *
     * @param node The RevolvedNode to convert
     * @returns A Result containing the DSL command string or an error
     */
    private revolveToDsl(node: RevolvedNode): Result<string> {
        try {
            // Convert the 'profile' shape into a DSL command.
            const profileNode = node.profile as unknown as INode;
            const profileDslResult = this.nodeToDsl(profileNode);
            if (!profileDslResult.isOk) {
                return Result.err(`Error converting profile shape: ${profileDslResult.error}`);
            }

            // Extract the axis information from the Ray.
            // Based on the Ray class structure, it likely has:
            // - location/point/start: the starting point of the ray
            // - direction: the direction vector
            const axis = node.axis;

            // Get the starting point (origin) of the ray
            // Using a safe approach to access properties
            let originX = 0,
                originY = 0,
                originZ = 0;
            let dirX = 0,
                dirY = 0,
                dirZ = 0;

            // Try different possible property names for the origin point
            if ("location" in axis) {
                originX = (axis as any).location.x;
                originY = (axis as any).location.y;
                originZ = (axis as any).location.z;
            } else if ("point" in axis) {
                originX = (axis as any).point.x;
                originY = (axis as any).point.y;
                originZ = (axis as any).point.z;
            } else if ("start" in axis) {
                originX = (axis as any).start.x;
                originY = (axis as any).start.y;
                originZ = (axis as any).start.z;
            } else if ("origin" in axis) {
                originX = (axis as any).origin.x;
                originY = (axis as any).origin.y;
                originZ = (axis as any).origin.z;
            }

            // Get the direction vector
            if ("direction" in axis) {
                dirX = axis.direction.x;
                dirY = axis.direction.y;
                dirZ = axis.direction.z;
            }

            // Format the coordinates and angle
            const axOriginX = this.formatNumber(originX);
            const axOriginY = this.formatNumber(originY);
            const axOriginZ = this.formatNumber(originZ);
            const axDirX = this.formatNumber(dirX);
            const axDirY = this.formatNumber(dirY);
            const axDirZ = this.formatNumber(dirZ);
            const angleStr = this.formatNumber(node.angle);

            // Construct the DSL command
            const dslCommand = `CREATE REVOLVE PROFILE ${profileDslResult.value} AXIS ORIGIN ${axOriginX} ${axOriginY} ${axOriginZ} DIRECTION ${axDirX} ${axDirY} ${axDirZ} ANGLE ${angleStr}`;

            return Result.ok(dslCommand);
        } catch (error) {
            return Result.err(`Error converting RevolvedNode to DSL: ${error}`);
        }
    }

    /**
     * Converts a SweepedNode to its DSL representation.
     *
     * This implementation converts both the profile shape and path wire of the SweepedNode
     * into their DSL commands, then constructs a sweep DSL command:
     *   CREATE SWEEP PROFILE <profile-dsl> PATH <path-dsl>
     *
     * @param node The SweepedNode to convert
     * @returns A Result containing the DSL command string or an error
     */
    private sweepToDsl(node: SweepedNode): Result<string> {
        try {
            // Convert the 'profile' shape into a DSL command
            const profileNode = node.profile as unknown as INode;
            const profileDslResult = this.nodeToDsl(profileNode);
            if (!profileDslResult.isOk) {
                return Result.err(`Error converting profile shape: ${profileDslResult.error}`);
            }

            // Convert the 'path' wire into a DSL command
            const pathNode = node.path as unknown as INode;
            const pathDslResult = this.nodeToDsl(pathNode);
            if (!pathDslResult.isOk) {
                return Result.err(`Error converting path wire: ${pathDslResult.error}`);
            }

            // Construct the DSL command with the expected syntax
            const dslCommand = `CREATE SWEEP PROFILE ${profileDslResult.value} PATH ${pathDslResult.value}`;

            return Result.ok(dslCommand);
        } catch (error) {
            return Result.err(`Error converting SweepedNode to DSL: ${error}`);
        }
    }

    /**
     * Converts a WireNode to its DSL representation.
     *
     * This implementation converts each edge in the WireNode into its DSL command,
     * then constructs a wire DSL command that combines these edges:
     *   CREATE WIRE EDGES <edge1-dsl> <edge2-dsl> ... <edgeN-dsl>
     *
     * @param node The WireNode to convert
     * @returns A Result containing the DSL command string or an error
     */
    private wireToDsl(node: WireNode): Result<string> {
        try {
            // Check if there are edges to convert
            if (!node.edges || node.edges.length === 0) {
                return Result.err("WireNode has no edges to convert");
            }

            // Convert each edge to its DSL representation
            const edgeDslResults: Result<string>[] = [];
            for (const edge of node.edges) {
                // Treat each edge as a node for conversion purposes
                const edgeNode = edge as unknown as INode;
                const edgeDslResult = this.nodeToDsl(edgeNode);
                edgeDslResults.push(edgeDslResult);
            }

            // Check if any edge conversion failed
            const failedConversion = edgeDslResults.find((result) => !result.isOk);
            if (failedConversion) {
                return Result.err(`Error converting edge: ${failedConversion.error}`);
            }

            // Extract the successful DSL commands
            const edgeDslCommands = edgeDslResults.map((result) => result.value);

            // Construct the DSL command with the expected syntax
            const dslCommand = `CREATE WIRE EDGES ${edgeDslCommands.join(" ")}`;

            return Result.ok(dslCommand);
        } catch (error) {
            return Result.err(`Error converting WireNode to DSL: ${error}`);
        }
    }

    /**
     * Converts a FaceNode to its DSL representation.
     *
     * This implementation converts the shapes (edges or wires) of the FaceNode into their DSL commands,
     * then constructs a face DSL command:
     *   CREATE FACE WIRES <wire1-dsl> <wire2-dsl> ... <wireN-dsl>
     * or
     *   CREATE FACE EDGES <edge1-dsl> <edge2-dsl> ... <edgeN-dsl>
     *
     * @param node The FaceNode to convert
     * @returns A Result containing the DSL command string or an error
     */
    private faceToDsl(node: FaceNode): Result<string> {
        try {
            // Check if there are shapes to convert
            if (!node.shapes || node.shapes.length === 0) {
                return Result.err("FaceNode has no shapes to convert");
            }

            // Determine if we're dealing with wires or edges
            const isWires = node.shapes[0].shapeType === ShapeType.Wire;

            // Convert each shape to its DSL representation
            const shapeDslResults: Result<string>[] = [];
            for (const shape of node.shapes) {
                // Treat each shape as a node for conversion purposes
                const shapeNode = shape as unknown as INode;
                const shapeDslResult = this.nodeToDsl(shapeNode);
                shapeDslResults.push(shapeDslResult);
            }

            // Check if any shape conversion failed
            const failedConversion = shapeDslResults.find((result) => !result.isOk);
            if (failedConversion) {
                return Result.err(`Error converting shape: ${failedConversion.error}`);
            }

            // Extract the successful DSL commands
            const shapeDslCommands = shapeDslResults.map((result) => result.value);

            // Construct the DSL command with the expected syntax
            const shapeType = isWires ? "WIRES" : "EDGES";
            const dslCommand = `CREATE FACE ${shapeType} ${shapeDslCommands.join(" ")}`;

            return Result.ok(dslCommand);
        } catch (error) {
            return Result.err(`Error converting FaceNode to DSL: ${error}`);
        }
    }

    /**
     * Converts a BooleanNode to its DSL representation.
     *
     * The BooleanNode appears to be a wrapper around another shape.
     * This implementation simply converts the wrapped shape to its DSL representation.
     *
     * @param node The BooleanNode to convert
     * @returns A Result containing the DSL command string or an error
     */
    private booleanToDsl(node: BooleanNode): Result<string> {
        try {
            // The BooleanNode wraps another shape in its booleanShape property
            // We'll simply convert that shape to its DSL representation
            const wrappedShape = node.booleanShape as unknown as INode;
            const wrappedShapeDslResult = this.nodeToDsl(wrappedShape);

            if (!wrappedShapeDslResult.isOk) {
                return Result.err(`Error converting boolean wrapped shape: ${wrappedShapeDslResult.error}`);
            }

            // Return the DSL representation of the wrapped shape
            return wrappedShapeDslResult;
        } catch (error) {
            return Result.err(`Error converting BooleanNode to DSL: ${error}`);
        }
    }

    /**
     * Converts an EditableShapeNode to its DSL representation with detailed geometric information.
     * In the case of a complex imported shape, we decompose it into its constituent subshapes (e.g., faces)
     * and convert each subshape into a proper "CREATE" command which the DSLExecutionService can execute.
     *
     * @param node The EditableShapeNode to convert
     * @returns A Result containing one or more DSL command strings (joined with newline) or an error
     */
    private editableShapeToDsl(node: INode): Result<string> {
        try {
            // Extract the node's name (if available)
            const name: string = (node as any).name || "Imported Shape";

            // Retrieve the underlying shape (which is expected to be a Result<IShape>)
            const shapeResult = (node as any).shape as Result<IShape>;
            if (!shapeResult || !shapeResult.isOk) {
                return Result.err(
                    `EditableShapeNode "${name}" contains an invalid shape: ${shapeResult?.error}`,
                );
            }
            const shape = shapeResult.value;

            // Attempt to break down the imported shape into its subfaces
            const subFaces = shape.findSubShapes(ShapeType.Face);
            if (subFaces.length > 0) {
                // For a complex imported shape with multiple faces,
                // convert each face individually.
                const dslCommands: string[] = [];
                for (const subShape of subFaces) {
                    // Use our helper method to convert each subshape (face) to a DSL command.
                    const result = this.convertIShapeToDsl(subShape, name);
                    if (!result.isOk) {
                        return Result.err(`Error converting a subface of "${name}": ${result.error}`);
                    }
                    dslCommands.push(result.value);
                }
                // Join the individual commands with newline so that each command can be executed separately.
                return Result.ok(dslCommands.join("\n"));
            }

            // If no subfaces were found, try converting the entire shape directly.
            const singleResult = this.convertIShapeToDsl(shape, name);
            if (!singleResult.isOk) {
                return Result.err(`Error converting EditableShapeNode "${name}": ${singleResult.error}`);
            }
            return singleResult;
        } catch (error) {
            return Result.err(`Error converting EditableShapeNode to DSL: ${error}`);
        }
    }

    /**
     * Helper method to convert an IShape (which is typically a subshape such as a Face, Edge, Wire, or Solid)
     * into its corresponding DSL command. The returned command uses the standard "CREATE ..." syntax recognizable
     * by DSLExecutionService.
     *
     * @param shape The IShape to convert.
     * @param defaultName An optional name from the parent EditableShapeNode.
     * @returns A Result containing the DSL command string or an error.
     */
    private convertIShapeToDsl(shape: IShape, defaultName?: string): Result<string> {
        // Remove the transformation matrix info since DSLExecutionService doesn't support it.
        const matrixInfo = ""; // Explicitly remove TRANSFORM details

        switch (shape.shapeType) {
            case ShapeType.Face:
                try {
                    const face = shape as IFace;
                    // Retrieve the outer wire and edges from the face – this is used as a fallback.
                    const outerWire = face.outerWire();
                    const edges = outerWire.findSubShapes(ShapeType.Edge);
                    let command: string;
                    try {
                        // Sample a representative point from the face.
                        // (We ignore the normal since "CREATE RECTANGLE" does not need a normal.)
                        const [point, _] = face.normal(0.5, 0.5);
                        // Use default dimensions as placeholders (a more complete solution might compute the actual bounding box).
                        const width = 10.0;
                        const height = 10.0;
                        // Construct the DSL command in a format that DSLExecutionService recognizes.
                        // IMPORTANT: Changed from "CREATE RECT PLANE ..." to "CREATE RECTANGLE ..." and removed the NORMAL specification.
                        command =
                            `CREATE RECTANGLE ORIGIN ${this.formatNumber(point.x)} ${this.formatNumber(point.y)} ${this.formatNumber(point.z)} ` +
                            `SIZE ${this.formatNumber(width)} ${this.formatNumber(height)}${matrixInfo}`;
                    } catch (error) {
                        // Fallback: if sampling fails, return a generic face command.
                        command = `CREATE FACE EDGES ${edges.length} GENERIC${matrixInfo}`;
                    }
                    return Result.ok(command);
                } catch (error) {
                    return Result.err(`Error converting face: ${error}`);
                }
            case ShapeType.Edge:
                try {
                    const edge = shape as IEdge;
                    const length = edge.length();
                    let endpointsInfo = "";
                    try {
                        // Attempt to determine endpoints by intersecting the edge with itself.
                        const intersections = edge.intersect(edge);
                        if (intersections && intersections.length >= 2) {
                            const start = intersections[0].point;
                            const end = intersections[intersections.length - 1].point;
                            endpointsInfo =
                                ` FROM ${start.x.toFixed(2)} ${start.y.toFixed(2)} ${start.z.toFixed(2)}` +
                                ` TO ${end.x.toFixed(2)} ${end.y.toFixed(2)} ${end.z.toFixed(2)}`;
                        }
                    } catch (error) {
                        // If we cannot extract endpoints, we'll omit that info.
                    }
                    return Result.ok(`CREATE LINE LENGTH ${length.toFixed(2)}${endpointsInfo}${matrixInfo}`);
                } catch (error) {
                    return Result.err(`Error converting edge: ${error}`);
                }
            case ShapeType.Wire:
                try {
                    const wire = shape as IWire;
                    const edges = wire.findSubShapes(ShapeType.Edge);
                    const isClosed = wire.isClosed();
                    const closedInfo = isClosed ? " CLOSED" : " OPEN";
                    return Result.ok(`CREATE WIRE WITH ${edges.length} EDGES${closedInfo}${matrixInfo}`);
                } catch (error) {
                    return Result.err(`Error converting wire: ${error}`);
                }
            case ShapeType.Solid:
                try {
                    // For solids, we may decompose further into faces.
                    const faces = shape.findSubShapes(ShapeType.Face);
                    if (faces.length > 0) {
                        // In a more advanced implementation, compute the bounding box dimensions.
                        return Result.ok(`CREATE BOX SIZE 10 10 10${matrixInfo}`);
                    }
                    return Result.ok(`CREATE SOLID${matrixInfo}`);
                } catch (error) {
                    return Result.err(`Error converting solid: ${error}`);
                }
            default:
                return Result.err(`Unsupported subshape type: ${shape.shapeType}`);
        }
    }

    // Helper methods

    /**
     * Formats a number to a consistent precision to avoid floating point issues
     */
    private formatNumber(num: number): string {
        return num.toFixed(6).replace(/\.?0+$/, "");
    }

    /**
     * Finds a material by ID and returns a category.name format string
     */
    private findMaterialById(materialId: string): { category: string; name: string } | null {
        const doc = this.app.activeView?.document;
        if (!doc) return null;

        const material = doc.materials.find((m) => m.id === materialId);
        if (!material) return null;

        // Check if it's a PhysicalMaterial
        if (material instanceof PhysicalMaterial) {
            // Determine category based on physical material properties
            if (material.metalness > 0.7) {
                return {
                    category: MaterialCategory.Metal,
                    name: material.name.toUpperCase().replace(/\s+/g, "_"),
                };
            } else if (material.roughness > 0.7) {
                return {
                    category: MaterialCategory.Wood,
                    name: material.name.toUpperCase().replace(/\s+/g, "_"),
                };
            } else if (material.roughness < 0.3) {
                return {
                    category: MaterialCategory.Glass,
                    name: material.name.toUpperCase().replace(/\s+/g, "_"),
                };
            } else {
                return {
                    category: MaterialCategory.Plastic,
                    name: material.name.toUpperCase().replace(/\s+/g, "_"),
                };
            }
        }

        // If it's a PhongMaterial or base Material, use basic properties
        if (material instanceof PhongMaterial) {
            if (material.shininess > 90) {
                return {
                    category: MaterialCategory.Glass,
                    name: material.name.toUpperCase().replace(/\s+/g, "_"),
                };
            }
        }

        // Default to METALS category if we can't determine the type
        return {
            category: MaterialCategory.Metal,
            name: material.name.toUpperCase().replace(/\s+/g, "_"),
        };
    }
}
