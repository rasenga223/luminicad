import { ButtonSize, Property } from "luminicad-core";
import { RibbonButton } from "./ribbonButton";
import style from "./ribbonToggleButton.module.css";

export class RibbonToggleButton extends RibbonButton {
    constructor(
        readonly source: any,
        readonly property: Property,
        size: ButtonSize,
    ) {
        super(property.display, property.icon!, size, () => {
            source[property.name] = !source[property.name];
        });
        this.setCheckedStyle(source[property.name]);
        source.onPropertyChanged(this.onPropertyChanged);
    }

    private onPropertyChanged = (prop: string) => {
        if (prop !== this.property.name) return;
        this.setCheckedStyle(this.source[prop]);
    };

    private setCheckedStyle(isChecked: boolean) {
        if (isChecked) {
            this.classList.add(style.checked);
        } else {
            this.classList.remove(style.checked);
        }
    }
}

customElements.define("ribbon-toggle-button", RibbonToggleButton);
