import { Observable, Subject } from 'rxjs';
import { ScopeChecker } from './ScopeChecker';
import { getSelectors, isEqualNamespace } from './utils';
import { ElementFinder } from './ElementFinder';
import SymbolTree from './SymbolTree';
import PriorityQueue from './PriorityQueue';
import { fromEvent, preventDefaultConditional } from './fromEvent';
export const eventTypesThatDontBubble = [
    `blur`,
    `canplay`,
    `canplaythrough`,
    `durationchange`,
    `emptied`,
    `ended`,
    `focus`,
    `load`,
    `loadeddata`,
    `loadedmetadata`,
    `mouseenter`,
    `mouseleave`,
    `pause`,
    `play`,
    `playing`,
    `ratechange`,
    `reset`,
    `scroll`,
    `seeked`,
    `seeking`,
    `stalled`,
    `submit`,
    `suspend`,
    `timeupdate`,
    `unload`,
    `volumechange`,
    `waiting`,
];
export class EventDelegator {
    constructor(rootElement$, isolateModule) {
        this.isolateModule = isolateModule;
        this.virtualListeners = new SymbolTree(x => x.scope);
        this.nonBubblingListenersToAdd = new Set();
        this.virtualNonBubblingListener = [];
        this.isolateModule.setEventDelegator(this);
        this.domListeners = new Map();
        this.domListenersToAdd = new Map();
        this.nonBubblingListeners = new Map();
        rootElement$.subscribe({
            next: (el) => {
                if (this.origin !== el) {
                    this.origin = el;
                    this.resetEventListeners();
                    this.domListenersToAdd.forEach((passive, type) => this.setupDOMListener(type, passive));
                    this.domListenersToAdd.clear();
                }
                this.nonBubblingListenersToAdd.forEach(arr => {
                    this.setupNonBubblingListener(arr);
                });
            },
        });
    }
    addEventListener(eventType, namespace, options, bubbles) {
        const subject = new Subject();
        const scopeChecker = new ScopeChecker(namespace, this.isolateModule);
        const shouldBubble = bubbles === undefined
            ? eventTypesThatDontBubble.indexOf(eventType) === -1
            : bubbles;
        if (shouldBubble) {
            if (!this.domListeners.has(eventType)) {
                this.setupDOMListener(eventType, !!options.passive);
            }
            this.insertListener(subject, scopeChecker, eventType, options);
            return subject.asObservable();
        }
        else {
            const setArray = [];
            this.nonBubblingListenersToAdd.forEach(v => setArray.push(v));
            let found = undefined, index = 0;
            const length = setArray.length;
            const tester = (x) => {
                const [, et, ef] = x;
                return eventType === et && isEqualNamespace(ef.namespace, namespace);
            };
            while (!found && index < length) {
                const item = setArray[index];
                found = tester(item) ? item : found;
                index++;
            }
            let input = found;
            let nonBubbleSubject;
            if (!input) {
                const finder = new ElementFinder(namespace, this.isolateModule);
                const dest = this.insertListener(subject, scopeChecker, eventType, options);
                input = [subject, eventType, finder, dest];
                nonBubbleSubject = subject;
                this.nonBubblingListenersToAdd.add(input);
                this.setupNonBubblingListener(input);
            }
            else {
                const [sub] = input;
                nonBubbleSubject = sub;
            }
            return new Observable(subscriber => {
                const subscription = nonBubbleSubject.subscribe(subscriber);
                return () => {
                    const [, et, ef] = input;
                    const elements = ef.call();
                    elements.forEach((element) => {
                        const subs = element.subs;
                        if (subs && subs[et]) {
                            subs[et].unsubscribe();
                            delete subs[et];
                        }
                    });
                    this.nonBubblingListenersToAdd.delete(input);
                    subscription.unsubscribe();
                };
            });
        }
    }
    removeElement(element, namespace) {
        if (namespace !== undefined) {
            this.virtualListeners.delete(namespace);
        }
        const toRemove = [];
        this.nonBubblingListeners.forEach((map, type) => {
            if (map.has(element)) {
                toRemove.push([type, element]);
                const subs = element.subs;
                if (subs) {
                    Object.keys(subs).forEach((key) => {
                        subs[key].unsubscribe();
                    });
                }
            }
        });
        for (let i = 0; i < toRemove.length; i++) {
            const map = this.nonBubblingListeners.get(toRemove[i][0]);
            if (!map) {
                continue;
            }
            map.delete(toRemove[i][1]);
            if (map.size === 0) {
                this.nonBubblingListeners.delete(toRemove[i][0]);
            }
            else {
                this.nonBubblingListeners.set(toRemove[i][0], map);
            }
        }
    }
    insertListener(subject, scopeChecker, eventType, options) {
        const relevantSets = [];
        const n = scopeChecker._namespace;
        let max = n.length;
        do {
            relevantSets.push(this.getVirtualListeners(eventType, n, true, max));
            max--;
        } while (max >= 0 && n[max].type !== 'total');
        const destination = {
            ...options,
            scopeChecker,
            subject,
            bubbles: !!options.bubbles,
            useCapture: !!options.useCapture,
            passive: !!options.passive,
        };
        for (let i = 0; i < relevantSets.length; i++) {
            relevantSets[i].add(destination, n.length);
        }
        return destination;
    }
    getVirtualListeners(eventType, namespace, exact = false, max) {
        let _max = max !== undefined ? max : namespace.length;
        if (!exact) {
            for (let i = _max - 1; i >= 0; i--) {
                if (namespace[i].type === 'total') {
                    _max = i + 1;
                    break;
                }
                _max = i;
            }
        }
        const map = this.virtualListeners.getDefault(namespace, () => new Map(), _max);
        if (!map.has(eventType)) {
            map.set(eventType, new PriorityQueue());
        }
        return map.get(eventType);
    }
    setupDOMListener(eventType, passive) {
        if (this.origin) {
            const sub = fromEvent(this.origin, eventType, false, false, passive).subscribe({
                next: (event) => this.onEvent(eventType, event, passive),
                error: () => { },
                complete: () => { },
            });
            this.domListeners.set(eventType, { sub, passive });
        }
        else {
            this.domListenersToAdd.set(eventType, passive);
        }
    }
    setupNonBubblingListener(input) {
        const [, eventType, elementFinder, destination] = input;
        if (!this.origin) {
            return;
        }
        const elements = elementFinder.call();
        if (elements.length) {
            const self = this;
            elements.forEach((element) => {
                const subs = element.subs;
                if (!subs || !subs[eventType]) {
                    const sub = fromEvent(element, eventType, false, false, destination.passive).subscribe({
                        next: (ev) => self.onEvent(eventType, ev, !!destination.passive, false),
                        error: () => { },
                        complete: () => { },
                    });
                    if (!self.nonBubblingListeners.has(eventType)) {
                        self.nonBubblingListeners.set(eventType, new Map());
                    }
                    const map = self.nonBubblingListeners.get(eventType);
                    if (!map) {
                        return;
                    }
                    map.set(element, { sub, destination });
                    element.subs = {
                        ...subs,
                        [eventType]: sub,
                    };
                }
            });
        }
    }
    resetEventListeners() {
        const iter = this.domListeners.entries();
        let curr = iter.next();
        while (!curr.done) {
            const [type, { sub, passive }] = curr.value;
            sub.unsubscribe();
            this.setupDOMListener(type, passive);
            curr = iter.next();
        }
    }
    onEvent(_eventType, event, passive, bubbles = true) {
        const cycleEvent = this.patchEvent(event);
        const rootElement = this.isolateModule.getRootElement(event.target);
        if (bubbles) {
            const namespace = this.isolateModule.getNamespace(event.target);
            if (!namespace) {
                // If no namespace found, use empty namespace for root element
                const emptyNamespace = [];
                if (!rootElement) {
                    return;
                }
                const listeners = this.getVirtualListeners(_eventType, emptyNamespace);
                this.bubble(_eventType, event.target, rootElement, cycleEvent, listeners, emptyNamespace, -1, true, passive);
                this.bubble(_eventType, event.target, rootElement, cycleEvent, listeners, emptyNamespace, -1, false, passive);
                return;
            }
            const listeners = this.getVirtualListeners(_eventType, namespace);
            this.bubble(_eventType, event.target, rootElement, cycleEvent, listeners, namespace, namespace.length - 1, true, passive);
            this.bubble(_eventType, event.target, rootElement, cycleEvent, listeners, namespace, namespace.length - 1, false, passive);
        }
        else {
            this.putNonBubblingListener(_eventType, event.target, true, passive);
            this.doBubbleStep(_eventType, event.target, rootElement, cycleEvent, this.virtualNonBubblingListener, true, passive);
            this.putNonBubblingListener(_eventType, event.target, false, passive);
            this.doBubbleStep(_eventType, event.target, rootElement, cycleEvent, this.virtualNonBubblingListener, false, passive);
            event.stopPropagation();
        }
    }
    bubble(eventType, elm, rootElement, event, listeners, namespace, index, useCapture, passive) {
        if (!useCapture && !event.propagationHasBeenStopped) {
            this.doBubbleStep(eventType, elm, rootElement, event, listeners, useCapture, passive);
        }
        let newRoot = rootElement;
        let newIndex = index;
        if (elm === rootElement) {
            if (index >= 0 && namespace[index].type === 'sibling') {
                newRoot = this.isolateModule.getElement(namespace, index);
                newIndex--;
            }
            else {
                return;
            }
        }
        if (elm.parentNode && newRoot) {
            this.bubble(eventType, elm.parentNode, newRoot, event, listeners, namespace, newIndex, useCapture, passive);
        }
        if (useCapture && !event.propagationHasBeenStopped) {
            this.doBubbleStep(eventType, elm, rootElement, event, listeners, useCapture, passive);
        }
    }
    doBubbleStep(_eventType, elm, rootElement, event, listeners, useCapture, passive) {
        if (!rootElement) {
            return;
        }
        this.mutateEventCurrentTarget(event, elm);
        listeners.forEach(dest => {
            if (dest.passive === passive && dest.useCapture === useCapture) {
                const sel = getSelectors(dest.scopeChecker._namespace);
                if (!event.propagationHasBeenStopped &&
                    dest.scopeChecker.isDirectlyInScope(elm) &&
                    (sel === '' || elm.matches(sel))) {
                    preventDefaultConditional(event, dest.preventDefault);
                    dest.subject.next(event);
                }
            }
        });
    }
    putNonBubblingListener(eventType, elm, useCapture, passive) {
        const map = this.nonBubblingListeners.get(eventType);
        if (!map) {
            return;
        }
        const listener = map.get(elm);
        if (listener &&
            listener.destination.passive === passive &&
            listener.destination.useCapture === useCapture) {
            this.virtualNonBubblingListener[0] = listener.destination;
        }
    }
    patchEvent(event) {
        const pEvent = event;
        pEvent.propagationHasBeenStopped = false;
        const oldStopPropagation = pEvent.stopPropagation;
        pEvent.stopPropagation = function stopPropagation() {
            oldStopPropagation.call(this);
            this.propagationHasBeenStopped = true;
        };
        return pEvent;
    }
    mutateEventCurrentTarget(event, currentTargetElement) {
        try {
            Object.defineProperty(event, `currentTarget`, {
                value: currentTargetElement,
                configurable: true,
            });
        }
        catch (err) {
            console.log(`please use event.ownerTarget`);
        }
        event.ownerTarget = currentTargetElement;
    }
}
//# sourceMappingURL=EventDelegator.js.map