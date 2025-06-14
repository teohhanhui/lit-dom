import {Observable} from 'rxjs';
import {map, filter, shareReplay} from 'rxjs/operators';
import {ElementFinder} from './ElementFinder';
import {makeIsolateSink, getScopeObj} from './isolate';
import {IsolateModule} from './IsolateModule';
import {EventDelegator} from './EventDelegator';
import {EventsFnOptions, Scope, LitTemplate, IsolateSink} from './types';

export class LitDOMSource {
  constructor(
    private _rootElement$: Observable<Element>,
    private _sanitation$: Observable<null>,
    private _namespace: Array<Scope> = [],
    public _isolateModule: IsolateModule,
    private _eventDelegator: EventDelegator,
    private _name: string
  ) {
    this.isolateSource = (source, scope) =>
      new LitDOMSource(
        source._rootElement$,
        source._sanitation$,
        source._namespace.concat(getScopeObj(scope)),
        source._isolateModule,
        source._eventDelegator,
        source._name
      );
    this.isolateSink = makeIsolateSink(this._namespace) as any;
  }

  private _elements(): Observable<Array<Element>> {
    if (this._namespace.length === 0) {
      return this._rootElement$.pipe(map(x => [x]));
    } else {
      const elementFinder = new ElementFinder(
        this._namespace,
        this._isolateModule
      );
      return this._rootElement$.pipe(map(() => elementFinder.call()));
    }
  }

  public elements(): Observable<Array<Element>> {
    return this._elements().pipe(shareReplay(1));
  }

  public element(): Observable<Element> {
    return this._elements().pipe(
      filter(arr => arr.length > 0),
      map(arr => arr[0]),
      shareReplay(1)
    );
  }

  get namespace(): Array<Scope> {
    return this._namespace;
  }

  public select(selector: string): LitDOMSource {
    if (typeof selector !== 'string') {
      throw new Error(
        `DOM driver's select() expects the argument to be a ` +
          `string as a CSS selector`
      );
    }

    const namespace =
      selector === ':root'
        ? []
        : this._namespace.concat({type: 'selector', scope: selector.trim()});

    return new LitDOMSource(
      this._rootElement$,
      this._sanitation$,
      namespace,
      this._isolateModule,
      this._eventDelegator,
      this._name
    );
  }

  public events<K extends keyof HTMLElementEventMap>(
    eventType: K,
    options?: EventsFnOptions,
    bubbles?: boolean
  ): Observable<HTMLElementEventMap[K]>;
  public events(
    eventType: string,
    options: EventsFnOptions = {},
    bubbles?: boolean
  ): Observable<Event> {
    if (typeof eventType !== `string`) {
      throw new Error(
        `DOM driver's events() expects argument to be a ` +
          `string representing the event type to listen for.`
      );
    }

    const event$: Observable<Event> = this._eventDelegator.addEventListener(
      eventType,
      this._namespace,
      options,
      bubbles
    );

    return event$;
  }

  public dispose(): void {
    // Implementation would depend on how sanitation$ is used
    // For now, this is a placeholder
  }

  public isolateSource: (source: LitDOMSource, scope: string) => LitDOMSource;
  public isolateSink: IsolateSink<LitTemplate>;
}

