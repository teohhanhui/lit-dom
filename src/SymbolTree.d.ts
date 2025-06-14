export default class SymbolTree<T, U> {
    private tree;
    private keyFunc;
    constructor(keyFunc: (item: U) => string);
    set(path: Array<U>, value: T): void;
    get(path: Array<U>, defaultValue?: T, max?: number): T | undefined;
    getDefault(path: Array<U>, defaultFactory: () => T, max?: number): T;
    delete(path: Array<U>): boolean;
    has(path: Array<U>): boolean;
    private pathToKey;
}
//# sourceMappingURL=SymbolTree.d.ts.map