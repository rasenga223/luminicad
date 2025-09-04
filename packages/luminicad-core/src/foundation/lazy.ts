export class Lazy<T> {
    #value?: T;
    readonly #factory: () => T;

    constructor(factory: () => T) {
        this.#factory = factory;
    }

    get value(): T {
        if (this.#value === undefined) {
            this.#value = this.#factory();
        }
        return this.#value;
    }
}
