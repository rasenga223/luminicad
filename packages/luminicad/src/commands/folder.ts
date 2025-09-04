import { command, FolderNode, IApplication, ICommand } from "luminicad-core";

let index = 1;

@command({
    name: "create.folder",
    display: "command.newFolder",
    icon: `<svg viewBox="0 0 48 48" fill="#808080">
        <path d="m47 38v-24c0-1.326-.527-2.598-1.464-3.536-.938-.937-2.21-1.464-3.536-1.464h-17.382l-.618-1.236c-.847-1.694-2.578-2.764-4.472-2.764h-13.528c-2.761 0-5 2.239-5 5v28c0 2.761 2.239 5 5 5h36c1.326 0 2.598-.527 3.536-1.464.937-.938 1.464-2.21 1.464-3.536zm-2-20v20c0 .796-.316 1.559-.879 2.121-.562.563-1.325.879-2.121.879-8.367 0-27.633 0-36 0-1.657 0-3-1.343-3-3v-28c0-1.657 1.343-3 3-3h13.528c1.136 0 2.175.642 2.683 1.658 0 0 2.895 5.789 2.895 5.789.169.339.515.553.894.553h16c.796 0 1.559.316 2.121.879.563.562.879 1.325.879 2.121zm-19.382-7 1 2h15.382c1.088 0 2.14.355 3 1 0-.796-.316-1.559-.879-2.121-.562-.563-1.325-.879-2.121-.879z"></path>
    </svg>`,
})
export class NewFolder implements ICommand {
    async execute(app: IApplication): Promise<void> {
        const document = app.activeView?.document!;
        const folder = new FolderNode(document, `Folder${index++}`);
        document.addNode(folder);
    }
}
