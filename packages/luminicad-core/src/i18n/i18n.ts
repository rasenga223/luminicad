import ar from "./ar";
import de from "./de";
import en from "./en";
import es from "./es";
import fr from "./fr";
import { I18nKeys } from "./keys";
import zh from "./zh-cn";
const I18nId = "luminicad18n";
const I18nArgs = new WeakMap<HTMLElement, any[]>();

export type LanguageCode = "en" | "fr" | "es" | "de" | "zh-CN" | "ar";

export type Locale = {
    display: string;
    code: LanguageCode;
    translation: {
        [key in I18nKeys]: string;
    } & {
        [key: string]: string;
    };
};

export type Translation = Record<I18nKeys, string>;

export namespace I18n {
    export const languages = new Map<LanguageCode, Locale>([
        ["en", en],
        ["fr", fr],
        ["de", de],
        ["es", es],
        ["ar", ar],
        ["zh-CN", zh],
    ]);

    let _currentLanguage: LanguageCode = "en";

    export function currentLanguage() {
        return _currentLanguage;
    }

    export function combineTranslation(language: LanguageCode, translations: Record<string, string>) {
        let local = languages.get(language);
        if (local) {
            local.translation = {
                ...local.translation,
                ...translations,
            };
        }
    }

    export function translate(key: I18nKeys, ...args: any[]) {
        let language = languages.get(_currentLanguage)!;
        let text = language.translation[key] ?? languages.get("zh-CN")!.translation[key];
        if (args.length > 0) {
            text = text.replace(/\{(\d+)\}/g, (_, index) => args[index]);
        }
        return text;
    }

    export function set(dom: HTMLElement, key: I18nKeys, ...args: any[]) {
        dom.textContent = translate(key, ...args);
        dom.dataset[I18nId] = key;
        if (args.length > 0) {
            I18nArgs.set(dom, args);
        }
    }

    export function changeLanguage(index: number) {
        if (index < 0 || index >= languages.size) return;

        let newLanguage = Array.from(languages.keys())[index];
        if (newLanguage === _currentLanguage) return;
        _currentLanguage = newLanguage;

        document.querySelectorAll(`[data-${I18nId}]`).forEach((e) => {
            let html = e as HTMLElement;
            let id = html?.dataset[I18nId] as I18nKeys;
            if (id === undefined) return;
            let args = I18nArgs.get(html) ?? [];
            html.textContent = translate(id, ...args);
        });
    }
}
