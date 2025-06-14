import {Observable, Subject, Subscription} from 'rxjs';
import {ScopeChecker} from './ScopeChecker';
import {IsolateModule} from './IsolateModule';
import {getSelectors, isEqualNamespace} from './utils';
import {ElementFinder} from './ElementFinder';
import {
  EventsFnOptions,
  Scope,
  CycleDOMEvent,
  PreventDefaultOpt,
} from './types';
import SymbolTree from './SymbolTree';
import PriorityQueue from './PriorityQueue';
import {fromEvent, preventDefaultConditional} from './fromEvent';

interface Destination {
  useCapture: boolean;
  bubbles: boolean;
  passive: boolean;
  scopeChecker: ScopeChecker;
  subject: Subject<Event>;
  preventDefault?: PreventDefaultOpt;
}

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

interface DOMListener {
  sub: Subscription;
  passive: boolean;
}

interface NonBubblingListener {
  sub: Subscription | undefined;
  destination: Destination;
}

type NonBubblingMeta = [Subject<Event>, string, ElementFinder, Destination];

export class EventDelegator {
  private virtualListeners = new SymbolTree<
    Map<string, PriorityQueue<Destination>>,
    Scope
  >(x => x.scope);
  private origin: Element | undefined;

  private domListeners: Map<string, DOMListener>;
  private nonBubblingListeners: Map<string, Map<Element, NonBubblingListener>>;
  private domListenersToAdd: Map<string, boolean>;
  private nonBubblingListenersToAdd = new Set<NonBubblingMeta>();

  private virtualNonBubblingListener: Array<Destination> = [];

  constructor(
    rootElement$: Observable<Element>,
    public isolateModule: IsolateModule
  ) {
    this.isolateModule.setEventDelegator(this);
    this.domListeners = new Map<string, DOMListener>();
    this.domListenersToAdd = new Map<string, boolean>();
    this.nonBubblingListeners = new Map<
      string,
      Map<Element, NonBubblingListener>
    >();

    rootElement$.subscribe({
      next: (el: Element) => {
        if (this.origin !== el) {
          this.origin = el;
          this.resetEventListeners();
          this.domListenersToAdd.forEach((passive, type) =>
            this.setupDOMListener(type, passive)
          );
          this.domListenersToAdd.clear();
        }

        this.nonBubblingListenersToAdd.forEach(arr => {
          this.setupNonBubblingListener(arr);
        });
      },
    });
  }

  public addEventListener(
    eventType: string,
    namespace: Array<Scope>,
    options: EventsFnOptions,
    bubbles?: boolean
  ): Observable<Event> {
    const subject = new Subject<Event>();

    const scopeChecker = new ScopeChecker(namespace, this.isolateModule);

    const shouldBubble =
      bubbles === undefined
        ? eventTypesThatDontBubble.indexOf(eventType) === -1
        : bubbles;

    if (shouldBubble) {
      if (!this.domListeners.has(eventType)) {
        this.setupDOMListener(eventType, !!options.passive);
      }

      this.insertListener(subject, scopeChecker, eventType, options);
      return subject.asObservable();
    } else {
      const setArray: Array<NonBubblingMeta> = [];
      this.nonBubblingListenersToAdd.forEach(v => setArray.push(v));
      let found = undefined,
        index = 0;
      const length = setArray.length;
      const tester = (x: NonBubblingMeta) => {
        const [, et, ef] = x;
        return eventType === et && isEqualNamespace(ef.namespace, namespace);
      };

      while (!found && index < length) {
        const item = setArray[index];
        found = tester(item) ? item : found;
        index++;
      }

      let input: NonBubblingMeta = found as NonBubblingMeta;
      let nonBubbleSubject: Subject<Event>;

      if (!input) {
        const finder = new ElementFinder(namespace, this.isolateModule);
        const dest = this.insertListener(
          subject,
          scopeChecker,
          eventType,
          options
        );
        input = [subject, eventType, finder, dest];
        nonBubbleSubject = subject;
        this.nonBubblingListenersToAdd.add(input);
        this.setupNonBubblingListener(input);
      } else {
        const [sub] = input;
        nonBubbleSubject = sub;
      }

      return new Observable(subscriber => {
        const subscription = nonBubbleSubject.subscribe(subscriber);

        return () => {
          const [, et, ef] = input;
          const elements = ef.call();

          elements.forEach((element: any) => {
            const subs = element.subs;
            if (subs && subs[et]) {
              subs[et].unsubscribe();
              delete subs[et];
            }
          });

          this.nonBubblingListenersToAdd.delete(input as any);
          subscription.unsubscribe();
        };
      });
    }
  }

  public removeElement(element: Element, namespace?: Array<Scope>): void {
    if (namespace !== undefined) {
      this.virtualListeners.delete(namespace);
    }

    const toRemove: Array<[string, Element]> = [];
    this.nonBubblingListeners.forEach((map, type) => {
      if (map.has(element)) {
        toRemove.push([type, element]);
        const subs = (element as any).subs;
        if (subs) {
          Object.keys(subs).forEach((key: any) => {
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
      } else {
        this.nonBubblingListeners.set(toRemove[i][0], map);
      }
    }
  }

  private insertListener(
    subject: Subject<Event>,
    scopeChecker: ScopeChecker,
    eventType: string,
    options: EventsFnOptions
  ): Destination {
    const relevantSets: Array<PriorityQueue<Destination>> = [];
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

  private getVirtualListeners(
    eventType: string,
    namespace: Array<Scope>,
    exact = false,
    max?: number
  ): PriorityQueue<Destination> {
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

    const map = this.virtualListeners.getDefault(
      namespace,
      () => new Map<string, PriorityQueue<Destination>>(),
      _max
    );

    if (!map.has(eventType)) {
      map.set(eventType, new PriorityQueue<Destination>());
    }
    return map.get(eventType) as PriorityQueue<Destination>;
  }

  private setupDOMListener(eventType: string, passive: boolean): void {
    if (this.origin) {
      const sub = fromEvent(
        this.origin,
        eventType,
        false,
        false,
        passive
      ).subscribe({
        next: (event: Event) => this.onEvent(eventType, event, passive),
        error: () => {},
        complete: () => {},
      });
      this.domListeners.set(eventType, {sub, passive});
    } else {
      this.domListenersToAdd.set(eventType, passive);
    }
  }

  private setupNonBubblingListener(input: NonBubblingMeta): void {
    const [, eventType, elementFinder, destination] = input;
    if (!this.origin) {
      return;
    }

    const elements = elementFinder.call();
    if (elements.length) {
      const self = this;
      elements.forEach((element: Element) => {
        const subs = (element as any).subs;
        if (!subs || !subs[eventType]) {
          const sub = fromEvent(
            element,
            eventType,
            false,
            false,
            destination.passive
          ).subscribe({
            next: (ev: Event) =>
              self.onEvent(eventType, ev, !!destination.passive, false),
            error: () => {},
            complete: () => {},
          });

          if (!self.nonBubblingListeners.has(eventType)) {
            self.nonBubblingListeners.set(
              eventType,
              new Map<Element, NonBubblingListener>()
            );
          }

          const map = self.nonBubblingListeners.get(eventType);
          if (!map) {
            return;
          }
          map.set(element, {sub, destination});

          (element as any).subs = {
            ...subs,
            [eventType]: sub,
          };
        }
      });
    }
  }

  private resetEventListeners(): void {
    const iter = this.domListeners.entries();
    let curr = iter.next();
    while (!curr.done) {
      const [type, {sub, passive}] = curr.value;
      sub.unsubscribe();
      this.setupDOMListener(type, passive);
      curr = iter.next();
    }
  }

  private onEvent(
    _eventType: string,
    event: Event,
    passive: boolean,
    bubbles = true
  ): void {
    const cycleEvent = this.patchEvent(event);
    const rootElement = this.isolateModule.getRootElement(
      event.target as Element
    );

    if (bubbles) {
      const namespace = this.isolateModule.getNamespace(
        event.target as Element
      );
      if (!namespace) {
        // If no namespace found, use empty namespace for root element
        const emptyNamespace: Array<Scope> = [];
        if (!rootElement) {
          return;
        }
        const listeners = this.getVirtualListeners(_eventType, emptyNamespace);
        this.bubble(
          _eventType,
          event.target as Element,
          rootElement,
          cycleEvent,
          listeners,
          emptyNamespace,
          -1,
          true,
          passive
        );

        this.bubble(
          _eventType,
          event.target as Element,
          rootElement,
          cycleEvent,
          listeners,
          emptyNamespace,
          -1,
          false,
          passive
        );
        return;
      }
      const listeners = this.getVirtualListeners(_eventType, namespace);
      this.bubble(
        _eventType,
        event.target as Element,
        rootElement,
        cycleEvent,
        listeners,
        namespace,
        namespace.length - 1,
        true,
        passive
      );

      this.bubble(
        _eventType,
        event.target as Element,
        rootElement,
        cycleEvent,
        listeners,
        namespace,
        namespace.length - 1,
        false,
        passive
      );
    } else {
      this.putNonBubblingListener(
        _eventType,
        event.target as Element,
        true,
        passive
      );
      this.doBubbleStep(
        _eventType,
        event.target as Element,
        rootElement,
        cycleEvent,
        this.virtualNonBubblingListener,
        true,
        passive
      );

      this.putNonBubblingListener(
        _eventType,
        event.target as Element,
        false,
        passive
      );
      this.doBubbleStep(
        _eventType,
        event.target as Element,
        rootElement,
        cycleEvent,
        this.virtualNonBubblingListener,
        false,
        passive
      );
      event.stopPropagation();
    }
  }

  private bubble(
    eventType: string,
    elm: Element,
    rootElement: Element | undefined,
    event: CycleDOMEvent,
    listeners: PriorityQueue<Destination>,
    namespace: Array<Scope>,
    index: number,
    useCapture: boolean,
    passive: boolean
  ): void {
    if (!useCapture && !event.propagationHasBeenStopped) {
      this.doBubbleStep(
        eventType,
        elm,
        rootElement,
        event,
        listeners,
        useCapture,
        passive
      );
    }

    let newRoot: Element | undefined = rootElement;
    let newIndex = index;
    if (elm === rootElement) {
      if (index >= 0 && namespace[index].type === 'sibling') {
        newRoot = this.isolateModule.getElement(namespace, index);
        newIndex--;
      } else {
        return;
      }
    }

    if (elm.parentNode && newRoot) {
      this.bubble(
        eventType,
        elm.parentNode as Element,
        newRoot,
        event,
        listeners,
        namespace,
        newIndex,
        useCapture,
        passive
      );
    }

    if (useCapture && !event.propagationHasBeenStopped) {
      this.doBubbleStep(
        eventType,
        elm,
        rootElement,
        event,
        listeners,
        useCapture,
        passive
      );
    }
  }

  private doBubbleStep(
    _eventType: string,
    elm: Element,
    rootElement: Element | undefined,
    event: CycleDOMEvent,
    listeners: PriorityQueue<Destination> | Array<Destination>,
    useCapture: boolean,
    passive: boolean
  ): void {
    if (!rootElement) {
      return;
    }
    this.mutateEventCurrentTarget(event, elm);
    listeners.forEach(dest => {
      if (dest.passive === passive && dest.useCapture === useCapture) {
        const sel = getSelectors(dest.scopeChecker._namespace);
        if (
          !event.propagationHasBeenStopped &&
          dest.scopeChecker.isDirectlyInScope(elm) &&
          (sel === '' || elm.matches(sel))
        ) {
          preventDefaultConditional(
            event,
            dest.preventDefault as PreventDefaultOpt
          );

          dest.subject.next(event);
        }
      }
    });
  }

  private putNonBubblingListener(
    eventType: string,
    elm: Element,
    useCapture: boolean,
    passive: boolean
  ): void {
    const map = this.nonBubblingListeners.get(eventType);
    if (!map) {
      return;
    }
    const listener = map.get(elm);
    if (
      listener &&
      listener.destination.passive === passive &&
      listener.destination.useCapture === useCapture
    ) {
      this.virtualNonBubblingListener[0] = listener.destination;
    }
  }

  private patchEvent(event: Event): CycleDOMEvent {
    const pEvent = event as CycleDOMEvent;
    pEvent.propagationHasBeenStopped = false;
    const oldStopPropagation = pEvent.stopPropagation;
    pEvent.stopPropagation = function stopPropagation() {
      oldStopPropagation.call(this);
      this.propagationHasBeenStopped = true;
    };
    return pEvent;
  }

  private mutateEventCurrentTarget(
    event: CycleDOMEvent,
    currentTargetElement: Element
  ) {
    try {
      Object.defineProperty(event, `currentTarget`, {
        value: currentTargetElement,
        configurable: true,
      });
    } catch (err) {
      console.log(`please use event.ownerTarget`);
    }
    event.ownerTarget = currentTargetElement;
  }
}
