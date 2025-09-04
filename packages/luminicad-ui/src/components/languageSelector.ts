import { I18n } from "luminicad-core";
import { HTMLProps, option, select } from ".";

export const LanguageSelector = (props: HTMLProps<HTMLElement>) => {
    let languages: HTMLOptionElement[] = [];
    I18n.languages.forEach((language, index) =>
        languages.push(
            option({
                selected: index === I18n.currentLanguage(),
                textContent: language.display,
                style: {
                    color: "var(--text-color)",
                    backgroundColor: "var(--panel-background-color)",
                },
            }),
        ),
    );
    return select(
        {
            onchange: (e) => {
                let language = (e.target as HTMLSelectElement).selectedIndex;
                I18n.changeLanguage(language);
            },
            style: {
                color: "var(--text-color)",
                backgroundColor: "var(--panel-background-color)",
            },
            ...props,
        },
        ...languages,
    );
};
