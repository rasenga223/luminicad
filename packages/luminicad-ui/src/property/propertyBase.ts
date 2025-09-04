import style from "./propertyBase.module.css";

export abstract class PropertyBase extends HTMLElement {
    constructor(readonly objects: any[]) {
        super();
        this.className = style.panel;
        if (objects.length === 0) {
            throw new Error(`there are no objects`);
        }
    }
}
