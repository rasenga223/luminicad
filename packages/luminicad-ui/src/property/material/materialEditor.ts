import {
    Binding,
    IConverter,
    Material,
    MaterialLibrary,
    PathBinding,
    Property,
    PubSub,
    Result,
    Texture,
} from "luminicad-core";
import { button, collection, div, localize, span } from "../../components";
import { ColorConverter } from "../../converters";
import { findPropertyControl } from "../utils";
import { MaterialDataContent } from "./materialDataContent";
import style from "./materialEditor.module.css";
import { UrlStringConverter } from "./urlConverter";

class ActiveStyleConverter implements IConverter<Material> {
    constructor(readonly material: Material) {}

    convert(value: Material): Result<string> {
        return Result.ok(this.material === value ? `${style.material} ${style.active}` : style.material);
    }
}

export class MaterialEditor extends HTMLElement {
    private readonly editingControl: HTMLElement;
    private readonly colorConverter = new ColorConverter();

    constructor(readonly dataContent: MaterialDataContent) {
        super();
        this.editingControl = div({ className: style.properties });
        this.initEditingControl(dataContent.editingMaterial);

        const presetsFromLibrary = MaterialLibrary.getAllPresets() as Record<string, Record<string, any>>;
        const libraryPresets: Array<{ name: string; color?: number | string }> = [];
        Object.keys(presetsFromLibrary).forEach((category) => {
            const categoryPresets = presetsFromLibrary[category];
            Object.keys(categoryPresets).forEach((key) => {
                libraryPresets.push(categoryPresets[key]);
            });
        });

        const dropdown = document.createElement("select");
        const placeholderOption = document.createElement("option");
        placeholderOption.textContent = "Select Material";
        placeholderOption.value = "";
        dropdown.appendChild(placeholderOption);
        libraryPresets.forEach((preset, idx) => {
            const option = document.createElement("option");
            option.textContent = preset.name;
            option.value = idx.toString();
            dropdown.appendChild(option);
        });
        dropdown.addEventListener("change", () => {
            const selectedIndex = dropdown.value;
            if (selectedIndex !== "") {
                const preset = libraryPresets[parseInt(selectedIndex, 10)];
                this.dataContent.addMaterial(preset);
                const materials = this.dataContent.document.materials as unknown as Material[];
                this.dataContent.editingMaterial = materials[materials.length - 1];
                dropdown.value = "";
            }
        });

        this.append(
            div(
                { className: style.root },
                div(
                    { className: style.title },
                    span({ textContent: localize("common.material") }),
                    (() => {
                        const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                        svgEl.setAttribute("class", style.iconButton);
                        svgEl.setAttribute("viewBox", "0 0 24 24");
                        svgEl.setAttribute("fill", "none");
                        svgEl.setAttribute("stroke", "currentColor");
                        svgEl.setAttribute("stroke-linecap", "round");
                        svgEl.setAttribute("stroke-linejoin", "round");
                        svgEl.innerHTML = `
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        `;
                        svgEl.addEventListener("click", () => {
                            this.dataContent.addMaterial();
                        });
                        return svgEl;
                    })(),
                    (() => {
                        const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                        svgEl.setAttribute("class", style.iconButton);
                        svgEl.setAttribute("viewBox", "0 0 24 24");
                        svgEl.setAttribute("fill", "none");
                        svgEl.setAttribute("stroke", "currentColor");
                        svgEl.setAttribute("stroke-linecap", "round");
                        svgEl.setAttribute("stroke-linejoin", "round");
                        svgEl.innerHTML = `
                            <rect x="8" y="8" width="12" height="12" rx="2" ry="2"></rect>
                            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
                        `;
                        svgEl.addEventListener("click", () => {
                            this.dataContent.copyMaterial();
                        });
                        return svgEl;
                    })(),
                    (() => {
                        const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                        svgEl.setAttribute("class", style.iconButton);
                        svgEl.setAttribute("viewBox", "0 0 24 24");
                        svgEl.setAttribute("fill", "none");
                        svgEl.setAttribute("stroke", "currentColor");
                        svgEl.setAttribute("stroke-linecap", "round");
                        svgEl.setAttribute("stroke-linejoin", "round");
                        svgEl.innerHTML = `
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        `;
                        svgEl.addEventListener("click", () => {
                            this.dataContent.deleteMaterial();
                        });
                        return svgEl;
                    })(),
                ),
                collection({
                    className: style.materials,
                    sources: this.dataContent.document.materials,
                    template: (material: Material) =>
                        span({
                            className: new Binding(
                                this.dataContent,
                                "editingMaterial",
                                new ActiveStyleConverter(material),
                            ),
                            title: material.name,
                            style: {
                                backgroundColor: new Binding(material, "color", this.colorConverter),
                                backgroundImage: new PathBinding(
                                    material,
                                    "map.image",
                                    new UrlStringConverter(),
                                ),
                                backgroundBlendMode: material.map?.image ? "multiply" : "normal",
                                backgroundSize: "contain",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                            },
                            onclick: () => {
                                this.dataContent.editingMaterial = material;
                            },
                            ondblclick: () => {
                                this.dataContent.callback(material);
                                this.remove();
                            },
                        }),
                }),
                div(
                    { className: style.libraryDropdownContainer },
                    span({ textContent: "Library" }),
                    dropdown,
                ),
                this.editingControl,
                div(
                    { className: style.bottom },
                    button({
                        textContent: localize("common.confirm"),
                        onclick: () => {
                            this.dataContent.callback(this.dataContent.editingMaterial);
                            this.remove();
                        },
                    }),
                    button({
                        textContent: localize("common.cancel"),
                        onclick: () => {
                            this.remove();
                        },
                    }),
                ),
            ),
        );
    }

    connectedCallback() {
        this.dataContent.onPropertyChanged(this._onEditingMaterialChanged);
        PubSub.default.sub("showProperties", this._handleShowProperty);
    }

    disconnectedCallback() {
        PubSub.default.remove("showProperties", this._handleShowProperty);
    }

    private readonly _handleShowProperty = () => {
        this.remove();
    };

    private readonly _onEditingMaterialChanged = (property: keyof MaterialDataContent) => {
        if (property !== "editingMaterial") return;
        this.editingControl.firstChild?.remove();
        this.initEditingControl(this.dataContent.editingMaterial);
    };

    private initEditingControl(material: Material) {
        this.editingControl.innerHTML = "";
        const isTexture = (p: Property) => {
            return (material as any)[p.name] instanceof Texture;
        };

        let properties = Property.getProperties(material);
        this.editingControl.append(
            ...properties
                .filter((x) => !isTexture(x))
                .map((x) => findPropertyControl(this.dataContent.document, [material], x)),
            ...properties
                .filter(isTexture)
                .map((x) => findPropertyControl(this.dataContent.document, [material], x)),
        );
    }
}

customElements.define("material-editor", MaterialEditor);
