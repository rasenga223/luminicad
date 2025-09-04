import { IDisposable } from "../foundation";

export enum GeometryType {
    Curve,
    Surface,
}

export interface IGeometry extends IDisposable {
    get geometryType(): GeometryType;
    copy(): IGeometry;
}
