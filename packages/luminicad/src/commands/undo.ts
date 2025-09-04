import { command, IApplication, ICommand } from "luminicad-core";

@command({
    name: "edit.undo",
    display: "command.undo",
    icon: "icon-undo",
})
export class Undo implements ICommand {
    async execute(application: IApplication): Promise<void> {
        const document = application.activeView?.document;
        document?.history.undo();
        document?.visual.update();
    }
}
