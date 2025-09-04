import { IPropertyChanged, PathBinding } from "luminicad-core";
import { Localize } from "./localize";

export type HTMLProps<T> = {
    [P in keyof T]?: T[P] extends object
        ? HTMLProps<T[P]>
        : (T[P] | PathBinding<IPropertyChanged>) | (P extends "textContent" ? Localize : never);
};
