import { Config, GeometryNode, MathUtils, Plane, Property, XYZ, command } from "luminicad-core";
import { ViewUtils } from "luminicad-vis";
import { RectNode } from "../../bodys";
import { SnapLengthAtPlaneData, SnapResult } from "../../snap";
import { IStep, LengthAtPlaneStep, PointStep } from "../../step";
import { CreateCommand } from "../createCommand";

export interface RectData {
    plane: Plane;
    dx: number;
    dy: number;
    p1: XYZ;
    p2: XYZ;
}

export namespace RectData {
    export function get(atPlane: Plane, start: XYZ, end: XYZ): RectData {
        let plane = new Plane(start, atPlane.normal, atPlane.xvec);
        let vector = end.sub(start);
        let dx = vector.dot(plane.xvec);
        let dy = vector.dot(plane.yvec);
        return { plane, dx, dy, p1: start, p2: end };
    }
}

export abstract class RectCommandBase extends CreateCommand {
    protected getSteps(): IStep[] {
        return [
            new PointStep("operate.pickFistPoint"),
            new LengthAtPlaneStep("operate.pickNextPoint", this.nextSnapData),
        ];
    }

    private readonly nextSnapData = (): SnapLengthAtPlaneData => {
        const { point, view } = this.stepDatas[0];
        return {
            point: () => point!,
            preview: this.previewRect,
            plane: (tmp: XYZ | undefined) => this.findPlane(view, point!, tmp),
            validator: this.handleValid,
            prompt: (snaped: SnapResult) => {
                let data = this.rectDataFromTemp(snaped.point!);
                return `${data.dx.toFixed(2)}, ${data.dy.toFixed(2)}`;
            },
        };
    };

    private readonly handleValid = (end: XYZ) => {
        const data = this.rectDataFromTemp(end);
        return data !== undefined && !MathUtils.anyEqualZero(data.dx, data.dy);
    };

    protected previewRect = (end: XYZ | undefined) => {
        if (end === undefined) return [this.meshPoint(this.stepDatas[0].point!)];
        const { plane, dx, dy } = this.rectDataFromTemp(end);

        return [
            this.meshPoint(this.stepDatas[0].point!),
            this.meshPoint(end),
            this.meshCreatedShape("rect", plane, dx, dy),
        ];
    };

    protected rectDataFromTemp(tmp: XYZ): RectData {
        const { view, point } = this.stepDatas[0];
        const plane = Config.instance.dynamicWorkplane
            ? ViewUtils.raycastClosestPlane(view, point!, tmp)
            : this.stepDatas[0].view.workplane.translateTo(point!);
        return RectData.get(plane, point!, tmp);
    }

    protected rectDataFromTwoSteps() {
        let rect: RectData;
        if (this.stepDatas[1].plane) {
            rect = RectData.get(this.stepDatas[1].plane, this.stepDatas[0].point!, this.stepDatas[1].point!);
        } else {
            rect = this.rectDataFromTemp(this.stepDatas[1].point!);
        }
        return rect;
    }
}

@command({
    name: "create.rect",
    display: "command.rect",
    icon: `<svg viewBox="0 0 512 512" fill="#808080">
        <path d="M503.467,72.533h-51.2c-4.71,0-8.533,3.823-8.533,8.533v17.067h-409.6c-4.71,0-8.533,3.823-8.533,8.533V371.2H8.533
            c-4.71,0-8.533,3.823-8.533,8.533v51.2c0,4.71,3.823,8.533,8.533,8.533h51.2c4.71,0,8.533-3.823,8.533-8.533v-17.067h409.6
            c4.71,0,8.533-3.823,8.533-8.533V396.8v-256h17.067c4.71,0,8.533-3.823,8.533-8.533v-51.2
            C512,76.356,508.177,72.533,503.467,72.533z M469.333,396.8H68.267v-17.067c0-4.71-3.823-8.533-8.533-8.533H42.667v-256h401.067
            v17.067c0,4.71,3.823,8.533,8.533,8.533h17.067V396.8z"></path>
        <rect x="8.533" y="371.2" width="51.2" height="68.267" rx="8.533" ry="8.533" fill="#1F77B4"/>
        <rect x="452.267" y="72.533" width="51.2" height="68.267" rx="8.533" ry="8.533" fill="#1F77B4"/>
    </svg>`,
})
export class Rect extends RectCommandBase {
    @Property.define("command.faceable.isFace")
    public get isFace() {
        return this.getPrivateValue("isFace", false);
    }
    public set isFace(value: boolean) {
        this.setProperty("isFace", value);
    }

    protected override geometryNode(): GeometryNode {
        const { plane, dx, dy } = this.rectDataFromTwoSteps();
        const node = new RectNode(this.document, plane, dx, dy);
        node.isFace = this.isFace;
        return node;
    }
}
