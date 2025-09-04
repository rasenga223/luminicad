import style from "./ribbonStack.module.css";

export class RibbonStack extends HTMLElement {
    constructor() {
        super();
        this.className = style.root;
    }
}

customElements.define("ribbon-stack", RibbonStack);
