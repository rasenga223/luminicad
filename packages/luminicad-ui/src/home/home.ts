import {
    Constants,
    I18n,
    I18nKeys,
    IApplication,
    ObservableCollection,
    PubSub,
    RecentDocumentDTO,
} from "luminicad-core";
import { LanguageSelector, button, collection, div, img, label, localize, span, svg } from "../components";
import style from "./home.module.css";

interface ApplicationCommand {
    display: I18nKeys;
    icon?: string;
    onclick: () => void;
}

const applicationCommands = new ObservableCollection<ApplicationCommand>(
    {
        display: "command.document.new",
        onclick: () => PubSub.default.pub("executeCommand", "doc.new"),
    },
    {
        display: "command.document.open",
        onclick: () => PubSub.default.pub("executeCommand", "doc.open"),
    },
);

export class Home extends HTMLElement {
    private themeToggle: HTMLButtonElement;

    constructor(readonly app: IApplication) {
        super();
        this.className = style.root;
        this.themeToggle = this.createThemeToggle();
    }

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

    private hasOpen(documentId: string) {
        for (const document of this.app.documents) {
            if (document.id === documentId) return true;
        }
        return false;
    }

    private async getDocuments() {
        let documentArray: RecentDocumentDTO[] = await this.app.storage.page(
            Constants.DBName,
            Constants.RecentTable,
            0,
        );

        documentArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return new ObservableCollection(...documentArray);
    }

    async render() {
        let documents = await this.getDocuments();
        this.append(
            div(
                { className: style.topBar },
                div(
                    { className: style.topBarLeft },
                    img({
                        src: "/logo/LuminiCAD-logo-transparent.png",
                        className: style.topBarLogo,
                    }),
                    label({ className: style.welcome, textContent: "LuminiCAD" }),
                ),
                div(
                    { className: style.topBarRight },
                    div(
                        { className: style.topControls },
                        button({
                            className: style.supportButton,
                            onclick: () => window.open("https://luminicad.com/help", "_blank"),
                            innerHTML: `
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                    <line x1="12" y1="17" x2="12" y2="17"></line>
                                </svg>
                            `,
                        }),
                        this.themeToggle,
                        LanguageSelector({ className: style.language }),
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
            ),
            div(
                { className: style.left },
                div(
                    { className: style.top },
                    div(
                        { className: style.logo },
                        svg({ icon: "icon-lumini" }),
                        span({
                            textContent: "LuminiCAD",
                        }),
                        span({
                            className: style.beta,
                            textContent: "Alpha",
                        }),
                    ),
                    collection({
                        className: style.buttons,
                        sources: applicationCommands,
                        template: (item) =>
                            button({
                                className: style.button,
                                textContent: localize(item.display),
                                onclick: item.onclick,
                            }),
                    }),
                ),
                div(
                    { className: style.bottom },
                    button({
                        className: style.iconButton,
                        onclick: () => window.open("https://docs.luminicad.com", "_blank"),
                        title: "Documentation",
                        innerHTML: `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                        `,
                    }),
                    button({
                        className: style.iconButton,
                        onclick: () => window.open("https://luminicad.com/feedback", "_blank"),
                        title: "Provide Feedback",
                        innerHTML: `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        `,
                    }),
                    span({
                        className: style.version,
                        textContent: `v${__APP_VERSION__}`,
                    }),
                ),
            ),
            div(
                { className: style.right },
                div({ className: style.recent, textContent: localize("home.recent") }),
                collection({
                    className: style.documents,
                    sources: documents,
                    template: (item) =>
                        div(
                            {
                                className: style.document,
                                onclick: () => {
                                    if (this.hasOpen(item.id)) {
                                        PubSub.default.pub("displayHome", false);
                                        const targetDocumentId = item.id;
                                        const targetView = this.app.views.find(
                                            (v) => v.document.id === targetDocumentId,
                                        );
                                        if (targetView) {
                                            this.app.activeView = targetView;
                                        } else {
                                            console.warn(
                                                `Home: Document ${targetDocumentId} reported as open, but no corresponding view found.`,
                                            );
                                        }
                                    } else {
                                        PubSub.default.pub(
                                            "showPermanent",
                                            async () => {
                                                let document = await this.app.openDocument(item.id);
                                                if (document) {
                                                    const targetView = this.app.views.find(
                                                        (v) => v.document.id === document!.id,
                                                    );
                                                    if (targetView) {
                                                        this.app.activeView = targetView;
                                                        await targetView.cameraController.fitContent();
                                                    } else {
                                                        console.warn(
                                                            `Home: Document ${document.id} opened, but no corresponding view found in app.views.`,
                                                        );
                                                    }
                                                }
                                                PubSub.default.pub("displayHome", false);
                                            },
                                            "toast.excuting{0}",
                                            I18n.translate("command.document.open"),
                                        );
                                    }
                                },
                            },
                            img({ className: style.img, src: item.image }),
                            div(
                                { className: style.description },
                                span({ className: style.title, textContent: item.name }),
                                span({
                                    className: style.date,
                                    textContent: new Date(item.date).toLocaleDateString(),
                                }),
                            ),
                            svg({
                                className: style.delete,
                                icon: "icon-times",
                                onclick: async (e) => {
                                    e.stopPropagation();
                                    if (
                                        window.confirm(I18n.translate("prompt.deleteDocument{0}", item.name))
                                    ) {
                                        await this.app.storage.delete(
                                            Constants.DBName,
                                            Constants.DocumentTable,
                                            item.id,
                                        );
                                        await this.app.storage.delete(
                                            Constants.DBName,
                                            Constants.RecentTable,
                                            item.id,
                                        );
                                        documents.remove(item);
                                    }
                                },
                            }),
                        ),
                }),
            ),
        );
        document.body.appendChild(this);
    }
}

customElements.define("luminicad-home", Home);
