import {
    AsyncController,
    EdgeMeshData,
    GeometryNode,
    LineType,
    Matrix4,
    ShapeMeshData,
    Transaction,
    VisualConfig,
    VisualNode,
    XYZ,
    command,
} from "luminicad-core";
import { Dimension, PointSnapData } from "../../snap";
import { IStep, PointStep } from "../../step";
import { MultistepCommand } from "../multistepCommand";

@command({
    name: "modify.array",
    display: "command.array",
    icon: "icon-array",
})
export class Array extends MultistepCommand {
    private models?: VisualNode[];
    private positions?: number[];

    getSteps(): IStep[] {
        let firstStep = new PointStep("operate.pickFistPoint");
        let secondStep = new PointStep("operate.pickNextPoint", this.getSecondPointData);
        return [firstStep, secondStep];
    }

    private readonly getSecondPointData = (): PointSnapData => {
        return {
            refPoint: () => this.stepDatas[0].point!,
            dimension: Dimension.D1D2D3,
            preview: this.movePreview,
        };
    };

    private readonly movePreview = (point: XYZ | undefined): ShapeMeshData[] => {
        if (!point) return [];
        let start = this.stepDatas[0].point!;
        let positions = [...this.positions!];
        let { x, y, z } = point.sub(start);
        for (let i = 0; i < this.positions!.length; i++) {
            if (i % 3 === 0) positions[i] += x;
            else if (i % 3 === 1) positions[i] += y;
            else if (i % 3 === 2) positions[i] += z;
        }
        positions.push(start.x, start.y, start.z, point.x, point.y, point.z);
        return [
            {
                positions: new Float32Array(positions),
                lineType: LineType.Solid,
                color: VisualConfig.temporaryEdgeColor,
                groups: [],
            } as EdgeMeshData,
        ];
    };

    protected override async beforeExecute(): Promise<boolean> {
        this.models = this.document.selection.getSelectedNodes().filter((x) => x instanceof GeometryNode);
        if (this.models.length === 0) {
            this.controller = new AsyncController();
            this.models = await this.document.selection.pickNode("axis.x", this.controller, true);
            if (this.models.length === 0) return false;
        }
        this.positions = [];
        this.models?.forEach((model) => {});
        return true;
    }

    protected executeMainTask(): void {
        Transaction.execute(this.document, `execute ${Object.getPrototypeOf(this).data.name}`, () => {
            let vec = this.stepDatas[1].point!.sub(this.stepDatas[0].point!);
            let transform = Matrix4.createTranslation(vec.x, vec.y, vec.z);
            this.models?.forEach((x) => {
                x.transform = x.transform.multiply(transform);
            });
            this.document.visual.update();
        });
    }
}
