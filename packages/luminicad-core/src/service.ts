import { IApplication } from "./application";

export interface IService {
    register(app: IApplication): void;
    start(): void;
    stop(): void;
}
