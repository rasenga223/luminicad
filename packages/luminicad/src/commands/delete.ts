import { command, IApplication, ICommand, PubSub } from "luminicad-core";

@command({
    name: "modify.delete",
    display: "command.delete",
    icon: `<svg viewBox="0 0 297 297" fill="none">
        <path d="M287.55,260.218H149.47l131.846-131.846c10.437-10.437,10.437-27.419,0-37.856l-64.808-64.808
            c-10.437-10.437-27.419-10.436-37.856,0L11.788,192.573c-5.055,5.056-7.84,11.778-7.84,18.928c0,7.15,2.785,13.872,7.84,18.928
            l29.79,29.79H9.45c-5.218,0-9.45,4.231-9.45,9.45c0,5.219,4.231,9.45,9.45,9.45h278.1c5.218,0,9.45-4.231,9.45-9.45
            C297,264.45,292.769,260.218,287.55,260.218z M192.016,39.072c3.069-3.069,8.063-3.067,11.128,0l64.808,64.808
            c1.487,1.486,2.305,3.462,2.305,5.565c0,2.101-0.819,4.078-2.305,5.564L159.309,223.651l-75.936-75.936L192.016,39.072z
            M122.742,260.219H68.306l-43.154-43.155c-3.068-3.067-3.068-8.06,0-11.127l44.858-44.858l75.936,75.936L122.742,260.219z" 
            fill="#E74C3C"></path>
    </svg>`,
})
export class Delete implements ICommand {
    async execute(app: IApplication): Promise<void> {
        const document = app.activeView?.document;
        if (!document) return;

        const nodes = document.selection.getSelectedNodes();
        if (document.currentNode && nodes.includes(document.currentNode)) {
            document.currentNode = document.rootNode;
        }

        document.selection.clearSelection();
        nodes.forEach((model) => model.parent?.remove(model));
        document.visual.update();
        PubSub.default.pub("showToast", "toast.delete{0}Objects", nodes.length);
    }
}
