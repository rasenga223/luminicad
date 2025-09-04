import {
    AsyncController,
    EdgeMeshDataBuilder,
    GeometryNode,
    I18n,
    Precision,
    ShapeMeshData,
    XYZ,
    command,
} from "luminicad-core";
import { PolygonNode } from "../../bodys";
import { Dimension, PointSnapData, SnapResult } from "../../snap";
import { IStep, PointStep } from "../../step";
import { CreateFaceableCommand } from "../createCommand";

@command({
    name: "create.polygon",
    display: "command.polygon",
    icon: `<svg viewBox="0 0 512 512" fill="#808080">
        <path d="M304.067,96.868c-5.334,7.334-3.707,17.593,3.627,22.918l81.368,59.108c2.907,2.125,6.285,3.147,9.628,3.147
            c5.076,0,10.081-2.347,13.29-6.774c5.334-7.334,3.707-17.593-3.627-22.918l-81.368-59.108
            C319.66,87.898,309.374,89.543,304.067,96.868z"></path>
        <path d="M113.31,182.041c3.343,0,6.721-1.022,9.628-3.147l81.368-59.108c7.334-5.325,8.961-15.584,3.627-22.918
            c-5.316-7.325-15.593-8.97-22.918-3.627l-81.368,59.108c-7.334,5.325-8.961,15.584-3.627,22.918
            C103.22,179.685,108.234,182.041,113.31,182.041z"></path>
        <path d="M106.473,394.365c1.671,0,3.378-0.258,5.067-0.8c8.623-2.8,13.344-12.055,10.543-20.678l-31.079-95.654
            c-2.8-8.623-12.028-13.352-20.678-10.543c-8.623,2.8-13.344,12.055-10.543,20.678l31.079,95.654
            C93.121,389.956,99.557,394.365,106.473,394.365z"></path>
        <path d="M441.673,266.681c-8.632-2.8-17.877,1.929-20.678,10.543l-31.079,95.654c-2.8,8.623,1.92,17.877,10.543,20.678
            c1.68,0.551,3.396,0.809,5.067,0.809c6.925,0,13.352-4.409,15.611-11.352l31.079-95.654
            C455.016,278.736,450.296,269.481,441.673,266.681z"></path>
        <path d="M306.29,433.632h-100.57c-9.068,0-16.411,7.343-16.411,16.411s7.343,16.411,16.411,16.411h100.562
            c9.068,0,16.42-7.343,16.42-16.411S315.357,433.632,306.29,433.632z"></path>
        <circle cx="256" cy="61.958" r="19.149" fill="#1F77B4"/>
        <circle cx="460.03" cy="210.195" r="19.149" fill="#1F77B4"/>
        <circle cx="382.093" cy="450.042" r="19.149" fill="#1F77B4"/>
        <circle cx="129.907" cy="450.042" r="19.149" fill="#1F77B4"/>
        <circle cx="51.97" cy="210.195" r="19.149" fill="#1F77B4"/>
    </svg>`,
})
export class Polygon extends CreateFaceableCommand {
    protected override geometryNode(): GeometryNode {
        let node = new PolygonNode(
            this.document,
            this.stepDatas.map((step) => step.point!),
        );
        node.isFace = this.isFace;
        return node;
    }

    protected override async executeSteps(): Promise<boolean> {
        let steps = this.getSteps();
        let firstStep = true;
        while (true) {
            let step = firstStep ? steps[0] : steps[1];
            if (firstStep) firstStep = false;
            this.controller = new AsyncController();
            let data = await step.execute(this.document, this.controller);
            if (data === undefined) {
                return this.controller.result?.status === "success";
            }
            this.stepDatas.push(data);
            if (this.isClose(data)) {
                return true;
            }
        }
    }

    private isClose(data: SnapResult) {
        return (
            this.stepDatas.length > 1 &&
            this.stepDatas[0].point!.distanceTo(data.point!) <= Precision.Distance
        );
    }

    protected override getSteps(): IStep[] {
        let firstStep = new PointStep("operate.pickFistPoint");
        let secondStep = new PointStep("operate.pickNextPoint", this.getNextData);
        return [firstStep, secondStep];
    }

    private readonly getNextData = (): PointSnapData => {
        return {
            refPoint: () => this.stepDatas.at(-1)!.point!,
            dimension: Dimension.D1D2D3,
            validator: this.validator,
            preview: this.preview,
            featurePoints: [
                {
                    point: this.stepDatas.at(0)!.point!,
                    prompt: I18n.translate("prompt.polygon.close"),
                    when: () => this.stepDatas.length > 2,
                },
            ],
        };
    };

    private readonly preview = (point: XYZ | undefined): ShapeMeshData[] => {
        let ps = this.stepDatas.map((data) => this.meshPoint(data.point!));
        let edges = new EdgeMeshDataBuilder();
        this.stepDatas.forEach((data) => edges.addPosition(data.point!.x, data.point!.y, data.point!.z));
        if (point) {
            edges.addPosition(point.x, point.y, point.z);
        }
        return [...ps, edges.build()];
    };

    private readonly validator = (point: XYZ): boolean => {
        for (const data of this.stepDatas) {
            if (point.distanceTo(data.point!) < 0.001) {
                return false;
            }
        }
        return true;
    };
}
