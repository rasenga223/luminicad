import {
    History,
    IDocument,
    INodeChangedObserver,
    NodeLinkedListHistoryRecord,
    NodeRecord,
    Transaction,
} from "../src";

export class TestDocument {
    history = new History();
    notifyNodeChanged(records: NodeRecord[]) {
        Transaction.add(this as unknown as IDocument, new NodeLinkedListHistoryRecord(records));
    }
    addNodeObserver(observer: INodeChangedObserver) {}
}
