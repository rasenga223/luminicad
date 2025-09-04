import { IView } from "./visual";

export interface IEditor {
    active(): boolean;
    deactive(): boolean;
    onPointerMove(view: IView, e: PointerEvent): void;
    onPointerDown(view: IView, e: PointerEvent): void;
    onPointerUp(view: IView, e: PointerEvent): void;
}
