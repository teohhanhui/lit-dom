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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGl0RE9NU291cmNlLmpzIiwic291cmNlUm9vdCI6Ii9ob21lL2Zibi9kZXYvbGl0LWRvbS8iLCJzb3VyY2VzIjpbInNyYy9MaXRET01Tb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBQzlDLE9BQU8sRUFBQyxlQUFlLEVBQUUsV0FBVyxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBS3ZELE1BQU0sT0FBTyxZQUFZO0lBQ3ZCLFlBQ1UsYUFBa0MsRUFDbEMsWUFBOEIsRUFDOUIsYUFBMkIsRUFBRSxFQUM5QixjQUE2QixFQUM1QixlQUErQixFQUMvQixLQUFhO1FBTGIsa0JBQWEsR0FBYixhQUFhLENBQXFCO1FBQ2xDLGlCQUFZLEdBQVosWUFBWSxDQUFrQjtRQUM5QixlQUFVLEdBQVYsVUFBVSxDQUFtQjtRQUM5QixtQkFBYyxHQUFkLGNBQWMsQ0FBZTtRQUM1QixvQkFBZSxHQUFmLGVBQWUsQ0FBZ0I7UUFDL0IsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUVyQixJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQ3JDLElBQUksWUFBWSxDQUNkLE1BQU0sQ0FBQyxhQUFhLEVBQ3BCLE1BQU0sQ0FBQyxZQUFZLEVBQ25CLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUM1QyxNQUFNLENBQUMsY0FBYyxFQUNyQixNQUFNLENBQUMsZUFBZSxFQUN0QixNQUFNLENBQUMsS0FBSyxDQUNiLENBQUM7UUFDSixJQUFJLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFRLENBQUM7SUFDN0QsQ0FBQztJQUVPLFNBQVM7UUFDZixJQUFJLElBQUksQ0FB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