import {
    EditableShapeNode,
    GeometryNode,
    I18n,
    IEdge,
    IFace,
    IShape,
    IWire,
    JoinType,
    ShapeMeshData,
    ShapeType,
    XYZ,
    command,
} from "luminicad-core";
import { GeoUtils } from "luminicad-geo";
import { IStep, LengthAtAxisStep, SelectShapeStep } from "../../step";
import { CreateCommand } from "../createCommand";

@command({
    name: "create.offset",
    display: "command.offset",
    icon: `<svg viewBox="0 0 512 512" fill="none">
        <rect x="96" y="96" width="320" height="320" stroke="#808080" stroke-width="16" fill="none"/>
        <rect x="160" y="160" width="192" height="192" stroke="#1F77B4" stroke-width="16" fill="none"/>
        <line x1="96" y1="96" x2="160" y2="160" stroke="#808080" stroke-width="8"/>
        <line x1="416" y1="96" x2="352" y2="160" stroke="#808080" stroke-width="8"/>
        <line x1="96" y1="416" x2="160" y2="352" stroke="#808080" stroke-width="8"/>
        <line x1="416" y1="416" x2="352" y2="352" stroke="#808080" stroke-width="8"/>
    </svg>`,
})
export class OffsetCommand extends CreateCommand {
    protected override geometryNode(): GeometryNode {
        let normal = this.getAxis().normal;
        let shape = this.createOffsetShape(normal, this.stepDatas[1].distance!);
        return new EditableShapeNode(this.document, I18n.translate("command.offset"), shape.value);
    }

    protected override getSteps(): IStep[] {
        return [
            new SelectShapeStep(ShapeType.Edge | ShapeType.Wire | ShapeType.Face, "prompt.select.shape"),
            new LengthAtAxisStep("common.length", () => {
                let ax = this.getAxis();
                return {
                    point: ax.point,
                    direction: ax.direction,
                    preview: (point: XYZ | undefined) => this.preview(ax, point),
                };
            }),
        ];
    }

    private preview(
        ax: { point: XYZ; direction: XYZ; normal: XYZ },
        point: XYZ | undefined,
    ): ShapeMeshData[] {
        let res: ShapeMeshData[] = [this.meshPoint(ax.point)];
        if (point !== undefined) {
            res.push(this.meshLine(ax.point, point));
            let distance = point.sub(ax.point).dot(ax.direction);
            let shape = this.createOffsetShape(ax.normal, distance);
            if (shape.isOk) {
                res.push(shape.value.edgesMeshPosition());
            }
        }
        return res;
    }

    private getAxis(): { direction: XYZ; point: XYZ; normal: XYZ } {
        let start = this.stepDatas[0].shapes[0].point!;
        let shape = this.stepDatas[0].shapes[0].shape;
        if (shape.shapeType === ShapeType.Edge) {
            return this.getEdgeAxis(shape as IEdge, start);
        }

        return this.getFaceOrWireAxis(shape, start);
    }

    private getFaceOrWireAxis(shape: IShape, start: XYZ) {
        let face = shape as IFace;
        if (shape.shapeType === ShapeType.Wire) {
            face = (shape as IWire).toFace().value;
        }
        const normal = face.normal(0, 0)[1];
        const { nearest, direction } = this.getNearstPointAndDirection(shape, start, normal);
        return {
            point: nearest.point,
            normal,
            direction: direction.cross(normal).normalize()!,
        };
    }

    private getEdgeAxis(edge: IEdge, start: XYZ) {
        const curve = edge.curve();
        const direction = curve.dn(curve.parameter(start, 1e-3)!, 1);
        const normal = GeoUtils.normal(edge);
        return {
            point: start,
            normal,
            direction: direction.cross(normal).normalize()!,
        };
    }

    private getNearstPointAndDirection(shape: IShape, start: XYZ, normal: XYZ) {
        let wire = shape as IWire;
        if (shape.shapeType === ShapeType.Face) {
            wire = (shape as IFace).outerWire();
        }
        const nearest = GeoUtils.nearestPoint(wire, start);
        const nextEdge = GeoUtils.findNextEdge(wire, nearest.edge).value;
        let direction = nearest.edge.curve().dn(0, 1);
        const scale = nearest.edge.orientation() === nextEdge.orientation() ? 1 : -1;
        const nextDirection = nextEdge.curve().dn(0, 1).multiply(scale);
        if (direction.cross(nextDirection).normalize()?.isOppositeTo(normal)) {
            direction = direction.multiply(-1);
        }
        return { nearest, direction };
    }

    private createOffsetShape(normal: XYZ, distance: number) {
        let shape = this.stepDatas[0].shapes[0].shape;
        if (shape.shapeType === ShapeType.Edge) {
            return (shape as IEdge).offset(distance, normal);
        }

        let wire = shape as IWire;
        if (shape.shapeType === ShapeType.Face) {
            wire = (shape as IFace).outerWire();
        }
        return wire.offset(distance, JoinType.intersection);
    }
}
