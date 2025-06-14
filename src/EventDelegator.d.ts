import { Observable } from 'rxjs';
import { IsolateModule } from './IsolateModule';
import { EventsFnOptions, Scope } from './types';
export declare const eventTypesThatDontBubble: string[];
export declare class EventDelegator {
    isolateModule: IsolateModule;
    private virtualListeners;
    private origin;
    private domListeners;
    private nonBubblingListeners;
    private domListenersToAdd;
    private nonBubblingListenersToAdd;
    private virtualNonBubblingListener;
    constructor(rootElement$: Observable<Element>, isolateModule: IsolateModule);
    addEventListener(eventType: string, namespace: Array<Scope>, options: EventsFnOptions, bubbles?: boolean): Observable<Event>;
    removeElement(element: Element, namespace?: Array<Scope>): void;
    private insertListener;
    private getVirtualListeners;
    private setupDOMListener;
    private setupNonBubblingListener;
    private resetEventListeners;
    private onEvent;
    private bubble;
    private doBubbleStep;
    private putNonBubblingListener;
    private patchEvent;
    private mutateEventCurrentTarget;
}
//# sourceMappingURL=EventDelegator.d.ts.map