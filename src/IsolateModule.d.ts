import { Scope } from './types';
import { EventDelegator } from './EventDelegator';
export declare class IsolateModule {
    private namespaceTree;
    private namespaceByElement;
    private eventDelegator;
    private elementsBeingRemoved;
    constructor();
    setEventDelegator(del: EventDelegator): void;
    insertElement(namespace: Array<Scope>, el: Element): void;
    removeElement(elm: Element): void;
    getElement(namespace: Array<Scope>, max?: number): Element | undefined;
    getRootElement(elm: Element): Element | undefined;
    getNamespace(elm: Element): Array<Scope> | undefined;
    addElementToRemovalQueue(element: Element): void;
    processRemovals(): void;
}
//# sourceMappingURL=IsolateModule.d.ts.map