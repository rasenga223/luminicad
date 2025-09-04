import { Binding, Config, IApplication, ICommand, command } from "luminicad-core";

@command({
    name: "workingPlane.toggleDynamic",
    display: "workingPlane.toggleDynamic",
    toggle: new Binding(Config.instance, "dynamicWorkplane"),
    icon: "icon-dynamicPlane",
})
export class ToggleDynamicWorkplaneCommand implements ICommand {
    async execute(app: IApplication): Promise<void> {
        Config.instance.dynamicWorkplane = !Config.instance.dynamicWorkplane;
    }
}
