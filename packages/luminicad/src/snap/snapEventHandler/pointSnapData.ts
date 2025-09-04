import { ICurve, Plane, XYZ } from "luminicad-core";
import { Dimension } from "../dimension";
import { SnapData } from "../snap";

export interface PointSnapData extends SnapData {
    dimension?: Dimension;
    refPoint?: () => XYZ;
    plane?: () => Plane;
}

export interface SnapPointOnCurveData extends PointSnapData {
    curve: ICurve;
}
