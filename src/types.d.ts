import { Observable } from 'rxjs';
import { TemplateResult } from 'lit-html';
export type LitTemplate = TemplateResult | string | number | boolean | null | undefined;
export interface Scope {
    type: 'sibling' | 'total' | 'selector';
    scope: string;
}
export interface EventsFnOptions {
    useCapture?: boolean;
    passive?: boolean;
    bubbles?: boolean;
    preventDefault?: PreventDefaultOpt;
}
export type PreventDefaultOpt = boolean | ((ev: Event) => boolean);
export interface LitDOMDriverOptions {
    reportRenderError?(err: any): void;
}
export interface CycleDOMEvent extends Event {
    propagationHasBeenStopped: boolean;
    ownerTarget: Element;
}
export type IsolateSink<T = any> = (s: Observable<T> | any, scope: string) => Observable<T> | any;
//# sourceMappingURL=types.d.ts.map