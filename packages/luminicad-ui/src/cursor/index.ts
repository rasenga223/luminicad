import { CursorType } from "luminicad-core";
import draw from "./draw.cur";

const cursors: Map<CursorType, string> = new Map([
    ["default", "default"],
    ["draw", `url(${draw}), default`],
    ["select.default", "crosshair"],
]);

export namespace Cursor {
    export function get(type: CursorType) {
        return cursors.get(type) ?? "default";
    }
}
