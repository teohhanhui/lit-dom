import { Observable } from 'rxjs';
import { IsolateModule } from './IsolateModule';
import { EventDelegator } from './EventDelegator';
import { EventsFnOptions, Scope, LitTemplate, IsolateSink } from './types';
export declare class LitDOMSource {
    private _rootElement$;
    private _sanitation$;
    private _namespace;
    _isolateModule: IsolateModule;
    private _eventDelegator;
    private _name;
    constructor(_rootElement$: Observable<Element>, _sanitation$: Observable<null>, _namespace: Array<Scope> | undefined, _isolateModule: IsolateModule, _eventDelegator: EventDelegator, _name: string);
    private _elements;
    elements(): Observable<Array<Element>>;
    element(): Observable<Element>;
    get namespace(): Array<Scope>;
    select(selector: string): LitDOMSource;
    events<K extends keyof HTMLElementEventMap>(eventType: K, options?: EventsFnOptions, bubbles?: boolean): Observable<HTMLElementEventMap[K]>;
    dispose(): void;
    isolateSource: (source: LitDOMSource, scope: string) => LitDOMSource;
    isolateSink: IsolateSink<LitTemplate>;
}
//# sourceMappingURL=LitDOMSource.d.ts.map