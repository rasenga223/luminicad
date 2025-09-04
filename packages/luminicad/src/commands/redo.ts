import { command, IApplication, ICommand } from "luminicad-core";

@command({
    name: "edit.redo",
    display: "command.redo",
    icon: "icon-redo",
})
export class Redo implements ICommand {
    async execute(app: IApplication): Promise<void> {
        const document = app.activeView?.document;
        document?.history.redo();
        document?.visual.update();
    }
}
