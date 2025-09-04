import { CommandKeys, I18nKeys, Locale } from "luminicad-core";

export interface AdditionalCommand {
    tabName: I18nKeys;
    groupName: I18nKeys;
    command: CommandKeys;
}

export interface IAdditionalModule {
    i18n(): Locale[];
    ribbonCommands(): AdditionalCommand[];
}
