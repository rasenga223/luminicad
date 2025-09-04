export interface IEqualityComparer<T> {
    equals(left: T, right: T): boolean;
}
