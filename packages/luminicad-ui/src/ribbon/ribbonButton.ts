import { ButtonSize, Command, CommandKeys, I18nKeys, Logger, PubSub } from "luminicad-core";
import { label, localize, svg } from "../components";
import style from "./ribbonButton.module.css";

export class RibbonButton extends HTMLElement {
    constructor(
        display: I18nKeys,
        icon: string,
        size: ButtonSize,
        readonly onClick: () => void,
    ) {
        super();
        this.initHTML(display, icon, size);
        this.addEventListener("click", onClick);
    }

    static fromCommandName(commandName: CommandKeys, size: ButtonSize) {
        let data = Command.getData(commandName);
        if (data === undefined) {
            Logger.warn(`commandData of ${commandName} is undefined`);
            return undefined;
        }
        return new RibbonButton(data.display, data.icon, size, () => {
            PubSub.default.pub("executeCommand", commandName);
        });
    }

    dispose(): void {
        this.removeEventListener("click", this.onClick);
    }

    private initHTML(display: I18nKeys, icon: string, size: ButtonSize) {
        let image: Element;

        // Check if the passed icon is raw SVG markup (starts with "<svg")
        if (icon.trim().startsWith("<svg")) {
            // Option 2: Use raw SVG markup directly instead of referencing an icon identifier
            // Create a temporary container to parse the SVG string into an Element.
            const container = document.createElement("div");
            container.innerHTML = icon;
            // Use the first element child which should be the <svg> element.
            image = container.firstElementChild as Element;
        } else {
            // Use the existing icon registry via the svg helper
            image = svg({
                icon,
            });
        }

        // Apply proper styling based on button size
        if (size === ButtonSize.large) {
            image.classList.add(style.icon);
            this.className = style.normal;
        } else {
            image.classList.add(style.smallIcon);
            this.className = style.small;
        }

        // Create label text for the ribbon button
        const text = label({
            className: style.buttonText,
            textContent: localize(display),
        });

        // Append both the icon and the text to the RibbonButton
        this.append(image, text);
    }
}

customElements.define("ribbon-button", RibbonButton);
