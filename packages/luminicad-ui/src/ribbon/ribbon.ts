import {
    Binding,
    ButtonSize,
    Command,
    CommandKeys,
    I18n,
    IApplication,
    ICommand,
    IConverter,
    IView,
    Logger,
    Observable,
    ObservableCollection,
    PubSub,
    Result,
} from "luminicad-core";
import { button, collection, div, img, label, localize, span, svg } from "../components";
import { CommandContext } from "./commandContext";
import style from "./ribbon.module.css";
import { RibbonButton } from "./ribbonButton";
import { RibbonGroupData, RibbonTabData } from "./ribbonData";
import { RibbonStack } from "./ribbonStack";

export class RibbonDataContent extends Observable {
    readonly quickCommands = new ObservableCollection<CommandKeys>();
    readonly ribbonTabs = new ObservableCollection<RibbonTabData>();

    private _activeTab: RibbonTabData;
    get activeTab() {
        return this._activeTab;
    }
    set activeTab(value: RibbonTabData) {
        this.setProperty("activeTab", value);
    }

    private _activeView: IView | undefined;
    get activeView() {
        return this._activeView;
    }
    set activeView(value: IView | undefined) {
        this.setProperty("activeView", value);
    }

    constructor(
        readonly app: IApplication,
        quickCommands: CommandKeys[],
        ribbonTabs: RibbonTabData[],
    ) {
        super();
        this.quickCommands.push(...quickCommands);
        this.ribbonTabs.push(...ribbonTabs);
        this._activeTab = ribbonTabs[0];
        PubSub.default.sub("activeViewChanged", (v) => (this.activeView = v));
    }
}

export const QuickButton = (command: ICommand) => {
    let data = Command.getData(command);
    if (data === undefined) {
        Logger.warn("commandData is undefined");
        return span({ textContent: "null" });
    }
    return svg({
        icon: data.icon,
        title: I18n.translate(data.display),
        className: style.quickCommandIcon,
        onclick: () => {
            PubSub.default.pub("executeCommand", command as any);
        },
    });
};

class ViewActiveConverter implements IConverter<IView> {
    constructor(
        readonly target: IView,
        readonly style: string,
        readonly activeStyle: string,
    ) {}

    convert(value: IView): Result<string> {
        if (this.target === value) {
            return Result.ok(`${this.style} ${this.activeStyle}`);
        } else {
            return Result.ok(this.style);
        }
    }
}

class ActivedRibbonTabConverter implements IConverter<RibbonTabData> {
    constructor(
        readonly tab: RibbonTabData,
        readonly style: string,
        readonly activeStyle: string,
    ) {}

    convert(value: RibbonTabData): Result<string> {
        if (this.tab === value) {
            return Result.ok(`${this.style} ${this.activeStyle}`);
        } else {
            return Result.ok(this.style);
        }
    }
}

class DisplayConverter implements IConverter<RibbonTabData> {
    constructor(readonly tab: RibbonTabData) {}

    convert(value: RibbonTabData): Result<string> {
        if (this.tab === value) {
            return Result.ok("");
        } else {
            return Result.ok("none");
        }
    }
}

export class Ribbon extends HTMLElement {
    private readonly _commandContextContainer = div({ className: style.commandContextPanel });
    private commandContext?: CommandContext;
    private themeToggle: HTMLButtonElement;

    constructor(readonly dataContent: RibbonDataContent) {
        super();
        this.className = style.root;
        this.themeToggle = this.createThemeToggle();
        this.append(
            div(
                { className: style.titleBar },
                div(
                    { className: style.left },
                    div(
                        {
                            className: style.appIcon,
                            onclick: () => PubSub.default.pub("displayHome", true),
                        },
                        img({
                            src: "/favicon.svg",
                            alt: "LuminiCAD Logo",
                            width: 24,
                            height: 24,
                        }),
                        span({ id: "appName", textContent: `LuminiCAD` }),
                    ),
                ),
                div(
                    { className: style.ribbonTitlePanel },
                    (() => {
                        const homeButton = button({
                            className: style.homeButton || style.supportButton,
                            title: "Home",
                            onclick: () => PubSub.default.pub("displayHome", true),
                            innerHTML: `
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                            `,
                        });
                        return homeButton;
                    })(),
                    collection({
                        className: style.quickCommands,
                        sources: dataContent.quickCommands,
                        template: (command: CommandKeys) => {
                            console.log("Creating quick command for:", command);

                            let iconPath = "";
                            let title = "";

                            switch (command) {
                                case "doc.save":
                                    iconPath =
                                        '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>';
                                    title = "Save";
                                    break;
                                case "doc.saveToFile":
                                    iconPath =
                                        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>';
                                    title = "Download";
                                    break;
                                case "edit.undo":
                                    iconPath =
                                        '<path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>';
                                    title = "Undo";
                                    break;
                                case "edit.redo":
                                    iconPath =
                                        '<path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>';
                                    title = "Redo";
                                    break;
                                default:
                                    console.log("Using default QuickButton for:", command);
                                    return QuickButton(command as any);
                            }

                            const wrapper = div({
                                className: style.quickButton,
                                title: title,
                                onclick: () => PubSub.default.pub("executeCommand", command),
                            });

                            try {
                                const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                                svgEl.setAttribute("viewBox", "0 0 24 24");
                                svgEl.setAttribute("fill", "none");
                                svgEl.setAttribute("stroke", "currentColor");
                                svgEl.setAttribute("stroke-width", "2");
                                svgEl.setAttribute("stroke-linecap", "round");
                                svgEl.setAttribute("stroke-linejoin", "round");
                                svgEl.innerHTML = iconPath;

                                wrapper.appendChild(svgEl);
                                console.log("Created SVG for:", command);
                                return wrapper;
                            } catch (error) {
                                console.error("Error creating SVG for:", command, error);

                                wrapper.textContent = title;
                                return wrapper;
                            }
                        },
                    }),
                    span({ className: style.split }),
                    // Comment out the startup button - can be used later
                    // label({
                    //     className: style.tabHeader,
                    //     textContent: localize("ribbon.startup"),
                    //     onclick: () => PubSub.default.pub("displayHome", true),
                    // }),
                    collection({
                        sources: dataContent.ribbonTabs,
                        template: (tab: RibbonTabData) => {
                            const converter = new ActivedRibbonTabConverter(
                                tab,
                                style.tabHeader,
                                style.activedTab,
                            );
                            return label({
                                className: new Binding(dataContent, "activeTab", converter),
                                textContent: localize(tab.tabName),
                                onclick: () => (dataContent.activeTab = tab),
                            });
                        },
                    }),
                ),
                div(
                    {
                        className: style.center,
                    },
                    collection({
                        className: style.views,
                        sources: this.dataContent.app.views,
                        template: (view) =>
                            div(
                                {
                                    className: new Binding(
                                        dataContent,
                                        "activeView",
                                        new ViewActiveConverter(
                                            view,
                                            style.tab,
                                            `${style.tab} ${style.active}`,
                                        ),
                                    ),
                                    onclick: () => {
                                        this.dataContent.app.activeView = view;
                                    },
                                },
                                div(
                                    {
                                        className: style.name,
                                    },
                                    span({ textContent: new Binding(view.document, "name") }),
                                ),
                                svg({
                                    className: style.close,
                                    icon: "icon-times",
                                    onclick: (e) => {
                                        e.stopPropagation();
                                        view.close();
                                    },
                                }),
                            ),
                    }),
                    svg({
                        className: style.new,
                        icon: "icon-plus",
                        title: I18n.translate("command.document.new"),
                        onclick: () => PubSub.default.pub("executeCommand", "doc.new"),
                    }),
                ),
                div(
                    { className: style.right },
                    button({
                        className: style.supportButton,
                        onclick: () => window.open("https://luminicad.com/support", "_blank"),
                        innerHTML: `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12" y2="17"></line>
                            </svg>
                        `,
                    }),
                    this.themeToggle,
                    button({
                        className: style.accountButton,
                        onclick: () => window.open("https://luminicad.com/account", "_blank"),
                        innerHTML: `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        `,
                    }),
                ),
            ),
            collection({
                className: style.tabContentPanel,
                sources: dataContent.ribbonTabs,
                template: (tab: RibbonTabData) => {
                    return collection({
                        className: style.groupPanel,
                        sources: tab.groups,
                        style: {
                            display: new Binding(dataContent, "activeTab", new DisplayConverter(tab)),
                        },
                        template: (group: RibbonGroupData) =>
                            div(
                                { className: style.ribbonGroup },
                                collection({
                                    sources: group.items,
                                    className: style.content,
                                    template: (item) => {
                                        if (typeof item === "string") {
                                            return RibbonButton.fromCommandName(item, ButtonSize.large)!;
                                        } else if (item instanceof ObservableCollection) {
                                            let stack = new RibbonStack();
                                            item.forEach((b) => {
                                                let button = RibbonButton.fromCommandName(
                                                    b,
                                                    ButtonSize.small,
                                                );
                                                if (button) stack.append(button);
                                            });
                                            return stack;
                                        } else {
                                            return new RibbonButton(
                                                item.display,
                                                item.icon,
                                                ButtonSize.large,
                                                item.onClick,
                                            );
                                        }
                                    },
                                }),
                            ),
                    });
                },
            }),
            this._commandContextContainer,
        );
    }

    connectedCallback(): void {
        PubSub.default.sub("openCommandContext", this.openContext);
        PubSub.default.sub("closeCommandContext", this.closeContext);
    }

    disconnectedCallback(): void {
        PubSub.default.remove("openCommandContext", this.openContext);
        PubSub.default.remove("closeCommandContext", this.closeContext);
    }

    private readonly openContext = (command: ICommand) => {
        if (this.commandContext) {
            this.closeContext();
        }
        this.commandContext = new CommandContext(command);
        this._commandContextContainer.append(this.commandContext);
    };

    private readonly closeContext = () => {
        this.commandContext?.remove();
        this.commandContext?.dispose();

        this.commandContext = undefined;
        this._commandContextContainer.innerHTML = "";
    };

    private createThemeToggle() {
        const currentTheme = document.documentElement.getAttribute("theme") || "light";
        const toggle = button({
            className: `${style.themeToggle} ${style[currentTheme]}`,
            onclick: () => this.toggleTheme(),
            innerHTML: `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${
                            currentTheme === "light"
                                ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' // moon icon
                                : '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>' // sun icon
                        }`,
        }) as HTMLButtonElement;
        return toggle;
    }

    private toggleTheme() {
        const currentTheme = document.documentElement.getAttribute("theme") || "light";
        const newTheme = currentTheme === "light" ? "dark" : "light";

        document.documentElement.setAttribute("theme", newTheme);

        this.themeToggle.className = `${style.themeToggle} ${style[newTheme]}`;
        this.themeToggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${
                    newTheme === "light"
                        ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' // moon icon
                        : '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>' // sun icon
                }`;
    }
}

customElements.define("luminicad-ribbon", Ribbon);
