import { IVisualObject } from "./visualObject";

export interface ITextGenerator {
    generate(text: string, size: number, color: number, font: "fzhei"): Promise<IVisualObject>;
}
