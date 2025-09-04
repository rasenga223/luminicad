import { GeometryNode, Plane, Precision, XYZ, command } from "luminicad-core";
import { BoxNode } from "../../bodys";
import { LengthAtAxisSnapData } from "../../snap";
import { IStep, LengthAtAxisStep } from "../../step";
import { RectCommandBase } from "./rect";

@command({
    name: "create.box",
    display: "command.box",
    icon: `<svg viewBox="0 0 512 512" fill="none">
        <path d="M486.289,97.293L262.296,1.296c-4.048-1.728-8.56-1.728-12.608,0L25.695,97.293
            C19.791,99.821,16,105.581,16,111.997v287.991c0,6.416,3.792,12.176,9.696,14.704l223.993,95.997c4.048,1.728,8.56,1.728,12.608,0
            l223.993-95.997c5.904-2.528,9.696-8.272,9.696-14.704V111.997C495.985,105.581,492.193,99.821,486.289,97.293z M239.993,471.729
            L47.999,389.444V136.268l191.994,82.285V471.729z M255.992,190.586l-183.37-78.59l183.37-78.59l183.37,78.59L255.992,190.586z
            M463.986,389.444l-191.994,82.285V218.553l191.994-82.285V389.444z" fill="#808080"/>
        <polygon points="255.992,207.993 255.992,495.984 31.999,399.988 31.999,111.997" fill="#1F77B4" opacity="0.3"/>
        <polygon points="479.985,111.997 479.985,399.988 255.992,495.984 255.992,207.993" fill="#1F77B4" opacity="0.5"/>
        <polygon points="479.985,111.997 255.992,207.993 31.999,111.997 255.992,16" fill="#1F77B4" opacity="0.7"/>
    </svg>`,
})
export class Box extends RectCommandBase {
    protected override getSteps(): IStep[] {
        let steps = super.getSteps();
        let third = new LengthAtAxisStep("operate.pickNextPoint", this.getHeightStepData);
        return [...steps, third];
    }

    private readonly getHeightStepData = (): LengthAtAxisSnapData => {
        const plane = this.stepDatas[1].plane;
        if (plane === undefined) {
            throw new Error("plane is undefined, please report bug");
        }
        return {
            point: this.stepDatas[1].point!,
            direction: plane.normal,
            preview: this.previewBox,
        };
    };

    private readonly previewBox = (end: XYZ | undefined) => {
        if (!end) {
            return this.previewRect(this.stepDatas[1].point);
        }

        const { plane, dx, dy } = this.rectDataFromTwoSteps();
        return [
            this.meshPoint(this.stepDatas[0].point!),
            this.meshPoint(this.stepDatas[1].point!),
            this.meshCreatedShape("box", plane, dx, dy, this.getHeight(plane, end)),
        ];
    };

    protected override geometryNode(): GeometryNode {
        const rect = this.rectDataFromTwoSteps();
        const dz = this.getHeight(rect.plane, this.stepDatas[2].point!);
        return new BoxNode(this.document, rect.plane, rect.dx, rect.dy, dz);
    }

    private getHeight(plane: Plane, point: XYZ): number {
        const h = point.sub(this.stepDatas[1].point!).dot(plane.normal);
        if (Math.abs(h) < Precision.Distance) {
            return h < 0 ? -0.00001 : 0.00001;
        }
        return h;
    }
}
