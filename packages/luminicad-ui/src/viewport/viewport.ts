import { CameraType, IConverter, IView, Result } from "luminicad-core";
import { div, Flyout } from "../components";
import style from "./viewport.module.css";

class CameraConverter implements IConverter<CameraType> {
    constructor(readonly type: CameraType) {}

    convert(value: CameraType): Result<string, string> {
        if (value === this.type) {
            return Result.ok(style.actived);
        }
        return Result.ok("");
    }
}

export class Viewport extends HTMLElement {
    private readonly _flyout: Flyout;
    private readonly _eventCaches: [keyof HTMLElementEventMap, (e: any) => void][] = [];

    constructor(readonly view: IView) {
        super();
        this.className = style.root;
        this.initEvent();
        this._flyout = new Flyout();
        this.render();
    }

    private render() {
        this.append(
            div(
                {
                    className: style.viewControls,
                    onpointerdown(ev) {
                        ev.stopPropagation();
                    },
                    onclick: (e) => {
                        e.stopPropagation();
                    },
                },
                /* 
                // Camera type controls - commented out for now, will be used later
                div(
                    {
                        className: style.border,
                    },
                    div(
                        {
                            className: new Binding(
                                this.view,
                                "cameraType",
                                new CameraConverter(CameraType.orthographic),
                            ),
                        },
                        svg({
                            icon: "icon-orthographic",
                            onclick: (e) => {
                                e.stopPropagation();
                                this.view.cameraType = CameraType.orthographic;
                            },
                        }),
                    ),
                    div(
                        {
                            className: new Binding(
                                this.view,
                                "cameraType",
                                new CameraConverter(CameraType.perspective),
                            ),
                        },
                        svg({
                            icon: "icon-perspective",
                            onclick: (e) => {
                                e.stopPropagation();
                                this.view.cameraType = CameraType.perspective;
                            },
                        }),
                    ),
                ),
                */
                div(
                    {
                        className: style.border,
                    },
                    div({
                        className: style.iconButton || "",
                        innerHTML: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="#808080">
                            <path d="m7.52 26.12c.09.03.18.04.27.04.44 0 .84-.29.96-.73 2.26-8.03 8.65-14.42 16.68-16.68.53-.15.84-.7.69-1.23s-.7-.84-1.23-.69c-8.7 2.45-15.62 9.37-18.06 18.06-.15.53.16 1.08.69 1.23z"></path>
                            <path d="m25.43 55.25c-8.03-2.26-14.42-8.65-16.68-16.68-.15-.53-.7-.84-1.23-.69s-.84.7-.69 1.23c2.45 8.7 9.37 15.62 18.06 18.06.09.03.18.04.27.04.44 0 .84-.29.96-.73.15-.53-.16-1.08-.69-1.23z"></path>
                            <path d="m56.48 37.88c-.53-.15-1.08.16-1.23.69-2.26 8.03-8.65 14.42-16.68 16.68-.53.15-.84.7-.69 1.23.12.44.52.73.96.73.09 0 .18-.01.27-.04 8.7-2.45 15.62-9.37 18.06-18.06.15-.53-.16-1.08-.69-1.23z"></path>
                            <path d="m38.57 8.75c8.03 2.26 14.42 8.65 16.68 16.68.12.44.53.73.96.73.09 0 .18-.01.27-.04.53-.15.84-.7.69-1.23-2.45-8.7-9.37-15.62-18.06-18.06-.53-.15-1.08.16-1.23.69s.16 1.08.69 1.23z"></path>
                            <path d="m11.69 32c0-.55-.45-1-1-1h-7.69c-.55 0-1 .45-1 1s.45 1 1 1h7.69c.55 0 1-.45 1-1z"></path>
                            <path d="m61 31h-7.69c-.55 0-1 .45-1 1s.45 1 1 1h7.69c.55 0 1-.45 1-1s-.45-1-1-1z"></path>
                            <path d="m32 11.69c.55 0 1-.45 1-1v-7.69c0-.55-.45-1-1-1s-1 .45-1 1v7.69c0 .55.45 1 1 1z"></path>
                            <path d="m32 52.31c-.55 0-1 .45-1 1v7.69c0 .55.45 1 1 1s1-.45 1-1v-7.69c0-.55-.45-1-1-1z"></path>
                            <path d="m32.5 17c-.31-.18-.69-.18-1 0l-12.24 7.07c-.31.18-.5.51-.5.87v14.14c0 .36.19.69.5.87l12.24 7.07c.15.09.33.13.5.13s.35-.04.5-.13l12.24-7.07c.31-.18.5-.51.5-.87v-14.14c0-.36-.19-.69-.5-.87zm-.5 2.02 10.24 5.91-10.24 5.91-10.24-5.91zm-11.24 7.65 10.24 5.91v11.83l-10.24-5.91zm12.24 17.74v-11.83l10.24-5.91v11.83z"></path>
                        </svg>`,
                        onclick: async (e) => {
                            e.stopPropagation();
                            await this.view.cameraController.fitContent();
                        },
                    }),
                    div({
                        className: style.iconButton || "",
                        innerHTML: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" fill="#808080">
                            <g>
                                <g>
                                    <path d="M506.141,477.851L361.689,333.399c65.814-80.075,61.336-198.944-13.451-273.73c-79.559-79.559-209.01-79.559-288.569,0
                                        s-79.559,209.01,0,288.569c74.766,74.766,193.62,79.293,273.73,13.451l144.452,144.452c7.812,7.812,20.477,7.812,28.289,0
                                        C513.953,498.328,513.953,485.663,506.141,477.851z M319.949,319.948c-63.96,63.96-168.03,63.959-231.99,0
                                        c-63.96-63.96-63.96-168.03,0-231.99c63.958-63.957,168.028-63.962,231.99,0C383.909,151.918,383.909,255.988,319.949,319.948z"></path>
                                </g>
                            </g>
                            <g>
                                <g>
                                    <path d="M301.897,183.949h-77.94v-77.94c0-11.048-8.956-20.004-20.004-20.004c-11.048,0-20.004,8.956-20.004,20.004v77.94h-77.94
                                        c-11.048,0-20.004,8.956-20.004,20.004c0,11.048,8.956,20.004,20.004,20.004h77.94v77.94c0,11.048,8.956,20.004,20.004,20.004
                                        c11.048,0,20.004-8.956,20.004-20.004v-77.94h77.94c11.048,0,20.004-8.956,20.004-20.004
                                        C321.901,192.905,312.945,183.949,301.897,183.949z"></path>
                                </g>
                            </g>
                        </svg>`,
                        onclick: () => {
                            const { width, height } = this.view;
                            this.view.cameraController.zoom(width / 2, height / 2, -100);
                        },
                    }),
                    div({
                        className: style.iconButton || "",
                        innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 227.406 227.406" style="enable-background:new 0 0 227.406 227.406;" fill="#808080">
                            <g>
                                <path d="M217.575,214.708l-65.188-67.793c16.139-15.55,26.209-37.356,26.209-61.485
                                    C178.596,38.323,140.272,0,93.167,0C46.06,0,7.737,38.323,7.737,85.43c0,47.106,38.323,85.43,85.43,85.43
                                    c17.574,0,33.922-5.339,47.518-14.473l66.078,68.718c1.473,1.531,3.439,2.302,5.407,2.302c1.87,0,3.743-0.695,5.197-2.094
                                    C220.353,222.441,220.446,217.693,217.575,214.708z M22.737,85.43c0-38.835,31.595-70.43,70.43-70.43
                                    c38.835,0,70.429,31.595,70.429,70.43s-31.594,70.43-70.429,70.43C54.332,155.859,22.737,124.265,22.737,85.43z"></path>
                                <path d="M131.414,77.93H54.919c-4.143,0-7.5,3.357-7.5,7.5s3.357,7.5,7.5,7.5h76.495
                                    c4.143,0,7.5-3.357,7.5-7.5S135.557,77.93,131.414,77.93z"></path>
                            </g>
                        </svg>`,
                        onclick: () => {
                            const { width, height } = this.view;
                            this.view.cameraController.zoom(width / 2, height / 2, 100);
                        },
                    }),
                ),
            ),
        );
    }

    connectedCallback() {
        this.appendChild(this._flyout);
        this.addEventListener("mousemove", this._handleFlyoutMove);
    }

    disconnectedCallback() {
        this._flyout.remove();
        this.removeEventListener("mousemove", this._handleFlyoutMove);
    }

    private _handleFlyoutMove(e: MouseEvent) {
        if (this._flyout) {
            this._flyout.style.top = e.offsetY + "px";
            this._flyout.style.left = e.offsetX + "px";
        }
    }

    dispose() {
        this.removeEvents();
        this.removeEventListener("mousemove", this._handleFlyoutMove);
    }

    private initEvent() {
        let events: [keyof HTMLElementEventMap, (view: IView, e: any) => any][] = [
            ["pointerdown", this.pointerDown],
            ["pointermove", this.pointerMove],
            ["pointerout", this.pointerOut],
            ["pointerup", this.pointerUp],
            ["wheel", this.mouseWheel],
        ];
        events.forEach((v) => {
            this.addEventListenerHandler(v[0], v[1]);
        });
    }

    private addEventListenerHandler(type: keyof HTMLElementEventMap, handler: (view: IView, e: any) => any) {
        let listener = (e: any) => {
            e.preventDefault();
            handler(this.view, e);
        };
        this.addEventListener(type, listener);
        this._eventCaches.push([type, listener]);
    }

    private removeEvents() {
        this._eventCaches.forEach((x) => {
            this.removeEventListener(x[0], x[1]);
        });
        this._eventCaches.length = 0;
    }

    private readonly pointerMove = (view: IView, event: PointerEvent) => {
        view.document.visual.eventHandler.pointerMove(view, event);
        view.document.visual.viewHandler.pointerMove(view, event);
    };

    private readonly pointerDown = (view: IView, event: PointerEvent) => {
        view.document.application.activeView = view;
        view.document.visual.eventHandler.pointerDown(view, event);
        view.document.visual.viewHandler.pointerDown(view, event);
    };

    private readonly pointerUp = (view: IView, event: PointerEvent) => {
        view.document.visual.eventHandler.pointerUp(view, event);
        view.document.visual.viewHandler.pointerUp(view, event);
    };

    private readonly pointerOut = (view: IView, event: PointerEvent) => {
        view.document.visual.eventHandler.pointerOut?.(view, event);
        view.document.visual.viewHandler.pointerOut?.(view, event);
    };

    private readonly mouseWheel = (view: IView, event: WheelEvent) => {
        view.document.visual.eventHandler.mouseWheel?.(view, event);
        view.document.visual.viewHandler.mouseWheel?.(view, event);
    };
}

customElements.define("luminicad-uiview", Viewport);
