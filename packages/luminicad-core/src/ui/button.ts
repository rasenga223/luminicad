import { I18nKeys } from "../i18n";

export enum ButtonSize {
    large,
    small,
}

export interface Button {
    display: I18nKeys;
    icon: string;
    size: ButtonSize;
    onClick: () => void;
}
