import { GeometryNode, Plane, PlaneAngle, Precision, ShapeMeshData, XYZ, command } from "luminicad-core";
import { ArcNode } from "../../bodys/arc";
import { Dimension, SnapLengthAtPlaneData } from "../../snap";
import { AngleStep, IStep, LengthAtPlaneStep, PointStep } from "../../step";
import { CreateCommand } from "../createCommand";

@command({
    name: "create.arc",
    display: "command.arc",
    icon: `<svg viewBox="0 0 512 512" fill="none">
        <path d="M48.069,450c-0.352,0-0.718-0.015-1.069-0.044c-8.262-0.571-14.487-7.749-13.901-16.011
            C48.23,219.419,221.419,46.23,435.945,31.099c8.145-0.835,15.425,5.64,16.011,13.901s-5.64,15.439-13.901,16.011
            C238.338,75.103,77.103,236.338,63.011,436.055C62.454,443.965,55.877,450,48.069,450z" fill="#808080"/>
        <rect x="0" y="420" width="92" height="92" rx="15" ry="15" fill="#1F77B4"/>
        <rect x="420" y="0" width="92" height="92" rx="15" ry="15" fill="#1F77B4"/>
    </svg>`,
})
export class Arc extends CreateCommand {
    private _planeAngle: PlaneAngle | undefined;

    getSteps(): IStep[] {
        return [
            new PointStep("operate.pickCircleCenter"),
            new LengthAtPlaneStep("operate.pickRadius", this.getRadiusData),
            new AngleStep(
                "operate.pickNextPoint",
                () => this.stepDatas[0].point!,
                () => this.stepDatas[1].point!,
                this.getAngleData,
            ),
        ];
    }

    private readonly getRadiusData = (): SnapLengthAtPlaneData => {
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

    private readonly getAngleData = () => {
        const [center, p1] = [this.stepDatas[0].point!, this.stepDatas[1].point!];
        const plane = this.stepDatas[1].plane ?? this.findPlane(this.stepDatas[1].view, center, p1);
        const points: ShapeMeshData[] = [this.meshPoint(center), this.meshPoint(p1)];
        this._planeAngle = new PlaneAngle(new Plane(center, plane.normal, p1.sub(center)));
        return {
            dimension: Dimension.D1D2,
            preview: (point: XYZ | undefined) => this.anglePreview(point, center, p1, points),
            plane: () => plane,
            validators: [this.angleValidator(center, plane)],
        };
    };

    private anglePreview(
        point: XYZ | undefined,
        center: XYZ,
        p1: XYZ,
        points: ShapeMeshData[],
    ): ShapeMeshData[] {
        point = point ?? p1;
        this._planeAngle!.movePoint(point);
        const result = [...points];
        if (Math.abs(this._planeAngle!.angle) > Precision.Angle) {
            result.push(
                this.meshCreatedShape(
                    "arc",
                    this._planeAngle!.plane.normal,
                    center,
                    p1,
                    this._planeAngle!.angle,
                ),
            );
        }
        return result;
    }

    private angleValidator(center: XYZ, plane: Plane) {
        return (p: XYZ) =>
            p.distanceTo(center) >= Precision.Distance && !p.sub(center).isParallelTo(plane.normal);
    }

    protected override geometryNode(): GeometryNode {
        const [p0, p1] = [this.stepDatas[0].point!, this.stepDatas[1].point!];
        const plane = this.stepDatas[1].plane ?? this.findPlane(this.stepDatas[1].view, p0, p1);
        this._planeAngle?.movePoint(this.stepDatas[2].point!);
        return new ArcNode(this.document, plane.normal, p0, p1, this._planeAngle!.angle);
    }

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
}
