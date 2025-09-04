import { AI_CONFIG, OpenRouterClient } from "luminicad-ai";
import { Button, CommandKeys, I18nKeys, IApplication, RibbonTab } from "luminicad-core";
import { ChatInterface } from "./chat/chat";
import { button, div } from "./components";
import apiKeyStyle from "./components/apiKeyDialog.module.css";
import style from "./editor.module.css";
import { ProjectView } from "./project";
import { PropertyView } from "./property";
import { Ribbon, RibbonDataContent } from "./ribbon";
import { RibbonTabData } from "./ribbon/ribbonData";
import { ScriptInterface } from "./script/script";
// import { Statusbar } from "./statusbar"; // Commented out for now
import { LayoutViewport } from "./viewport";

let quickCommands: CommandKeys[] = ["doc.save", "doc.saveToFile", "edit.undo", "edit.redo"];

export class Editor extends HTMLElement {
    readonly ribbonContent: RibbonDataContent;
    private projectView: ProjectView;
    private propertyView: PropertyView;
    private scriptInterface: ScriptInterface;
    private leftSidebar: HTMLDivElement;

    private sidebarContainer: HTMLDivElement;

    private activeView: "none" | "project" | "property" | "script" = "none";

    constructor(app: IApplication, tabs: RibbonTab[]) {
        super();

        let viewport = new LayoutViewport(app);
        viewport.classList.add(style.viewport);

        this.ribbonContent = new RibbonDataContent(
            app,
            quickCommands,
            tabs.map((p) => RibbonTabData.fromProfile(p)),
        );

        try {
            const stored = window.localStorage?.getItem("OPENROUTER_API_KEY");
            if (stored) OpenRouterClient.setApiKey(stored);
        } catch {}

        this.promptOpenRouterApiKeyIfNeeded();

        const chatSidebar = new ChatInterface(
            app,
            new OpenRouterClient({
                model: AI_CONFIG.defaultModel,
            }),
        );
        chatSidebar.toggleVisibility(true);

        this.projectView = new ProjectView({ className: style.sidebarItem });
        this.propertyView = new PropertyView({ className: style.sidebarItem });
        this.scriptInterface = new ScriptInterface(app);

        this.projectView.style.display = "none";
        this.propertyView.style.display = "none";
        this.scriptInterface.style.display = "none";

        this.sidebarContainer = div(
            {
                className: style.sidebar,
                style: "display: none;",
            },

            this.projectView,
            this.propertyView,
            this.scriptInterface,
        );

        this.leftSidebar = div(
            { className: style.leftSidebar },
            div({
                className: style.sidebarButton,
                onclick: () => this.toggleProjectView(),
                title: "Toggle Project Explorer",
                innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3h18v18H3zM3 9h18M9 9v12"/>
                    </svg>`,
            }),
            div({
                className: style.sidebarButton,
                onclick: () => this.togglePropertyView(),
                title: "Toggle Property View",
                innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6"/>
                    </svg>`,
            }),
            div({
                className: style.sidebarButton,
                onclick: () => this.toggleScriptView(),
                title: "Toggle Script Editor",
                innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>`,
            }),
        );

        this.append(
            div(
                { className: style.root },
                new Ribbon(this.ribbonContent),
                div({ className: style.content }, this.sidebarContainer, viewport, chatSidebar),
                // Status bar is commented out for now - we can add it back later when needed
                // new Statusbar(style.statusbar)
            ),
            this.leftSidebar,
        );

        this.addEventListener("contextmenu", (e: MouseEvent) => {});

        document.body.appendChild(this);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__luminiPromptApiKeyIfNeeded = () => this.promptOpenRouterApiKeyIfNeeded();
    }

    private promptOpenRouterApiKeyIfNeeded() {
        let hasKey = false;
        try {
            hasKey =
                !!(window as any).LUMINI_OPENROUTER_API_KEY ||
                !!window.localStorage?.getItem("OPENROUTER_API_KEY");
        } catch {}
        if (hasKey) return;

        const dialog = document.createElement("dialog") as HTMLDialogElement;
        dialog.className = apiKeyStyle.dialog;
        document.body.appendChild(dialog);

        const input = document.createElement("input");
        input.type = "password";
        input.className = apiKeyStyle.input;
        input.placeholder = "sk-or-...";
        input.autocomplete = "off";

        const externalIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>`;

        const content = div(
            { className: apiKeyStyle.container },
            div(
                { className: apiKeyStyle.header },
                div({ className: apiKeyStyle.title }, "Connect your OpenRouter API key"),
                div({ className: apiKeyStyle.subtitle }, "Your key is stored locally in this browser only."),
            ),
            div({ className: apiKeyStyle.inputGroup }, input),
            div(
                { className: apiKeyStyle.help },
                "Need a key?",
                div(
                    {
                        className: apiKeyStyle.helpLink,
                        onclick: () => window.open("https://openrouter.ai", "_blank", "noopener"),
                    },
                    "Get one at OpenRouter.ai",
                    div({ innerHTML: externalIcon }),
                ),
            ),
            div(
                { className: apiKeyStyle.buttons },
                button({
                    className: apiKeyStyle.primaryButton,
                    textContent: "Save",
                    onclick: () => {
                        const key = input.value.trim();
                        if (!key) {
                            input.focus();
                            return;
                        }
                        try {
                            window.localStorage?.setItem("OPENROUTER_API_KEY", key);
                        } catch {}
                        OpenRouterClient.setApiKey(key);
                        dialog.remove();
                    },
                }),
                button({
                    className: apiKeyStyle.secondaryButton,
                    textContent: "Skip",
                    onclick: () => dialog.remove(),
                }),
            ),
        );

        dialog.appendChild(content);
        dialog.showModal();

        setTimeout(() => input.focus(), 100);
    }

    /**
     
     */
    private hideAllViews() {
        this.projectView.style.display = "none";
        this.propertyView.style.display = "none";
        this.scriptInterface.style.display = "none";

        this.sidebarContainer.style.display = "none";
        this.activeView = "none";
    }

    /**
     
     */
    private toggleProjectView() {
        if (this.activeView === "project") {
            this.hideAllViews();
        } else {
            this.hideAllViews();
            this.projectView.style.display = "block";
            this.sidebarContainer.style.display = "block";
            this.activeView = "project";
        }
    }

    /**
     
     */
    private togglePropertyView() {
        if (this.activeView === "property") {
            this.hideAllViews();
        } else {
            this.hideAllViews();
            this.propertyView.style.display = "block";
            this.sidebarContainer.style.display = "block";
            this.activeView = "property";
        }
    }

    /**
     
     */
    private toggleScriptView() {
        if (this.activeView === "script") {
            this.hideAllViews();
        } else {
            this.hideAllViews();
            this.scriptInterface.style.display = "block";
            this.sidebarContainer.style.display = "block";
            this.activeView = "script";
        }
    }

    /**
     
     */
    registerRibbonCommand(tabName: I18nKeys, groupName: I18nKeys, command: CommandKeys | Button) {
        this.ribbonContent.ribbonTabs
            .find((p) => p.tabName === tabName)
            ?.groups.find((p) => p.groupName === groupName)
            ?.items.push(command);
    }
}

customElements.define("luminicad-editor", Editor);
