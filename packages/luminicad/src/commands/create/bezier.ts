import {
    AsyncController,
    EdgeMeshData,
    EditableShapeNode,
    GeometryNode,
    I18n,
    LineType,
    ShapeMeshData,
    VisualConfig,
    XYZ,
    command,
} from "luminicad-core";
import { Dimension, PointSnapData } from "../../snap";
import { IStep, PointStep } from "../../step";
import { CreateCommand } from "../createCommand";

@command({
    name: "create.bezier",
    display: "command.bezier",
    icon: `<svg viewBox="0 0 16 16" fill="#808080">
        <path d="m15.5 11h-2c-.276 0-.5.224-.5.5v.5h-1c-1.93 0-3.5-1.57-3.5-3.5v-1c0-2.481-2.019-4.5-4.5-4.5h-1v-.5c0-.276-.224-.5-.5-.5h-2c-.276 0-.5.224-.5.5v2c0 .276.224.5.5.5h2c.276 0 .5-.224.5-.5v-.5h1c1.93 0 3.5 1.57 3.5 3.5v1c0 2.481 2.019 4.5 4.5 4.5h1v.5c0 .276.224.5.5.5h2c.276 0 .5-.224.5-.5v-2c0-.276-.224-.5-.5-.5z"></path>
        <rect x="0" y="1" width="3" height="3" rx="0.5" ry="0.5" fill="#1F77B4"/>
        <rect x="13" y="12" width="3" height="3" rx="0.5" ry="0.5" fill="#1F77B4"/>
    </svg>`,
})
export class BezierCommand extends CreateCommand {
    protected override geometryNode(): GeometryNode {
        let bezier = this.application.shapeFactory.bezier(this.stepDatas.map((x) => x.point!));
        return new EditableShapeNode(this.document, I18n.translate("command.bezier"), bezier.value);
    }

    protected override async executeSteps() {
        const steps = this.getSteps();
        let firstStep = true;
        while (true) {
            const step = firstStep ? steps[0] : steps[1];
            if (firstStep) firstStep = false;
            this.controller = new AsyncController();
            const data = await step.execute(this.document, this.controller);
            if (data === undefined) {
                return this.controller.result?.status === "success";
            }
            this.stepDatas.push(data);
        }
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
        };
    };

    private readonly preview = (point: XYZ | undefined): ShapeMeshData[] => {
        let ps: ShapeMeshData[] = this.stepDatas.map((data) => this.meshPoint(data.point!));
        let points = this.stepDatas.map((data) => data.point) as XYZ[];
        if (point) {
            points.push(point);
        }
        if (points.length > 1) {
            ps.push(...this.previewLines(points));
            ps.push(this.meshCreatedShape("bezier", points));
        }

        return ps;
    };

    private readonly previewLines = (points: XYZ[]): ShapeMeshData[] => {
        if (points.length < 2) {
            return [];
        }
        let res: ShapeMeshData[] = [];
        for (let i = 1; i < points.length; i++) {
            res.push(this.meshHandle(points[i - 1], points[i]));
        }
        return res;
    };

    protected meshHandle(start: XYZ, end: XYZ) {
        return EdgeMeshData.from(start, end, VisualConfig.temporaryEdgeColor, LineType.Dash);
    }

    private readonly validator = (point: XYZ): boolean => {
        for (const data of this.stepDatas) {
            if (point.distanceTo(data.point!) < 0.001) {
                return false;
            }
        }
        return true;
    };
}
