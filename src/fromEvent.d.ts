import { Observable } from 'rxjs';
import { PreventDefaultOpt } from './types';
export declare function fromEvent(element: Element | Document | Window, eventType: string, useCapture?: boolean, preventDefault?: PreventDefaultOpt, passive?: boolean): Observable<Event>;
export declare function preventDefaultConditional(event: Event, preventDefault: PreventDefaultOpt): void;
//# sourceMappingURL=fromEvent.d.ts.map