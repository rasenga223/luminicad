import {
    FolderNode,
    IApplication,
    IService,
    Logger,
    MaterialLibrary,
    MultiShapeNode,
    Plane,
    PubSub,
    Ray,
    Result,
    Transaction,
    XYZ,
} from "luminicad-core";
import { MainModule, ShapeResult } from "luminicad-wasm/lib/luminicad-wasm";
import { OcctHelper } from "luminicad-wasm/src/helper";

/**
 * CodeExecutionService
 *
 * This service provides a JavaScript/TypeScript execution environment for CAD operations.
 * It exposes the full OpenCascade API and additional helper functions to create and
 * manipulate geometry programmatically.
 */
export class CodeExecutionService implements IService {
    private app!: IApplication;
    private storedVariables: Map<string, any> = new Map();
    private lastCreatedNode: any = null;

    constructor() {}

    register(app: IApplication): void {
        this.app = app;
    }

    start(): void {
        Logger.info(`${CodeExecutionService.name} started`);
    }

    stop(): void {}

    /**
     *
     * @param code JavaScript/TypeScript code or an array of code blocks that uses OpenCascade operations.
     * @param options .
     */
    async executeCode(
        code: string | string[],
        options: {
            appendToDocument?: boolean;
            preserveExisting?: boolean;
            maintainVariables?: boolean;
        } = {},
    ): Promise<Result<any>> {
        try {
            // Verify that the OpenCascade WASM module is initialized.
            if (!global.wasm) {
                return Result.err("OpenCascade WASM module is not initialized");
            }

            const wasm = global.wasm as MainModule;
            const doc = this.app.activeView?.document;

            if (!doc) {
                return Result.err("No active document");
            }

            // Clear stored variables if not maintaining state
            if (!options.maintainVariables) {
                this.storedVariables.clear();
            }

            // Create the complete execution context with all available operations.
            // Each property is exposed for use in AI-generated scripts.
            const context = {
                // Document access for the CAD model.
                document: doc,

                // Core OpenCascade geometric classes (constructors).
                gp_Pnt: wasm.gp_Pnt,
                gp_Dir: wasm.gp_Dir,
                gp_Vec: wasm.gp_Vec,
                gp_Ax1: wasm.gp_Ax1,
                gp_Ax2: wasm.gp_Ax2,
                gp_Ax3: wasm.gp_Ax3,
                gp_Trsf: wasm.gp_Trsf,
                gp_Pln: wasm.gp_Pln,

                // Shape Factory Methods for creating primitive shapes and performing Boolean operations.
                ShapeFactory: {
                    face: wasm.ShapeFactory.face,
                    bezier: wasm.ShapeFactory.bezier,
                    point: wasm.ShapeFactory.point,
                    line: wasm.ShapeFactory.line,
                    arc: wasm.ShapeFactory.arc,
                    circle: wasm.ShapeFactory.circle,
                    rect: wasm.ShapeFactory.rect,
                    polygon: wasm.ShapeFactory.polygon,
                    box: wasm.ShapeFactory.box,
                    wire: wasm.ShapeFactory.wire,
                    prism: wasm.ShapeFactory.prism,
                    combine: wasm.ShapeFactory.combine,
                    makeThickSolid: wasm.ShapeFactory.makeThickSolidByJoin,
                    makeThickSolidSimple: wasm.ShapeFactory.makeThickSolidBySimple,
                    sweep: wasm.ShapeFactory.sweep,
                    revolve: wasm.ShapeFactory.revolve,

                    // Boolean operations provided by the ShapeFactory.
                    booleanCommon: wasm.ShapeFactory.booleanCommon,
                    booleanCut: wasm.ShapeFactory.booleanCut,
                    booleanFuse: wasm.ShapeFactory.booleanFuse,
                    // Added missing alias for fuse operation for convenience.
                    fuse: wasm.ShapeFactory.booleanFuse,
                },

                // Boolean Operations as a convenience grouping (mirrors ShapeFactory's Boolean ops).
                BooleanOps: {
                    common: wasm.ShapeFactory.booleanCommon,
                    cut: wasm.ShapeFactory.booleanCut,
                    fuse: wasm.ShapeFactory.booleanFuse,
                },

                // Curve Operations: methods to work with curves.
                CurveOps: {
                    length: wasm.Curve.curveLength,
                    trim: wasm.Curve.trim,
                    uniformAbscissa: wasm.Curve.uniformAbscissaWithCount,
                    uniformAbscissaByLength: wasm.Curve.uniformAbscissaWithLength,
                    nearestExtrema: wasm.Curve.nearestExtremaCC,
                    makeLine: wasm.Curve.makeLine,
                    project: wasm.Curve.projectOrNearest,
                    parameter: wasm.Curve.parameter,
                    projects: wasm.Curve.projects,
                    // Advanced curve operations to extract point derivatives.
                    d0: (curve: any, u: number) => curve.d0(u),
                    d1: (curve: any, u: number) => curve.d1(u),
                    d2: (curve: any, u: number) => curve.d2(u),
                    d3: (curve: any, u: number) => curve.d3(u),
                    dn: (curve: any, u: number, n: number) => curve.dn(u, n),
                },

                // Edge Operations: for extracting or modifying edges from curves.
                EdgeOps: {
                    fromCurve: wasm.Edge.fromCurve,
                    getCurve: wasm.Edge.curve,
                    length: wasm.Edge.curveLength,
                    trim: wasm.Edge.trim,
                    offset: wasm.Edge.offset,
                    intersect: wasm.Edge.intersect,
                },

                // Wire Operations: managing groups of connected edges.
                WireOps: {
                    offset: wasm.Wire.offset,
                    makeFace: wasm.Wire.makeFace,
                },

                // Face Operations: methods to work with surfaces of shapes.
                FaceOps: {
                    offset: wasm.Face.offset,
                    outerWire: wasm.Face.outerWire,
                    surface: wasm.Face.surface,
                    normal: wasm.Face.normal,
                    curveOnSurface: wasm.Face.curveOnSurface,
                },

                // Helper functions (such as wrapping shapes and adding them to the current document).
                addToDocument: (shape: any, name?: string) => {
                    const wrappedShape = OcctHelper.wrapShape(shape);
                    const node = new MultiShapeNode(doc, name || "AI Generated Shape", [wrappedShape]);
                    doc.addNode(node);
                    // Store the last created node
                    this.lastCreatedNode = node;
                    return node;
                },

                // Logging function used by AI scripts to log messages.
                log: (message: string) => Logger.info(`AI Script: ${message}`),

                // Additional OpenCascade types (exposing low-level shape constructs).
                TopoDS_Shape: wasm.TopoDS_Shape,
                TopoDS_Solid: wasm.TopoDS_Solid,
                TopoDS_Face: wasm.TopoDS_Face,
                TopoDS_Wire: wasm.TopoDS_Wire,
                TopoDS_Edge: wasm.TopoDS_Edge,
                TopoDS_Vertex: wasm.TopoDS_Vertex,

                // Enhanced Geometry Classes (basic constructors for curves and surfaces).
                Geometry: {
                    Curve: wasm.Geom_Curve,
                    Surface: wasm.Geom_Surface,
                    BezierCurve: wasm.Geom_BezierCurve,
                    BSplineCurve: wasm.Geom_BSplineCurve,
                    Circle: wasm.Geom_Circle,
                    Line: wasm.Geom_Line,
                    // Surface types.
                    Plane: wasm.Geom_Plane,
                    CylindricalSurface: wasm.Geom_CylindricalSurface,
                    ConicalSurface: wasm.Geom_ConicalSurface,
                    SphericalSurface: wasm.Geom_SphericalSurface,
                    ToroidalSurface: wasm.Geom_ToroidalSurface,
                },

                // Enhanced Surface Operations (for detailed analysis of a surface).
                SurfaceOps: {
                    isPlanar: wasm.Surface.isPlanar,
                    bounds: wasm.Surface.bounds,
                    projectCurve: wasm.Surface.projectCurve,
                    projectPoint: wasm.Surface.projectPoint,
                    parameters: wasm.Surface.parameters,
                    nearestPoint: wasm.Surface.nearestPoint,
                    // Surface analysis methods: checking closedness & periodicity.
                    isClosed: (surface: any) => ({
                        u: surface.isUClosed(),
                        v: surface.isVClosed(),
                    }),
                    isPeriodic: (surface: any) => ({
                        u: surface.isUPeriodic(),
                        v: surface.isVPeriodic(),
                    }),
                    period: (surface: any) => ({
                        u: surface.uPeriod(),
                        v: surface.vPeriod(),
                    }),
                },

                // Shape Analysis and Operations: higher-level operations on complete shapes.
                ShapeOps: {
                    sectionSS: wasm.Shape.sectionSS,
                    isClosed: wasm.Shape.isClosed,
                    findAncestor: wasm.Shape.findAncestor,
                    findSubShapes: wasm.Shape.findSubShapes,
                    splitByEdgeOrWires: wasm.Shape.splitByEdgeOrWires,
                    sectionSP: wasm.Shape.sectionSP,
                    // Edge operations within a shape.
                    edgeFromCurve: wasm.Edge.fromCurve,
                    edgeCurve: wasm.Edge.curve,
                    edgeLength: wasm.Edge.curveLength,
                    edgeTrim: wasm.Edge.trim,
                    edgeOffset: wasm.Edge.offset,
                    edgeIntersect: wasm.Edge.intersect,
                    // Wire operations within a shape.
                    wireOffset: wasm.Wire.offset,
                    wireMakeFace: wasm.Wire.makeFace,
                    // Face operations within a shape.
                    faceOffset: wasm.Face.offset,
                    faceOuterWire: wasm.Face.outerWire,
                    faceSurface: wasm.Face.surface,
                    faceNormal: wasm.Face.normal,
                    faceCurveOnSurface: wasm.Face.curveOnSurface,
                },

                // Type Checking methods for runtime validation of OpenCascade types.
                TypeCheck: {
                    isKind: wasm.Transient.isKind,
                    isInstance: wasm.Transient.isInstance,
                },

                // Shape Type Enums and Orientation/Join data for precise operations.
                ShapeType: wasm.TopAbs_ShapeEnum,

                // Orientation Types
                Orientation: wasm.TopAbs_Orientation,

                // Join Types for Operations
                JoinType: wasm.GeomAbs_JoinType,

                // Continuity Types
                Continuity: wasm.GeomAbs_Shape,

                // Converter methods to support import/export of common CAD formats (IGES, STEP, BREP).
                Converter: {
                    // Convert shapes to IGES format for interoperability
                    convertToIges: wasm.Converter.convertToIges,
                    // Convert IGES data back to shapes
                    convertFromIges: wasm.Converter.convertFromIges,
                    // Convert shapes to STEP format
                    convertToStep: wasm.Converter.convertToStep,
                    // Convert STEP data back to shapes
                    convertFromStep: wasm.Converter.convertFromStep,
                    // Convert shapes to BREP format
                    convertToBrep: wasm.Converter.convertToBrep,
                    // Convert BREP data back to a shape
                    convertFromBrep: wasm.Converter.convertFromBrep,
                },

                // Advanced Geometry Exposure for ALL available operations via GeometryEx.
                GeometryEx: {
                    // Advanced curve types beyond the basic ones:
                    Conic: wasm.Geom_Conic, // Generic conic curves from which circles, ellipses, etc. derive
                    Ellipse: wasm.Geom_Ellipse, // Elliptical curves with methods for major/minor radii and foci
                    Hyperbola: wasm.Geom_Hyperbola, // Hyperbolic curves including methods for focal distance
                    Parabola: wasm.Geom_Parabola, // Parabolic curves with methods for focal parameter

                    // Operations on curves with defined boundaries:
                    BoundedCurve: wasm.Geom_BoundedCurve, // Curves that have distinct start and end points
                    TrimmedCurve: wasm.Geom_TrimmedCurve, // Curves trimmed to specific parameter ranges
                    OffsetCurve: wasm.Geom_OffsetCurve, // Curves with an offset applied

                    // Advanced surface types to support a wide variety of models:
                    ElementarySurface: wasm.Geom_ElementarySurface, // Surfaces defined by elementary parameters like position and axis
                    OffsetSurface: wasm.Geom_OffsetSurface, // Surfaces that are generated based on an offset from a base surface
                    SweptSurface: wasm.Geom_SweptSurface, // Surfaces created by sweeping a curve along a specified direction
                    BSplineSurface: wasm.Geom_BSplineSurface, // Complex surfaces generated via B-Spline methods
                    BezierSurface: wasm.Geom_BezierSurface, // Surfaces defined using Bezier patches for smooth curves
                    BoundedSurface: wasm.Geom_BoundedSurface, // Surfaces with defined boundaries
                    RectangularTrimmedSurface: wasm.Geom_RectangularTrimmedSurface, // Surfaces trimmed within a rectangular domain
                    SurfaceOfLinearExtrusion: wasm.Geom_SurfaceOfLinearExtrusion, // Surfaces created by extruding a profile linearly
                    SurfaceOfRevolution: wasm.Geom_SurfaceOfRevolution, // Surfaces generated by revolving a curve about an axis
                },

                // NEW: Material support - expose material library and helper functions
                Materials: {
                    // Material categories
                    METALS: MaterialLibrary.METALS,
                    PLASTICS: MaterialLibrary.PLASTICS,
                    WOOD: MaterialLibrary.WOOD,
                    GLASS: MaterialLibrary.GLASS,

                    // Helper to create and apply a material to a node
                    applyMaterial: (node: any, category: string, materialName: string) => {
                        // Get material preset based on category
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
                                throw new Error(
                                    `Unknown material category: ${category}. Available categories: METALS, PLASTICS, WOOD, GLASS`,
                                );
                        }

                        // Find the material preset (case-insensitive)
                        const materialKey = Object.keys(materialPresets).find(
                            (key) => key.toUpperCase() === materialName.toUpperCase(),
                        );

                        if (!materialKey) {
                            const availableMaterials = Object.keys(materialPresets).join(", ");
                            throw new Error(
                                `Unknown material: ${materialName} in category ${category}. Available materials: ${availableMaterials}`,
                            );
                        }

                        const materialPreset = materialPresets[materialKey as keyof typeof materialPresets];

                        // Create and add the material to the document
                        const material = MaterialLibrary.createMaterial(doc, materialPreset);
                        doc.materials.push(material);

                        // Set the material ID on the node
                        node.materialId = material.id;

                        // Force a visual update
                        doc.visual.update();

                        return node;
                    },

                    // List all available materials in a category
                    listMaterials: (category: string) => {
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
                                throw new Error(
                                    `Unknown material category: ${category}. Available categories: METALS, PLASTICS, WOOD, GLASS`,
                                );
                        }
                        return Object.keys(materialPresets);
                    },
                },

                // NEW: Variable storage and retrieval functions
                Variables: {
                    // Store a variable for later use
                    store: (name: string, value: any) => {
                        this.storedVariables.set(name, value);
                        return value;
                    },
                    // Retrieve a stored variable
                    get: (name: string) => {
                        if (!this.storedVariables.has(name)) {
                            throw new Error(`Variable '${name}' not found`);
                        }
                        return this.storedVariables.get(name);
                    },
                    // Check if a variable exists
                    exists: (name: string) => this.storedVariables.has(name),
                    // List all stored variable names
                    list: () => Array.from(this.storedVariables.keys()),
                    // Clear all stored variables
                    clearAll: () => {
                        this.storedVariables.clear();
                        return true;
                    },
                    // Delete a specific variable
                    delete: (name: string) => {
                        if (!this.storedVariables.has(name)) {
                            return false;
                        }
                        return this.storedVariables.delete(name);
                    },
                },

                // NEW: Selection helpers
                Selection: {
                    // Select a node in the document
                    select: (node: any) => {
                        doc.selection.setSelection([node], false);
                        doc.visual.update();
                        return node;
                    },
                    // Select the last created node
                    selectLast: () => {
                        if (!this.lastCreatedNode) {
                            throw new Error("No previously created node available");
                        }
                        doc.selection.setSelection([this.lastCreatedNode], false);
                        doc.visual.update();
                        return this.lastCreatedNode;
                    },
                    // Get currently selected nodes
                    getSelected: () => doc.selection.getSelectedNodes(),
                    // Clear selection
                    clear: () => {
                        doc.selection.clearSelection();
                        doc.visual.update();
                        return true;
                    },
                },

                // NEW: Document manipulation helpers
                Document: {
                    // Delete selected nodes
                    deleteSelected: () => {
                        const nodesToDelete = doc.selection.getSelectedNodes();
                        const count = nodesToDelete.length;

                        if (count === 0) {
                            return { message: "No objects selected for deletion" };
                        }

                        Transaction.execute(doc, "delete", () => {
                            if (doc.currentNode && nodesToDelete.includes(doc.currentNode)) {
                                doc.currentNode = doc.rootNode;
                            }
                            doc.selection.clearSelection();
                            nodesToDelete.forEach((model) => model.parent?.remove(model));
                            doc.visual.update();
                            PubSub.default.pub("showToast", "toast.delete{0}Objects", count);
                        });

                        return { message: `Deleted ${count} object${count === 1 ? "" : "s"}` };
                    },

                    // Delete a specific node
                    deleteNode: (node: any) => {
                        if (!node || !node.parent) {
                            return { message: "Invalid node or node has no parent" };
                        }

                        Transaction.execute(doc, "delete", () => {
                            if (doc.currentNode && doc.currentNode === node) {
                                doc.currentNode = doc.rootNode;
                            }
                            // Check if node is in the selected nodes instead of using isSelected
                            const selectedNodes = doc.selection.getSelectedNodes();
                            if (selectedNodes.includes(node)) {
                                doc.selection.clearSelection();
                            }
                            node.parent.remove(node);
                            doc.visual.update();
                            PubSub.default.pub("showToast", "toast.delete{0}Objects", 1);
                        });

                        return { message: "Node deleted" };
                    },

                    // Create a folder
                    createFolder: (name?: string) => {
                        const folderName = name || `Folder${Date.now()}`;
                        const folder = new FolderNode(doc, folderName);
                        doc.addNode(folder);
                        this.lastCreatedNode = folder;
                        return folder;
                    },
                },

                // NEW: Utility functions for common operations
                Utils: {
                    // Create a default plane at a given origin
                    createPlane: (origin: XYZ | [number, number, number]) => {
                        let xyz: XYZ;
                        if (Array.isArray(origin)) {
                            xyz = new XYZ(origin[0], origin[1], origin[2]);
                        } else {
                            xyz = origin;
                        }
                        return new Plane(xyz, XYZ.unitZ, XYZ.unitX);
                    },

                    // Create an XYZ point from coordinates
                    createPoint: (x: number, y: number, z: number) => new XYZ(x, y, z),

                    // Create a ray from origin and direction
                    createRay: (
                        origin: XYZ | [number, number, number],
                        direction: XYZ | [number, number, number],
                    ) => {
                        let originXYZ: XYZ;
                        let directionXYZ: XYZ;

                        if (Array.isArray(origin)) {
                            originXYZ = new XYZ(origin[0], origin[1], origin[2]);
                        } else {
                            originXYZ = origin;
                        }

                        if (Array.isArray(direction)) {
                            directionXYZ = new XYZ(direction[0], direction[1], direction[2]);
                        } else {
                            directionXYZ = direction;
                        }

                        return new Ray(originXYZ, directionXYZ);
                    },
                },
            };

            // Clear existing geometry if specified and not appending.
            if (!options.preserveExisting && !options.appendToDocument) {
                Logger.info("Clearing existing geometry before execution");
            }

            let result: any; // Will hold the result from the last code block or the single code block.

            // Check if we received multiple code blocks.
            if (Array.isArray(code)) {
                // Execute each code block sequentially.
                for (let i = 0; i < code.length; i++) {
                    Logger.info(`Executing code block ${i + 1} of ${code.length}`);
                    try {
                        // Wrap the current code block in an async function
                        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
                        const fn = new AsyncFunction(...Object.keys(context), code[i]);
                        result = await fn(...Object.values(context));
                    } catch (err) {
                        // Log and return error with information about which code block failed.
                        Logger.error(`Error in code block ${i + 1}:`, err);
                        return Result.err(`Error in code block ${i + 1}: ${err}`);
                    }
                }
            } else {
                // Execute the single code block.
                const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
                const fn = new AsyncFunction(...Object.keys(context), code);
                result = await fn(...Object.values(context));
            }

            // Process shape results if the returned result appears to be a shape.
            if (result && typeof result === "object" && "isOk" in result) {
                const shapeResult = result as ShapeResult;
                if (shapeResult.isOk) {
                    const wrappedShape = OcctHelper.wrapShape(shapeResult.shape);
                    const node = new MultiShapeNode(doc, "AI Generated Shape", [wrappedShape]);
                    doc.addNode(node);
                    this.lastCreatedNode = node;
                    Logger.info("Successfully added AI-generated shape");
                    return Result.ok(node);
                }
                return Result.err(String(shapeResult.error));
            }

            // Return the result directly in case it is not a shape.
            return Result.ok(result);
        } catch (error) {
            Logger.error("AI script execution failed:", error);
            return Result.err(`AI script execution failed: ${error}`);
        }
    }

    /**
     * Clears all stored variables
     */
    public clearVariables(): void {
        this.storedVariables.clear();
    }

    /**
     * Gets the last created node
     */
    public getLastCreatedNode(): any {
        return this.lastCreatedNode;
    }

    /**
     * Gets a stored variable by name
     */
    public getVariable(name: string): any | undefined {
        return this.storedVariables.get(name);
    }

    /**
     * Lists all stored variable names
     */
    public listVariables(): string[] {
        return Array.from(this.storedVariables.keys());
    }
}
