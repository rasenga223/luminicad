import { MessageType } from "luminicad-core";
import style from "./tip.module.css";

export class Tip extends HTMLElement {
    private color?: string;

    constructor(msg: string, type: MessageType) {
        super();
        this.className = style.tip;
        this.set(msg, type);
    }

    set(msg: string, type: MessageType) {
        if (this.textContent !== msg) {
            this.textContent = msg;
        }

        let newStyle = this.getStyle(type);
        this.setStyle(newStyle);
    }

    private setStyle(newStyle: string) {
        if (this.color !== newStyle && newStyle !== undefined) {
            if (this.color !== undefined) this.classList.remove(this.color);
            this.classList.add(newStyle);
            this.color = newStyle;
        }
    }

    private getStyle(type: MessageType) {
        switch (type) {
            case MessageType.error:
                return style.error;
            case MessageType.warn:
                return style.warn;
            default:
                return style.info;
        }
    }
}

customElements.define("luminicad-tip", Tip);
