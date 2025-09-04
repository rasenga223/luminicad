import { AsyncController, I18nKeys, IDocument, Precision, XYZ } from "luminicad-core";

import { AngleSnapEventHandler, Dimension, PointSnapData } from "../snap";
import { SnapStep } from "./step";

function defaultSnapedData(): PointSnapData {
    return {
        dimension: Dimension.D1D2D3,
    };
}

export class AngleStep extends SnapStep<PointSnapData> {
    constructor(
        tip: I18nKeys,
        private readonly handleCenter: () => XYZ,
        private readonly handleP1: () => XYZ,
        handleP2Data: () => PointSnapData = defaultSnapedData,
        keepSelected = false,
    ) {
        super(tip, handleP2Data, keepSelected);
    }

    protected getEventHandler(document: IDocument, controller: AsyncController, data: PointSnapData) {
        return new AngleSnapEventHandler(document, controller, this.handleCenter, this.handleP1(), data);
    }

    protected validator(data: PointSnapData, point: XYZ): boolean {
        return data.refPoint === undefined || data.refPoint().distanceTo(point) > Precision.Distance;
    }
}
