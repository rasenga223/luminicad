import {
    AI_CONFIG,
    AiCadExecutionService,
    CODE_EXEC_CONFIG,
    ContentPart,
    deleteShapeToolSchema,
    DSLExecutionService,
    editShapeToolSchema,
    JsonExecutionService,
    OpenRouterClient,
    OpenRouterMessage,
    ShapeEditingTool,
    Tool,
} from "luminicad-ai";
import { Constants, I18n, IApplication, Logger, Result } from "luminicad-core";
import { marked, MarkedOptions } from "marked";
import { button, div, span, svg } from "../components";
import style from "./chat.module.css";

export class ChatInterface extends HTMLElement {
    private chatHistory: HTMLDivElement;
    private inputField: HTMLInputElement;
    private modelSelector: HTMLSelectElement;
    private messages: OpenRouterMessage[] = [];
    private _app: IApplication | undefined;
    private isMinimized: boolean = false;
    private minimizedSidebar: HTMLDivElement;

    private currentConversationId: string | null = null;
    private currentConversationDocumentId: string | null = null;
    private isInitializingConversation: boolean = false;

    private conversationListContainer: HTMLDivElement;
    private isConversationListVisible: boolean = false;

    private shapesListContainer: HTMLDivElement;
    private isShapesListVisible: boolean = false;

    constructor(
        app: IApplication,
        private readonly aiClient: OpenRouterClient,
    ) {
        super();
        this._app = app;
        this.className = style.chatContainer;
        this.style.display = "flex";

        this.shapesListContainer = div({
            className: style.shapesListContainer,
            style: "display: none;",
        });

        this.minimizedSidebar = div(
            {
                className: style.minimizedSidebar,
                style: "display: none;",
            },
            button({
                className: style.expandButton,
                onclick: () => this.toggleMinimize(),
                innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>`,
            }),
        );

        const conversationHistoryButton = button({
            className: `${style.headerButton} ${style.conversationHistoryButton}`,
            title: "Show conversations for this document",
            onclick: () => this.toggleConversationList(),
            innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 6H3M21 12H3M21 18H3"/><path d="M12 4v16"/></svg>`,
        });

        const newConversationButton = button({
            className: `${style.headerButton} ${style.newConversationButton}`,
            title: "Start a new conversation for this document",
            onclick: () => this.ensureConversationContext(this.app.activeView?.document?.id || null, true),
            innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        });

        const shapesListButton = button({
            className: style.headerButton,
            title: I18n.translate("chat.shapesList.currentDocument"),
            onclick: () => this.toggleShapesList(),
            innerHTML: `<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M3 10h18M3 14h18\"/></svg>`,
        });

        const header = div(
            { className: style.header },
            span({ textContent: I18n.translate("chat.title") }),
            div(
                { className: style.headerButtons },
                conversationHistoryButton,
                newConversationButton,
                shapesListButton,
                button({
                    className: `${style.headerButton} ${style.debugButton}`,
                    title: "Log document as DSL to console",
                    onclick: () => this.logDocumentAsDsl(),
                    innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>`,
                }),
                button({
                    className: `${style.headerButton} ${style.closeButton}`,
                    onclick: () => this.toggleMinimize(),
                    innerHTML: `<svg viewBox="0 0 24 24" fill="currentColor" enable-background="new 0 0 24 24" xml:space="preserve">
                            <g>
                                <g>
                                    <g>
                                        <path d="M20,24H4c-2.2,0-4-1.8-4-4V4c0-2.2,1.8-4,4-4h16c2.2,0,4,1.8,4,4v16C24,22.2,22.2,24,20,24z M4,2C2.9,2,2,2.9,2,4v16 c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V4c0-1.1-0.9-2-2-2H4z"></path>
                                    </g>
                                </g>
                                <g>
                                    <g>
                                        <path d="M8,24c-0.6,0-1-0.4-1-1V1c0-0.6,0.4-1,1-1s1,0.4,1,1v22C9,23.6,8.6,24,8,24z"></path>
                                    </g>
                                </g>
                                <g>
                                    <g>
                                        <path d="M14,13c-0.3,0-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l3-3c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4l-3,3C14.5,12.9,14.3,13,14,13z"></path>
                                    </g>
                                </g>
                                <g>
                                    <g>
                                        <path d="M17,16c-0.3,0-0.5-0.1-0.7-0.3l-3-3c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l3,3c0.4,0.4,0.4,1,0,1.4C17.5,15.9,17.3,16,17,16z"></path>
                                    </g>
                                </g>
                            </g>
                        </svg>`,
                }),
            ),
        );

        this.chatHistory = div({ className: style.chatHistory });
        this.inputField = this.createInputField();
        this.modelSelector = this.createModelSelector();

        this.conversationListContainer = div({
            className: style.conversationListContainer,
            style: "display: none;",
        });

        const options: MarkedOptions = {
            breaks: true,
            gfm: true,
        };
        marked.setOptions(options);

        const inputContainer = div(
            { className: style.inputContainer },
            this.inputField,
            button({
                className: style.sendButton,
                onclick: () => this.handleSend(),
                innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20V4"></path>
                        <path d="M5 11l7-7 7 7"></path>
                    </svg>`,
            }),
        );

        const modelContainer = div({ className: style.modelContainer }, this.modelSelector);

        this.append(
            header,
            this.shapesListContainer,
            this.conversationListContainer,
            this.chatHistory,
            modelContainer,
            inputContainer,
        );

        this.ensureConversationContext(null);

        document.addEventListener("click", this.handleDocumentClick.bind(this));

        const resizeHandle = document.createElement("div");
        resizeHandle.className = style.resizeHandle;
        this.insertBefore(resizeHandle, this.firstChild);

        let isResizing = false;
        let resizeStartX = 0;
        let resizeStartWidth = 0;

        function clampVW(vw: number) {
            return Math.max(20, Math.min(40, vw));
        }

        resizeHandle.addEventListener("mousedown", (e) => {
            isResizing = true;
            resizeHandle.classList.add(style.active);
            resizeStartX = e.clientX;
            const chatRect = this.getBoundingClientRect();
            resizeStartWidth = (chatRect.width / window.innerWidth) * 100;
            document.body.style.cursor = "ew-resize";
            e.preventDefault();
        });
        document.addEventListener("mousemove", (e) => {
            if (!isResizing) return;
            const dx = e.clientX - resizeStartX;
            let newVW = resizeStartWidth - (dx * 100) / window.innerWidth;
            newVW = clampVW(newVW);
            this.style.width = `${newVW}vw`;
        });
        document.addEventListener("mouseup", () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove(style.active);
                document.body.style.cursor = "";
            }
        });
    }

    connectedCallback() {
        if (this.minimizedSidebar && !this.minimizedSidebar.parentElement) {
            this.parentElement?.appendChild(this.minimizedSidebar);
        }
        if (!this.currentConversationId) {
            this.ensureConversationContext(null);
        }
    }

    disconnectedCallback() {
        this.minimizedSidebar?.remove();
        document.removeEventListener("click", this.handleDocumentClick.bind(this));
    }

    private get app(): IApplication {
        if (this._app === undefined) {
            throw new Error("Application is not initialized");
        }
        return this._app;
    }

    private createInputField() {
        const el = document.createElement("input");
        el.type = "text";
        el.className = style.input;
        el.placeholder = I18n.translate("chat.placeholder");

        const stopKeys = (e: KeyboardEvent) => {
            e.stopPropagation();
        };
        el.addEventListener("keydown", stopKeys);
        el.addEventListener("keypress", stopKeys);

        el.addEventListener("keyup", (e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
                this.handleSend();
            }
        });

        return el;
    }

    private createModelSelector() {
        const select = document.createElement("select");
        select.className = style.modelSelector;

        CODE_EXEC_CONFIG.availableModels.forEach((model: { id: string; name: string }) => {
            const option = document.createElement("option");
            option.value = model.id;
            option.textContent = model.name;
            select.appendChild(option);
        });

        const debugButton = document.createElement("button");
        debugButton.className = style.debugButton;
        debugButton.title = "Log document as DSL to console";
        debugButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
            <path d="M12 16v.01"></path>
            <path d="M12 8v4"></path>
        </svg>`;

        debugButton.addEventListener("click", () => this.logDocumentAsDsl());

        const container = document.createElement("div");
        container.className = style.modelSelectorContainer;
        container.appendChild(select);
        container.appendChild(debugButton);

        return select;
    }

    private handleModelChange(modelId: string) {
        Logger.info(`Chat model selection changed to: ${modelId}`);
    }

    private async ensureConversationContext(documentId: string | null, forceNew: boolean = false) {
        if (this.isInitializingConversation && !forceNew) return;
        if (!forceNew && this.currentConversationId && this.currentConversationDocumentId === documentId) {
            return;
        }

        if (!this.app.storage) {
            Logger.warn(
                "ChatInterface: Storage service not available. Cannot initialize/switch conversation.",
            );
            if (this.messages.length === 0) {
                this.messages.push(OpenRouterClient.createSystemMessage(AI_CONFIG.systemPrompt));
            }
            return;
        }

        this.isInitializingConversation = true;
        Logger.info(
            `ChatInterface: Ensuring conversation context for document ID: ${documentId}. Force new: ${forceNew}`,
        );
        this.chatHistory.innerHTML = "";
        const loadingIndicator = createLoadingIndicator();
        this.chatHistory.appendChild(loadingIndicator);

        try {
            const newConversationId = crypto.randomUUID();
            const conversationTitle = documentId
                ? `Chat for doc: ${documentId.substring(0, 8)}...`
                : `LuminiCAD AI Chat - ${new Date().toLocaleString()}`;

            const conversationData = {
                title: conversationTitle,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                document_id: documentId,
            };

            const success = await this.app.storage.put(
                Constants.DBName,
                "Conversations",
                newConversationId,
                conversationData,
            );

            if (success) {
                this.currentConversationId = newConversationId;
                this.currentConversationDocumentId = documentId;
                Logger.info(
                    `ChatInterface: Conversation context ensured. New ID: ${this.currentConversationId}, Document ID: ${this.currentConversationDocumentId}`,
                );

                const systemMessage = OpenRouterClient.createSystemMessage(AI_CONFIG.systemPrompt);
                this.messages = [systemMessage];
                await this.saveMessageToStorage(systemMessage);
            } else {
                Logger.error(
                    "ChatInterface: Failed to save new conversation to storage for context switch.",
                );
                if (this.messages.length === 0) {
                    this.messages.push(OpenRouterClient.createSystemMessage(AI_CONFIG.systemPrompt));
                }
            }
        } catch (error) {
            Logger.error("ChatInterface: Error ensuring conversation context:", error);
            if (this.messages.length === 0) {
                this.messages.push(OpenRouterClient.createSystemMessage(AI_CONFIG.systemPrompt));
            }
        } finally {
            if (this.chatHistory.contains(loadingIndicator)) {
                this.chatHistory.removeChild(loadingIndicator);
            }
            this.isInitializingConversation = false;
        }
    }

    private async saveMessageToStorage(
        message: OpenRouterMessage,
        modelUsed?: string,
        cadQueryExecutionId?: string,
    ) {
        if (!this.app.storage || !this.currentConversationId) {
            Logger.warn(
                "ChatInterface: Storage service or currentConversationId not available. Cannot save message.",
            );
            return;
        }
        const messageId = crypto.randomUUID();
        const messageData = {
            conversation_id: this.currentConversationId,
            role: message.role,
            content: message.content,
            model_used: modelUsed || null,
            cad_query_execution_id: cadQueryExecutionId || null,
            timestamp: new Date().toISOString(),
        };

        try {
            await this.app.storage.put(Constants.DBName, "ChatMessages", messageId, messageData);
            Logger.info(
                `ChatInterface: Message saved to storage. Conversation ID: ${this.currentConversationId}, Message ID: ${messageId}, Role: ${message.role}`,
            );
        } catch (error) {
            Logger.error(`ChatInterface: Failed to save message (ID: ${messageId}) to storage:`, error);
        }
    }

    private extractCodeBlock(text: string): string | null {
        const codeBlockRegex = /\`\`\`(?:json|javascript|typescript|js|ts)?\n([\s\S]+?)\n\`\`\`/i;
        const match = text.match(codeBlockRegex);
        if (match && match[1]) {
            return match[1].trim();
        }
        const trimmedText = text.trim();
        if (
            trimmedText.startsWith("{") ||
            trimmedText.startsWith("(") ||
            trimmedText.startsWith("const") ||
            trimmedText.startsWith("let") ||
            trimmedText.startsWith("var") ||
            trimmedText.startsWith("async") ||
            trimmedText.startsWith("function")
        ) {
            return null;
        }
        return null;
    }

    private getMessageStringContent(content: string | ContentPart[] | null): string {
        if (typeof content === "string") {
            return content;
        }
        if (Array.isArray(content)) {
            return content
                .filter((part) => part.type === "text")
                .map((part) => (part as { type: "text"; text: string }).text)
                .join("\n");
        }
        return "";
    }

    private async handleSend() {
        const hasApiKey = (() => {
            try {
                return !!(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (
                        (window as any).LUMINI_OPENROUTER_API_KEY ||
                        window.localStorage?.getItem("OPENROUTER_API_KEY")
                    )
                );
            } catch {
                return false;
            }
        })();
        if (!hasApiKey) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const promptFn = (window as any).__luminiPromptApiKeyIfNeeded as (() => void) | undefined;
                if (typeof promptFn === "function") {
                    promptFn();
                } else {
                    alert(
                        "Please set your OpenRouter API key to use AI. You can obtain one at openrouter.ai.",
                    );
                }
            } catch {}
            return;
        }

        const userMessageText = this.inputField.value.trim();
        if (!userMessageText) return;

        const activeDocId = this.app.activeView?.document?.id || null;

        if (!this.currentConversationId || this.currentConversationDocumentId !== activeDocId) {
            Logger.info(
                `ChatInterface: Active document (${activeDocId}) differs from current conversation's document (${this.currentConversationDocumentId}) or no conversation active. Ensuring context.`,
            );
            await this.ensureConversationContext(activeDocId, true);
        } else if (this.messages.length === 0) {
            Logger.info(
                `ChatInterface: Current conversation (${this.currentConversationId}) matches document but messages empty. Adding system prompt.`,
            );
            this.messages.push(OpenRouterClient.createSystemMessage(AI_CONFIG.systemPrompt));
        }

        this.inputField.value = "";

        let augmentedUserMessageText = userMessageText;
        let selectedShapeDisplayNames: string[] = [];

        const currentDoc = this.app.activeView?.document;
        if (currentDoc) {
            const selectedNodes = currentDoc.selection.getSelectedNodes();
            if (selectedNodes.length > 0) {
                selectedShapeDisplayNames = selectedNodes.map((node) => node.name);
                let selectionInfo = "\n\n--- BEGIN CONTEXT: SELECTED SHAPES ---\n";
                selectionInfo +=
                    'The following shapes are currently selected in the editor. If your task involves modifying or referencing these, use their names or IDs. To use them as input for a CadQuery script, list them in the \'input_files\' array in your JSON output, e.g., { "variable_name": "shape_name_as_variable", "output_filename_for_script": "input_shape.step" }.\n\nSelected Shapes:\n';
                for (const node of selectedNodes) {
                    const actualNode = node as any;
                    selectionInfo += `- Name: '${actualNode.name}', ID: '${actualNode.id}', Type: '${actualNode.type || "unknown"}'\n`;
                    const cadJson = actualNode.properties?.get("cadQueryJsonString");
                    if (typeof cadJson === "string" && cadJson.length > 0) {
                        selectionInfo += `  (This shape was generated from a CadQuery script.)\n`;
                        selectionInfo += `  Original CadQuery JSON:\n  \`\`\`json\n${cadJson}\n  \`\`\`\n`;
                        try {
                            const execRecord = await this.app.storage.get(
                                Constants.DBName,
                                "CadQueryExecutions",
                                actualNode.id,
                            );
                            if (execRecord?.python_script) {
                                selectionInfo += `  Saved Python script from DB:\n  \`\`\`python\n${execRecord.python_script}\n  \`\`\`\n`;
                            }
                        } catch (e: any) {
                            Logger.warn(
                                `ChatInterface.handleSend: Unable to fetch CadQuery execution record for node ${actualNode.id}: ${e.message}`,
                            );
                        }
                    }
                    try {
                        const docRecord = await this.app.storage.get(
                            Constants.DBName,
                            Constants.DocumentTable,
                            currentDoc.id,
                        );
                        const nodesArray = docRecord?.properties?.nodes as any[] | undefined;
                        const serializedNode = nodesArray?.find((n) => n.id === actualNode.id);
                        if (serializedNode) {
                            selectionInfo += `  Serialized node data from DB:\n  \`\`\`json\n${JSON.stringify(serializedNode, null, 2)}\n  \`\`\`\n`;
                        }
                    } catch (e: any) {
                        Logger.warn(
                            `ChatInterface.handleSend: Unable to fetch document record for shapes list context: ${e.message}`,
                        );
                    }
                }
                selectionInfo += "--- END CONTEXT: SELECTED SHAPES ---\n";
                augmentedUserMessageText += selectionInfo;
                Logger.info("ChatInterface: Appended selected shapes context to user message for AI.");
            }
        }

        this.addMessage(userMessageText, "user", false, false, selectedShapeDisplayNames);

        const userMessageForAI = OpenRouterClient.createUserMessage(augmentedUserMessageText);
        this.messages.push(userMessageForAI);
        await this.saveMessageToStorage(userMessageForAI);

        const loadingEl = createLoadingIndicator();
        this.chatHistory.appendChild(loadingEl);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;

        let conversationComplete = false;
        let interactionCount = 0;
        const MAX_INTERACTIONS = 5;

        while (!conversationComplete && interactionCount < MAX_INTERACTIONS) {
            interactionCount++;
            Logger.info(
                `ChatInterface.handleSend: Interaction loop attempt ${interactionCount}/${MAX_INTERACTIONS}`,
            );

            const currentModel = this.modelSelector.value;
            let llmResponse: OpenRouterMessage | null = null;

            try {
                const availableTools: Tool[] = [deleteShapeToolSchema as Tool, editShapeToolSchema as Tool];

                const responseResult = await this.aiClient.chat(this.messages, {
                    model: currentModel,
                    tools: availableTools,
                    tool_choice: "auto",
                });

                if (!responseResult.isOk) {
                    const errorMsg = `AI Client Error: ${responseResult.error}`;
                    Logger.error(errorMsg);
                    const errorDisplayMessage: OpenRouterMessage = {
                        role: "assistant",
                        content: `Error from AI: ${errorMsg}`,
                    };
                    this.messages.push(errorDisplayMessage);
                    await this.saveMessageToStorage(errorDisplayMessage, currentModel);
                    this.addMessage(`Error from AI: ${errorMsg}`, "assistant");
                    conversationComplete = true;
                    break;
                }

                llmResponse = responseResult.value;
                this.messages.push(llmResponse);
                await this.saveMessageToStorage(llmResponse, currentModel);

                if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
                    const toolCall = llmResponse.tool_calls[0];
                    const functionName = toolCall.function.name;
                    const functionArgsString = toolCall.function.arguments;
                    let functionArgs: any;

                    try {
                        functionArgs = JSON.parse(functionArgsString);
                    } catch (e: any) {
                        Logger.error(
                            `ChatInterface: Failed to parse tool arguments JSON: ${e.message}. Args: ${functionArgsString}`,
                        );
                        const toolExecErrorMsg = `Error: Could not parse arguments for tool ${functionName}.`;
                        this.addMessage(toolExecErrorMsg, "assistant", false, true);
                        const toolResponseMessage: OpenRouterMessage = {
                            role: "tool",
                            tool_call_id: toolCall.id,
                            name: functionName,
                            content: JSON.stringify({
                                success: false,
                                error: "Failed to parse arguments JSON: " + e.message,
                            }),
                        };
                        this.messages.push(toolResponseMessage);
                        await this.saveMessageToStorage(toolResponseMessage, "tool_result_error");
                        continue;
                    }

                    let userFriendlyToolMessage = `AI is working...`;
                    if (functionName === "deleteShape") {
                        userFriendlyToolMessage = `AI is attempting to delete shape: ${functionArgs.identifier}...`;
                    } else if (functionName === "editShape") {
                        userFriendlyToolMessage = `AI is attempting to edit shape: ${functionArgs.identifier}...`;
                    } else if (
                        functionName.toLowerCase().includes("read") ||
                        functionName.toLowerCase().includes("get")
                    ) {
                        userFriendlyToolMessage = `AI is reading information...`;
                    }

                    this.addMessage(userFriendlyToolMessage, "assistant", false, true);

                    let toolExecutionResult: Result<any, string>;

                    if (functionName === "deleteShape") {
                        if (!functionArgs.identifier) {
                            toolExecutionResult = Result.err(
                                "Missing 'identifier' argument for deleteShape tool.",
                            );
                        } else {
                            toolExecutionResult = await ShapeEditingTool.deleteShape(
                                functionArgs.identifier,
                                this.app,
                            );
                        }
                    } else if (functionName === "editShape") {
                        if (!functionArgs.identifier || !functionArgs.cadQueryJsonString) {
                            toolExecutionResult = Result.err(
                                "Missing 'identifier' or 'cadQueryJsonString' argument for editShape tool.",
                            );
                        } else {
                            toolExecutionResult = await ShapeEditingTool.editShape(
                                functionArgs.identifier,
                                functionArgs.cadQueryJsonString,
                                this.app,
                            );
                        }
                    } else {
                        Logger.warn(`ChatInterface: AI requested an unknown tool: ${functionName}`);
                        toolExecutionResult = Result.err(`Unknown tool requested: ${functionName}`);
                    }

                    const toolResponseMessageContent = toolExecutionResult.isOk
                        ? JSON.stringify({ success: true, data: toolExecutionResult.value })
                        : JSON.stringify({ success: false, error: toolExecutionResult.error });

                    if (toolExecutionResult.isOk) {
                        let successMessage = `Tool ${functionName} executed successfully.`;
                        if (functionName === "editShape" && toolExecutionResult.value?.newNodeName) {
                            const { newNodeName, newNodeId, message } = toolExecutionResult.value as {
                                newNodeName: string;
                                newNodeId: string;
                                message: string;
                            };
                            const originalIdentifierMatch = message.match(/Shape identified by "(.*?)"/);
                            const originalIdentifierText = originalIdentifierMatch
                                ? originalIdentifierMatch[1]
                                : functionArgs.identifier;
                            successMessage = `✅ Shape '${originalIdentifierText}' successfully edited. New shape: '${newNodeName}' (ID: ${newNodeId}).`;
                        } else if (functionName === "deleteShape") {
                            successMessage = `✅ Shape '${functionArgs.identifier}' successfully deleted.`;
                        }
                        this.addMessage(successMessage, "assistant", false, true);
                    } else {
                        this.addMessage(
                            `Tool ${functionName} execution failed. Error: ${toolExecutionResult.error}`,
                            "assistant",
                            false,
                            true,
                        );
                    }

                    const toolResponseMessage: OpenRouterMessage = {
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: functionName,
                        content: toolResponseMessageContent,
                    };
                    this.messages.push(toolResponseMessage);
                    await this.saveMessageToStorage(toolResponseMessage, "tool_result");
                } else if (llmResponse.content) {
                    const assistantResponseText = this.getMessageStringContent(llmResponse.content);

                    // Attempt to extract and auto-execute from the textual response (CadQuery JSON, LuminiCAD JSON, or JavaScript code).
                    const extractedCode = this.extractCodeBlock(assistantResponseText);
                    let isCadQueryAttempt = false;
                    let isJsonImportAttempt = false;
                    let isJavaScriptCodeAttempt = false;
                    if (extractedCode) {
                        try {
                            const parsedCode = JSON.parse(extractedCode);
                            Logger.info(`ChatInterface: Parsed JSON code:`, parsedCode);
                            if (parsedCode && parsedCode.tool === "cadquery") {
                                isCadQueryAttempt = true;
                                Logger.info(`ChatInterface: Detected CadQuery JSON`);
                            } else if (
                                parsedCode &&
                                typeof parsedCode === "object" &&
                                (Array.isArray(parsedCode.nodes) ||
                                    (parsedCode.classKey === "Document" &&
                                        parsedCode.properties &&
                                        Array.isArray(parsedCode.properties.nodes)) ||
                                    Array.isArray(parsedCode.materials) ||
                                    (parsedCode.name &&
                                        (Array.isArray(parsedCode.nodes) ||
                                            Array.isArray(parsedCode.materials))))
                            ) {
                                isJsonImportAttempt = true;
                                Logger.info(`ChatInterface: Detected LuminiCAD JSON import attempt`);
                            } else {
                                Logger.info(
                                    `ChatInterface: JSON detected but not recognized as LuminiCAD format:`,
                                    parsedCode,
                                );
                            }
                        } catch (e) {
                            Logger.info(
                                `ChatInterface: Failed to parse as JSON, checking if it looks like malformed JSON:`,
                                e,
                            );
                            const trimmed = extractedCode.trim();
                            if (
                                trimmed.startsWith("{") &&
                                trimmed.includes('"classKey"') &&
                                (trimmed.includes('"nodes"') ||
                                    trimmed.includes('"materials"') ||
                                    trimmed.includes('"Document"'))
                            ) {
                                isJsonImportAttempt = true;
                                Logger.info(
                                    `ChatInterface: Detected malformed LuminiCAD JSON, will attempt execution for error feedback`,
                                );
                            } else {
                                Logger.info(`ChatInterface: Checking for JavaScript code patterns`);
                            }
                            if (
                                extractedCode.includes("new BoxNode") ||
                                extractedCode.includes("new CircleNode") ||
                                extractedCode.includes("new CylinderNode") ||
                                extractedCode.includes("addNode(") ||
                                extractedCode.includes("document") ||
                                extractedCode.includes("storeVariable") ||
                                extractedCode.includes("booleanCut") ||
                                extractedCode.includes("booleanFuse") ||
                                extractedCode.includes("booleanCommon") ||
                                extractedCode.includes("const ") ||
                                extractedCode.includes("let ") ||
                                extractedCode.includes("var ") ||
                                extractedCode.includes("function ") ||
                                extractedCode.includes("async ") ||
                                extractedCode.includes("await ")
                            ) {
                                isJavaScriptCodeAttempt = true;
                            }
                        }
                    }

                    if (isCadQueryAttempt && extractedCode) {
                        Logger.info(
                            `ChatInterface: Attempting to auto-execute CadQuery from AI's textual response. Interaction: ${interactionCount}`,
                        );

                        const service = this.app.services.find(
                            (s) => s instanceof AiCadExecutionService,
                        ) as AiCadExecutionService;

                        if (!service) {
                            const execError =
                                "Execution Error: AiCadExecutionService not found for auto-execution.";
                            Logger.error(execError);
                            if (this.chatHistory.contains(loadingEl)) {
                                this.chatHistory.removeChild(loadingEl);
                            }
                            this.addMessage(execError, "assistant", false, true);
                            conversationComplete = true;
                        } else {
                            const executionResult = await service.executeCode(extractedCode);

                            if (executionResult.isOk) {
                                if (this.chatHistory.contains(loadingEl)) {
                                    this.chatHistory.removeChild(loadingEl);
                                }
                                this.addMessage(assistantResponseText, "assistant");
                                const successMsgText = "✅ Shape generated successfully!";
                                this.addMessage(successMsgText, "assistant", false, true);

                                const cadExecutionId = executionResult.value?.node?.id;
                                await this.saveMessageToStorage(llmResponse, currentModel, cadExecutionId);
                                const successSystemMessage: OpenRouterMessage = {
                                    role: "assistant",
                                    content: successMsgText,
                                };
                                await this.saveMessageToStorage(
                                    successSystemMessage,
                                    "system_feedback",
                                    cadExecutionId,
                                );

                                this.app.activeView?.cameraController?.fitContent();
                                conversationComplete = true;
                            } else {
                                const lastError = executionResult.error;
                                Logger.warn(
                                    `ChatInterface: Auto-execution of CadQuery failed (Interaction ${interactionCount}): ${lastError}`,
                                );

                                if (this.chatHistory.contains(loadingEl)) {
                                    this.chatHistory.removeChild(loadingEl);
                                }
                                this.addMessage(
                                    `Attempt ${interactionCount}/${MAX_INTERACTIONS}: AI shape generation failed. Asking AI for correction...`,
                                    "assistant",
                                    false,
                                    true,
                                );
                                if (!this.chatHistory.contains(loadingEl)) {
                                    this.chatHistory.appendChild(loadingEl);
                                }

                                const feedbackText = `The previous CadQuery script attempt (provided directly in your text response) failed with the following error:\n\`\`\`\n${lastError}\n\`\`\`\nPlease analyze the error and provide a corrected CadQuery script in the required JSON format, or try a different approach.`;
                                const feedbackMessage = OpenRouterClient.createUserMessage(feedbackText);

                                this.messages.push(feedbackMessage);
                                await this.saveMessageToStorage(feedbackMessage, "user_feedback_to_ai");

                                conversationComplete = false;
                            }
                        }
                    } else if (isJsonImportAttempt && extractedCode) {
                        Logger.info(
                            `ChatInterface: Attempting to auto-import LuminiCAD JSON from AI's textual response. Interaction: ${interactionCount}`,
                        );
                        const jsonService = this.app.services.find(
                            (s) => s instanceof JsonExecutionService,
                        ) as JsonExecutionService | undefined;
                        if (!jsonService) {
                            const execError =
                                "Execution Error: JsonExecutionService not found for auto-import.";
                            Logger.error(execError);
                            if (this.chatHistory.contains(loadingEl)) {
                                this.chatHistory.removeChild(loadingEl);
                            }
                            this.addMessage(execError, "assistant", false, true);
                            conversationComplete = true;
                        } else {
                            const executionResult = await jsonService.executeJson(extractedCode);
                            if (executionResult.isOk) {
                                if (this.chatHistory.contains(loadingEl)) {
                                    this.chatHistory.removeChild(loadingEl);
                                }
                                this.addMessage(assistantResponseText, "assistant");
                                const successMsgText = "✅ Model imported successfully!";
                                this.addMessage(successMsgText, "assistant", false, true);

                                const createdRootId = (executionResult.value as any)?.root?.id;
                                await this.saveMessageToStorage(llmResponse, currentModel, createdRootId);
                                const successSystemMessage: OpenRouterMessage = {
                                    role: "assistant",
                                    content: successMsgText,
                                };
                                await this.saveMessageToStorage(
                                    successSystemMessage,
                                    "system_feedback",
                                    createdRootId,
                                );

                                this.app.activeView?.cameraController?.fitContent();
                                conversationComplete = true;
                            } else {
                                const lastError = executionResult.error;
                                Logger.warn(
                                    `ChatInterface: Auto-import of LuminiCAD JSON failed (Interaction ${interactionCount}): ${lastError}`,
                                );
                                if (this.chatHistory.contains(loadingEl)) {
                                    this.chatHistory.removeChild(loadingEl);
                                }
                                this.addMessage(
                                    `Attempt ${interactionCount}/${MAX_INTERACTIONS}: Model import failed. Asking AI for correction...`,
                                    "assistant",
                                    false,
                                    true,
                                );
                                if (!this.chatHistory.contains(loadingEl)) {
                                    this.chatHistory.appendChild(loadingEl);
                                }

                                const feedbackText = `The previous JSON payload you provided failed to import with the following error:\n\`\`\`\n${lastError}\n\`\`\`\nPlease analyze the error and return a corrected LuminiCAD JSON payload that follows the required schema (nodes/materials or a full Document).`;
                                const feedbackMessage = OpenRouterClient.createUserMessage(feedbackText);

                                this.messages.push(feedbackMessage);
                                await this.saveMessageToStorage(feedbackMessage, "user_feedback_to_ai");

                                conversationComplete = false;
                            }
                        }
                    } else if (isJavaScriptCodeAttempt && extractedCode) {
                        Logger.info(
                            `ChatInterface: Attempting to auto-execute JavaScript code from AI's textual response. Interaction: ${interactionCount}`,
                        );

                        const service = this.app.services.find(
                            (s) => s instanceof AiCadExecutionService,
                        ) as AiCadExecutionService;

                        if (!service) {
                            const execError =
                                "Execution Error: AiCadExecutionService not found for JavaScript auto-execution.";
                            Logger.error(execError);
                            if (this.chatHistory.contains(loadingEl)) {
                                this.chatHistory.removeChild(loadingEl);
                            }
                            this.addMessage(execError, "assistant", false, true);
                            conversationComplete = true;
                        } else {
                            const executionResult = await service.executeCode(extractedCode);

                            if (executionResult.isOk) {
                                if (this.chatHistory.contains(loadingEl)) {
                                    this.chatHistory.removeChild(loadingEl);
                                }
                                this.addMessage(assistantResponseText, "assistant");
                                const successMsgText = "✅ Model imported successfully!";
                                this.addMessage(successMsgText, "assistant", false, true);

                                const jsExecutionId = executionResult.value?.node?.id;
                                await this.saveMessageToStorage(llmResponse, currentModel, jsExecutionId);
                                const successSystemMessage: OpenRouterMessage = {
                                    role: "assistant",
                                    content: successMsgText,
                                };
                                await this.saveMessageToStorage(
                                    successSystemMessage,
                                    "system_feedback",
                                    jsExecutionId,
                                );

                                this.app.activeView?.cameraController?.fitContent();
                                conversationComplete = true;
                            } else {
                                const lastError = executionResult.error;
                                Logger.warn(
                                    `ChatInterface: Auto-execution of JavaScript code failed (Interaction ${interactionCount}): ${lastError}`,
                                );

                                if (this.chatHistory.contains(loadingEl)) {
                                    this.chatHistory.removeChild(loadingEl);
                                }
                                this.addMessage(
                                    `Attempt ${interactionCount}/${MAX_INTERACTIONS}: JavaScript code execution failed. Asking AI for correction...`,
                                    "assistant",
                                    false,
                                    true,
                                );
                                if (!this.chatHistory.contains(loadingEl)) {
                                    this.chatHistory.appendChild(loadingEl);
                                }

                                const feedbackText = `The previous JavaScript code attempt (provided directly in your text response) failed with the following error:\n\`\`\`\n${lastError}\n\`\`\`\nPlease analyze the error and provide corrected JavaScript code using the LuminiCAD API, or try a different approach.`;
                                const feedbackMessage = OpenRouterClient.createUserMessage(feedbackText);

                                this.messages.push(feedbackMessage);
                                await this.saveMessageToStorage(feedbackMessage, "user_feedback_to_ai");

                                conversationComplete = false;
                            }
                        }
                    } else {
                        if (this.chatHistory.contains(loadingEl)) {
                            this.chatHistory.removeChild(loadingEl);
                        }
                        this.addMessage(assistantResponseText, "assistant");
                        conversationComplete = true;
                    }
                } else {
                    Logger.warn("ChatInterface: AI response had no tool_calls and no content.");
                    if (this.chatHistory.contains(loadingEl)) {
                        this.chatHistory.removeChild(loadingEl);
                    }
                    this.addMessage("AI returned an empty response.", "assistant");
                    conversationComplete = true;
                }
            } catch (error: any) {
                Logger.error(
                    `ChatInterface.handleSend: Error in interaction loop: ${error.message || error}`,
                    error,
                );
                const loopErrorMsg = `Error during AI interaction: ${error.message || error}`;

                const internalErrorMessage: OpenRouterMessage = { role: "assistant", content: loopErrorMsg };
                this.messages.push(internalErrorMessage);
                await this.saveMessageToStorage(internalErrorMessage, currentModel);
                if (this.chatHistory.contains(loadingEl)) {
                    this.chatHistory.removeChild(loadingEl);
                }
                this.addMessage(loopErrorMsg, "assistant");
                conversationComplete = true;
            }
        }

        if (!conversationComplete && interactionCount >= MAX_INTERACTIONS) {
            Logger.warn(`ChatInterface.handleSend: Max interactions (${MAX_INTERACTIONS}) reached.`);
            if (this.chatHistory.contains(loadingEl)) {
                this.chatHistory.removeChild(loadingEl);
            }
            this.addMessage(
                "Max interactions reached with AI for this request. Please try rephrasing or a new message.",
                "assistant",
            );
        }

        if (this.chatHistory.contains(loadingEl)) {
            this.chatHistory.removeChild(loadingEl);
        }
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    private getDslExecutionService(): DSLExecutionService {
        const service = this.app.services.find(
            (s) => s instanceof DSLExecutionService,
        ) as DSLExecutionService;

        if (!service) {
            throw new Error("DSLExecutionService not found in application services");
        }

        return service;
    }

    private addMessage(
        text: string,
        sender: "user" | "assistant",
        isNewConversationSystemMessage: boolean = false,
        isToolStatusOrFeedback: boolean = false,
        selectedShapeNames?: string[],
    ) {
        if (!isNewConversationSystemMessage) {
            // this.chatHistory.scrollTop = this.chatHistory.scrollHeight; // Scroll before adding if not new system message
        }

        const messageEl = div({ className: `${style.message} ${style[sender]}` });

        if (isToolStatusOrFeedback) {
            messageEl.classList.add(style.toolStatusMessage);

            if (text.includes("✓") || text.includes("✅") || text.includes("successfully")) {
                messageEl.classList.add(style.successStatus);
            } else if (
                text.includes("⚠") ||
                text.includes("failed") ||
                text.includes("error") ||
                text.includes("Error")
            ) {
                messageEl.classList.add(style.errorStatus);
            }
        }

        messageEl.innerHTML = "";

        if (sender === "assistant" && !isToolStatusOrFeedback) {
            const html = marked(text);
            messageEl.innerHTML = html;
            messageEl.querySelectorAll("pre code").forEach((block) => {
                const codeBlock = block as HTMLElement;

                let language =
                    codeBlock.className
                        .split(" ")
                        .find((cls) => cls.startsWith("language-"))
                        ?.replace("language-", "") || "";

                if (
                    language === "" ||
                    language === "javascript" ||
                    language === "typescript" ||
                    language === "json" ||
                    language === "js" ||
                    language === "ts"
                ) {
                    const hiddenCode = codeBlock.innerText;

                    const codeParent = codeBlock.parentElement;
                    if (codeParent) {
                        codeParent.innerHTML = "";
                    }

                    const generatedBox = div({ className: style.generatedBox });
                    generatedBox.textContent = "AI generated shape";

                    const buttonContainer = div({ className: style.codeActions });

                    const executeButton = button(
                        {
                            className: style.codeButton,
                            onclick: async () => {
                                executeButton.disabled = true;
                                try {
                                    // OLD EXECUTION CODE (KEPT FOR REFERENCE):
                                    // Switch execution to JSON import service; keep old AI CAD exec code commented for reference
                                    // const aiService = this.app.services.find((s) => s instanceof AiCadExecutionService) as AiCadExecutionService;
                                    // if (!aiService) throw new Error("AiCadExecutionService not found in application services");
                                    // const aiResult = await aiService.executeCode(hiddenCode);
                                    // const jsonService = this.app.services.find(
                                    //     (s) => s instanceof JsonExecutionService,
                                    // ) as JsonExecutionService | undefined;
                                    // if (!jsonService) {
                                    //     throw new Error(
                                    //         "JsonExecutionService not found in application services",
                                    //     );
                                    // }
                                    // // Execute JSON payload (expects serialized nodes/materials). Uses defaults for options.
                                    // const result = await jsonService.executeJson(hiddenCode);

                                    // NEW EXECUTION CODE - Detect if it's JSON or JavaScript code
                                    let isJsonCode = false;
                                    let isJavaScriptCode = false;

                                    try {
                                        const parsedCode = JSON.parse(hiddenCode);
                                        if (parsedCode && parsedCode.tool === "cadquery") {
                                            isJavaScriptCode = false;
                                            isJsonCode = false;
                                        } else if (
                                            parsedCode &&
                                            typeof parsedCode === "object" &&
                                            (Array.isArray(parsedCode.nodes) ||
                                                (parsedCode.classKey === "Document" &&
                                                    parsedCode.properties &&
                                                    Array.isArray(parsedCode.properties.nodes)))
                                        ) {
                                            isJsonCode = true;
                                        }
                                    } catch (e) {
                                        isJavaScriptCode = true;
                                    }

                                    if (isJavaScriptCode || (!isJsonCode && !isJavaScriptCode)) {
                                        const aiService = this.app.services.find(
                                            (s) => s instanceof AiCadExecutionService,
                                        ) as AiCadExecutionService;
                                        if (!aiService)
                                            throw new Error(
                                                "AiCadExecutionService not found in application services",
                                            );
                                        const result = await aiService.executeCode(hiddenCode);
                                        if (result.isOk) {
                                            this.addMessage(
                                                "✓ JavaScript code executed successfully!",
                                                "assistant",
                                            );
                                            const execSuccessMsg: OpenRouterMessage = {
                                                role: "assistant" as const,
                                                content: "✓ JavaScript code executed successfully!",
                                            };
                                            if (this.currentConversationId) {
                                                await this.saveMessageToStorage(
                                                    execSuccessMsg,
                                                    "system_feedback",
                                                    result.value?.node?.id,
                                                );
                                            } else {
                                                Logger.warn(
                                                    "ChatInterface: No currentConversationId, skipping save for execute button success.",
                                                );
                                            }
                                            this.app.activeView?.cameraController?.fitContent();
                                        } else {
                                            this.addMessage(`⚠ ${result.error}`, "assistant");
                                            const execErrorMsg: OpenRouterMessage = {
                                                role: "assistant" as const,
                                                content: `⚠ ${result.error}`,
                                            };
                                            if (this.currentConversationId) {
                                                await this.saveMessageToStorage(
                                                    execErrorMsg,
                                                    "system_feedback",
                                                );
                                            } else {
                                                Logger.warn(
                                                    "ChatInterface: No currentConversationId, skipping save for execute button error.",
                                                );
                                            }
                                        }
                                    } else if (isJsonCode) {
                                        const jsonService = this.app.services.find(
                                            (s) => s instanceof JsonExecutionService,
                                        ) as JsonExecutionService | undefined;
                                        if (!jsonService) {
                                            throw new Error(
                                                "JsonExecutionService not found in application services",
                                            );
                                        }
                                        const result = await jsonService.executeJson(hiddenCode);
                                        if (result.isOk) {
                                            this.addMessage("✓ JSON imported successfully!", "assistant");
                                            const execSuccessMsg: OpenRouterMessage = {
                                                role: "assistant" as const,
                                                content: "✓ JSON imported successfully!",
                                            };
                                            if (this.currentConversationId) {
                                                await this.saveMessageToStorage(
                                                    execSuccessMsg,
                                                    "system_feedback",
                                                    (result.value as any)?.root?.id,
                                                );
                                            } else {
                                                Logger.warn(
                                                    "ChatInterface: No currentConversationId, skipping save for execute button success.",
                                                );
                                            }
                                            this.app.activeView?.cameraController?.fitContent();
                                        } else {
                                            this.addMessage(`⚠ ${result.error}`, "assistant");
                                            const execErrorMsg: OpenRouterMessage = {
                                                role: "assistant" as const,
                                                content: `⚠ ${result.error}`,
                                            };
                                            if (this.currentConversationId) {
                                                await this.saveMessageToStorage(
                                                    execErrorMsg,
                                                    "system_feedback",
                                                );
                                            } else {
                                                Logger.warn(
                                                    "ChatInterface: No currentConversationId, skipping save for execute button error.",
                                                );
                                            }
                                        }
                                    }
                                } catch (error) {
                                    const errorMsgText = `⚠ Error executing code: ${error}`;
                                    this.addMessage(errorMsgText, "assistant");
                                    const catchErrorMsg: OpenRouterMessage = {
                                        role: "assistant" as const,
                                        content: errorMsgText,
                                    };
                                    if (this.currentConversationId) {
                                        await this.saveMessageToStorage(catchErrorMsg, "system_feedback");
                                    } else {
                                        Logger.warn(
                                            "ChatInterface: No currentConversationId, skipping save for execute button catch error.",
                                        );
                                    }
                                } finally {
                                    executeButton.disabled = false;
                                }
                            },
                        },
                        svg({
                            icon: "lightning",
                            innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>
                                        </svg>`,
                        }),
                        span({ textContent: "Execute" }),
                    );

                    buttonContainer.appendChild(executeButton);
                    generatedBox.appendChild(buttonContainer);

                    if (codeParent) {
                        codeParent.appendChild(generatedBox);
                    }
                }
            });
        } else if (sender === "user") {
            const userTextSpan = span({ textContent: text });
            messageEl.appendChild(userTextSpan);

            if (selectedShapeNames && selectedShapeNames.length > 0) {
                const contextContainer = div({ className: style.selectedShapesContextContainer });
                const contextTitle = span({
                    className: style.selectedShapesContextTitle,
                    textContent: "Context:",
                });
                contextContainer.appendChild(contextTitle);

                selectedShapeNames.forEach((name) => {
                    const shapeItem = span({
                        className: style.selectedShapeItem,
                        textContent: name,
                        title: name,
                    });
                    contextContainer.appendChild(shapeItem);
                });
                messageEl.appendChild(contextContainer);
            }
        } else {
            messageEl.textContent = text;
        }
        this.chatHistory.appendChild(messageEl);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }

    private toggleMinimize() {
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            this.style.display = "none";
            this.style.width = "44px";
            this.minimizedSidebar.style.display = "flex";
            const resizeHandle = this.querySelector(`.${style.resizeHandle}`) as HTMLElement;
            if (resizeHandle) resizeHandle.style.display = "none";
        } else {
            this.style.display = "flex";
            this.style.width = "";
            this.minimizedSidebar.style.display = "none";
            const resizeHandle = this.querySelector(`.${style.resizeHandle}`) as HTMLElement;
            if (resizeHandle) resizeHandle.style.display = "";
        }
    }

    toggleVisibility(visible: boolean) {
        if (!visible) {
            this.isMinimized = true;
            this.style.display = "none";
            this.style.width = "44px";
            this.minimizedSidebar.style.display = "flex";
            const resizeHandle = this.querySelector(`.${style.resizeHandle}`) as HTMLElement;
            if (resizeHandle) resizeHandle.style.display = "none";
        } else {
            this.isMinimized = false;
            this.style.display = "flex";
            this.style.width = "";
            this.minimizedSidebar.style.display = "none";
            const resizeHandle = this.querySelector(`.${style.resizeHandle}`) as HTMLElement;
            if (resizeHandle) resizeHandle.style.display = "";
        }
    }

    private logDocumentAsDsl() {
        try {
            const conversionService = this.app.services.find(
                (s) => s.constructor.name === "DSLConversionService",
            );

            if (!conversionService) {
                console.error("DSLConversionService not found in application services");
                return;
            }

            const document = this.app.activeView?.document;
            if (!document) {
                console.warn("No active document to convert");
                return;
            }

            console.group("Document Information");
            console.log("Document:", document);
            console.log("Root node:", document.rootNode);
            if ("children" in document.rootNode) {
                console.log("Root node children:", (document.rootNode as any).children);
                console.log("Number of children:", (document.rootNode as any).children.length);
            }
            console.groupEnd();

            const result = (conversionService as any).documentToDsl(document);

            if (result.isOk) {
                console.group("Document as DSL Commands");
                if (result.value.length === 0) {
                    console.log("No DSL commands generated. The document may be empty.");

                    this.addMessage(
                        "⚠️ No DSL commands were generated. This could be because:\n" +
                            "1. The document is empty\n" +
                            "2. The shapes aren't supported by the DSL converter\n" +
                            "3. The shapes are in a different structure than expected\n\n" +
                            "Check the browser console (F12) for more details.",
                        "assistant",
                    );
                } else {
                    result.value.forEach((cmd: string, index: number) => {
                        console.log(`${index + 1}. ${cmd}`);
                    });

                    this.addMessage(
                        `💻 Document converted to ${result.value.length} DSL commands. Check the browser console (F12) for details.`,
                        "assistant",
                    );
                }
                console.groupEnd();
            } else {
                console.error("Failed to convert document to DSL:", result.error);
                this.addMessage(`⚠️ Failed to convert document to DSL: ${result.error}`, "assistant");
            }
        } catch (error) {
            console.error("Error converting document to DSL:", error);
            this.addMessage(`⚠️ Error converting document to DSL: ${error}`, "assistant");
        }
    }

    private async toggleConversationList() {
        if (this.isShapesListVisible) {
            this.isShapesListVisible = false;
            this.shapesListContainer.style.display = "none";
        }

        this.isConversationListVisible = !this.isConversationListVisible;
        if (this.isConversationListVisible) {
            await this.populateConversationList();
            this.conversationListContainer.style.display = "block";
        } else {
            this.conversationListContainer.style.display = "none";
        }
    }

    private async populateConversationList() {
        this.conversationListContainer.innerHTML = "";
        const loadingText = span({ textContent: "Loading conversations..." });
        this.conversationListContainer.appendChild(loadingText);

        const currentDocId = this.app.activeView?.document?.id;
        Logger.info(`ChatInterface: Populating conversation list for currentDocId: ${currentDocId}`);

        if (!currentDocId) {
            this.conversationListContainer.innerHTML = "";
            const noDocText = span({ textContent: "No active document to show conversations for." });
            this.conversationListContainer.appendChild(noDocText);
            return;
        }

        if (!this.app.storage) {
            this.conversationListContainer.innerHTML = "";
            Logger.warn("ChatInterface: Storage service not available. Cannot fetch conversations.");
            const noStorageText = span({ textContent: "Storage not available." });
            this.conversationListContainer.appendChild(noStorageText);
            return;
        }

        try {
            const conversationsPage = await this.app.storage.page(Constants.DBName, "Conversations", 0);

            const docConversations = conversationsPage
                .filter((conv) => conv.document_id === currentDocId)
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()); // Sort by most recent

            this.conversationListContainer.innerHTML = "";

            if (docConversations.length === 0) {
                const noConvoText = span({ textContent: "No conversations found for this document." });
                this.conversationListContainer.appendChild(noConvoText);
                return;
            }

            const ul = document.createElement("ul");
            ul.className = style.conversationList;
            docConversations.forEach((conv: any) => {
                const li = document.createElement("li");
                li.textContent = `${conv.title || `Conversation (${conv.id.substring(0, 6)}...)`} (Last updated: ${new Date(conv.updated_at).toLocaleTimeString()})${conv.id === this.currentConversationId ? " (current)" : ""}`;
                li.onclick = () => this.loadConversation(conv.id);
                if (conv.id === this.currentConversationId) {
                    li.classList.add(style.currentConversationItem);
                }
                ul.appendChild(li);
            });
            this.conversationListContainer.appendChild(ul);
        } catch (error) {
            Logger.error("ChatInterface: Error fetching document conversations:", error);
            this.conversationListContainer.innerHTML = "";
            const errorText = span({ textContent: "Error loading conversations." });
            this.conversationListContainer.appendChild(errorText);
        }
    }

    private async loadConversation(conversationId: string) {
        Logger.info(`ChatInterface: Attempting to load conversation ID: ${conversationId}`);
        if (!this.app.storage) {
            Logger.warn("ChatInterface: Storage service not available. Cannot load conversation.");
            return;
        }

        this.isConversationListVisible = false;
        this.conversationListContainer.style.display = "none";

        this.chatHistory.innerHTML = "";
        const loadingIndicator = createLoadingIndicator();
        this.chatHistory.appendChild(loadingIndicator);

        try {
            const messagesPage = await this.app.storage.page(Constants.DBName, "ChatMessages", 0);
            const conversationMessages = messagesPage
                .filter((msg: any) => msg.conversation_id === conversationId)
                .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            this.chatHistory.innerHTML = "";

            if (conversationMessages.length === 0) {
                Logger.warn(
                    `ChatInterface: No messages found for conversation ${conversationId}. Re-initializing with system prompt.`,
                );
                this.currentConversationId = conversationId;
                this.messages = [OpenRouterClient.createSystemMessage(AI_CONFIG.systemPrompt)];
                return;
            }

            this.currentConversationId = conversationId;
            this.messages = [];

            conversationMessages.forEach((msgData: any) => {
                const message: OpenRouterMessage = { role: msgData.role, content: msgData.content };
                this.messages.push(message);
                if (msgData.role === "user" || msgData.role === "assistant") {
                    this.addMessage(msgData.content, msgData.role as "user" | "assistant", false);
                }
            });

            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
            Logger.info(
                `ChatInterface: Successfully loaded ${conversationMessages.length} messages for conversation ID: ${conversationId}`,
            );
        } catch (error) {
            Logger.error(`ChatInterface: Error loading conversation ${conversationId}:`, error);
            this.chatHistory.innerHTML = "";
            const errorMsgEl = div({ className: `${style.message} ${style.assistant}` });
            errorMsgEl.textContent = "Error loading conversation. Please try again.";
            this.chatHistory.appendChild(errorMsgEl);
        }
    }

    private async toggleShapesList() {
        if (this.isConversationListVisible) {
            this.isConversationListVisible = false;
            this.conversationListContainer.style.display = "none";
        }

        this.isShapesListVisible = !this.isShapesListVisible;
        if (this.isShapesListVisible) {
            await this.populateShapesList();
            this.shapesListContainer.style.display = "block";
        } else {
            this.shapesListContainer.style.display = "none";
        }
    }

    private async populateShapesList() {
        this.shapesListContainer.innerHTML = "";
        const currentDoc = this.app.activeView?.document;
        if (!currentDoc) {
            this.shapesListContainer.textContent = I18n.translate("chat.shapesList.noDocument");
            return;
        }
        const currentHeader = span({ textContent: I18n.translate("chat.shapesList.currentDocument") });
        this.shapesListContainer.appendChild(currentHeader);
        const ulCurrent = document.createElement("ul");
        ulCurrent.className = style.shapesList;
        const selectedNodes = currentDoc.selection.getSelectedNodes();
        let child = currentDoc.rootNode.firstChild;
        while (child) {
            const node = child;
            const li = document.createElement("li");
            li.textContent = node.name;
            if (selectedNodes.includes(node)) {
                li.classList.add(style.selected);
            }
            li.addEventListener("click", () => {
                li.classList.toggle(style.selected);
                currentDoc.selection.setSelection([node], true);
            });
            ulCurrent.appendChild(li);
            child = node.nextSibling as any;
        }
        this.shapesListContainer.appendChild(ulCurrent);

        const allHeader = span({ textContent: I18n.translate("chat.shapesList.allDocuments") });
        this.shapesListContainer.appendChild(allHeader);
        if (!this.app.storage) {
            const noStorage = span({ textContent: I18n.translate("chat.shapesList.noStorage") });
            this.shapesListContainer.appendChild(noStorage);
            return;
        }
        try {
            const docs = await this.app.storage.page(Constants.DBName, Constants.DocumentTable, 0);
            docs.forEach((docRecord: any) => {
                if (docRecord.id === currentDoc.id) return;
                const docName = docRecord.properties?.name ?? docRecord.name ?? docRecord.id;
                const docTitle = span({ textContent: docName });
                this.shapesListContainer.appendChild(docTitle);
                const ul = document.createElement("ul");
                ul.className = style.shapesList;
                const nodes = docRecord.properties?.nodes ?? [];
                nodes.forEach((node: any) => {
                    const nodeName = node.properties?.name;
                    if (nodeName) {
                        const li = document.createElement("li");
                        li.textContent = nodeName;
                        ul.appendChild(li);
                    }
                });
                this.shapesListContainer.appendChild(ul);
            });
        } catch (e: any) {
            Logger.error("ChatInterface: Error fetching documents for shapes list", e);
            const errorEl = span({ textContent: I18n.translate("chat.shapesList.errorLoading") });
            this.shapesListContainer.appendChild(errorEl);
        }
    }

    private handleDocumentClick(event: MouseEvent) {
        if (!this.isConversationListVisible && !this.isShapesListVisible) return;

        const target = event.target as Node;

        if (
            this.isConversationListVisible &&
            !this.conversationListContainer.contains(target) &&
            !event
                .composedPath()
                .some(
                    (el) =>
                        el instanceof HTMLElement && el.classList.contains(style.conversationHistoryButton),
                )
        ) {
            this.isConversationListVisible = false;
            this.conversationListContainer.style.display = "none";
        }

        if (
            this.isShapesListVisible &&
            !this.shapesListContainer.contains(target) &&
            !event
                .composedPath()
                .some(
                    (el) =>
                        el instanceof HTMLElement &&
                        el.classList.contains(style.headerButton) &&
                        el.getAttribute("title") === I18n.translate("chat.shapesList.currentDocument"),
                )
        ) {
            this.isShapesListVisible = false;
            this.shapesListContainer.style.display = "none";
        }
    }
}

customElements.define("luminicad-chat", ChatInterface);

const createLoadingIndicator = () => {
    return div(
        { className: style.loadingContainer },
        div(
            { className: style.scene },
            div({ className: style.shadow }),
            div(
                { className: style.jumper },
                div(
                    { className: style.spinner },
                    div(
                        { className: style.loader },
                        div(
                            { className: style.cuboid },
                            div({ className: style.cuboid__side }),
                            div({ className: style.cuboid__side }),
                            div({ className: style.cuboid__side }),
                            div({ className: style.cuboid__side }),
                            div({ className: style.cuboid__side }),
                            div({ className: style.cuboid__side }),
                        ),
                    ),
                ),
            ),
        ),
    );
};
