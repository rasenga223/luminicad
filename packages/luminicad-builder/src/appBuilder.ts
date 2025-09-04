import { Application, CommandService, EditEventHandler, EditorService, HotkeyService } from "luminicad";
import {
    AiCadExecutionService,
    CodeExecutionService,
    DSLExecutionService,
    JsonExecutionService,
} from "luminicad-ai";
import {
    DefaultDataExchange,
    I18n,
    IDataExchange,
    IDocument,
    INode,
    IService,
    IShapeConverter,
    IShapeFactory,
    IStorage,
    IVisualFactory,
    IWindow,
    Logger,
} from "luminicad-core";
import { IAdditionalModule } from "./additionalModule";

export class AppBuilder {
    protected readonly _inits: (() => Promise<void>)[] = [];
    protected readonly _additionalModules: IAdditionalModule[] = [];
    protected _storage?: IStorage;
    protected _visualFactory?: IVisualFactory;
    protected _shapeFactory?: IShapeFactory;
    protected _shapeConverter?: IShapeConverter;
    protected _window?: IWindow;

    useIndexedDB() {
        this._inits.push(async () => {
            Logger.info("initializing IndexedDBStorage");

            let db = await import("luminicad-storage");
            this._storage = new db.IndexedDBStorage();
        });
        return this;
    }

    useWasmOcc() {
        this._inits.push(async () => {
            Logger.info("initializing wasm occ");

            let wasm = await import("luminicad-wasm");
            await wasm.initWasm();
            this._shapeFactory = new wasm.ShapeFactory();
            if (this._shapeFactory && this._shapeFactory.converter) {
                this._shapeConverter = this._shapeFactory.converter;
            } else {
                Logger.error(
                    "AppBuilder: ShapeFactory or its IShapeConverter is not available after WasmOcc initialization.",
                );
            }
        });
        return this;
    }

    useThree(): this {
        this._inits.push(async () => {
            Logger.info("initializing three");

            let three = await import("luminicad-three");
            this._visualFactory = new three.ThreeVisulFactory();
        });
        return this;
    }

    useUI(): this {
        this._inits.push(async () => {
            Logger.info("initializing MainWindow");

            this.loadAdditionalI18n();

            let ui = await import("luminicad-ui");
            this._window = new ui.MainWindow(await this.getRibbonTabs());
        });
        return this;
    }

    useHybridStorage() {
        this._inits.push(async () => {
            Logger.info("initializing HybridStorage");

            let db = await import("luminicad-storage");
            this._storage = new db.HybridStorage();
        });
        return this;
    }

    addAdditionalModules(...modules: IAdditionalModule[]): this {
        this._additionalModules.push(...modules);
        return this;
    }

    async getRibbonTabs() {
        let defaultRibbon = await import("./ribbon");
        return defaultRibbon.DefaultRibbon;
    }

    async build(): Promise<void> {
        for (const init of this._inits) {
            await init();
        }
        this.ensureNecessary();

        let app = this.createApp();
        this._window?.init(app);

        this.loadAdditionalCommands();

        Logger.info("Application build completed");
    }

    createApp() {
        return new Application({
            storage: this._storage!,
            shapeFactory: this._shapeFactory!,
            shapeConverter: this._shapeConverter!,
            visualFactory: this._visualFactory!,
            services: this.getServices(),
            mainWindow: this._window,
            dataExchange: this.initDataExchange(),
        });
    }

    initDataExchange(): IDataExchange {
        return new DefaultDataExchange();
    }

    private ensureNecessary() {
        if (this._shapeFactory === undefined) {
            throw new Error("ShapeFactory not set");
        }
        if (this._shapeConverter === undefined) {
            throw new Error("ShapeConverter not set");
        }
        if (this._visualFactory === undefined) {
            throw new Error("VisualFactory not set");
        }
        if (this._storage === undefined) {
            throw new Error("storage has not been initialized");
        }
    }

    private loadAdditionalI18n() {
        for (const module of this._additionalModules) {
            module.i18n().forEach((local) => {
                I18n.combineTranslation(local.code, local.translation);
            });
        }
    }

    private loadAdditionalCommands() {
        for (const module of this._additionalModules) {
            if (this._window) {
                module.ribbonCommands().forEach((command) => {
                    this._window!.registerRibbonCommand(command.tabName, command.groupName, command.command);
                });
            }
        }
    }

    protected getServices(): IService[] {
        return [
            new CommandService(),
            new HotkeyService(),
            new EditorService((document: IDocument, selected: INode[]) => {
                return new EditEventHandler(document, selected);
            }),
            new CodeExecutionService(),
            new DSLExecutionService(),
            new JsonExecutionService(),
            new AiCadExecutionService(),
        ];
    }
}
