import { DSLExecutionService } from "luminicad-ai";
import { IApplication } from "luminicad-core";
import { button, div, span } from "../components";
import style from "./script.module.css";

export class ScriptInterface extends HTMLElement {
    private scriptHistory: HTMLDivElement;
    private inputField: HTMLInputElement;
    private _app: IApplication | undefined;
    private modeSwitcher: HTMLDivElement = document.createElement("div");
    private isAdvancedMode: boolean = false;
    private classicContainer: HTMLDivElement;
    private advancedContainer: HTMLDivElement;
    private advancedScriptHistory: HTMLDivElement;
    private advancedInput: HTMLTextAreaElement;
    private highlightedContent: HTMLDivElement;

    constructor(app: IApplication) {
        super();
        this._app = app;
        this.className = style.scriptContainer;

        const header = this.createHeader();

        // Create classic mode container
        this.scriptHistory = div({ className: style.scriptHistory });
        this.inputField = this.createInputField();

        const inputContainer = div(
            { className: style.inputContainer },
            this.inputField,
            button({
                className: style.executeButton,
                onclick: () => this.handleExecute(),
                innerHTML: `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span>Run</span>
                    `,
            }),
        );

        this.classicContainer = div({ className: style.modeContainer }, this.scriptHistory, inputContainer);

        // Create advanced mode container with syntax highlighting
        this.advancedInput = this.createAdvancedInputField();
        this.highlightedContent = div({ className: style.highlightedContent });

        const advancedInputWrapper = div(
            { className: style.advancedInputWrapper },
            this.advancedInput,
            this.highlightedContent,
        );

        this.advancedScriptHistory = div({ className: style.scriptHistory });

        const advancedInputContainer = div(
            { className: style.inputContainer },
            advancedInputWrapper,
            button({
                className: style.executeButton,
                onclick: () => this.handleAdvancedExecute(),
                innerHTML: `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span>Run</span>
                    `,
            }),
        );

        this.advancedContainer = div(
            { className: `${style.modeContainer} ${style.advancedMode}` },
            advancedInputContainer,
            this.advancedScriptHistory,
        );

        // Initially hide advanced container
        this.advancedContainer.style.display = "none";

        this.append(header, this.classicContainer, this.advancedContainer);
    }

    private createHeader() {
        this.modeSwitcher = div({
            className: style.modeSwitcher,
        });

        const classicButton = button({
            className: `${style.modeButton} ${!this.isAdvancedMode ? style.activeMode : ""}`,
            onclick: () => this.switchMode(false),
            innerHTML: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <span>Classic</span>
            `,
        });

        const advancedButton = button({
            className: `${style.modeButton} ${this.isAdvancedMode ? style.activeMode : ""}`,
            onclick: () => this.switchMode(true),
            innerHTML: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>Advanced</span>
            `,
        });

        this.modeSwitcher.append(classicButton, advancedButton);

        return div({ className: style.header }, span({ textContent: "Script Editor" }), this.modeSwitcher);
    }

    private switchMode(advancedMode: boolean) {
        this.isAdvancedMode = advancedMode;

        // Toggle visibility of containers
        this.classicContainer.style.display = advancedMode ? "none" : "flex";
        this.advancedContainer.style.display = advancedMode ? "flex" : "none";

        // Update mode buttons
        const buttons = this.modeSwitcher.querySelectorAll(`.${style.modeButton}`);
        buttons.forEach((btn, index) => {
            if ((index === 0 && !this.isAdvancedMode) || (index === 1 && this.isAdvancedMode)) {
                btn.classList.add(style.activeMode);
            } else {
                btn.classList.remove(style.activeMode);
            }
        });
    }

    private createAdvancedInputField() {
        const textarea = document.createElement("textarea");
        textarea.className = `${style.input} ${style.advancedInput}`;
        textarea.placeholder = "Enter DSL commands...";

        const stopKeys = (e: KeyboardEvent) => {
            e.stopPropagation();
        };
        textarea.addEventListener("keydown", stopKeys);
        textarea.addEventListener("keypress", stopKeys);

        // Add input event listener for syntax highlighting
        textarea.addEventListener("input", () => {
            this.updateSyntaxHighlighting(textarea.value);

            // Sync scroll position between textarea and highlighted content
            this.highlightedContent.scrollTop = textarea.scrollTop;
            this.highlightedContent.scrollLeft = textarea.scrollLeft;
        });

        // Sync scroll position on scroll
        textarea.addEventListener("scroll", () => {
            this.highlightedContent.scrollTop = textarea.scrollTop;
            this.highlightedContent.scrollLeft = textarea.scrollLeft;
        });

        // Initial highlighting
        setTimeout(() => {
            this.updateSyntaxHighlighting(textarea.value);
        }, 0);

        return textarea;
    }

    private createInputField() {
        const el = document.createElement("input");
        el.type = "text";
        el.className = style.input;
        el.placeholder = "Enter DSL command...";

        const stopKeys = (e: KeyboardEvent) => {
            e.stopPropagation();
        };
        el.addEventListener("keydown", stopKeys);
        el.addEventListener("keypress", stopKeys);

        el.addEventListener("keyup", (e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
                this.handleExecute();
            }
        });

        return el;
    }

    private updateSyntaxHighlighting(code: string) {
        // Apply syntax highlighting to the code
        const highlighted = this.highlightDSLSyntax(code);
        this.highlightedContent.innerHTML = highlighted;
    }

    private highlightDSLSyntax(code: string): string {
        if (!code) return "";

        // Add a newline at the end to ensure the last line is processed
        code = code + "\n";

        // Define regex patterns for different syntax elements
        const patterns = [
            // Keywords (CREATE, DELETE, SELECT, etc.)
            {
                pattern:
                    /\b(CREATE|DELETE|SELECT|WITH|MATERIAL|ORIGIN|SIZE|HEIGHT|CENTER|RADIUS|NORMAL|ANGLE|FROM|TO|POINTS|VARIABLE|THICKNESS|WIRE|EDGES|SHAPE|FUSE|BOTTOM|TOP)\b/gi,
                className: "keyword",
            },

            // Shape types (BOX, ARC, CIRCLE, etc.)
            {
                pattern: /\b(BOX|ARC|CIRCLE|LINE|POLYGON|RECTANGLE|FOLDER|FACE|THICKSOLID)\b/gi,
                className: "shape",
            },

            // Numbers
            { pattern: /\b(\d+(\.\d+)?)\b/g, className: "number" },

            // Variables (starting with $)
            { pattern: /(\$[a-zA-Z][a-zA-Z0-9_]*)/g, className: "variable" },

            // Variable assignments
            { pattern: /^([a-zA-Z][a-zA-Z0-9_]*)\s*=/gm, className: "assignment" },

            // Comments
            { pattern: /(\/\/.*$)/gm, className: "comment" },
        ];

        // Process each line separately to maintain line breaks
        const lines = code.split("\n");
        const processedLines = lines.map((line) => {
            let processedLine = line;

            // Apply each pattern
            for (const { pattern, className } of patterns) {
                processedLine = processedLine.replace(
                    pattern,
                    (match) => `<span class="${style[className]}">${match}</span>`,
                );
            }

            return processedLine;
        });

        // Join lines back with line breaks and wrap in a pre tag
        return processedLines.join("\n");
    }

    private async handleExecute() {
        const command = this.inputField.value.trim();
        if (!command) return;

        this.inputField.value = "";
        this.addToHistory(command, "input");

        await this.executeCommand(command);
    }

    private async handleAdvancedExecute() {
        const command = this.advancedInput.value.trim();
        if (!command) return;

        // Keep the command in the textarea for advanced mode
        this.addToAdvancedHistory(command, "input");

        await this.executeCommand(command);
    }

    private async executeCommand(command: string) {
        try {
            const loadingEl = this.createLoadingIndicator();
            const historyEl = this.isAdvancedMode ? this.advancedScriptHistory : this.scriptHistory;
            historyEl.appendChild(loadingEl);

            const service = this.getDslExecutionService();
            const result = await service.executeDsl(command);

            loadingEl.remove();

            if (result.isOk) {
                this.addToCurrentHistory("✓ Command executed successfully", "success");
                this.app.activeView?.cameraController?.fitContent();
            } else {
                this.addToCurrentHistory(`⚠ Error: ${result.error}`, "error");
            }
        } catch (error) {
            this.addToCurrentHistory(`⚠ Error: ${error}`, "error");
        }
    }

    private createLoadingIndicator(): HTMLDivElement {
        return div(
            { className: style.loadingIndicator },
            div({
                className: style.loadingSpinner,
                innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>`,
            }),
        );
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

    private addToCurrentHistory(text: string, type: "input" | "success" | "error") {
        if (this.isAdvancedMode) {
            this.addToAdvancedHistory(text, type);
        } else {
            this.addToHistory(text, type);
        }
    }

    private addToHistory(text: string, type: "input" | "success" | "error") {
        const messageEl = div({ className: `${style.message} ${style[type]}` });
        messageEl.textContent = text;

        this.scriptHistory.appendChild(messageEl);
        this.scriptHistory.scrollTop = this.scriptHistory.scrollHeight;
    }

    private addToAdvancedHistory(text: string, type: "input" | "success" | "error") {
        const messageEl = div({ className: `${style.message} ${style[type]}` });
        messageEl.textContent = text;

        this.advancedScriptHistory.appendChild(messageEl);
        this.advancedScriptHistory.scrollTop = this.advancedScriptHistory.scrollHeight;
    }

    private get app(): IApplication {
        if (this._app === undefined) {
            throw new Error("Application is not initialized");
        }
        return this._app;
    }
}

customElements.define("luminicad-script", ScriptInterface);
