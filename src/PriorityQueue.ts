export default class PriorityQueue<T> {
  private items: Array<{value: T; priority: number}> = [];

  add(item: T, priority: number): void {
    const newItem = {value: item, priority};
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (priority > this.items[i].priority) {
        this.items.splice(i, 0, newItem);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(newItem);
    }
  }

  forEach(callback: (item: T) => void): void {
    this.items.forEach(item => callback(item.value));
  }

  get length(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

