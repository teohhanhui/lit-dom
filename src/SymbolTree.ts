export default class SymbolTree<T, U> {
  private tree: Map<string, T> = new Map();
  private keyFunc: (item: U) => string;

  constructor(keyFunc: (item: U) => string) {
    this.keyFunc = keyFunc;
  }

  set(path: Array<U>, value: T): void {
    const key = this.pathToKey(path);
    this.tree.set(key, value);
  }

  get(path: Array<U>, defaultValue?: T, max?: number): T | undefined {
    const actualPath = max !== undefined ? path.slice(0, max) : path;
    const key = this.pathToKey(actualPath);
    return this.tree.get(key) || defaultValue;
  }

  getDefault(path: Array<U>, defaultFactory: () => T, max?: number): T {
    const actualPath = max !== undefined ? path.slice(0, max) : path;
    const key = this.pathToKey(actualPath);

    if (!this.tree.has(key)) {
      this.tree.set(key, defaultFactory());
    }

    return this.tree.get(key) as T;
  }

  delete(path: Array<U>): boolean {
    const key = this.pathToKey(path);
    return this.tree.delete(key);
  }

  has(path: Array<U>): boolean {
    const key = this.pathToKey(path);
    return this.tree.has(key);
  }

  private pathToKey(path: Array<U>): string {
    return JSON.stringify(path.map(this.keyFunc));
  }
}
