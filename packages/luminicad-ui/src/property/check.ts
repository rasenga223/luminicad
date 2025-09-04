import { Property } from "luminicad-core";

import { PropertyBase } from "./propertyBase";

export class CheckProperty extends PropertyBase {
    constructor(
        objects: any[],
        readonly property: Property,
    ) {
        super(objects);
    }
}

customElements.define("luminicad-check-property", CheckProperty);
