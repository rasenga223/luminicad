import { GeometryNode, Precision, Property, XYZ, command } from "luminicad-core";
import { LineNode } from "../../bodys";
import { Dimension, PointSnapData } from "../../snap";
import { IStep, PointStep } from "../../step";
import { CreateCommand } from "../createCommand";

@command({
    name: "create.line",
    display: "command.line",
    icon: `<svg viewBox="0 0 512 512" fill="#808080" stroke="none">
        <path d="M458.667,0c-29.419,0-53.333,23.936-53.333,53.333c0,10.859,3.285,20.928,8.875,29.376l-331.52,331.52
            c-8.427-5.611-18.496-8.896-29.355-8.896C23.915,405.333,0,429.269,0,458.667S23.915,512,53.333,512
            c29.419,0,53.333-23.936,53.333-53.333c0-10.859-3.285-20.928-8.875-29.376l331.52-331.52c8.427,5.611,18.496,8.896,29.355,8.896
            c29.419,0,53.333-23.936,53.333-53.333S488.085,0,458.667,0z"></path>
        <circle cx="53.333" cy="458.667" r="32" fill="#1F77B4"></circle>
        <circle cx="458.667" cy="53.333" r="32" fill="#1F77B4"></circle>
    </svg>`,
})
export class Line extends CreateCommand {
    @Property.define("command.line.isConnected", {
        dependencies: [{ property: "repeatOperation", value: true }],
    })
    get isContinue() {
        return this.getPrivateValue("isContinue", false);
    }
    set isContinue(value: boolean) {
        this.setProperty("isContinue", value);
    }

    protected override geometryNode(): GeometryNode {
        return new LineNode(this.document, this.stepDatas[0].point!, this.stepDatas[1].point!);
    }

    getSteps(): IStep[] {
        let firstStep = new PointStep("operate.pickFistPoint");
        let secondStep = new PointStep("operate.pickNextPoint", this.getSecondPointData);
        return [firstStep, secondStep];
    }

    protected override resetSteps() {
        if (this.isContinue) {
            this.stepDatas[0] = this.stepDatas[1];
            this.stepDatas.length = 1;
        } else {
            this.stepDatas.length = 0;
        }
    }

    private readonly getSecondPointData = (): PointSnapData => {
        return {
            refPoint: () => this.stepDatas[0].point!,
            dimension: Dimension.D1D2D3,
            validator: (point: XYZ) => {
                return this.stepDatas[0].point!.distanceTo(point) > Precision.Distance;
            },
            preview: this.linePreview,
        };
    };

    private readonly linePreview = (point: XYZ | undefined) => {
        if (!point) {
            return [this.meshPoint(this.stepDatas[0].point!)];
        }
        return [this.meshPoint(this.stepDatas[0].point!), this.meshLine(this.stepDatas[0].point!, point)];
    };
}
