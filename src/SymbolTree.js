export default class SymbolTree {
    constructor(keyFunc) {
        this.tree = new Map();
        this.keyFunc = keyFunc;
    }
    set(path, value) {
        const key = this.pathToKey(path);
        this.tree.set(key, value);
    }
    get(path, defaultValue, max) {
        const actualPath = max !== undefined ? path.slice(0, max) : path;
        const key = this.pathToKey(actualPath);
        return this.tree.get(key) || defaultValue;
    }
    getDefault(path, defaultFactory, max) {
        const actualPath = max !== undefined ? path.slice(0, max) : path;
        const key = this.pathToKey(actualPath);
        if (!this.tree.has(key)) {
            this.tree.set(key, defaultFactory());
        }
        return this.tree.get(key);
    }
    delete(path) {
        const key = this.pathToKey(path);
        return this.tree.delete(key);
    }
    has(path) {
        const key = this.pathToKey(path);
        return this.tree.has(key);
    }
    pathToKey(path) {
        return JSON.stringify(path.map(this.keyFunc));
    }
}
//# sourceMappingURL=SymbolTree.js.map