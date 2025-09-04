import { Result } from "./result";

export interface IConverter<TFrom = unknown, TTo = string> {
    convert(value: TFrom): Result<TTo>;
    convertBack?(value: TTo): Result<TFrom>;
}
