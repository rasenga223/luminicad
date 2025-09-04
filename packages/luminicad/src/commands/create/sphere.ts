import { GeometryNode, Precision, XYZ, command } from "luminicad-core";
import { SphereNode } from "../../bodys";
import { SnapLengthAtPlaneData } from "../../snap";
import { IStep, LengthAtPlaneStep, PointStep } from "../../step";
import { CreateCommand } from "../createCommand";

@command({
    name: "create.sphere",
    display: "command.sphere",
    icon: "icon-sphere",
})
export class Sphere extends CreateCommand {
    protected override getSteps(): IStep[] {
        let centerStep = new PointStep("operate.pickCircleCenter");
        let radiusStep = new LengthAtPlaneStep("operate.pickRadius", this.getRadiusData);
        return [centerStep, radiusStep];
    }

    private readonly getRadiusData = (): SnapLengthAtPlaneData => {
        const point = this.stepDatas[0].point!;
        return {
            point: () => point,
            preview: this.previewSphere,
            plane: () => this.stepDatas[0].view.workplane.translateTo(point),
            validator: (p: XYZ) => p.distanceTo(point) > Precision.Distance,
        };
    };

    private readonly previewSphere = (end: XYZ | undefined) => {
        if (!end) {
            return [this.meshPoint(this.stepDatas[0].point!)];
        }

        const radius = this.stepDatas[0].point?.distanceTo(end)!;
        return [
            this.meshPoint(this.stepDatas[0].point!),
            this.meshCreatedShape("circle", XYZ.unitZ, this.stepDatas[0].point!, radius),
            this.meshCreatedShape("circle", XYZ.unitY, this.stepDatas[0].point!, radius),
        ];
    };

    protected override geometryNode(): GeometryNode {
        const radius = this.stepDatas[0].point!.distanceTo(this.stepDatas[1].point!);
        return new SphereNode(this.document, this.stepDatas[0].point!, radius);
    }
}
