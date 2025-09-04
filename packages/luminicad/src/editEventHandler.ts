import { IDocument, INode, PubSub } from "luminicad-core";
import { NodeSelectionHandler } from "luminicad-vis";

export class EditEventHandler extends NodeSelectionHandler {
    constructor(
        document: IDocument,
        readonly selectedNodes: INode[],
    ) {
        super(document, true);
        PubSub.default.pub("showProperties", document, selectedNodes);
    }

    override dispose() {
        PubSub.default.pub("showProperties", this.document, []);
        super.dispose();
    }
}
