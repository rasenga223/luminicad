import { IApplication } from "../application";
import { CommandKeys } from "../command";
import { I18nKeys } from "../i18n";
import { Button } from "./button";

export interface IWindow {
    init(app: IApplication): void;
    registerHomeCommand(groupName: I18nKeys, command: CommandKeys | Button): void;
    registerRibbonCommand(tabName: I18nKeys, groupName: I18nKeys, command: CommandKeys | Button): void;
}
