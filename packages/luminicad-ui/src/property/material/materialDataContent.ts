import { IDocument, Material, MaterialLibrary, Observable } from "luminicad-core";

let count = 1;

export class MaterialDataContent extends Observable {
    private _editingMaterial: Material;
    get editingMaterial(): Material {
        return this._editingMaterial;
    }
    set editingMaterial(value: Material) {
        this.setProperty("editingMaterial", value);
    }

    constructor(
        readonly document: IDocument,
        readonly callback: (material: Material) => void,
        editingMaterial: Material,
    ) {
        super();
        this._editingMaterial = editingMaterial;
    }

    deleteMaterial() {
        if (this.document.materials.length <= 1) return;
        let tempMaterial = this.editingMaterial;
        this.editingMaterial = this.document.materials.find((m) => m.id !== this.editingMaterial.id)!;
        this.callback(this.editingMaterial);
        this.document.materials.remove(tempMaterial);
    }

    addMaterial(preset?: any) {
        let newMaterial;
        if (preset) {
            newMaterial = MaterialLibrary.createMaterial(this.document, preset);
        } else {
            newMaterial = new Material(this.document, `Material ${count++}`, 0xdddddd);
        }
        this.document.materials.push(newMaterial);
    }

    copyMaterial() {
        this.document.materials.push(this.editingMaterial.clone());
    }
}
