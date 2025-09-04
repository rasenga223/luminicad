// Adapted from Chili3d Project

import { Camera, Matrix4, Vector3 } from "three";
import { ThreeView } from "./threeView";

const options = {
    size: 200,
    padding: 16,
    bubbleSizePrimary: 16,
    bubbleSizeSeconday: 8,
    showSecondary: true,
    lineWidth: 1.5,
    fontSize: "16px",
    fontFamily: "Inter, Arial, sans-serif",
    fontColor: "#FFFFFF",
    fontYAdjust: 0,
    colors: {
        x: ["#f73c3c", "#942424"],
        y: ["#6ccb26", "#417a17"],
        z: ["#178cf0", "#0e5490"],
    },
    backgroundColor: "rgba(10, 37, 64, 0.7)",
    hoverBackgroundColor: "rgba(229, 161, 0, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.2)",
};

export interface Axis {
    axis: string;
    direction: Vector3;
    size: number;
    position: Vector3;
    color: string[];
    lineWidth?: number;
    label?: string;
}

export class ViewGizmo extends HTMLElement {
    private readonly _axes: Axis[];
    private readonly _center: Vector3;
    private readonly _canvas: HTMLCanvasElement;
    private readonly _context: CanvasRenderingContext2D;
    private _canClick: boolean = true;
    private _selectedAxis?: Axis;
    private _mouse?: Vector3;

    constructor(readonly view: ThreeView) {
        super();
        this._axes = this._initAxes();
        this._center = new Vector3(options.size * 0.5, options.size * 0.5, 0);
        this._canvas = this._initCanvas();
        this._context = this._canvas.getContext("2d")!;
        this._initStyle();
    }

    private _initStyle() {
        this.style.position = "absolute";
        this.style.top = "20px";
        this.style.right = "20px";
        this.style.borderRadius = "50%";
        this.style.cursor = "pointer";
        this.style.userSelect = "none";
        this.style.webkitUserSelect = "none";
        this.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
        this.style.border = `1px solid ${options.borderColor}`;
        this.style.backgroundColor = options.backgroundColor;
        this.style.transition = "background-color 0.2s ease";
    }

    private _initCanvas() {
        let canvas = document.createElement("canvas");
        canvas.width = options.size;
        canvas.height = options.size;
        canvas.style.width = `${options.size * 0.5}px`;
        canvas.style.height = `${options.size * 0.5}px`;
        canvas.style.borderRadius = "50%";
        this.append(canvas);
        return canvas;
    }

    private _initAxes(): Axis[] {
        return [
            {
                axis: "x",
                direction: new Vector3(1, 0, 0),
                position: new Vector3(),
                size: options.bubbleSizePrimary,
                color: options.colors.x,
                lineWidth: options.lineWidth,
                label: "X",
            },
            {
                axis: "y",
                direction: new Vector3(0, 1, 0),
                position: new Vector3(),
                size: options.bubbleSizePrimary,
                color: options.colors.y,
                lineWidth: options.lineWidth,
                label: "Y",
            },
            {
                axis: "z",
                direction: new Vector3(0, 0, 1),
                position: new Vector3(),
                size: options.bubbleSizePrimary,
                color: options.colors.z,
                lineWidth: options.lineWidth,
                label: "Z",
            },
            {
                axis: "-x",
                direction: new Vector3(-1, 0, 0),
                position: new Vector3(),
                size: options.bubbleSizeSeconday,
                color: options.colors.x,
            },
            {
                axis: "-y",
                direction: new Vector3(0, -1, 0),
                position: new Vector3(),
                size: options.bubbleSizeSeconday,
                color: options.colors.y,
            },
            {
                axis: "-z",
                direction: new Vector3(0, 0, -1),
                position: new Vector3(),
                size: options.bubbleSizeSeconday,
                color: options.colors.z,
            },
        ];
    }

    connectedCallback() {
        this._canvas.addEventListener("pointermove", this._onPointerMove, false);
        this._canvas.addEventListener("pointerenter", this._onPointerEnter, false);
        this._canvas.addEventListener("pointerout", this._onPointerOut, false);
        this._canvas.addEventListener("pointerdown", this._onPointDown, false);
        this._canvas.addEventListener("click", this._onClick, false);
    }

    disconnectedCallback() {
        this._canvas.removeEventListener("pointermove", this._onPointerMove, false);
        this._canvas.removeEventListener("pointerenter", this._onPointerEnter, false);
        this._canvas.removeEventListener("pointerout", this._onPointerOut, false);
        this._canvas.removeEventListener("pointerdown", this._onPointDown, false);
        this._canvas.removeEventListener("click", this._onClick, false);
    }

    private readonly _onPointerMove = (e: PointerEvent) => {
        e.stopPropagation();
        if (e.buttons === 1 && !(e.movementX === 0 && e.movementY === 0)) {
            this.view.cameraController.rotate(e.movementX * 4, e.movementY * 4);
            this._canClick = false;
        }
        const rect = this._canvas.getBoundingClientRect();
        this._mouse = new Vector3(e.clientX - rect.left, e.clientY - rect.top, 0).multiplyScalar(2);
        this.view.update();
    };

    private readonly _onPointDown = (e: PointerEvent) => {
        e.stopPropagation();
    };

    private readonly _onPointerOut = (e: PointerEvent) => {
        this._mouse = undefined;
        this.style.backgroundColor = options.backgroundColor;
    };

    private readonly _onPointerEnter = (e: PointerEvent) => {
        this.style.backgroundColor = options.hoverBackgroundColor;
    };

    private readonly _onClick = (e: MouseEvent) => {
        e.stopPropagation();
        if (!this._canClick) {
            this._canClick = true;
            return;
        }
        if (this._selectedAxis) {
            const currentTarget = this.view.cameraController.target.clone();
            const currentPosition = new Vector3().copy(this.view.cameraController.cameraPosition);
            const distance = currentPosition.distanceTo(currentTarget);

            const newPosition = this._selectedAxis.direction
                .clone()
                .multiplyScalar(distance)
                .add(currentTarget);

            this.view.cameraController.lookAt(newPosition, currentTarget, Camera.DEFAULT_UP);
            this.view.update();
        }
    };

    clear() {
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    update() {
        this.clear();
        let invRotMat = new Matrix4().makeRotationFromEuler(this.view.camera.rotation).invert();
        this._axes.forEach(
            (axis) =>
                (axis.position = this.getBubblePosition(axis.direction.clone().applyMatrix4(invRotMat))),
        );
        this._axes.sort((a, b) => a.position.z - b.position.z);
        this.setSelectedAxis(this._axes);
        this.drawAxes(this._axes);
    }

    private setSelectedAxis(axes: Axis[]) {
        this._selectedAxis = undefined;
        if (this._mouse && this._canClick) {
            let closestDist = Infinity;
            for (let axis of axes) {
                const distance = this._mouse.distanceTo(axis.position);
                if (distance < closestDist && distance < axis.size) {
                    closestDist = distance;
                    this._selectedAxis = axis;
                }
            }
        }
    }

    drawAxes(axes: Axis[]) {
        for (let axis of axes) {
            let color = this.getAxisColor(axis);
            this.drawCircle(axis.position, axis.size, color);
            this.drawLine(this._center, axis.position, color, axis.lineWidth);
            this.drawLabel(axis);
        }
    }

    private getAxisColor(axis: Axis) {
        let color;
        if (this._selectedAxis === axis) {
            color = "#FFFFFF";
        } else if (axis.position.z >= -0.01) {
            const hexColor = axis.color[0];
            color = this.addAlphaToHex(hexColor, 0.9);
        } else {
            const hexColor = axis.color[1];
            color = this.addAlphaToHex(hexColor, 0.7);
        }
        return color;
    }

    private addAlphaToHex(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    private drawCircle(p: Vector3, radius = 10, color = "#FF0000") {
        this._context.beginPath();
        this._context.arc(p.x, p.y, radius, 0, 2 * Math.PI, false);
        this._context.fillStyle = color;
        this._context.fill();

        if (color !== "#FFFFFF") {
            this._context.strokeStyle = "rgba(255, 255, 255, 0.3)";
            this._context.lineWidth = 0.5;
            this._context.stroke();
        }

        this._context.closePath();
    }

    private drawLine(p1: Vector3, p2: Vector3, color: string, width?: number) {
        if (width) {
            this._context.beginPath();
            this._context.moveTo(p1.x, p1.y);
            this._context.lineTo(p2.x, p2.y);
            this._context.lineWidth = width;
            this._context.strokeStyle = color;
            this._context.stroke();
            this._context.closePath();
        }
    }

    private drawLabel(axis: Axis) {
        if (axis.label) {
            this._context.font = [options.fontSize, options.fontFamily].join(" ");
            this._context.fillStyle = options.fontColor;
            this._context.textBaseline = "middle";
            this._context.textAlign = "center";
            this._context.fillText(axis.label, axis.position.x, axis.position.y + options.fontYAdjust);
        }
    }

    private getBubblePosition(vector: Vector3) {
        return new Vector3(
            vector.x * (this._center.x - options.bubbleSizePrimary / 2 - options.padding) + this._center.x,
            this._center.y - vector.y * (this._center.y - options.bubbleSizePrimary / 2 - options.padding),
            vector.z,
        );
    }
}

customElements.define("view-gizmo", ViewGizmo);
