import MainModuleFactory, { MainModule } from "../lib/luminicad-wasm";

declare global {
    var wasm: MainModule;
}

export async function initWasm() {
    global.wasm = await MainModuleFactory();
    return global.wasm;
}
