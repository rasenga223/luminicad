import { IConverter, Result } from "luminicad-core";

export class ColorConverter implements IConverter<number> {
    convert(value: number): Result<string> {
        return Result.ok(typeof value === "string" ? value : `#${value.toString(16).padStart(6, "0")}`);
    }

    convertBack(value: string): Result<number> {
        const hexValue = value.startsWith("#") ? value.substring(1) : value;
        const result = parseInt(hexValue, 16);
        return Number.isNaN(result) ? Result.err(`Invalid hex string: ${value}`) : Result.ok(result);
    }
}
