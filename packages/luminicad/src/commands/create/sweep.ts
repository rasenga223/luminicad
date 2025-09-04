import { GeometryNode, IWire, ShapeType, command } from "luminicad-core";
import { SweepedNode } from "../../bodys";
import { IStep } from "../../step";
import { SelectShapeStep } from "../../step/selectStep";
import { CreateCommand } from "../createCommand";

@command({
    name: "convert.sweep",
    display: "command.sweep",
    icon: `<svg viewBox="0 0 508.575 508.575" fill="none">
        <path d="M17.879,380.599C190.983,270.983,59.127,111.047,238.775,15.991l251.904,111.968
            c-173.104,109.616-41.248,269.552-220.912,364.592L17.879,380.599z" fill="#1F77B4" opacity="0.7"></path>
        <path d="M497.191,113.351L245.271,1.383c-4.496-2-9.632-1.824-13.984,0.48
            c-47.248,24.88-75.712,55.504-92.672,88.416c-25.392,49.456-26.336,101.216-37.712,148.16
            c-11.504,47.104-30.352,89.44-91.584,128.64c-5.008,3.168-7.824,8.784-7.392,14.688s4.048,11.04,9.456,13.456l251.904,111.968
            c4.496,2,9.632,1.824,13.984-0.48c47.264-24.88,75.712-55.52,92.688-88.416c25.392-49.456,26.336-101.216,37.712-148.16
            c11.504-47.104,30.352-89.44,91.584-128.64c5.008-3.168,7.824-8.784,7.392-14.688S502.599,115.751,497.191,113.351z
            M393.879,211.079c-23.776,51.792-24.544,104.016-36.4,149.28c-5.84,22.72-14.048,43.664-28.352,63.2
            c-13.28,18.096-32.08,35.232-60.176,51.136L50.007,377.367c31.472-24.656,51.76-51.904,64.672-79.888
            c23.776-51.792,24.544-104.016,36.4-149.28c5.84-22.72,14.048-43.664,28.336-63.2c13.28-18.096,32.08-35.232,60.176-51.136
            l218.96,97.312C427.079,155.847,406.791,183.095,393.879,211.079z" fill="#808080"></path>
    </svg>`,
})
export class Sweep extends CreateCommand {
    protected override geometryNode(): GeometryNode {
        const shape = this.stepDatas[0].shapes[0].shape;
        const path = this.stepDatas[1].shapes[0].shape as IWire;
        return new SweepedNode(this.document, shape, path);
    }

    protected override getSteps(): IStep[] {
        return [
            new SelectShapeStep(ShapeType.Edge | ShapeType.Wire | ShapeType.Face, "prompt.select.shape"),
            new SelectShapeStep(ShapeType.Edge | ShapeType.Wire, "prompt.select.edges", {
                keepSelection: true,
            }),
        ];
    }
}
