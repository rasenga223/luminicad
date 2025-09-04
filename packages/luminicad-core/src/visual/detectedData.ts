import { XYZ } from "../math";
import { IShape } from "../shape";
import { IVisualGeometry } from "./visualObject";

export interface VisualShapeData {
    shape: IShape;
    owner: IVisualGeometry;
    point?: XYZ;
    directShape?: IShape;
    indexes: number[];
}
