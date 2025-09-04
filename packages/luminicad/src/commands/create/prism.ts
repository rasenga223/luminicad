import { GeometryNode, Precision, ShapeType, command } from "luminicad-core";
import { GeoUtils } from "luminicad-geo";
import { PrismNode } from "../../bodys";
import { LengthAtAxisSnapData } from "../../snap";
import { IStep, LengthAtAxisStep } from "../../step";
import { SelectShapeStep } from "../../step/selectStep";
import { CreateCommand } from "../createCommand";

@command({
    name: "convert.prism",
    display: "command.prism",
    icon: `<svg viewBox="0 0 512 512" fill="#808080">
        <path d="m479.97 426.07c4.142 0 7.5-3.358 7.5-7.5v-240.17c0-2.339-1.091-4.544-2.95-5.962l-223.97-170.9c-2.687-2.05-6.413-2.05-9.1 0l-138.77 105.89c-3.293 2.513-3.925 7.219-1.413 10.512 2.513 3.293 7.219 3.925 10.512 1.413l126.721-96.696v7.847c0 4.142 3.358 7.5 7.5 7.5s7.5-3.358 7.5-7.5v-7.847l194.274 148.241h-403.55l39.976-30.506c3.293-2.513 3.925-7.219 1.413-10.512-2.513-3.293-7.22-3.925-10.512-1.413l-57.62 43.97c-1.99 1.519-3.01 3.842-2.947 6.17v325.888c0 4.142 3.358 7.5 7.5 7.5h447.694c.082.003.163.004.244.004.924 0 1.855-.171 2.749-.523 2.866-1.13 4.75-3.897 4.75-6.978v-50.93c0-4.142-3.358-7.5-7.5-7.5s-7.5 3.358-7.5 7.5v35.772l-9.784-7.466c-3.293-2.513-7.999-1.88-10.512 1.413s-1.88 7.999 1.413 10.512l4.187 3.195h-403.549l4.187-3.195c3.293-2.513 3.925-7.219 1.413-10.512-2.513-3.293-7.219-3.925-10.512-1.413l-9.781 7.463v-303.439h213.031c-2.412 1.247-4.064 3.759-4.064 6.662v27.009c0 4.142 3.358 7.5 7.5 7.5s7.5-3.358 7.5-7.5v-27.009c0-2.903-1.652-5.415-4.064-6.662h213.034v232.672c0 4.142 3.358 7.5 7.5 7.5z"></path>
        <path d="m102.573 441.238-22.825 17.417c-3.293 2.513-3.925 7.219-1.413 10.512 1.476 1.935 3.709 2.951 5.968 2.951 1.586 0 3.186-.501 4.544-1.538l22.825-17.417c3.293-2.513 3.925-7.219 1.413-10.512s-7.218-3.926-10.512-1.413z" fill="#1F77B4"></path>
        <path d="m209.091 359.961-22.825 17.417c-3.293 2.513-3.925 7.219-1.413 10.512 1.476 1.935 3.709 2.951 5.968 2.951 1.586 0 3.186-.501 4.544-1.538l22.825-17.417c3.293-2.513 3.925-7.219 1.413-10.512s-7.218-3.925-10.512-1.413z" fill="#1F77B4"></path>
        <path d="m155.832 400.6-22.825 17.417c-3.293 2.513-3.925 7.219-1.413 10.512 1.476 1.935 3.709 2.951 5.968 2.951 1.586 0 3.186-.501 4.544-1.538l22.825-17.417c3.293-2.513 3.925-7.219 1.413-10.512-2.513-3.294-7.218-3.926-10.512-1.413z" fill="#1F77B4"></path>
        <path d="m302.909 359.962c-3.293-2.513-7.999-1.881-10.512 1.413-2.513 3.293-1.88 7.999 1.413 10.512l22.825 17.417c1.359 1.037 2.958 1.538 4.544 1.538 2.259 0 4.492-1.017 5.968-2.951 2.513-3.293 1.88-7.999-1.413-10.512z" fill="#1F77B4"></path>
        <path d="m356.168 400.6c-3.293-2.513-7.999-1.88-10.512 1.413s-1.88 7.999 1.413 10.512l22.825 17.417c1.359 1.037 2.958 1.538 4.544 1.538 2.259 0 4.492-1.017 5.968-2.951 2.513-3.293 1.88-7.999-1.413-10.512z" fill="#1F77B4"></path>
        <path d="m409.426 441.238c-3.292-2.512-7.999-1.88-10.512 1.413s-1.88 8 1.413 10.512l22.826 17.417c1.358 1.037 2.957 1.538 4.544 1.538 2.259 0 4.492-1.017 5.968-2.951 2.513-3.293 1.88-8-1.413-10.512z" fill="#1F77B4"></path>
        <path d="m248.5 329.892-8.975 6.848c-3.293 2.513-3.925 7.219-1.413 10.512 2.513 3.293 7.219 3.926 10.512 1.413l7.375-5.627 7.375 5.627c1.359 1.037 2.958 1.538 4.544 1.538 2.259 0 4.492-1.017 5.968-2.951 2.513-3.293 1.88-7.999-1.413-10.512l-8.975-6.848v-11.289c0-4.142-3.358-7.5-7.5-7.5s-7.5 3.358-7.5 7.5v11.289z" fill="#1F77B4"></path>
        <path d="m256 101.026c4.142 0 7.5-3.358 7.5-7.5v-27.01c0-4.142-3.358-7.5-7.5-7.5s-7.5 3.358-7.5 7.5v27.009c0 4.143 3.358 7.501 7.5 7.501z" fill="#1F77B4"></path>
        <path d="m248.5 156.547c0 4.142 3.358 7.5 7.5 7.5s7.5-3.358 7.5-7.5v-27.009c0-4.142-3.358-7.5-7.5-7.5s-7.5 3.358-7.5 7.5z" fill="#1F77B4"></path>
        <path d="m256 290.09c4.142 0 7.5-3.358 7.5-7.5v-27.009c0-4.142-3.358-7.5-7.5-7.5s-7.5 3.358-7.5 7.5v27.009c0 4.143 3.358 7.5 7.5 7.5z" fill="#1F77B4"></path>
    </svg>`,
})
export class Prism extends CreateCommand {
    protected override geometryNode(): GeometryNode {
        const shape = this.stepDatas[0].shapes[0].shape;
        const { point, normal } = this.getAxis();
        const dist = this.stepDatas[1].point!.sub(point).dot(normal);
        return new PrismNode(this.document, shape, dist);
    }

    protected override getSteps(): IStep[] {
        return [
            new SelectShapeStep(ShapeType.Face | ShapeType.Edge | ShapeType.Wire, "prompt.select.shape"),
            new LengthAtAxisStep("operate.pickNextPoint", this.getLengthStepData),
        ];
    }

    private readonly getLengthStepData = (): LengthAtAxisSnapData => {
        const { point, normal } = this.getAxis();
        return {
            point,
            direction: normal,
            preview: (p) => {
                if (!p) return [];
                const dist = p.sub(point).dot(normal);
                if (Math.abs(dist) < Precision.Float) return [];
                const vec = normal.multiply(dist);
                const shape = this.stepDatas[0].shapes[0].shape;
                return [this.meshCreatedShape("prism", shape, vec)];
            },
        };
    };

    private getAxis() {
        const point = this.stepDatas[0].shapes[0].point!;
        const shape = this.stepDatas[0].shapes[0].shape;
        const normal = GeoUtils.normal(shape as any);
        return { point, normal };
    }
}
