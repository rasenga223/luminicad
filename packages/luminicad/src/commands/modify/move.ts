import { Matrix4, XYZ, command } from "luminicad-core";
import { Dimension, PointSnapData } from "../../snap";
import { IStep, PointStep } from "../../step";
import { TransformedCommand } from "./transformedCommand";

@command({
    name: "modify.move",
    display: "command.move",
    icon: `<svg viewBox="0 0 480 480" fill="none">
        <path d="M240,80 L240,400" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <path d="M80,240 L400,240" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <path d="M240,80 L160,160" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <path d="M240,80 L320,160" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <path d="M240,400 L160,320" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <path d="M240,400 L320,320" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <path d="M80,240 L160,160" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <path d="M80,240 L160,320" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <path d="M400,240 L320,160" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <path d="M400,240 L320,320" stroke="#297BCC" stroke-width="16" stroke-linecap="round"></path>
        <circle cx="240" cy="240" r="40" fill="#4DC4FF" opacity="0.7"></circle>
    </svg>`,
})
export class Move extends TransformedCommand {
    getSteps(): IStep[] {
        return [
            new PointStep("operate.pickFistPoint", undefined, true),
            new PointStep("operate.pickNextPoint", this.getSecondPointData, true),
        ];
    }

    private readonly getSecondPointData = (): PointSnapData => {
        return {
            refPoint: () => this.stepDatas[0].point!,
            dimension: Dimension.D1D2D3,
            preview: this.movePreview,
        };
    };

    private readonly movePreview = (point: XYZ | undefined) => {
        const p1 = this.meshPoint(this.stepDatas[0].point!);
        if (!point) return [p1];
        return [p1, this.transformPreview(point), this.getTempLineData(this.stepDatas[0].point!, point)];
    };

    protected override transfrom(point: XYZ): Matrix4 {
        const { x, y, z } = point.sub(this.stepDatas[0].point!);
        return Matrix4.createTranslation(x, y, z);
    }
}
