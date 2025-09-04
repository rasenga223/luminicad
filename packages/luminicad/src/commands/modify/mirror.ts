import { Matrix4, Plane, ShapeMeshData, XYZ, command } from "luminicad-core";
import { Dimension, PointSnapData } from "../../snap";
import { IStep, PointStep } from "../../step";
import { TransformedCommand } from "./transformedCommand";

@command({
    name: "modify.mirror",
    display: "command.mirror",
    icon: `<svg viewBox="0 0 480 480" fill="none">
        <path d="M16,416 L192,240 L16,64" fill="#1F77B4" opacity="0.7"></path>
        <path d="M464,416 L288,240 L464,64" fill="#FFFFFF"></path>
        <rect x="224" y="400" width="32" height="64" fill="#808080"></rect>
        <rect x="224" y="304" width="32" height="64" fill="#808080"></rect>
        <rect x="224" y="208" width="32" height="64" fill="#808080"></rect>
        <rect x="224" y="16" width="32" height="64" fill="#808080"></rect>
        <rect x="224" y="112" width="32" height="64" fill="#808080"></rect>
        <path d="M27.312,52.688c-4.576-4.576-11.456-5.952-17.44-3.472C3.904,51.696,0,57.536,0,64v352
            c0,6.464,3.904,12.304,9.872,14.784c5.984,2.48,12.864,1.104,17.44-3.472l176-176C206.288,248.336,208,244.208,208,240
            s-1.712-8.336-4.688-11.312L27.312,52.688z M32,377.376V102.624L169.376,240L32,377.376z" fill="#808080"></path>
        <path d="M470.128,49.216c-5.984-2.48-12.864-1.104-17.44,3.472l-176,176
            C273.712,231.664,272,235.792,272,240c0,4.208,1.712,8.336,4.688,11.312l176,176c4.576,4.576,11.456,5.952,17.44,3.472
            c5.968-2.48,9.872-8.32,9.872-14.784V64C480,57.536,476.096,51.696,470.128,49.216z M448,377.376L310.624,240L448,102.624V377.376z" fill="#808080"></path>
    </svg>`,
})
export class Mirror extends TransformedCommand {
    protected override transfrom(point: XYZ): Matrix4 {
        const center = this.stepDatas[0].point!;
        const xvec = this.stepDatas[0].view.workplane.normal;
        const yvec = point.sub(center);
        const normal = yvec.cross(xvec);
        const plane = new Plane(center, normal, xvec);
        return Matrix4.createMirrorWithPlane(plane);
    }

    getSteps(): IStep[] {
        let firstStep = new PointStep("operate.pickFistPoint", undefined, true);
        let secondStep = new PointStep("operate.pickNextPoint", this.getSecondPointData, true);
        return [firstStep, secondStep];
    }

    private readonly getSecondPointData = (): PointSnapData => {
        return {
            refPoint: () => this.stepDatas[0].point!,
            dimension: Dimension.D1D2,
            preview: this.mirrorPreview,
            validator: (p) => {
                const vec = p.sub(this.stepDatas[0].point!);
                return vec.length() > 1e-3 && !vec.isParallelTo(this.stepDatas[0].view.workplane.normal);
            },
        };
    };

    private readonly mirrorPreview = (point: XYZ | undefined): ShapeMeshData[] => {
        const p1 = this.meshPoint(this.stepDatas[0].point!);
        if (!point) return [p1];
        const shape = this.transformPreview(point);
        const offset = point.sub(this.stepDatas[0].point!).normalize()!.multiply(1e6);
        const line = this.getTempLineData(this.stepDatas[0].point!.sub(offset), point.add(offset));
        return [p1, shape, line];
    };
}
