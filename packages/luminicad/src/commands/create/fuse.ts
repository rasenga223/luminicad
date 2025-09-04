import { GeometryNode, IFace, Precision, ShapeType, command } from "luminicad-core";
import { PrismNode } from "../../bodys";
import { LengthAtAxisSnapData } from "../../snap";
import { IStep, LengthAtAxisStep } from "../../step";
import { SelectShapeStep } from "../../step/selectStep";
import { CreateCommand } from "../createCommand";

@command({
    name: "convert.fuse",
    display: "command.fuse",
    icon: `<svg viewBox="0 0 512 512" fill="none">
        <path d="M507.312,164.688C504.336,161.712,500.208,160,496,160H352V16c0-4.208-1.712-8.336-4.688-11.312
            S340.208,0,336,0H16C11.792,0,7.664,1.712,4.688,4.688S0,11.792,0,16v320c0,4.208,1.712,8.336,4.688,11.312S11.792,352,16,352h144
            v144c0,4.208,1.712,8.336,4.688,11.312S171.792,512,176,512h320c4.208,0,8.336-1.712,11.312-4.688S512,500.208,512,496V176
            C512,171.792,510.288,167.664,507.312,164.688z M480,480H192V336c0-4.208-1.712-8.336-4.688-11.312S180.208,320,176,320H32V32h288
            v144c0,4.208,1.712,8.336,4.688,11.312S331.792,192,336,192h144V480z" fill="#808080"/>
        <polygon points="496,176 496,496 176,496 176,336 16,336 16,16 336,16 336,176" fill="#1F77B4" opacity="0.7"/>
    </svg>`,
})
export class Fuse extends CreateCommand {
    protected override geometryNode(): GeometryNode {
        let shape = this.stepDatas[0].shapes[0].shape as IFace; // todo assert
        let [point, normal] = shape.normal(0, 0);
        let dist = this.stepDatas[1].point!.sub(point).dot(normal);
        return new PrismNode(this.document, shape, dist);
    }

    protected override getSteps(): IStep[] {
        return [
            new SelectShapeStep(ShapeType.Face, "prompt.select.faces"),
            new LengthAtAxisStep("operate.pickNextPoint", this.getLengthStepData),
        ];
    }

    private getLengthStepData = (): LengthAtAxisSnapData => {
        let shape = this.stepDatas[0].shapes[0].shape as IFace; // todo assert
        let [point, normal] = shape.normal(0, 0);
        return {
            point,
            direction: normal,
            preview: (p) => {
                if (!p) return [];
                let dist = p.sub(point).dot(normal);
                if (Math.abs(dist) < Precision.Float) return [];
                let vec = normal.multiply(dist);
                return [this.application.shapeFactory.prism(shape, vec).value.mesh.edges!];
            },
        };
    };
}
