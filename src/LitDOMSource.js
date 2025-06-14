import { map, filter, shareReplay } from 'rxjs/operators';
import { ElementFinder } from './ElementFinder';
import { makeIsolateSink, getScopeObj } from './isolate';
export class LitDOMSource {
    constructor(_rootElement$, _sanitation$, _namespace = [], _isolateModule, _eventDelegator, _name) {
        this._rootElement$ = _rootElement$;
        this._sanitation$ = _sanitation$;
        this._namespace = _namespace;
        this._isolateModule = _isolateModule;
        this._eventDelegator = _eventDelegator;
        this._name = _name;
        this.isolateSource = (source, scope) => new LitDOMSource(source._rootElement$, source._sanitation$, source._namespace.concat(getScopeObj(scope)), source._isolateModule, source._eventDelegator, source._name);
        this.isolateSink = makeIsolateSink(this._namespace);
    }
    _elements() {
        if (this._namespace.length === 0) {
            return this._rootElement$.pipe(map(x => [x]));
        }
        else {
            const elementFinder = new ElementFinder(this._namespace, this._isolateModule);
            return this._rootElement$.pipe(map(() => elementFinder.call()));
        }
    }
    elements() {
        return this._elements().pipe(shareReplay(1));
    }
    element() {
        return this._elements().pipe(filter(arr => arr.length > 0), map(arr => arr[0]), shareReplay(1));
    }
    get namespace() {
        return this._namespace;
    }
    select(selector) {
        if (typeof selector !== 'string') {
            throw new Error(`DOM driver's select() expects the argument to be a ` +
                `string as a CSS selector`);
        }
        const namespace = selector === ':root'
            ? []
            : this._namespace.concat({ type: 'selector', scope: selector.trim() });
        return new LitDOMSource(this._rootElement$, this._sanitation$, namespace, this._isolateModule, this._eventDelegator, this._name);
    }
    events(eventType, options = {}, bubbles) {
        if (typeof eventType !== `string`) {
            throw new Error(`DOM driver's events() expects argument to be a ` +
                `string representing the event type to listen for.`);
        }
        const event$ = this._eventDelegator.addEventListener(eventType, this._namespace, options, bubbles);
        return event$;
    }
    dispose() {
        // Implementation would depend on how sanitation$ is used
        // For now, this is a placeholder
    }
}
//# sourceMappingURL=LitDOMSource.js.map