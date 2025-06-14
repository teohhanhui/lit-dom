import {Observable, merge, NEVER, Subject, from} from 'rxjs';
import {
  map,
  startWith,
  shareReplay,
  takeUntil,
  switchMap,
} from 'rxjs/operators';
import {render} from 'lit-html';
import {LitTemplate, LitDOMDriverOptions, Scope} from './types';
import {LitDOMSource} from './LitDOMSource';
import {IsolateModule} from './IsolateModule';
import {EventDelegator} from './EventDelegator';
import {
  checkValidContainer,
  getValidNode,
  defaultReportRenderError,
} from './utils';

function domDriverInputGuard(view$: any): void {
  if (!view$) {
    throw new Error(
      `The lit-html DOM driver function expects as input a stream of ` +
        `lit-html templates`
    );
  }
}

function dropCompletion<T>(input: Observable<T>): Observable<T> {
  return merge(input, NEVER);
}

function makeDOMReady$(): Observable<null> {
  return new Observable(subscriber => {
    if (document.readyState === 'loading') {
      const handler = () => {
        const state = document.readyState;
        if (state === 'interactive' || state === 'complete') {
          subscriber.next(null);
          subscriber.complete();
        }
      };
      document.addEventListener('readystatechange', handler);
      return () => document.removeEventListener('readystatechange', handler);
    } else {
      subscriber.next(null);
      subscriber.complete();
    }

    // This return is needed for TypeScript to know all code paths return a value
    return () => {};
  });
}

function addRootScope(
  template: LitTemplate,
  namespace: Array<Scope>
): LitTemplate {
  if (template && typeof template === 'object' && '_isolate' in template) {
    return template;
  }

  if (template && typeof template === 'object') {
    return {
      ...(template as any),
      _isolate: namespace,
    };
  }

  return template;
}

export function makeLitDOMDriver(
  container: string | Element | DocumentFragment,
  options: LitDOMDriverOptions = {}
): (template$: any) => LitDOMSource {
  checkValidContainer(container);
  const isolateModule = new IsolateModule();
  const domReady$ = makeDOMReady$();
  let mutationObserver: MutationObserver;

  const mutationConfirmed$ = new Observable<null>(subscriber => {
    mutationObserver = new MutationObserver(() => subscriber.next(null));
    return () => mutationObserver.disconnect();
  });

  function LitDOMDriver(
    template$: any,
    name = 'LitDOM'
  ): LitDOMSource {
    domDriverInputGuard(template$);
    const sanitation$ = new Subject<null>();

    const firstRoot$ = domReady$.pipe(
      map(() => {
        const firstRoot = getValidNode(container) || document.body;
        return firstRoot;
      })
    );

    // Convert the SinkProxy/xstream to RxJS Observable
    const templateObservable$ = from(template$ as any) as Observable<LitTemplate>;
    const rememberedTemplate$ = templateObservable$.pipe(shareReplay(1));

    mutationConfirmed$.subscribe();

    const elementAfterRender$ = firstRoot$.pipe(
      map(firstRoot => {
        return merge(
          rememberedTemplate$.pipe(takeUntil(sanitation$)),
          sanitation$
        ).pipe(
          map(template => {
            if (template === null) {
              return firstRoot;
            }

            try {
              const templateWithScope = addRootScope(template, []);
              
              // Always register the root element with empty namespace for event delegation
              isolateModule.insertElement([], firstRoot);

              if (
                templateWithScope &&
                typeof templateWithScope === 'object' &&
                '_isolate' in templateWithScope
              ) {
                const namespace = (templateWithScope as any)._isolate as Array<
                  Scope
                >;
                if (namespace && namespace.length > 0) {
                  isolateModule.insertElement(namespace, firstRoot);
                }
              }

              render(templateWithScope as any, firstRoot as HTMLElement);

              isolateModule.processRemovals();

              mutationObserver.observe(firstRoot, {
                childList: true,
                attributes: true,
                characterData: true,
                subtree: true,
                attributeOldValue: true,
                characterDataOldValue: true,
              });

              return firstRoot;
            } catch (error) {
              const reportError =
                options.reportRenderError || defaultReportRenderError;
              reportError(error);
              return firstRoot;
            }
          }),
          startWith(firstRoot),
          dropCompletion
        );
      }),
      switchMap(x => x)
    );

    const rootElement$ = merge(domReady$, mutationConfirmed$).pipe(
      takeUntil(sanitation$),
      switchMap(() => elementAfterRender$),
      shareReplay(1)
    );

    rootElement$.subscribe({
      error: options.reportRenderError || defaultReportRenderError,
    });

    const delegator = new EventDelegator(rootElement$, isolateModule);

    return new LitDOMSource(
      rootElement$,
      sanitation$,
      [],
      isolateModule,
      delegator,
      name
    );
  }

  return LitDOMDriver;
}
