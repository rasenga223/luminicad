import { GeometryNode, Precision, XYZ, command } from "luminicad-core";
import { CircleNode } from "../../bodys";
import { SnapLengthAtPlaneData } from "../../snap";
import { IStep, LengthAtPlaneStep, PointStep } from "../../step";
import { CreateFaceableCommand } from "../createCommand";

@command({
    name: "create.circle",
    display: "command.circle",
    icon: `<svg viewBox="0 0 500.333 500.333" fill="#808080">
        <path d="m500.333 205.667h-33.988c-8.617-42.295-29.246-80.637-60.145-111.535-30.898-30.898-69.24-51.527-111.534-60.144v-33.988h-89v33.987c-42.295 8.617-80.637 29.246-111.535 60.145-30.898 30.898-51.527 69.24-60.144 111.535h-33.987v89h33.988c8.617 42.294 29.246 80.637 60.144 111.535s69.24 51.527 111.535 60.145v33.987h89v-33.987c42.294-8.617 80.636-29.246 111.534-60.144s51.528-69.24 60.145-111.535h33.988v-89.001zm-264.666-175.667h29v29h-29zm-205.667 205.667h29v29h-29zm234.667 234.666h-29v-29h29zm30-34.737v-24.262h-89v24.263c-69.308-16.644-124.285-71.621-140.929-140.929h24.262v-89h-24.262c16.644-69.308 71.621-124.285 140.929-140.929v24.261h89v-24.262c69.308 16.644 124.285 71.621 140.929 140.929h-24.262v89h24.262c-16.644 69.308-71.621 124.284-140.929 140.929zm175.666-170.929h-29v-29h29z"></path>
        <circle cx="250.167" cy="250.167" r="15" fill="#1F77B4"/>
        <rect x="235.667" y="0" width="29" height="29" fill="#1F77B4"/>
        <rect x="235.667" y="471.333" width="29" height="29" fill="#1F77B4"/>
        <rect x="0" y="235.667" width="29" height="29" fill="#1F77B4"/>
        <rect x="471.333" y="235.667" width="29" height="29" fill="#1F77B4"/>
    </svg>`,
})
export class Circle extends CreateFaceableCommand {
    getSteps(): IStep[] {
        let centerStep = new PointStep("operate.pickCircleCenter");
        let radiusStep = new LengthAtPlaneStep("operate.pickRadius", this.getRadiusData);
        return [centerStep, radiusStep];
    }

    private readonly getRadiusData = (): SnapLengthAtPlaneData => {
        const { point, view } = this.stepDatas[0];
        return {
            point: () => point!,
            preview: this.circlePreview,
            plane: (tmp: XYZ | undefined) => this.findPlane(view, point!, tmp),
            validator: (p: XYZ) => {
                if (p.distanceTo(point!) < Precision.Distance) return false;
                const plane = this.findPlane(view, point!, p);
                return p.sub(point!).isParallelTo(plane.normal) === false;
            },
        };
    };

    protected override geometryNode(): GeometryNode {
        const [p1, p2] = [this.stepDatas[0].point!, this.stepDatas[1].point!];
        const plane = this.stepDatas[1].plane ?? this.findPlane(this.stepDatas[1].view, p1, p2);
        const body = new CircleNode(this.document, plane.normal, p1, plane.projectDistance(p1, p2));
        body.isFace = this.isFace;
        return body;
    }

    private readonly circlePreview = (end: XYZ | undefined) => {
        if (!end) return [this.meshPoint(this.stepDatas[0].point!)];

        const { point, view } = this.stepDatas[0];
        const plane = this.findPlane(view, point!, end);
        return [
            this.meshPoint(this.stepDatas[0].point!),
            this.meshLine(point!, end),
            this.meshCreatedShape("circle", plane.normal, point!, plane.projectDistance(point!, end)),
        ];
    };
}
