import { BoundingBox, GeometryNode, IDisposable, Matrix4 } from "luminicad-core";

export interface IVisualObject extends IDisposable {
    visible: boolean;
    transform: Matrix4;
    boundingBox(): BoundingBox;
}

export interface IVisualGeometry extends IVisualObject {
    get geometryNode(): GeometryNode;
}

export namespace IVisualObject {
    export function isGeometry(obj: IVisualObject): obj is IVisualGeometry {
        return (obj as IVisualGeometry).geometryNode !== undefined;
    }
}
