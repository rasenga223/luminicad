import { CommandKeys } from "../command";
import { I18nKeys } from "../i18n";

export type RibbonGroup = {
    groupName: I18nKeys;
    items: (CommandKeys | CommandKeys[])[];
};

export type RibbonTab = {
    tabName: I18nKeys;
    groups: RibbonGroup[];
};
