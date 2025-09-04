import { IDisposable, IDocument, IEventHandler, IVisual, Logger, Plane } from "luminicad-core";
import { NodeSelectionHandler } from "luminicad-vis";
import { AmbientLight, AxesHelper, Color, GridHelper, Object3D, Scene } from "three";
import { ThreeHighlighter } from "./threeHighlighter";
import { ThreeView } from "./threeView";
import { ThreeViewHandler } from "./threeViewEventHandler";
import { ThreeVisualContext } from "./threeVisualContext";

Object3D.DEFAULT_UP.set(0, 0, 1);

export class ThreeVisual implements IVisual {
    readonly defaultEventHandler: IEventHandler;
    readonly context: ThreeVisualContext;
    readonly scene: Scene;
    readonly highlighter: ThreeHighlighter;
    readonly viewHandler: IEventHandler;
    private _eventHandler: IEventHandler;
    private gridHelper!: GridHelper;

    get eventHandler() {
        return this._eventHandler;
    }

    set eventHandler(value: IEventHandler) {
        if (this._eventHandler === value) return;
        this._eventHandler = value;
        Logger.info(`Changed EventHandler to ${Object.getPrototypeOf(value).constructor.name}`);
    }

    constructor(readonly document: IDocument) {
        this.scene = this.initScene();
        this.defaultEventHandler = new NodeSelectionHandler(document, true);
        this.viewHandler = new ThreeViewHandler();
        this.context = new ThreeVisualContext(this, this.scene);
        this.highlighter = new ThreeHighlighter(this.context);
        this._eventHandler = this.defaultEventHandler;
    }

    initScene() {
        let scene = new Scene();
        let envLight = new AmbientLight(0x888888, 4);
        let axisHelper = new AxesHelper(250);

        const gridSize = 100000;
        const gridDivisions = 100;

        const centerLineColor = new Color(0xffffff).multiplyScalar(0.15);
        const gridLineColor = new Color(0xffffff).multiplyScalar(0.07);

        this.gridHelper = new GridHelper(gridSize, gridDivisions, centerLineColor, gridLineColor);

        this.gridHelper.rotation.x = Math.PI / 2;

        scene.add(envLight, axisHelper, this.gridHelper);
        return scene;
    }

    resetEventHandler() {
        this.eventHandler = this.defaultEventHandler;
    }

    isExcutingHandler(): boolean {
        return this.eventHandler !== this.defaultEventHandler;
    }

    createView(name: string, workplane: Plane) {
        return new ThreeView(this.document, name, workplane, this.highlighter, this.context);
    }

    update(): void {
        this.document.application.views.forEach((view) => {
            if (view.document === this.document) view.update();
        });
    }

    dispose() {
        this.context.dispose();
        this.defaultEventHandler.dispose();
        this._eventHandler.dispose();
        this.viewHandler.dispose();
        this.scene.traverse((x) => {
            if (IDisposable.isDisposable(x)) x.dispose();
        });
        this.scene.clear();
    }
}
