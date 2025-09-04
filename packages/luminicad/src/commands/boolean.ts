import { GeometryNode, IShape, Result, ShapeNode, command } from "luminicad-core";
import { BooleanNode } from "../bodys/boolean";
import { IStep, SelectShapeNodeStep } from "../step";
import { CreateCommand } from "./createCommand";

export abstract class BooleanOperate extends CreateCommand {
    protected override geometryNode(): GeometryNode {
        const shape1 = (this.stepDatas[0].nodes?.[0] as ShapeNode)?.shape.value;
        const shape2 = (this.stepDatas[1].nodes?.[0] as ShapeNode)?.shape.value;
        const booleanType = this.getBooleanOperateType();

        const booleanShape = this.getBooleanShape(booleanType, shape1, shape2);
        const node = new BooleanNode(this.document, booleanShape.value);

        this.stepDatas.forEach((x) => x.nodes?.[0]?.parent?.remove(x.nodes[0]));
        return node;
    }

    private getBooleanShape(
        type: "common" | "cut" | "fuse",
        shape1: IShape,
        shape2: IShape,
    ): Result<IShape> {
        switch (type) {
            case "common":
                return this.application.shapeFactory.booleanCommon(shape1, shape2);
            case "cut":
                return this.application.shapeFactory.booleanCut(shape1, shape2);
            default:
                return this.application.shapeFactory.booleanFuse(shape1, shape2);
        }
    }

    protected abstract getBooleanOperateType(): "common" | "cut" | "fuse";

    protected override getSteps(): IStep[] {
        return [
            new SelectShapeNodeStep("prompt.select.shape"),
            new SelectShapeNodeStep("prompt.select.shape", {
                filter: {
                    allow: (shape) => {
                        return !this.stepDatas[0].nodes
                            ?.map((x) => (x as ShapeNode).shape.value)
                            .includes(shape);
                    },
                },
                keepSelection: true,
            }),
        ];
    }
}

@command({
    name: "boolean.common",
    display: "command.boolean.common",
    icon: `<svg viewBox="0 0 512 512" fill="none">
        <rect x="176" y="176" width="160" height="160" fill="#1F77B4" opacity="0.7"></rect>
        <path d="M352,96h-32v64H176c-4.208,0-8.336,1.712-11.312,4.688S160,171.792,160,176v144H96v32h64v64h32v-64
            h144c4.208,0,8.336-1.712,11.312-4.688S352,340.208,352,336V192h64v-32h-64V96z M320,320H192V192h128V320z" fill="#808080"></path>
        <polygon points="480,224 512,224 512,160 448,160 448,192 480,192" fill="#808080"></polygon>
        <rect x="480" y="256" width="32" height="64" fill="#808080"></rect>
        <polygon points="480,448 480,480 448,480 448,512 512,512 512,448" fill="#808080"></polygon>
        <rect x="256" y="480" width="64" height="32" fill="#808080"></rect>
        <rect x="352" y="480" width="64" height="32" fill="#808080"></rect>
        <polygon points="192,448 160,448 160,512 224,512 224,480 224,480 192,480" fill="#808080"></polygon>
        <rect x="480" y="352" width="32" height="64" fill="#808080"></rect>
        <polygon points="320,64 352,64 352,0 288,0 288,32 320,32" fill="#808080"></polygon>
        <rect x="96" y="0" width="64" height="32" fill="#808080"></rect>
        <rect x="192" y="0" width="64" height="32" fill="#808080"></rect>
        <polygon points="0,64 32,64 32,32 64,32 64,0 64,0 0,0" fill="#808080"></polygon>
        <rect x="0" y="96" width="32" height="64" fill="#808080"></rect>
        <polygon points="32,288 0,288 0,352 64,352 64,320 64,320 32,320" fill="#808080"></polygon>
        <rect x="0" y="192" width="32" height="64" fill="#808080"></rect>
    </svg>`,
})
export class BooleanCommon extends BooleanOperate {
    protected override getBooleanOperateType(): "common" | "cut" | "fuse" {
        return "common";
    }
}

@command({
    name: "boolean.cut",
    display: "command.boolean.cut",
    icon: `<svg viewBox="0 0 512 512" fill="none">
        <polygon points="176,176 336,176 336,16 16,16 16,336 176,336" fill="#1F77B4" opacity="0.7"></polygon>
        <path d="M352,16c0-4.208-1.712-8.336-4.688-11.312C344.336,1.712,340.208,0,336,0H16
            C11.792,0,7.664,1.712,4.688,4.688S0,11.792,0,16v320c0,4.208,1.712,8.336,4.688,11.312S11.792,352,16,352h144v64h32v-80V192h144
            h80v-32h-64V16z M320,160H176c-4.208,0-8.336,1.712-11.312,4.688S160,171.792,160,176v144H32V32h288V160z" fill="#808080"></path>
        <polygon points="448,160 448,192 480,192 480,224 512,224 512,160" fill="#808080"></polygon>
        <rect x="480" y="256" width="32" height="64" fill="#808080"></rect>
        <polygon points="480,480 448,480 448,512 512,512 512,448 480,448" fill="#808080"></polygon>
        <rect x="256" y="480" width="64" height="32" fill="#808080"></rect>
        <rect x="352" y="480" width="64" height="32" fill="#808080"></rect>
        <polygon points="192,448 160,448 160,512 224,512 224,480 224,480 192,480" fill="#808080"></polygon>
        <rect x="480" y="352" width="32" height="64" fill="#808080"></rect>
    </svg>`,
})
export class BooleanCut extends BooleanOperate {
    protected override getBooleanOperateType(): "common" | "cut" | "fuse" {
        return "cut";
    }
}

@command({
    name: "boolean.fuse",
    display: "command.boolean.fuse",
    icon: `<svg viewBox="0 0 512 512" fill="none">
        <polygon points="496,176 496,496 176,496 176,336 16,336 16,16 336,16 336,176" fill="#1F77B4" opacity="0.7"></polygon>
        <path d="M507.312,164.688C504.336,161.712,500.208,160,496,160H352V16c0-4.208-1.712-8.336-4.688-11.312
            S340.208,0,336,0H16C11.792,0,7.664,1.712,4.688,4.688S0,11.792,0,16v320c0,4.208,1.712,8.336,4.688,11.312S11.792,352,16,352h144
            v144c0,4.208,1.712,8.336,4.688,11.312S171.792,512,176,512h320c4.208,0,8.336-1.712,11.312-4.688S512,500.208,512,496V176
            C512,171.792,510.288,167.664,507.312,164.688z M480,480H192V336c0-4.208-1.712-8.336-4.688-11.312S180.208,320,176,320H32V32h288
            v144c0,4.208,1.712,8.336,4.688,11.312S331.792,192,336,192h144V480z" fill="#808080"></path>
    </svg>`,
})
export class BooleanFuse extends BooleanOperate {
    protected override getBooleanOperateType(): "common" | "cut" | "fuse" {
        return "fuse";
    }
}
