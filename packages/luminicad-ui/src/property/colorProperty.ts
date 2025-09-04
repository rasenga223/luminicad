import { Binding, IDocument, Property, PubSub, Transaction } from "luminicad-core";
import { div, input, label, localize } from "../components";
import { ColorConverter } from "../converters";
import colorStyle from "./colorPorperty.module.css";
import commonStyle from "./common.module.css";
import { PropertyBase } from "./propertyBase";

const PRESET_COLORS = [
    "#ff0000",
    "#ff4d00",
    "#ff9900",
    "#ffcc00",
    "#ffff00",
    "#ccff00",
    "#99ff00",
    "#4dff00",
    "#00ff00",
    "#00ff4d",
    "#00ff99",
    "#00ffcc",
    "#00ffff",
    "#00ccff",
    "#0099ff",
    "#004dff",
    "#0000ff",
    "#4d00ff",
    "#9900ff",
    "#cc00ff",
    "#ff00ff",
    "#ff00cc",
    "#ff0099",
    "#ff004d",
    "#ffffff",
    "#cccccc",
    "#999999",
    "#666666",
    "#333333",
    "#000000",
];

export class ColorProperty extends PropertyBase {
    readonly converter = new ColorConverter();
    readonly input: HTMLInputElement;
    readonly paletteContainer: HTMLDivElement;

    constructor(
        readonly document: IDocument,
        objects: any[],
        readonly property: Property,
    ) {
        super(objects);
        this.input = input({
            className: colorStyle.color,
            type: "color",
            value: new Binding(objects[0], property.name, this.converter),
            onchange: this.setColor,
        });

        this.paletteContainer = div({ className: colorStyle.palette });

        PRESET_COLORS.forEach((color) => {
            const colorBtn = div({
                className: colorStyle.paletteColor,
                onclick: () => this.setColorFromPalette(color),
                style: { backgroundColor: color },
            });
            this.paletteContainer.appendChild(colorBtn);
        });

        this.appendChild(
            div(
                { className: commonStyle.panel },
                label({
                    className: commonStyle.propertyName,
                    textContent: localize(property.display),
                }),
                div({ className: colorStyle.colorContainer }, this.input, this.paletteContainer),
            ),
        );
    }

    disconnectedCallback(): void {
        this.input.removeEventListener("onchange", this.setColor);
    }

    private readonly setColorFromPalette = (colorHex: string) => {
        const color = this.converter.convertBack(colorHex).value;
        if (color === undefined) {
            PubSub.default.pub("showToast", "toast.converter.invalidColor");
            return;
        }
        Transaction.execute(this.document, "change color", () => {
            this.objects.forEach((x) => {
                x[this.property.name] = color;
            });
        });
        this.input.value = colorHex;
    };

    private readonly setColor = (e: Event) => {
        let value = (e.target as any).value;
        let color = this.converter.convertBack(value).value;
        if (color === undefined) {
            PubSub.default.pub("showToast", "toast.converter.invalidColor");
            return;
        }
        Transaction.execute(this.document, "change color", () => {
            this.objects.forEach((x) => {
                x[this.property.name] = color;
            });
        });
    };
}

customElements.define("luminicad-color-property", ColorProperty);
