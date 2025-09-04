import {
    command,
    DOCUMENT_FILE_EXTENSION,
    download,
    I18n,
    IApplication,
    ICommand,
    PubSub,
} from "luminicad-core";

@command({
    name: "doc.saveToFile",
    display: "command.document.saveToFile",
    icon: "icon-download",
})
export class SaveDocumentToFile implements ICommand {
    async execute(app: IApplication): Promise<void> {
        if (!app.activeView?.document) return;
        PubSub.default.pub(
            "showPermanent",
            async () => {
                await new Promise((r, j) => {
                    setTimeout(r, 100);
                });
                let s = app.activeView?.document!.serialize();
                PubSub.default.pub("showToast", "toast.downloading");
                download([JSON.stringify(s)], `${app.activeView?.document!.name}${DOCUMENT_FILE_EXTENSION}`);
            },
            "toast.excuting{0}",
            I18n.translate("command.document.saveToFile"),
        );
    }
}
