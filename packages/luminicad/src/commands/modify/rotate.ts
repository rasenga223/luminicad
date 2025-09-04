import { Matrix4, Precision, ShapeMeshData, XYZ, command } from "luminicad-core";
import { Dimension, PointSnapData, SnapLengthAtPlaneData } from "../../snap";
import { AngleStep, IStep, LengthAtPlaneStep, PointStep } from "../../step";
import { TransformedCommand } from "./transformedCommand";

@command({
    name: "modify.rotate",
    display: "command.rotate",
    icon: `<svg viewBox="0 0 480 480" fill="none">
        <path d="M240,240 m-160,0 a160,160 0 1,0 320,0 a160,160 0 1,0 -320,0" stroke="#808080" stroke-width="16" fill="none"></path>
        <path d="M240,80 L240,16" stroke="#808080" stroke-width="16" stroke-linecap="round"></path>
        <path d="M240,464 L240,400" stroke="#808080" stroke-width="16" stroke-linecap="round"></path>
        <path d="M80,240 L16,240" stroke="#808080" stroke-width="16" stroke-linecap="round"></path>
        <path d="M464,240 L400,240" stroke="#808080" stroke-width="16" stroke-linecap="round"></path>
        <path d="M240,240 L350,130" stroke="#1F77B4" stroke-width="16" stroke-linecap="round" opacity="0.7"></path>
        <path d="M350,130 L390,170" stroke="#1F77B4" stroke-width="16" stroke-linecap="round" opacity="0.7"></path>
        <path d="M350,130 L310,90" stroke="#1F77B4" stroke-width="16" stroke-linecap="round" opacity="0.7"></path>
    </svg>`,
})
export class Rotate extends TransformedCommand {
    protected override transfrom(point: XYZ): Matrix4 {
        const normal = this.stepDatas[1].plane!.normal;
        const center = this.stepDatas[0].point!;
        const angle = this.getAngle(point);
        return Matrix4.createRotationAt(center, normal, angle);
    }

    getSteps(): IStep[] {
        let firstStep = new PointStep("operate.pickFistPoint", undefined, true);
        let secondStep = new LengthAtPlaneStep("operate.pickNextPoint", this.getSecondPointData, true);
        let thirdStep = new AngleStep(
            "operate.pickNextPoint",
            () => this.stepDatas[0].point!,
            () => this.stepDatas[1].point!,
            this.getThirdPointData,
            true,
        );
        return [firstStep, secondStep, thirdStep];
    }

    private readonly getSecondPointData = (): SnapLengthAtPlaneData => {
        const { point, view } = this.stepDatas[0];
        return {
            point: () => point!,
            preview: this.circlePreview,
            plane: (p: XYZ | undefined) => this.findPlane(view, point!, p),
            validator: (p: XYZ) => {
                if (p.distanceTo(point!) < Precision.Distance) return false;
                return p.sub(point!).isParallelTo(this.stepDatas[0].view.workplane.normal) === false;
            },
        };
    };

    private readonly circlePreview = (end: XYZ | undefined) => {
        const visualCenter = this.meshPoint(this.stepDatas[0].point!);
        if (!end) return [visualCenter];
        const { point, view } = this.stepDatas[0];
        const plane = this.findPlane(view, point!, end);
        return [
            visualCenter,
            this.meshLine(this.stepDatas[0].point!, end),
            this.meshCreatedShape("circle", plane.normal, point!, plane.projectDistance(point!, end)),
        ];
    };

    private readonly getThirdPointData = (): PointSnapData => {
        return {
            dimension: Dimension.D1D2,
            preview: this.anglePreview,
            plane: () => this.stepDatas[1].plane!,
            validator: (p) => {
                return (
                    p.distanceTo(this.stepDatas[0].point!) > 1e-3 &&
                    p.distanceTo(this.stepDatas[1].point!) > 1e-3
                );
            },
        };
    };

    private getAngle(point: XYZ) {
        const normal = this.stepDatas[1].plane!.normal;
        const center = this.stepDatas[0].point!;
        const p1 = this.stepDatas[1].point!;
        const v1 = p1.sub(center);
        const v2 = point.sub(center);
        return v1.angleOnPlaneTo(v2, normal)!;
    }

    private readonly anglePreview = (point: XYZ | undefined): ShapeMeshData[] => {
        point = point ?? this.stepDatas[1].point!;
        const result = [
            this.transformPreview(point),
            this.meshPoint(this.stepDatas[0].point!),
            this.meshPoint(this.stepDatas[1].point!),
            this.getRayData(this.stepDatas[1].point!),
            this.getRayData(point),
        ];

        const angle = this.getAngle(point);
        if (Math.abs(angle) > Precision.Angle) {
            result.push(
                this.meshCreatedShape(
                    "arc",
                    this.stepDatas[1].plane!.normal,
                    this.stepDatas[0].point!,
                    this.stepDatas[1].point!,
                    (angle * 180) / Math.PI,
                ),
            );
        }
        return result;
    };

    private getRayData(end: XYZ) {
        let center = this.stepDatas[0].point!;
        let rayEnd = center.add(end.sub(center).normalize()!.multiply(1e6));
        return this.getTempLineData(center, rayEnd);
    }
}
