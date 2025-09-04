import { IDocument, IVisual, IVisualFactory } from "luminicad-core";

import { ThreeVisual } from "./threeVisual";

export class ThreeVisulFactory implements IVisualFactory {
    readonly kernelName = "three";
    create(document: IDocument): IVisual {
        return new ThreeVisual(document);
    }
}
