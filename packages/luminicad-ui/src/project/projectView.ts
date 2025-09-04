import { IDocument, IView, PubSub } from "luminicad-core";
import { div, localize, span } from "../components";
import style from "./projectView.module.css";
import { ToolBar } from "./toolBar";
import { Tree } from "./tree";

export class ProjectView extends HTMLElement {
    private readonly _documentTreeMap = new Map<IDocument, Tree>();

    private _activeDocument: IDocument | undefined;
    get activeDocument() {
        return this._activeDocument;
    }

    private readonly panel: HTMLDivElement;

    constructor(props: { className: string }) {
        super();
        this.classList.add(style.root, props.className);
        this.panel = div({
            className: style.itemsPanel,
        });
        this.append(
            div(
                { className: style.headerPanel },
                span({
                    className: style.header,
                    textContent: localize("items.header"),
                }),
                new ToolBar(this),
            ),
            this.panel,
        );
        PubSub.default.sub("activeViewChanged", this.handleActiveViewChanged);
        PubSub.default.sub("documentClosed", this.handleDocumentClosed);
    }

    activeTree() {
        if (!this._activeDocument) return undefined;
        return this._documentTreeMap.get(this._activeDocument);
    }

    private readonly handleDocumentClosed = (document: IDocument) => {
        let tree = this._documentTreeMap.get(document);
        if (tree === undefined) return;

        tree.remove();
        tree.dispose();
        this._documentTreeMap.delete(document);
    };

    private readonly handleActiveViewChanged = (view: IView | undefined) => {
        if (this._activeDocument === view?.document) return;

        if (this._activeDocument !== undefined) {
            this._documentTreeMap.get(this._activeDocument)?.remove();
        }

        this._activeDocument = view?.document;
        if (view === undefined) return;

        let tree = this._documentTreeMap.get(view.document);
        if (tree === undefined) {
            tree = new Tree(view.document);
            this._documentTreeMap.set(view.document, tree);
        }
        this.panel.append(tree);
    };
}

customElements.define("luminicad-project-view", ProjectView);
