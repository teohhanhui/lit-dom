export default class PriorityQueue {
    constructor() {
        this.items = [];
    }
    add(item, priority) {
        const newItem = { value: item, priority };
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
    forEach(callback) {
        this.items.forEach(item => callback(item.value));
    }
    get length() {
        return this.items.length;
    }
    clear() {
        this.items = [];
    }
}
//# sourceMappingURL=PriorityQueue.js.map