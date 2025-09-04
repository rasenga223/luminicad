import {
    I18n,
    IApplication,
    IEdge,
    IService,
    IShape,
    Logger,
    Plane,
    PubSub,
    Ray,
    Result,
    ShapeType,
    Transaction,
    XYZ,
} from "luminicad-core";

import { Constants, EditableShapeNode, MaterialCategory, MaterialLibrary, ShapeNode } from "luminicad-core";
import { ArcNode } from "../../../luminicad/src/bodys/arc";
import { BooleanNode } from "../../../luminicad/src/bodys/boolean";
import { BoxNode } from "../../../luminicad/src/bodys/box";
import { CircleNode } from "../../../luminicad/src/bodys/circle";
import { ConeNode } from "../../../luminicad/src/bodys/cone";
import { CylinderNode } from "../../../luminicad/src/bodys/cylinder";
import { EllipseNode } from "../../../luminicad/src/bodys/ellipse";
import { FaceNode } from "../../../luminicad/src/bodys/face";
import { FuseNode } from "../../../luminicad/src/bodys/fuse";
import { LineNode } from "../../../luminicad/src/bodys/line";
import { PolygonNode } from "../../../luminicad/src/bodys/polygon";
import { PrismNode } from "../../../luminicad/src/bodys/prism";
import { PyramidNode } from "../../../luminicad/src/bodys/pyramid";
import { RectNode } from "../../../luminicad/src/bodys/rect";
import { RevolvedNode } from "../../../luminicad/src/bodys/revolve";
import { SphereNode } from "../../../luminicad/src/bodys/sphere";
import { SweepedNode } from "../../../luminicad/src/bodys/sweep";
import { WireNode } from "../../../luminicad/src/bodys/wire";
import { AI_CONFIG } from "../config/config";

/**
 * AiCadExecutionService
 *
 * Executes AI-generated TypeScript code specifically designed to interact with
 * LuminiCAD's document model, primarily using the high-level 'bodys' classes.
 */
export class AiCadExecutionService implements IService {
    private app!: IApplication;
    private storedVariables: Map<string, any> = new Map();

    private static base64Encode(str: string): string {
        try {
            return btoa(unescape(encodeURIComponent(str)));
        } catch (e: unknown) {
            let errorMessage = "Unknown encoding error";
            if (e instanceof Error) {
                errorMessage = e.message;
            }
            Logger.error("base64Encode error:", errorMessage);
            throw new Error(`Failed to base64 encode string: ${errorMessage}`);
        }
    }

    private static base64DecodeToBytes(base64: string): Uint8Array {
        try {
            const binaryString = atob(base64);
            const length = binaryString.length;
            const bytes = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        } catch (e: unknown) {
            let errorMessage = "Unknown decoding error";
            if (e instanceof Error) {
                errorMessage = e.message;
            }
            Logger.error("base64DecodeToBytes error:", errorMessage);
            throw new Error(`Failed to decode base64 string: ${errorMessage}`);
        }
    }

    /**
     * Registers the service with the main application instance.
     * @param app The main application instance.
     */
    register(app: IApplication): void {
        this.app = app;
    }

    /**
     * Starts the service. Currently does nothing specific on start.
     */
    start(): void {
        Logger.info(`${AiCadExecutionService.name} started`);
    }

    /**
     * Stops the service. Currently does nothing specific on stop.
     */
    stop(): void {}

    /**
     *
     * @param aiCode The string containing the TypeScript code to execute.
     * @param maintainVariables Optional flag to keep variables between calls. Defaults to false.
     * @returns A Result object containing the output of the executed code (if any)
     *          or an error message string.
     */
    async executeCode(aiCode: string, maintainVariables: boolean = false): Promise<Result<any, string>> {
        Logger.warn(
            `AiCadExecutionService: executeCode called. Input length: ${aiCode.length}. First 100 chars: ${aiCode.substring(0, 100)}...`,
        );

        const doc = this.app.activeView?.document;
        if (!doc) {
            Logger.warn("AiCadExecutionService: No active document found.");
            return Result.err("No active document found.");
        }

        if (!maintainVariables) {
            this.storedVariables.clear();
        }

        try {
            const parsedAiCode = JSON.parse(aiCode);
            if (parsedAiCode && parsedAiCode.tool === "cadquery") {
                try {
                    Logger.info(
                        "AiCadExecutionService: Detected CadQuery directive. Delegating to CadQuery service.",
                    );
                    const {
                        script,
                        input_files: inputFiles,
                        expected_output_format: expectedOutputFormat,
                    } = parsedAiCode;

                    if (!script || typeof script !== "string") {
                        Logger.error(
                            "AiCadExecutionService: CadQuery directive is missing 'script' or it's not a string.",
                        );
                        return Result.err("CadQuery directive error: 'script' is missing or invalid.");
                    }

                    const cadQueryServicePayloadInputFiles: { filename: string; content_base64: string }[] =
                        [];

                    if (inputFiles && Array.isArray(inputFiles)) {
                        for (const inputFile of inputFiles) {
                            if (!inputFile.variable_name || !inputFile.output_filename_for_script) {
                                Logger.warn(
                                    "AiCadExecutionService: Skipping invalid input_file entry in CadQuery directive:",
                                    inputFile,
                                );
                                continue;
                            }
                            const luminiCadObject = this.storedVariables.get(inputFile.variable_name);
                            if (!luminiCadObject) {
                                throw new Error(
                                    `Variable '${inputFile.variable_name}' not found in storedVariables.`,
                                );
                            }

                            if (!(luminiCadObject instanceof ShapeNode)) {
                                throw new Error(`Variable '${inputFile.variable_name}' is not a ShapeNode.`);
                            }
                            const shapeToExportResult = luminiCadObject.shape;
                            if (!shapeToExportResult.isOk) {
                                throw new Error(
                                    `Error getting shape from '${inputFile.variable_name}': ${shapeToExportResult.error}`,
                                );
                            }
                            const shapeToExport = shapeToExportResult.value;

                            if (!this.app.shapeConverter || !("convertToSTEP" in this.app.shapeConverter)) {
                                Logger.error(
                                    "AiCadExecutionService: IShapeConverter with convertToSTEP is not available on app.",
                                );
                                return Result.err(
                                    "CadQuery preprocessing error: Shape converter not available.",
                                );
                            }
                            const stepResult = this.app.shapeConverter.convertToSTEP(shapeToExport);
                            if (!stepResult.isOk) {
                                Logger.error(
                                    "AiCadExecutionService: Failed to convert IShape to STEP:",
                                    stepResult.error,
                                );
                                return Result.err(
                                    `CadQuery preprocessing error: Failed to convert '${inputFile.variable_name}' to STEP: ${stepResult.error}`,
                                );
                            }
                            const stepDataString = stepResult.value;

                            const base64EncodedStepString =
                                AiCadExecutionService.base64Encode(stepDataString);

                            cadQueryServicePayloadInputFiles.push({
                                filename: inputFile.output_filename_for_script,
                                content_base64: base64EncodedStepString,
                            });
                            Logger.info(
                                `AiCadExecutionService: Prepared input file '${inputFile.output_filename_for_script}' from variable '${inputFile.variable_name}'.`,
                            );
                        }
                    }

                    const cadQueryServiceUrl = AI_CONFIG.CADQUERY_SERVICE_URL;
                    const payload = {
                        script: script,
                        input_files: cadQueryServicePayloadInputFiles,
                        output_format: expectedOutputFormat || "step",
                    };

                    Logger.info(
                        `AiCadExecutionService: Preparing to send POST request to CadQuery service at URL: ${cadQueryServiceUrl}`,
                    );
                    Logger.info("AiCadExecutionService: CadQuery service request payload:", payload);

                    let response;
                    try {
                        Logger.info(
                            `AiCadExecutionService: Executing fetch POST to ${cadQueryServiceUrl}...`,
                        );
                        response = await fetch(cadQueryServiceUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        });
                        Logger.info(
                            `AiCadExecutionService: Received response from ${cadQueryServiceUrl} with status: ${response.status}`,
                        );
                    } catch (networkError: any) {
                        Logger.error(
                            "AiCadExecutionService: Network error calling CadQuery service:",
                            networkError,
                        );
                        return Result.err(`CadQuery service network error: ${networkError.message}`);
                    }

                    if (!response.ok) {
                        const errorText = await response.text();
                        Logger.error(
                            `AiCadExecutionService: CadQuery service returned error ${response.status}:`,
                            errorText,
                        );
                        try {
                            const errorJson = JSON.parse(errorText);
                            return Result.err(
                                `CadQuery service error (${response.status}): ${errorJson.message || errorText}. Logs: ${JSON.stringify(errorJson.logs)}`,
                            );
                        } catch {
                            return Result.err(`CadQuery service error (${response.status}): ${errorText}`);
                        }
                    }

                    const resultData = await response.json();
                    Logger.info(
                        "AiCadExecutionService: Parsed JSON response from CadQuery service:",
                        resultData,
                    );

                    if (resultData.status === "error") {
                        Logger.error(
                            "AiCadExecutionService: CadQuery service reported an execution error:",
                            resultData.message,
                            resultData.logs,
                        );
                        return Result.err(
                            `CadQuery script execution error: ${resultData.message}. Logs: ${JSON.stringify(resultData.logs)}`,
                        );
                    }

                    if (
                        resultData.status === "success" &&
                        resultData.output_files &&
                        resultData.output_files.length > 0
                    ) {
                        const outputFile = resultData.output_files[0];
                        const base64OutputData = outputFile.content_base64;
                        const decodedOutputDataBytesAsBuffer =
                            AiCadExecutionService.base64DecodeToBytes(base64OutputData);
                        const decodedOutputDataBytes = new Uint8Array(
                            decodedOutputDataBytesAsBuffer.buffer,
                            decodedOutputDataBytesAsBuffer.byteOffset,
                            decodedOutputDataBytesAsBuffer.byteLength,
                        );

                        if (!this.app.shapeConverter || !("convertFromSTEP" in this.app.shapeConverter)) {
                            Logger.error(
                                "AiCadExecutionService: IShapeConverter with convertFromSTEP is not available on app.",
                            );
                            return Result.err(
                                "CadQuery postprocessing error: Shape converter not available.",
                            );
                        }
                        const importedShapeResult = this.app.shapeConverter.convertFromSTEP(
                            doc,
                            decodedOutputDataBytesAsBuffer,
                        );

                        if (!importedShapeResult.isOk) {
                            Logger.error(
                                "AiCadExecutionService: Failed to convert STEP data to IShape:",
                                importedShapeResult.error,
                            );
                            return Result.err(
                                `CadQuery postprocessing error: Failed to import result: ${importedShapeResult.error}`,
                            );
                        }
                        const folderNode = importedShapeResult.value;
                        Logger.info(
                            `AiCadExecutionService: convertFromSTEP returned FolderNode: ${folderNode.name}, ID: ${folderNode.id}`,
                        );

                        let finalShapeToRender: IShape | undefined;
                        const firstChildNode = folderNode.firstChild;

                        if (firstChildNode && firstChildNode instanceof ShapeNode) {
                            Logger.info(
                                `AiCadExecutionService: Extracted firstChildNode from FolderNode: ${firstChildNode.name}, ID: ${firstChildNode.id}, Type: ${firstChildNode.constructor.name}`,
                            );
                            if (firstChildNode.shape.isOk) {
                                finalShapeToRender = firstChildNode.shape.value;
                                Logger.info(
                                    "AiCadExecutionService: Successfully got IShape from firstChildNode to be rendered.",
                                );
                            } else {
                                Logger.error(
                                    "AiCadExecutionService: ShapeNode within imported FolderNode has an error state:",
                                    firstChildNode.shape.error,
                                );
                                return Result.err(
                                    `CadQuery postprocessing error: Imported shape node has error: ${firstChildNode.shape.error}`,
                                );
                            }
                        } else {
                            Logger.warn(
                                "AiCadExecutionService: No valid firstChildNode (ShapeNode) found in FolderNode. Attempting to use FolderNode's shape directly if it's a ShapeNode itself.",
                            );
                            if (folderNode instanceof ShapeNode && folderNode.shape.isOk) {
                                finalShapeToRender = folderNode.shape.value;
                                Logger.info(
                                    "AiCadExecutionService: Using FolderNode's own shape as finalShapeToRender.",
                                );
                            } else {
                                Logger.error(
                                    "AiCadExecutionService: No valid shape found in imported STEP result (neither firstChild nor FolderNode itself).",
                                );
                                return Result.err(
                                    "CadQuery postprocessing error: No valid shape found in imported STEP result.",
                                );
                            }
                        }

                        const nodeName = `ai_generated_${Date.now()}`;
                        const newNode = new EditableShapeNode(doc, nodeName, finalShapeToRender);

                        if (parsedAiCode.materialRef && typeof parsedAiCode.materialRef === "string") {
                            const materialRef: string = parsedAiCode.materialRef;
                            Logger.info(
                                `AiCadExecutionService: Attempting to apply materialRef "${materialRef}" to CadQuery result.`,
                            );
                            try {
                                const materialMatch = materialRef.match(/^([A-Z_]+)\.([A-Z_]+)$/i);

                                if (!materialMatch) {
                                    Logger.warn(
                                        `AiCadExecutionService: Invalid materialRef format "${materialRef}". Expected "CATEGORY.PRESET_NAME". Skipping material assignment.`,
                                    );
                                } else {
                                    const [_, categoryNameInput, presetNameInput] = materialMatch;
                                    const categoryName = categoryNameInput.toUpperCase();
                                    const presetName = presetNameInput.toUpperCase();

                                    const categoryKey = Object.keys(MaterialCategory).find(
                                        (key) =>
                                            MaterialCategory[
                                                key as keyof typeof MaterialCategory
                                            ].toUpperCase() === categoryName,
                                    );

                                    if (!categoryKey) {
                                        Logger.warn(
                                            `AiCadExecutionService: Unknown material category "${categoryName}" in materialRef "${materialRef}". Available categories: ${Object.values(MaterialCategory).join(", ")}. Skipping.`,
                                        );
                                    } else {
                                        const categoryPresets = (MaterialLibrary as any)[categoryName];

                                        if (!categoryPresets || typeof categoryPresets !== "object") {
                                            Logger.warn(
                                                `AiCadExecutionService: Could not find presets for category "${categoryName}". MaterialLibrary might not have this category. Skipping.`,
                                            );
                                        } else {
                                            const presetKey = Object.keys(categoryPresets).find(
                                                (key) => key.toUpperCase() === presetName,
                                            );

                                            if (!presetKey) {
                                                Logger.warn(
                                                    `AiCadExecutionService: Unknown material preset "${presetName}" in category "${categoryName}". Available presets: ${Object.keys(categoryPresets).join(", ")}. Skipping.`,
                                                );
                                            } else {
                                                const materialPreset = (categoryPresets as any)[presetKey];
                                                // Create the material instance using the document and the found preset.
                                                const material = MaterialLibrary.createMaterial(
                                                    doc,
                                                    materialPreset,
                                                );

                                                doc.materials.push(material);

                                                newNode.materialId = material.id;
                                                Logger.info(
                                                    `AiCadExecutionService: Successfully applied material '${material.name}' (ID: ${material.id}) to CadQuery result node '${newNode.name}'.`,
                                                );
                                            }
                                        }
                                    }
                                }
                            } catch (materialError: any) {
                                Logger.error(
                                    `AiCadExecutionService: Error applying material "${materialRef}" to CadQuery result node: ${materialError.message || materialError}`,
                                    materialError,
                                );
                            }
                        }

                        doc.addNode(newNode);
                        Logger.info(
                            `AiCadExecutionService: Explicitly added new EditableShapeNode '${newNode.name}' (ID: ${newNode.id}) to document for CadQuery result.`,
                        );

                        if (resultData.logs && resultData.logs.length > 0) {
                            Logger.info(
                                "AiCadExecutionService: Logs from CadQuery service:",
                                resultData.logs.join("\n"),
                            );
                        }

                        doc.visual.update();

                        if (this.app.storage) {
                            let exportedVariableName = "unknown";
                            const exportMatch = payload.script.match(
                                /cq\.exporters\.export\s*\(\s*([^,]+?)\s*,\s*['"`]_internal_output\.(step|stl|gltf)['"`]/,
                            );
                            if (exportMatch && exportMatch[1]) {
                                exportedVariableName = exportMatch[1].trim();
                            }

                            const scriptRecordData = {
                                python_script: payload.script,
                                document_id: doc.id,
                                shape_name: newNode.name,

                                exported_variable_name: exportedVariableName,
                                timestamp: new Date().toISOString(),
                                source: "cadquery_ai_generation",
                            };
                            try {
                                await this.app.storage.put(
                                    Constants.DBName,
                                    "CadQueryExecutions",
                                    newNode.id,
                                    scriptRecordData,
                                );
                                Logger.info(
                                    `Saved CadQuery script and metadata for node ID ${newNode.id} (exported var: ${exportedVariableName}) to storage.`,
                                );
                            } catch (storageError: any) {
                                Logger.error(
                                    `Failed to save CadQuery script for node ID ${newNode.id} to local storage:`,
                                    storageError,
                                );
                            }
                        } else {
                            Logger.warn(
                                "Storage service not available on app. Cannot save script execution history.",
                            );
                        }

                        try {
                            await doc.save();
                            Logger.info(`Document saved after execution. Document ID: ${doc.id}`);
                        } catch (saveError) {
                            Logger.error(`Failed to save document after execution: ${saveError}`);
                        }
                        return Result.ok({
                            message: "CadQuery task executed and node added.",
                            node: newNode,
                        });
                    } else {
                        Logger.error(
                            "AiCadExecutionService: CadQuery service success response was malformed or had no output files.",
                            resultData,
                        );
                        return Result.err(
                            "CadQuery service error: Success response was malformed or had no output_files.",
                        );
                    }
                } catch (cqProcessingError: any) {
                    Logger.error(
                        "AiCadExecutionService: Error during CadQuery delegation internal processing:",
                        cqProcessingError,
                    );
                    return Result.err(
                        `CadQuery delegation processing failed: ${cqProcessingError.message || cqProcessingError}`,
                    );
                }
            }
        } catch (e) {
            if (aiCode.trim().startsWith("{")) {
                Logger.error("AiCadExecutionService: Invalid JSON directive provided, cannot parse:", e);
                return Result.err(`Invalid JSON directive: ${e instanceof Error ? e.message : e}`);
            }

            // Logger.debug("AiCadExecutionService: Not a CadQuery JSON directive, proceeding with TypeScript execution.", e);
        }

        const getShapeFromInput = (input: any): IShape | null => {
            let shape: IShape | null = null;
            let resolvedInput = input;
            const sourceDescription = typeof input === "string" ? `variable '${input}'` : "input object";

            try {
                if (typeof input === "string") {
                    if (!this.storedVariables.has(input)) {
                        throw new Error(`Variable '${input}' not found.`);
                    }
                    resolvedInput = this.storedVariables.get(input);
                }

                if (resolvedInput instanceof ShapeNode && resolvedInput.shape instanceof Result) {
                    const shapeResult = resolvedInput.shape;
                    if (shapeResult.isOk) {
                        shape = shapeResult.value;
                    } else {
                        throw new Error(
                            `ShapeNode (${resolvedInput.constructor.name}) from ${sourceDescription} has an error: ${shapeResult.error}`,
                        );
                    }
                } else if (
                    resolvedInput &&
                    typeof resolvedInput.shapeType !== "undefined" &&
                    typeof resolvedInput.dispose === "function"
                ) {
                    shape = resolvedInput as IShape;
                } else {
                    let inputType = typeof resolvedInput;
                    if (resolvedInput && resolvedInput.constructor) {
                        inputType = resolvedInput.constructor.name;
                    }
                    throw new Error(
                        `Input from ${sourceDescription} is not a recognized ShapeNode or IShape. Found type: ${inputType}.`,
                    );
                }

                if (!shape || shape.isNull()) {
                    throw new Error(`Resolved shape from ${sourceDescription} is null or invalid.`);
                }
                return shape;
            } catch (error: any) {
                Logger.error(`Error in getShapeFromInput for ${sourceDescription}:`, error);
                throw new Error(
                    `Failed to get valid IShape from ${sourceDescription}: ${error.message || error}`,
                );
            }
        };

        const executionContext = {
            document: doc,

            XYZ: XYZ,
            Plane: Plane,
            Ray: Ray,
            ArcNode: ArcNode,
            BooleanNode: BooleanNode,
            BoxNode: BoxNode,
            CircleNode: CircleNode,
            ConeNode: ConeNode,
            CylinderNode: CylinderNode,
            EllipseNode: EllipseNode,
            FaceNode: FaceNode,
            FuseNode: FuseNode,
            LineNode: LineNode,
            PolygonNode: PolygonNode,
            PrismNode: PrismNode,
            PyramidNode: PyramidNode,
            RectNode: RectNode,
            RevolvedNode: RevolvedNode,
            SweepedNode: SweepedNode,
            SphereNode: SphereNode,
            WireNode: WireNode,
            EditableShapeNode: EditableShapeNode,
            Transaction: Transaction,
            Logger: Logger,
            PubSub: PubSub,
            MaterialLibrary: MaterialLibrary,

            booleanCommon: async (shape1Input: any, shape2Input: any): Promise<IShape> => {
                const shape1 = getShapeFromInput(shape1Input);
                const shape2 = getShapeFromInput(shape2Input);
                if (!shape1 || !shape2) throw new Error("booleanCommon requires two valid shape inputs.");

                Logger.info(
                    `booleanCommon: Input 1 - Type: ${shape1.shapeType}, IsNull: ${shape1.isNull()}`,
                );
                Logger.info(
                    `booleanCommon: Input 2 - Type: ${shape2.shapeType}, IsNull: ${shape2.isNull()}`,
                );

                let result: Result<IShape>;
                try {
                    result = await doc.application.shapeFactory.booleanCommon(shape1, shape2);
                } catch (factoryError: any) {
                    Logger.error(
                        "booleanCommon: Error during shapeFactory.booleanCommon call:",
                        factoryError,
                    );
                    throw new Error(
                        `booleanCommon: Factory operation failed: ${factoryError.message || factoryError}`,
                    );
                }

                if (!result.isOk) {
                    Logger.error(`booleanCommon: Operation failed post-factory call: ${result.error}`);
                    throw new Error(`Boolean common failed: ${result.error}`);
                }
                Logger.info(
                    `booleanCommon: Result - Type: ${result.value.shapeType}, IsNull: ${result.value.isNull()}`,
                );

                let finalShape = result.value;
                if (finalShape.shapeType === ShapeType.Compound) {
                    Logger.warn("booleanCommon resulted in a Compound. Attempting to extract Solid.");
                    const solids = finalShape.findSubShapes(ShapeType.Solid);
                    if (solids.length === 1) {
                        finalShape = solids[0];
                        Logger.info(`Extracted single Solid (Type: ${finalShape.shapeType}) from Compound.`);
                    } else {
                        Logger.error(
                            `Could not extract single Solid from Compound result (found ${solids.length}). Returning Compound.`,
                        );

                        // throw new Error("Boolean common resulted in a Compound with zero or multiple Solids.");
                    }
                }

                return finalShape;
            },
            booleanCut: async (shape1Input: any, shape2Input: any): Promise<IShape> => {
                const shape1 = getShapeFromInput(shape1Input);
                const shape2 = getShapeFromInput(shape2Input);
                if (!shape1 || !shape2) throw new Error("booleanCut requires two valid shape inputs.");

                Logger.info(
                    `booleanCut: Input 1 (Tool) - Type: ${shape1.shapeType}, IsNull: ${shape1.isNull()}`,
                );
                Logger.info(
                    `booleanCut: Input 2 (Object) - Type: ${shape2.shapeType}, IsNull: ${shape2.isNull()}`,
                );

                let result: Result<IShape>;
                try {
                    result = await doc.application.shapeFactory.booleanCut(shape1, shape2);
                } catch (factoryError: any) {
                    Logger.error("booleanCut: Error during shapeFactory.booleanCut call:", factoryError);
                    throw new Error(
                        `booleanCut: Factory operation failed: ${factoryError.message || factoryError}`,
                    );
                }

                if (!result.isOk) {
                    Logger.error(`booleanCut: Operation failed post-factory call: ${result.error}`);
                    throw new Error(`Boolean cut failed: ${result.error}`);
                }
                Logger.info(
                    `booleanCut: Result - Type: ${result.value.shapeType}, IsNull: ${result.value.isNull()}`,
                );

                let finalShape = result.value;
                if (finalShape.shapeType === ShapeType.Compound) {
                    Logger.warn("booleanCut resulted in a Compound. Attempting to extract Solid.");
                    const solids = finalShape.findSubShapes(ShapeType.Solid);
                    if (solids.length === 1) {
                        finalShape = solids[0];
                        Logger.info(`Extracted single Solid (Type: ${finalShape.shapeType}) from Compound.`);
                    } else {
                        Logger.error(
                            `Could not extract single Solid from Compound result (found ${solids.length}). Returning Compound.`,
                        );

                        // throw new Error("Boolean cut resulted in a Compound with zero or multiple Solids.");
                    }
                }

                return finalShape;
            },
            booleanFuse: async (shape1Input: any, shape2Input: any): Promise<IShape> => {
                const shape1 = getShapeFromInput(shape1Input);
                const shape2 = getShapeFromInput(shape2Input);
                if (!shape1 || !shape2) throw new Error("booleanFuse requires two valid shape inputs.");

                Logger.info(`booleanFuse: Input 1 - Type: ${shape1.shapeType}, IsNull: ${shape1.isNull()}`);
                Logger.info(`booleanFuse: Input 2 - Type: ${shape2.shapeType}, IsNull: ${shape2.isNull()}`);

                let result: Result<IShape>;
                try {
                    result = await doc.application.shapeFactory.booleanFuse(shape1, shape2);
                } catch (factoryError: any) {
                    Logger.error("booleanFuse: Error during shapeFactory.booleanFuse call:", factoryError);
                    throw new Error(
                        `booleanFuse: Factory operation failed: ${factoryError.message || factoryError}`,
                    );
                }

                if (!result.isOk) {
                    Logger.error(`booleanFuse: Operation failed post-factory call: ${result.error}`);
                    throw new Error(`Boolean fuse failed: ${result.error}`);
                }
                Logger.info(
                    `booleanFuse: Result - Type: ${result.value.shapeType}, IsNull: ${result.value.isNull()}`,
                );

                let finalShape = result.value;
                if (finalShape.shapeType === ShapeType.Compound) {
                    Logger.warn("booleanFuse resulted in a Compound. Attempting to extract Solid.");
                    const solids = finalShape.findSubShapes(ShapeType.Solid);
                    if (solids.length === 1) {
                        finalShape = solids[0];
                        Logger.info(`Extracted single Solid (Type: ${finalShape.shapeType}) from Compound.`);
                    } else {
                        Logger.error(
                            `Could not extract single Solid from Compound result (found ${solids.length}). Returning Compound.`,
                        );

                        // throw new Error("Boolean fuse resulted in a Compound with zero or multiple Solids.");
                    }
                }

                return finalShape;
            },

            makeThickSolidSimple: async (shapeInput: any, thickness: number): Promise<IShape> => {
                const baseShape = getShapeFromInput(shapeInput);
                if (!baseShape) throw new Error("makeThickSolidSimple requires a valid base shape input.");
                const result = await doc.application.shapeFactory.makeThickSolidBySimple(
                    baseShape,
                    thickness,
                );

                if (!result.isOk) {
                    throw new Error(`Make thick solid failed: ${result.error}`);
                }
                return result.value;
            },

            chamferAllEdges: async (shapeInput: any, distance: number): Promise<IShape> => {
                const baseShape = getShapeFromInput(shapeInput);
                if (!baseShape) throw new Error("chamferAllEdges requires a valid base shape input.");

                const edges = baseShape.findSubShapes(ShapeType.Edge) as IEdge[];
                if (!edges || edges.length === 0) {
                    throw new Error("No edges found on the provided shape to chamfer.");
                }

                const result = await doc.application.shapeFactory.chamfer(baseShape, edges, distance);

                if (!result.isOk) {
                    throw new Error(`Chamfer operation failed: ${result.error}`);
                }
                return result.value;
            },

            filletAllEdges: async (shapeInput: any, radius: number): Promise<IShape> => {
                const baseShape = getShapeFromInput(shapeInput);
                if (!baseShape) throw new Error("filletAllEdges requires a valid base shape input.");
                const edges = baseShape.findSubShapes(ShapeType.Edge) as IEdge[];
                if (!edges || edges.length === 0) {
                    throw new Error("No edges found on the provided shape to fillet.");
                }
                const result = await doc.application.shapeFactory.fillet(baseShape, edges, radius);
                if (!result.isOk) {
                    throw new Error(`Fillet operation failed: ${result.error}`);
                }
                return result.value;
            },

            storeVariable: (name: string, value: any): any => {
                if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
                    throw new Error(
                        `Invalid variable name: \"${name}\". Names must follow JavaScript identifier rules.`,
                    );
                }
                this.storedVariables.set(name, value);
                Logger.info(`Stored variable '${name}'`);
                return value;
            },
            getVariable: (name: string): any => {
                if (!this.storedVariables.has(name)) {
                    throw new Error(`Variable '${name}' not found.`);
                }
                Logger.info(`Retrieved variable '${name}'`);
                return this.storedVariables.get(name);
            },
            listVariables: (): string[] => {
                return Array.from(this.storedVariables.keys());
            },

            addNode: (nodeOrShapeToAdd: any, name?: string): ShapeNode => {
                let nodeToAdd: ShapeNode;
                if (nodeOrShapeToAdd instanceof ShapeNode) {
                    nodeToAdd = nodeOrShapeToAdd;
                    if (name && nodeToAdd.name.startsWith("Node_")) {
                        nodeToAdd.name = name;
                    }
                } else if (
                    nodeOrShapeToAdd &&
                    typeof nodeOrShapeToAdd.shapeType !== "undefined" &&
                    typeof nodeOrShapeToAdd.dispose === "function"
                ) {
                    const shape = nodeOrShapeToAdd as IShape;
                    Logger.info(
                        `addNode: Wrapping raw IShape (Type: ${shape.shapeType}, IsNull: ${shape.isNull()}) in EditableShapeNode.`,
                    );

                    const nodeName = name || I18n.translate("body.editableShape"); // Provide a default name
                    nodeToAdd = new EditableShapeNode(doc, nodeName, shape);
                } else {
                    throw new Error(
                        "Invalid object passed to addNode. Expected a ShapeNode instance or an IShape object.",
                    );
                }

                doc.addNode(nodeToAdd);
                Logger.info(`Added node '${nodeToAdd.name}' to document.`);
                return nodeToAdd;
            },

            logShapeDetails: (input: any, label: string = "Shape") => {
                let shape: IShape | null = null;
                let nodeType = "N/A";
                let resolvedInput = input;
                const sourceDescription = typeof input === "string" ? `variable '${input}'` : "input object";

                try {
                    if (typeof input === "string") {
                        if (!this.storedVariables.has(input)) {
                            throw new Error(`Variable '${input}' not found.`);
                        }
                        resolvedInput = this.storedVariables.get(input);
                    }

                    if (resolvedInput instanceof ShapeNode) {
                        nodeType = resolvedInput.constructor.name;
                        const shapeResult = resolvedInput.shape;
                        if (shapeResult.isOk) {
                            shape = shapeResult.value;
                        } else {
                            Logger.error(
                                `${label} (${sourceDescription} - ${nodeType}): Node contains error: ${shapeResult.error}`,
                            );
                            return;
                        }
                    } else if (resolvedInput && typeof resolvedInput.shapeType !== "undefined") {
                        nodeType = "(Raw IShape)";
                        shape = resolvedInput as IShape;
                    } else {
                        throw new Error(
                            `Input from ${sourceDescription} is not a recognized Node or IShape.`,
                        );
                    }

                    if (shape) {
                        Logger.info(
                            `${label} (${sourceDescription} - ${nodeType}): Type = ${shape.shapeType}, IsNull = ${shape.isNull()}, IsClosed = ${shape.isClosed()}`,
                        );
                    } else {
                        Logger.warn(
                            `${label} (${sourceDescription} - ${nodeType}): Could not resolve to a valid IShape.`,
                        );
                    }
                } catch (error: any) {
                    Logger.error(
                        `Error in logShapeDetails for ${label} (${sourceDescription}): ${error.message || error}`,
                    );
                }
            },

            assignMaterial: (targetInput: string | ShapeNode, materialRef: string): void => {
                const materialMatch = materialRef.match(/^([A-Z]+)\.([A-Z_]+)$/i);
                if (!materialMatch) {
                    throw new Error(
                        `Invalid material reference format: "${materialRef}". Expected format: CATEGORY.PRESET_NAME (e.g., METALS.POLISHED_STEEL).`,
                    );
                }
                const [_, categoryName, presetName] = materialMatch;

                const categoryKey = Object.keys(MaterialCategory).find(
                    (key) =>
                        MaterialCategory[key as keyof typeof MaterialCategory].toUpperCase() ===
                        categoryName.toUpperCase(),
                );
                if (!categoryKey) {
                    throw new Error(
                        `Unknown material category: "${categoryName}". Available categories: ${Object.values(MaterialCategory).join(", ")}.`,
                    );
                }
                const categoryValue = MaterialCategory[categoryKey as keyof typeof MaterialCategory];

                const categoryPresets =
                    MaterialLibrary[categoryName.toUpperCase() as keyof typeof MaterialLibrary]; // e.g., MaterialLibrary.METALS
                if (!categoryPresets || typeof categoryPresets !== "object") {
                    throw new Error(
                        `Internal error: Could not find presets for category "${categoryName}".`,
                    );
                }

                const presetKey = Object.keys(categoryPresets).find(
                    (key) => key.toUpperCase() === presetName.toUpperCase(),
                );
                if (!presetKey) {
                    const availablePresets = Object.keys(categoryPresets).join(", ");
                    throw new Error(
                        `Unknown material preset: "${presetName}" in category "${categoryName}". Available presets: ${availablePresets}.`,
                    );
                }
                const materialPreset = categoryPresets[presetKey as keyof typeof categoryPresets];

                const material = MaterialLibrary.createMaterial(doc, materialPreset);
                doc.materials.push(material);

                let targetNode: ShapeNode;
                if (typeof targetInput === "string") {
                    const variableValue = this.storedVariables.get(targetInput);
                    if (!variableValue) {
                        throw new Error(`Variable "${targetInput}" not found.`);
                    }
                    if (!(variableValue instanceof ShapeNode)) {
                        throw new Error(
                            `Variable "${targetInput}" does not hold a ShapeNode, cannot assign material.`,
                        );
                    }
                    targetNode = variableValue;
                } else if (targetInput instanceof ShapeNode) {
                    targetNode = targetInput;
                } else {
                    throw new Error(
                        "Invalid target for assignMaterial. Expected a ShapeNode instance or the name of a variable holding one.",
                    );
                }
                targetNode.materialId = material.id;
                Logger.info(
                    `Assigned material '${material.name}' (ID: ${material.id}) to node '${targetNode.name}'.`,
                );

                doc.visual.update();
            },
        };

        try {
            const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
            const func = new AsyncFunction(...Object.keys(executionContext), aiCode);
            const scriptResult = await func.apply(undefined, Object.values(executionContext));

            Logger.info(
                `AiCadExecutionService: Code executed successfully. Script returned: ${typeof scriptResult === "object" ? JSON.stringify(scriptResult) : scriptResult}`,
            );

            doc.visual.update();

            try {
                await doc.save();
                Logger.info(`Document saved after AI code execution. Document ID: ${doc.id}`);
            } catch (saveError) {
                Logger.error(`Failed to save document after AI code execution: ${saveError}`);
            }

            return Result.ok(scriptResult ?? { message: "AI code executed successfully." });
        } catch (error: any) {
            Logger.error("AiCadExecutionService: Error executing AI code:", error);
            return Result.err(`AI code execution failed: ${error.message || error}`);
        }
    }

    /**
     * Handles the specific logic for executing a CadQuery task.
     * Sends the request to the CadQuery service and processes the response.
     * Assumes parsedAiCode is a valid CadQuery directive object.
     * @param parsedAiCode The parsed JSON object representing the CadQuery task.
     * @param doc The active document.
     * @returns Result containing the resulting node on success, or an error string on failure.
     */
    private async _executeCadQueryTask(
        parsedAiCode: any,
        doc: import("luminicad-core").IDocument,
    ): Promise<Result<any, string>> {
        try {
            Logger.info("AiCadExecutionService: Delegating to CadQuery service...");

            const {
                script,
                input_files: inputFiles,
                expected_output_format: expectedOutputFormat,
            } = parsedAiCode;

            if (!script || typeof script !== "string") {
                Logger.error(
                    "AiCadExecutionService: CadQuery directive is missing 'script' or it's not a string.",
                );
                return Result.err("CadQuery directive error: 'script' is missing or invalid.");
            }

            const cadQueryServicePayloadInputFiles: { filename: string; content_base64: string }[] = [];

            if (inputFiles && Array.isArray(inputFiles)) {
                for (const inputFile of inputFiles) {
                    if (!inputFile.variable_name || !inputFile.output_filename_for_script) {
                        Logger.warn(
                            "AiCadExecutionService: Skipping invalid input_file entry in CadQuery directive:",
                            inputFile,
                        );
                        continue;
                    }
                    const luminiCadObject = this.storedVariables.get(inputFile.variable_name);
                    if (!luminiCadObject) {
                        throw new Error(
                            `Variable '${inputFile.variable_name}' not found in storedVariables.`,
                        );
                    }
                    if (!(luminiCadObject instanceof ShapeNode)) {
                        throw new Error(`Variable '${inputFile.variable_name}' is not a ShapeNode.`);
                    }
                    const shapeToExportResult = luminiCadObject.shape;
                    if (!shapeToExportResult.isOk) {
                        throw new Error(
                            `Error getting shape from '${inputFile.variable_name}': ${shapeToExportResult.error}`,
                        );
                    }
                    const shapeToExport = shapeToExportResult.value;
                    if (!this.app.shapeConverter || !("convertToSTEP" in this.app.shapeConverter)) {
                        throw new Error("IShapeConverter with convertToSTEP is not available on app.");
                    }
                    const stepResult = this.app.shapeConverter.convertToSTEP(shapeToExport);
                    if (!stepResult.isOk) {
                        throw new Error(
                            `Failed to convert '${inputFile.variable_name}' to STEP: ${stepResult.error}`,
                        );
                    }
                    const stepDataString = stepResult.value;
                    const base64EncodedStepString = AiCadExecutionService.base64Encode(stepDataString);
                    cadQueryServicePayloadInputFiles.push({
                        filename: inputFile.output_filename_for_script,
                        content_base64: base64EncodedStepString,
                    });
                    Logger.info(
                        `AiCadExecutionService: Prepared input file '${inputFile.output_filename_for_script}' from variable '${inputFile.variable_name}'.`,
                    );
                }
            }

            const cadQueryServiceUrl = AI_CONFIG.CADQUERY_SERVICE_URL;
            const payload = {
                script: script,
                input_files: cadQueryServicePayloadInputFiles,
                output_format: expectedOutputFormat || "step",
            };

            Logger.info("AiCadExecutionService: Sending POST to CadQuery service...", {
                url: cadQueryServiceUrl,
                payload: { ...payload, script: payload.script.substring(0, 100) + "..." },
            });

            let response;
            try {
                response = await fetch(cadQueryServiceUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                Logger.info(
                    `AiCadExecutionService: Received response from CadQuery service with status: ${response.status}`,
                );
            } catch (networkError: any) {
                Logger.error("AiCadExecutionService: Network error calling CadQuery service:", networkError);
                return Result.err(`CadQuery service network error: ${networkError.message}`);
            }

            if (!response.ok) {
                const errorText = await response.text();
                Logger.error(
                    `AiCadExecutionService: CadQuery service returned error ${response.status}:`,
                    errorText,
                );
                try {
                    const errorJson = JSON.parse(errorText);
                    return Result.err(
                        `CadQuery service error (${response.status}): ${errorJson.message || errorText}. Logs: ${JSON.stringify(errorJson.logs)}`,
                    );
                } catch {
                    return Result.err(`CadQuery service error (${response.status}): ${errorText}`);
                }
            }

            const resultData = await response.json();
            Logger.info("AiCadExecutionService: Parsed JSON response from CadQuery service:", resultData);

            if (resultData.status === "error") {
                Logger.error(
                    "AiCadExecutionService: CadQuery service reported an execution error:",
                    resultData.message,
                    resultData.logs,
                );

                const errorDetail = `Message: ${resultData.message}. Logs: ${JSON.stringify(resultData.logs)}`;
                return Result.err(`CadQuery script execution error: ${errorDetail}`);
            }

            if (
                resultData.status === "success" &&
                resultData.output_files &&
                resultData.output_files.length > 0
            ) {
                const outputFile = resultData.output_files[0];
                const base64OutputData = outputFile.content_base64;
                const decodedOutputDataBytes = AiCadExecutionService.base64DecodeToBytes(base64OutputData);

                if (!this.app.shapeConverter || !("convertFromSTEP" in this.app.shapeConverter)) {
                    throw new Error("IShapeConverter with convertFromSTEP is not available on app.");
                }
                const importedShapeResult = this.app.shapeConverter.convertFromSTEP(
                    doc,
                    decodedOutputDataBytes,
                );

                if (!importedShapeResult.isOk) {
                    throw new Error(`Failed to convert STEP data to IShape: ${importedShapeResult.error}`);
                }

                const folderNode = importedShapeResult.value;
                Logger.info(
                    `AiCadExecutionService: convertFromSTEP returned FolderNode: ${folderNode.name}, ID: ${folderNode.id}`,
                );

                let finalShapeToRender: IShape | undefined;
                const firstChildNode = folderNode.firstChild;

                if (firstChildNode && firstChildNode instanceof ShapeNode) {
                    Logger.info(
                        `AiCadExecutionService: Extracted firstChildNode: ${firstChildNode.name}, ID: ${firstChildNode.id}, Type: ${firstChildNode.constructor.name}`,
                    );
                    if (firstChildNode.shape.isOk) {
                        finalShapeToRender = firstChildNode.shape.value;
                        Logger.info("AiCadExecutionService: Got IShape from firstChildNode.");
                    } else {
                        throw new Error(`Imported shape node has error: ${firstChildNode.shape.error}`);
                    }
                } else {
                    Logger.warn(
                        "AiCadExecutionService: No valid firstChildNode found. Using FolderNode's shape if possible.",
                    );
                    if (folderNode instanceof ShapeNode && folderNode.shape.isOk) {
                        finalShapeToRender = folderNode.shape.value;
                        Logger.info("AiCadExecutionService: Using FolderNode's own shape.");
                    } else {
                        throw new Error("No valid shape found in imported STEP result.");
                    }
                }

                const nodeName = `ai_generated_${Date.now()}`;
                const newNode = new EditableShapeNode(doc, nodeName, finalShapeToRender);

                if (parsedAiCode.materialRef && typeof parsedAiCode.materialRef === "string") {
                    const materialRef: string = parsedAiCode.materialRef;
                    Logger.info(
                        `AiCadExecutionService: Attempting to apply materialRef "${materialRef}" to CadQuery result.`,
                    );
                    try {
                        const materialMatch = materialRef.match(/^([A-Z_]+)\.([A-Z_]+)$/i); // Adjusted regex to allow underscores in category/preset

                        if (!materialMatch) {
                            Logger.warn(
                                `AiCadExecutionService: Invalid materialRef format "${materialRef}". Expected "CATEGORY.PRESET_NAME". Skipping material assignment.`,
                            );
                        } else {
                            const [_, categoryNameInput, presetNameInput] = materialMatch;
                            const categoryName = categoryNameInput.toUpperCase();
                            const presetName = presetNameInput.toUpperCase();
                            const categoryKey = Object.keys(MaterialCategory).find(
                                (key) =>
                                    MaterialCategory[key as keyof typeof MaterialCategory].toUpperCase() ===
                                    categoryName,
                            );

                            if (!categoryKey) {
                                Logger.warn(
                                    `AiCadExecutionService: Unknown material category "${categoryName}" in materialRef "${materialRef}". Available categories: ${Object.values(MaterialCategory).join(", ")}. Skipping.`,
                                );
                            } else {
                                const categoryPresets = (MaterialLibrary as any)[categoryName];

                                if (!categoryPresets || typeof categoryPresets !== "object") {
                                    Logger.warn(
                                        `AiCadExecutionService: Could not find presets for category "${categoryName}". MaterialLibrary might not have this category. Skipping.`,
                                    );
                                } else {
                                    const presetKey = Object.keys(categoryPresets).find(
                                        (key) => key.toUpperCase() === presetName,
                                    );

                                    if (!presetKey) {
                                        Logger.warn(
                                            `AiCadExecutionService: Unknown material preset "${presetName}" in category "${categoryName}". Available presets: ${Object.keys(categoryPresets).join(", ")}. Skipping.`,
                                        );
                                    } else {
                                        const materialPreset = (categoryPresets as any)[presetKey];
                                        const material = MaterialLibrary.createMaterial(doc, materialPreset);
                                        doc.materials.push(material);
                                        newNode.materialId = material.id;
                                        Logger.info(
                                            `AiCadExecutionService: Successfully applied material '${material.name}' (ID: ${material.id}) to CadQuery result node '${newNode.name}'.`,
                                        );
                                    }
                                }
                            }
                        }
                    } catch (materialError: any) {
                        Logger.error(
                            `AiCadExecutionService: Error applying material "${materialRef}" to CadQuery result node: ${materialError.message || materialError}`,
                            materialError,
                        );
                    }
                }

                doc.addNode(newNode);
                Logger.info(
                    `AiCadExecutionService: Added new EditableShapeNode '${newNode.name}' (ID: ${newNode.id}) to document.`,
                );

                if (resultData.logs && resultData.logs.length > 0) {
                    Logger.info(
                        "AiCadExecutionService: Logs from CadQuery service:",
                        resultData.logs.join("\n"),
                    );
                }

                doc.visual.update();
                if (this.app.storage) {
                    let exportedVariableName = "unknown";
                    const exportMatch = payload.script.match(
                        /cq\.exporters\.export\s*\(\s*([^,]+?)\s*,\s*['"`]_internal_output\.(step|stl|gltf)['"`]/,
                    );
                    if (exportMatch && exportMatch[1]) {
                        exportedVariableName = exportMatch[1].trim();
                    }

                    const scriptRecordData = {
                        python_script: payload.script,
                        document_id: doc.id,
                        shape_name: newNode.name,
                        exported_variable_name: exportedVariableName,
                        timestamp: new Date().toISOString(),
                        source: "cadquery_ai_generation",
                    };
                    try {
                        await this.app.storage.put(
                            Constants.DBName,
                            "CadQueryExecutions",
                            newNode.id,
                            scriptRecordData,
                        );
                        Logger.info(
                            `Saved CadQuery script and metadata for node ID ${newNode.id} (exported var: ${exportedVariableName}) to storage.`,
                        );
                    } catch (storageError: any) {
                        Logger.error(
                            `Failed to save CadQuery script for node ID ${newNode.id} to local storage:`,
                            storageError,
                        );
                    }
                } else {
                    Logger.warn(
                        "Storage service not available on app. Cannot save CadQuery script execution history.",
                    );
                }

                try {
                    await doc.save();
                    Logger.info(`Document saved after CadQuery execution. Document ID: ${doc.id}`);
                } catch (saveError) {
                    Logger.error(`Failed to save document after CadQuery execution: ${saveError}`);
                }
                return Result.ok({ message: "CadQuery task executed and node added.", node: newNode });
            } else {
                Logger.error(
                    "AiCadExecutionService: CadQuery service success response was malformed or had no output files.",
                    resultData,
                );
                return Result.err(
                    "CadQuery service error: Success response was malformed or had no output_files.",
                );
            }
        } catch (processingError: any) {
            Logger.error(
                "AiCadExecutionService: Error during CadQuery task internal processing:",
                processingError,
            );
            return Result.err(
                `CadQuery task processing failed: ${processingError.message || processingError}`,
            );
        }
    }
}
