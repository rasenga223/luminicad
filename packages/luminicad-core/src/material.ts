import { IDocument } from "./document";
import { HistoryObservable, Id } from "./foundation";
import { XY } from "./math";
import { Property } from "./property";
import { Serializer } from "./serialize";

@Serializer.register(["document"])
export class Texture extends HistoryObservable {
    @Serializer.serialze()
    @Property.define("material.texture.image")
    get image(): string {
        return this.getPrivateValue("image", "");
    }
    set image(value: string) {
        this.setProperty("image", value);
    }

    @Serializer.serialze()
    get wrapS(): number {
        return this.getPrivateValue("wrapS", 1000);
    }
    set wrapS(value: number) {
        this.setProperty("wrapS", value);
    }

    @Serializer.serialze()
    get wrapT(): number {
        return this.getPrivateValue("wrapT", 1000);
    }
    set wrapT(value: number) {
        this.setProperty("wrapT", value);
    }

    @Serializer.serialze()
    @Property.define("material.texture.rotation")
    get rotation(): number {
        return this.getPrivateValue("rotation", 0);
    }
    set rotation(value: number) {
        this.setProperty("rotation", value);
    }

    @Serializer.serialze()
    @Property.define("material.texture.offset")
    get offset(): XY {
        return this.getPrivateValue("offset", new XY(0, 0));
    }
    set offset(value: XY) {
        this.setProperty("offset", value);
    }

    @Serializer.serialze()
    @Property.define("material.texture.repeat")
    get repeat(): XY {
        return this.getPrivateValue("repeat", new XY(1, 1));
    }
    set repeat(value: XY) {
        this.setProperty("repeat", value);
    }

    @Serializer.serialze()
    center: XY = new XY(0.5, 0.5);
}

@Serializer.register(["document", "name", "color", "id"])
export class Material extends HistoryObservable {
    @Serializer.serialze()
    vertexColors = false;

    @Serializer.serialze()
    transparent = true;

    @Serializer.serialze()
    readonly id: string;

    @Serializer.serialze()
    @Property.define("common.name")
    get name(): string {
        return this.getPrivateValue("name");
    }
    set name(value: string) {
        this.setProperty("name", value);
    }

    @Serializer.serialze()
    @Property.define("common.color", { type: "color" })
    get color(): number | string {
        return this.getPrivateValue("color");
    }
    set color(value: number | string) {
        this.setProperty("color", value);
    }

    @Serializer.serialze()
    @Property.define("common.opacity")
    get opacity(): number {
        return this.getPrivateValue("opacity", 1);
    }
    set opacity(value: number) {
        this.setProperty("opacity", value);
    }

    @Serializer.serialze()
    @Property.define("material.map")
    get map(): Texture {
        return this.getPrivateValue("map", new Texture(this.document));
    }
    set map(value: Texture) {
        this.setProperty("map", value);
    }

    constructor(document: IDocument, name: string, color: number | string, id: string = Id.generate()) {
        super(document);
        this.id = id;
        this.setPrivateValue("name", name?.length > 0 ? name : "unnamed");
        this.setPrivateValue("color", color);
    }

    clone(): Material {
        let material = new Material(this.document, `${this.name} clone`, this.color);
        material.setPrivateValue("map", this.map);

        return material;
    }
}

@Serializer.register(["document", "name", "color", "id"])
export class PhongMaterial extends Material {
    @Serializer.serialze()
    @Property.define("material.specular", { type: "color" })
    get specular(): number | string {
        return this.getPrivateValue("specular", 0x111111);
    }
    set specular(value: number | string) {
        this.setProperty("specular", value);
    }

    @Serializer.serialze()
    @Property.define("material.shininess")
    get shininess(): number {
        return this.getPrivateValue("shininess", 30);
    }
    set shininess(value: number) {
        this.setProperty("shininess", value);
    }

    @Serializer.serialze()
    @Property.define("material.emissive", { type: "color" })
    get emissive(): number | string {
        return this.getPrivateValue("emissive", 0x000000);
    }
    set emissive(value: number | string) {
        this.setProperty("emissive", value);
    }

    @Serializer.serialze()
    @Property.define("material.specularMap")
    get specularMap(): Texture {
        return this.getPrivateValue("specularMap", new Texture(this.document));
    }
    set specularMap(value: Texture) {
        this.setProperty("specularMap", value);
    }

    @Serializer.serialze()
    @Property.define("material.bumpMap")
    get bumpMap(): Texture {
        return this.getPrivateValue("bumpMap", new Texture(this.document));
    }
    set bumpMap(value: Texture) {
        this.setProperty("bumpMap", value);
    }

    @Serializer.serialze()
    @Property.define("material.normalMap")
    get normalMap(): Texture {
        return this.getPrivateValue("normalMap", new Texture(this.document));
    }
    set normalMap(value: Texture) {
        this.setProperty("normalMap", value);
    }

    @Serializer.serialze()
    @Property.define("material.emissiveMap")
    get emissiveMap(): Texture {
        return this.getPrivateValue("emissiveMap", new Texture(this.document));
    }
    set emissiveMap(value: Texture) {
        this.setProperty("emissiveMap", value);
    }
}

@Serializer.register(["document", "name", "color", "id"])
export class PhysicalMaterial extends Material {
    @Serializer.serialze()
    @Property.define("material.metalness")
    get metalness(): number {
        return this.getPrivateValue("metalness", 0);
    }
    set metalness(value: number) {
        this.setProperty("metalness", value);
    }

    @Serializer.serialze()
    @Property.define("material.metalnessMap")
    get metalnessMap(): Texture {
        return this.getPrivateValue("metalnessMap", new Texture(this.document));
    }
    set metalnessMap(value: Texture) {
        this.setProperty("metalnessMap", value);
    }

    @Serializer.serialze()
    @Property.define("material.roughness")
    get roughness(): number {
        return this.getPrivateValue("roughness", 1);
    }
    set roughness(value: number) {
        this.setProperty("roughness", value);
    }

    @Serializer.serialze()
    @Property.define("material.roughnessMap")
    get roughnessMap(): Texture {
        return this.getPrivateValue("roughnessMap", new Texture(this.document));
    }
    set roughnessMap(value: Texture) {
        this.setProperty("roughnessMap", value);
    }

    @Serializer.serialze()
    @Property.define("material.emissive", { type: "color" })
    get emissive(): number | string {
        return this.getPrivateValue("emissive", 0x000000);
    }
    set emissive(value: number | string) {
        this.setProperty("emissive", value);
    }

    @Serializer.serialze()
    @Property.define("material.bumpMap")
    get bumpMap(): Texture {
        return this.getPrivateValue("bumpMap", new Texture(this.document));
    }
    set bumpMap(value: Texture) {
        this.setProperty("bumpMap", value);
    }

    @Serializer.serialze()
    @Property.define("material.normalMap")
    get normalMap(): Texture {
        return this.getPrivateValue("normalMap", new Texture(this.document));
    }
    set normalMap(value: Texture) {
        this.setProperty("normalMap", value);
    }

    @Serializer.serialze()
    @Property.define("material.emissiveMap")
    get emissiveMap(): Texture {
        return this.getPrivateValue("emissiveMap", new Texture(this.document));
    }
    set emissiveMap(value: Texture) {
        this.setProperty("emissiveMap", value);
    }
}

// Define an enum or const object for material categories
export enum MaterialCategory {
    Metal = "metal",
    Plastic = "plastic",
    Wood = "wood",
    Glass = "glass",
    Fabric = "fabric",
    // Add more categories as needed
}

// Define interfaces for our predefined material properties
interface PredefinedMaterialProps {
    name: string;
    category: MaterialCategory;
    color: number | string;
    opacity?: number;
    // Add map properties that are common to all materials
    map?: {
        image: string;
        wrapS?: number;
        wrapT?: number;
        rotation?: number;
        repeat?: XY;
    };
    normalMap?: {
        image: string;
        wrapS?: number;
        wrapT?: number;
        rotation?: number;
        repeat?: XY;
    };
    bumpMap?: {
        image: string;
        wrapS?: number;
        wrapT?: number;
        rotation?: number;
        repeat?: XY;
    };
}

interface PredefinedPhongMaterialProps extends PredefinedMaterialProps {
    specular?: number | string;
    shininess?: number;
    emissive?: number | string;
    // Add Phong-specific maps
    specularMap?: {
        image: string;
        wrapS?: number;
        wrapT?: number;
        rotation?: number;
        repeat?: XY;
    };
    emissiveMap?: {
        image: string;
        wrapS?: number;
        wrapT?: number;
        rotation?: number;
        repeat?: XY;
    };
}

interface PredefinedPhysicalMaterialProps extends PredefinedMaterialProps {
    metalness?: number;
    roughness?: number;
    emissive?: number | string;
    // Add Physical-specific maps
    metalnessMap?: {
        image: string;
        wrapS?: number;
        wrapT?: number;
        rotation?: number;
        repeat?: XY;
    };
    roughnessMap?: {
        image: string;
        wrapS?: number;
        wrapT?: number;
        rotation?: number;
        repeat?: XY;
    };
    emissiveMap?: {
        image: string;
        wrapS?: number;
        wrapT?: number;
        rotation?: number;
        repeat?: XY;
    };
}

// Create a library of predefined materials
export class MaterialLibrary {
    // Predefined Physical Materials
    static readonly METALS = {
        POLISHED_STEEL: {
            name: "Polished Steel",
            category: MaterialCategory.Metal,
            color: 0xc0c0c0,
            metalness: 0.9,
            roughness: 0.15,
            emissive: 0x000000,
            // Fix texture paths
            map: {
                image: "/textures/metal/steel/steel-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            normalMap: {
                image: "/textures/metal/steel/steel-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            metalnessMap: {
                image: "/textures/metal/steel/steel-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            roughnessMap: {
                image: "/textures/metal/steel/steel-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            bumpMap: {
                image: "/textures/metal/steel/steel-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
        },
        BRUSHED_ALUMINUM: {
            name: "Brushed Aluminum",
            category: MaterialCategory.Metal,
            color: 0xd6d6d6,
            metalness: 0.8,
            roughness: 0.3,
            emissive: 0x000000,
            map: {
                image: "/textures/metal/aluminum/aluminum-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            normalMap: {
                image: "/textures/metal/aluminum/aluminum-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            metalnessMap: {
                image: "/textures/metal/aluminum/aluminum-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            roughnessMap: {
                image: "/textures/metal/aluminum/aluminum-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            bumpMap: {
                image: "/textures/metal/aluminum/aluminum-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
        },
        CHROME: {
            name: "Chrome",
            category: MaterialCategory.Metal,
            color: 0xffffff,
            metalness: 1.0,
            roughness: 0.05,
            emissive: 0x000000,
            map: {
                image: "/textures/metal/chrome/chrome-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            normalMap: {
                image: "/textures/metal/chrome/chrome-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            metalnessMap: {
                image: "/textures/metal/chrome/chrome-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            roughnessMap: {
                image: "/textures/metal/chrome/chrome-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            bumpMap: {
                image: "/textures/metal/chrome/chrome-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
        },
    } as const;

    static readonly PLASTICS = {
        GLOSSY_PLASTIC: {
            name: "Glossy Plastic",
            category: MaterialCategory.Plastic,
            color: 0xffffff,
            metalness: 0,
            roughness: 0.1,
            emissive: 0x000000,
            map: {
                image: "/textures/plastic/glossy/glossy-plastic-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            normalMap: {
                image: "/textures/plastic/glossy/glossy-plastic-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            roughnessMap: {
                image: "/textures/plastic/glossy/glossy-plastic-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            metalnessMap: {
                image: "/textures/plastic/glossy/glossy-plastic-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            bumpMap: {
                image: "/textures/plastic/glossy/glossy-plastic-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
        },
        MATTE_PLASTIC: {
            name: "Matte Plastic",
            category: MaterialCategory.Plastic,
            color: 0xffffff,
            metalness: 0,
            roughness: 0.9,
            emissive: 0x000000,
            map: {
                image: "/textures/plastic/matte/matte-plastic-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            normalMap: {
                image: "/textures/plastic/matte/matte-plastic-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            roughnessMap: {
                image: "/textures/plastic/matte/matte-plastic-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            metalnessMap: {
                image: "/textures/plastic/matte/matte-plastic-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            bumpMap: {
                image: "/textures/plastic/matte/matte-plastic-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
        },
        TEXTURED_PLASTIC: {
            name: "Textured Plastic",
            category: MaterialCategory.Plastic,
            color: 0xffffff,
            metalness: 0,
            roughness: 0.5,
            emissive: 0x000000,
            map: {
                image: "/textures/plastic/textured/textured-plastic-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(2, 2),
            },
            normalMap: {
                image: "/textures/plastic/textured/textured-plastic-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(2, 2),
            },
            roughnessMap: {
                image: "/textures/plastic/textured/textured-plastic-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(2, 2),
            },
            metalnessMap: {
                image: "/textures/plastic/textured/textured-plastic-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(2, 2),
            },
            bumpMap: {
                image: "/textures/plastic/textured/textured-plastic-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(2, 2),
            },
        },
    } as const;

    static readonly WOOD = {
        OAK: {
            name: "Oak",
            category: MaterialCategory.Wood,
            color: 0x8b4513,
            metalness: 0,
            roughness: 0.8,
            emissive: 0x000000,
            map: {
                image: "/textures/wood/oak/oak-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            normalMap: {
                image: "/textures/wood/oak/oak-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            roughnessMap: {
                image: "/textures/wood/oak/oak-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            metalnessMap: {
                image: "/textures/wood/oak/oak-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            bumpMap: {
                image: "/textures/wood/oak/oak-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
        },
        MAPLE: {
            name: "Maple",
            category: MaterialCategory.Wood,
            color: 0xdaa520,
            metalness: 0,
            roughness: 0.7,
            emissive: 0x000000,
            map: {
                image: "/textures/wood/maple/maple-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            normalMap: {
                image: "/textures/wood/maple/maple-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            roughnessMap: {
                image: "/textures/wood/maple/maple-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            metalnessMap: {
                image: "/textures/wood/maple/maple-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            bumpMap: {
                image: "/textures/wood/maple/maple-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
        },
    } as const;

    static readonly GLASS = {
        CLEAR_GLASS: {
            name: "Clear Glass",
            category: MaterialCategory.Glass,
            color: 0xffffff,
            metalness: 0,
            roughness: 0,
            opacity: 0.3,
            emissive: 0x000000,
            map: {
                image: "/textures/glass/clear/clear-glass-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            normalMap: {
                image: "/textures/glass/clear/clear-glass-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            roughnessMap: {
                image: "/textures/glass/clear/clear-glass-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            metalnessMap: {
                image: "/textures/glass/clear/clear-glass-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            bumpMap: {
                image: "/textures/glass/clear/clear-glass-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
        },
        FROSTED_GLASS: {
            name: "Frosted Glass",
            category: MaterialCategory.Glass,
            color: 0xffffff,
            metalness: 0,
            roughness: 0.2,
            opacity: 0.7,
            emissive: 0x000000,
            map: {
                image: "/textures/glass/frosted/frosted-glass-texture.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            normalMap: {
                image: "/textures/glass/frosted/frosted-glass-normal.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            roughnessMap: {
                image: "/textures/glass/frosted/frosted-glass-roughness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            metalnessMap: {
                image: "/textures/glass/frosted/frosted-glass-metalness.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
            bumpMap: {
                image: "/textures/glass/frosted/frosted-glass-bump.jpg",
                wrapS: 1000,
                wrapT: 1000,
                rotation: 0,
                repeat: new XY(1, 1),
            },
        },
    } as const;

    // Update the createMaterial method to handle all maps
    static createMaterial(
        document: IDocument,
        preset: PredefinedPhysicalMaterialProps | PredefinedPhongMaterialProps,
    ): Material {
        if ("metalness" in preset) {
            const material = new PhysicalMaterial(document, preset.name, preset.color);
            material.metalness = preset.metalness ?? 0;
            material.roughness = (preset as PredefinedPhysicalMaterialProps).roughness ?? 1;
            material.emissive = preset.emissive ?? 0x000000;
            material.opacity = preset.opacity ?? 1;

            // Set all possible maps for PhysicalMaterial
            if (preset.map) {
                const map = new Texture(document);
                this.applyTextureProperties(map, preset.map);
                material.map = map;
            }
            if (preset.normalMap) {
                const normalMap = new Texture(document);
                this.applyTextureProperties(normalMap, preset.normalMap);
                material.normalMap = normalMap;
            }
            if (preset.metalnessMap) {
                const metalnessMap = new Texture(document);
                this.applyTextureProperties(metalnessMap, preset.metalnessMap);
                material.metalnessMap = metalnessMap;
            }
            if (preset.roughnessMap) {
                const roughnessMap = new Texture(document);
                this.applyTextureProperties(roughnessMap, preset.roughnessMap);
                material.roughnessMap = roughnessMap;
            }
            if (preset.bumpMap) {
                const bumpMap = new Texture(document);
                this.applyTextureProperties(bumpMap, preset.bumpMap);
                material.bumpMap = bumpMap;
            }
            if (preset.emissiveMap) {
                const emissiveMap = new Texture(document);
                this.applyTextureProperties(emissiveMap, preset.emissiveMap);
                material.emissiveMap = emissiveMap;
            }

            return material;
        } else {
            const material = new PhongMaterial(document, preset.name, preset.color);
            material.specular = (preset as PredefinedPhongMaterialProps).specular ?? 0x111111;
            material.shininess = (preset as PredefinedPhongMaterialProps).shininess ?? 30;
            material.emissive = preset.emissive ?? 0x000000;
            material.opacity = preset.opacity ?? 1;

            // Set all possible maps for PhongMaterial
            if (preset.map) {
                const map = new Texture(document);
                this.applyTextureProperties(map, preset.map);
                material.map = map;
            }
            if (preset.normalMap) {
                const normalMap = new Texture(document);
                this.applyTextureProperties(normalMap, preset.normalMap);
                material.normalMap = normalMap;
            }
            if (preset.bumpMap) {
                const bumpMap = new Texture(document);
                this.applyTextureProperties(bumpMap, preset.bumpMap);
                material.bumpMap = bumpMap;
            }
            if ((preset as PredefinedPhongMaterialProps).specularMap) {
                const specularMap = new Texture(document);
                this.applyTextureProperties(
                    specularMap,
                    (preset as PredefinedPhongMaterialProps).specularMap!,
                );
                material.specularMap = specularMap;
            }
            if (preset.emissiveMap) {
                const emissiveMap = new Texture(document);
                this.applyTextureProperties(emissiveMap, preset.emissiveMap);
                material.emissiveMap = emissiveMap;
            }

            return material;
        }
    }

    // Helper method to apply texture properties
    private static applyTextureProperties(
        texture: Texture,
        props: {
            image: string;
            wrapS?: number;
            wrapT?: number;
            rotation?: number;
            repeat?: XY;
        },
    ) {
        // Set the image path
        texture.image = props.image;

        // Apply other texture properties
        if (props.wrapS !== undefined) texture.wrapS = props.wrapS;
        if (props.wrapT !== undefined) texture.wrapT = props.wrapT;
        if (props.rotation !== undefined) texture.rotation = props.rotation;
        if (props.repeat !== undefined) texture.repeat = props.repeat;

        // Log for debugging
        console.log(`Applied texture: ${props.image}`);
    }

    // Helper method to get all available presets
    static getAllPresets() {
        return {
            metals: this.METALS,
            plastics: this.PLASTICS,
            wood: this.WOOD,
            glass: this.GLASS,
            // Add more categories as they're created
        };
    }

    // Helper method to get presets by category
    static getPresetsByCategory(category: MaterialCategory) {
        switch (category) {
            case MaterialCategory.Metal:
                return this.METALS;
            case MaterialCategory.Plastic:
                return this.PLASTICS;
            case MaterialCategory.Wood:
                return this.WOOD;
            case MaterialCategory.Glass:
                return this.GLASS;
            default:
                return {};
        }
    }
}

// Similarly for textures, we can create a texture library
export class TextureLibrary {
    static readonly WOOD_TEXTURES = {
        OAK_GRAIN: {
            name: "Oak Grain",
            image: "/textures/wood/oak-grain.jpg",
            wrapS: 1000,
            wrapT: 1000,
            rotation: 0,
            repeat: new XY(1, 1),
        },
        // Add more wood textures
    } as const;

    static readonly METAL_TEXTURES = {
        BRUSHED_STEEL: {
            name: "Brushed Steel",
            image: "/textures/metal/brushed-steel.jpg",
            wrapS: 1000,
            wrapT: 1000,
            rotation: 0,
            repeat: new XY(1, 1),
        },
        // Add more metal textures
    } as const;

    // Method to create a texture instance from a preset
    static createTexture(
        document: IDocument,
        preset: (typeof TextureLibrary.WOOD_TEXTURES)[keyof typeof TextureLibrary.WOOD_TEXTURES],
    ) {
        const texture = new Texture(document);
        texture.image = preset.image;
        texture.wrapS = preset.wrapS;
        texture.wrapT = preset.wrapT;
        texture.rotation = preset.rotation;
        texture.repeat = preset.repeat;
        return texture;
    }

    // Helper method to get all available texture presets
    static getAllTextures() {
        return {
            wood: this.WOOD_TEXTURES,
            metal: this.METAL_TEXTURES,
            // Add more categories as they're created
        };
    }
}
