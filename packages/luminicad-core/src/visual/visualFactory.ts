import { IDocument } from "../document";
import { IVisual } from "./visual";

export interface IVisualFactory {
    readonly kernelName: string;
    create(document: IDocument): IVisual;
}
