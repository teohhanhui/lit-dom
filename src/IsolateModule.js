import SymbolTree from './SymbolTree';
export class IsolateModule {
    constructor() {
        this.namespaceTree = new SymbolTree(x => x.scope);
        this.namespaceByElement = new Map();
        this.elementsBeingRemoved = [];
    }
    setEventDelegator(del) {
        this.eventDelegator = del;
    }
    insertElement(namespace, el) {
        this.namespaceByElement.set(el, namespace);
        this.namespaceTree.set(namespace, el);
    }
    removeElement(elm) {
        this.namespaceByElement.delete(elm);
        const namespace = this.getNamespace(elm);
        if (namespace) {
            this.namespaceTree.delete(namespace);
        }
    }
    getElement(namespace, max) {
        return this.namespaceTree.get(namespace, undefined, max);
    }
    getRootElement(elm) {
        if (this.namespaceByElement.has(elm)) {
            return elm;
        }
        let curr = elm;
        while (curr && !this.namespaceByElement.has(curr)) {
            const parent = curr.parentNode;
            if (!parent || parent.nodeType !== Node.ELEMENT_NODE) {
                // If we reach a non-element node or null, stop traversing
                break;
            }
            curr = parent;
            if (curr.tagName === 'HTML') {
                // We've reached HTML without finding a registered element
                // This means we need to use the closest registered element or return undefined
                break;
            }
        }
        // Return the element if it's registered, otherwise undefined
        return this.namespaceByElement.has(curr) ? curr : undefined;
    }
    getNamespace(elm) {
        const rootElement = this.getRootElement(elm);
        if (!rootElement) {
            return undefined;
        }
        return this.namespaceByElement.get(rootElement);
    }
    addElementToRemovalQueue(element) {
        this.elementsBeingRemoved.push(element);
    }
    processRemovals() {
        const elementsToRemove = this.elementsBeingRemoved;
        for (let i = elementsToRemove.length - 1; i >= 0; i--) {
            const element = elementsToRemove[i];
            const namespace = this.getNamespace(element);
            this.removeElement(element);
            if (this.eventDelegator) {
                this.eventDelegator.removeElement(element, namespace);
            }
        }
        this.elementsBeingRemoved = [];
    }
}
//# sourceMappingURL=IsolateModule.js.map