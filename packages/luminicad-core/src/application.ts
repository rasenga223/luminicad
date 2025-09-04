import { ICommand } from "./command";
import { IDataExchange } from "./dataExchange";
import { IDocument } from "./document";
import { IStorage, ObservableCollection } from "./foundation";
import { Serialized } from "./serialize";
import { IService } from "./service";
import { IShapeFactory } from "./shape";
import { IShapeConverter } from "./shape/shapeConverter";
import { IWindow } from "./ui/window";
import { IView, IVisualFactory } from "./visual";

export interface IApplication {
    readonly mainWindow?: IWindow;
    readonly dataExchange: IDataExchange;
    readonly visualFactory: IVisualFactory;
    readonly shapeFactory: IShapeFactory;
    readonly shapeConverter: IShapeConverter;
    readonly services: IService[];
    readonly storage: IStorage;
    readonly views: ObservableCollection<IView>;
    readonly documents: Set<IDocument>;
    executingCommand: ICommand | undefined;
    activeView: IView | undefined;
    newDocument(name: string): Promise<IDocument>;
    openDocument(id: string): Promise<IDocument | undefined>;
    loadDocument(data: Serialized): Promise<IDocument | undefined>;
}
