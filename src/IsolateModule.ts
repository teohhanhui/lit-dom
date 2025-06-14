import {Scope} from './types';
import SymbolTree from './SymbolTree';
import {EventDelegator} from './EventDelegator';

export class IsolateModule {
  private namespaceTree = new SymbolTree<Element, Scope>(x => x.scope);
  private namespaceByElement: Map<Element, Array<Scope>>;
  private eventDelegator: EventDelegator | undefined;
  private elementsBeingRemoved: Array<Element>;

  constructor() {
    this.namespaceByElement = new Map<Element, Array<Scope>>();
    this.elementsBeingRemoved = [];
  }

  public setEventDelegator(del: EventDelegator): void {
    this.eventDelegator = del;
  }

  public insertElement(namespace: Array<Scope>, el: Element): void {
    this.namespaceByElement.set(el, namespace);
    this.namespaceTree.set(namespace, el);
  }

  public removeElement(elm: Element): void {
    this.namespaceByElement.delete(elm);
    const namespace = this.getNamespace(elm);
    if (namespace) {
      this.namespaceTree.delete(namespace);
    }
  }

  public getElement(
    namespace: Array<Scope>,
    max?: number
  ): Element | undefined {
    return this.namespaceTree.get(namespace, undefined, max);
  }

  public getRootElement(elm: Element): Element | undefined {
    console.log('getRootElement called for:', elm, 'tag:', elm.tagName, 'class:', elm.className);
    console.log('namespaceByElement has elm directly:', this.namespaceByElement.has(elm));
    console.log('namespaceByElement keys:', Array.from(this.namespaceByElement.keys()).map(el => ({tag: el.tagName, id: el.id, class: el.className})));
    
    if (this.namespaceByElement.has(elm)) {
      console.log('getRootElement: returning elm directly');
      return elm;
    }

    let curr = elm;
    while (curr && !this.namespaceByElement.has(curr)) {
      const parent = curr.parentNode;
      if (!parent || parent.nodeType !== Node.ELEMENT_NODE) {
        // If we reach a non-element node or null, stop traversing
        console.log('getRootElement: reached non-element parent, breaking');
        break;
      }
      curr = parent as Element;
      console.log('getRootElement: checking parent:', curr.tagName, curr.id, curr.className);
      
      if (curr.tagName === 'HTML') {
        // We've reached HTML without finding a registered element
        // This means we need to use the closest registered element or return undefined
        console.log('getRootElement: reached HTML, breaking');
        break;
      }
    }
    
    // Return the element if it's registered, otherwise undefined
    const result = this.namespaceByElement.has(curr) ? curr : undefined;
    console.log('getRootElement: final result:', result ? {tag: result.tagName, id: result.id, class: result.className} : 'undefined');
    return result;
  }

  public getNamespace(elm: Element): Array<Scope> | undefined {
    const rootElement = this.getRootElement(elm);
    if (!rootElement) {
      return undefined;
    }
    return this.namespaceByElement.get(rootElement) as Array<Scope>;
  }

  public addElementToRemovalQueue(element: Element): void {
    this.elementsBeingRemoved.push(element);
  }

  public processRemovals(): void {
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

