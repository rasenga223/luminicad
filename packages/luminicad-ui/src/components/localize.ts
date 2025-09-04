import { I18n, I18nKeys } from "luminicad-core";

export class Localize {
    constructor(readonly key: I18nKeys) {}

    set(e: HTMLElement) {
        I18n.set(e, this.key);
    }
}

export function localize(key: I18nKeys) {
    return new Localize(key);
}
