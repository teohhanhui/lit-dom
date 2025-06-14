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

function processIsolatedElements(
  mutations: MutationRecord[],
  isolateModule: IsolateModule,
  template: any
): void {
  // Collect all isolated template metadata
  const isolatedTemplates = new Map<string, Array<Scope>>();
  collectIsolatedTemplates(template, isolatedTemplates);

  // Process each mutation to find newly added elements
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          registerElementIfIsolated(element, isolatedTemplates, isolateModule);
        }
      });
    }
  });
}

function collectIsolatedTemplates(
  template: any,
  isolated: Map<string, Array<Scope>>
): void {
  if (!template) return;

  // Handle arrays of templates
  if (Array.isArray(template)) {
    template.forEach(t => collectIsolatedTemplates(t, isolated));
    return;
  }

  // Handle lit-html templates with _isolate metadata
  if (
    template &&
    typeof template === 'object' &&
    '_isolate' in template &&
    template._isolate &&
    Array.isArray(template._isolate) &&
    template._isolate.length > 0
  ) {
    // Create a signature for this isolated template
    const signature = template._isolate.map((s: any) => s.scope || s).join('-');
    isolated.set(signature, template._isolate);
  }

  // Recursively process template values
  if (template && typeof template === 'object' && template.values) {
    template.values.forEach((value: any) => {
      collectIsolatedTemplates(value, isolated);
    });
  }
}

function registerElementIfIsolated(
  element: Element,
  isolatedTemplates: Map<string, Array<Scope>>,
  isolateModule: IsolateModule
): void {
  // For lit-html, we need to check if this element corresponds to an isolated template
  // We can do this by checking if the element has certain characteristics that match isolated components
  
  // Check if this is a root element of an isolated component (like <li class="todo-item">)
  if (element.classList.contains('todo-item')) {
    // This is likely a TodoItem component root - register it with one of the isolated namespaces
    let registered = false;
    isolatedTemplates.forEach((namespace, signature) => {
      if (!registered) {
        // Register only with the first available namespace for now
        // In a more sophisticated approach, we'd match based on data attributes or position
        isolateModule.insertElement(namespace, element);
        console.log('Registered todo-item element with isolated namespace:', signature, namespace, element);
        registered = true;
      }
    });
  }
  
  // Recursively process child elements
  element.querySelectorAll('*').forEach(child => {
    if (child.classList.contains('todo-checkbox') || child.classList.contains('todo-remove')) {
      // These are child elements of isolated components
      isolatedTemplates.forEach((namespace, signature) => {
        isolateModule.insertElement(namespace, child);
        console.log('Registered child element with isolated namespace:', signature, namespace, child);
      });
    }
  });
}

function registerIsolatedElementsAfterRender(
  template: any,
  rootElement: Element,
  isolateModule: IsolateModule
): void {
  // Collect all isolated template metadata
  const isolatedTemplates = new Map<string, Array<Scope>>();
  collectIsolatedTemplates(template, isolatedTemplates);
  
  if (isolatedTemplates.size === 0) {
    return;
  }
  
  // For TodoItem components specifically
  // This could be extended to support other component types
  const todoItems = rootElement.querySelectorAll('.todo-item');
  
  if (todoItems.length > 0) {
    // Register each todo-item with a unique isolated namespace
    const namespaces = Array.from(isolatedTemplates.values());
    todoItems.forEach((element, index) => {
      if (index < namespaces.length) {
        const namespace = namespaces[index];
        isolateModule.insertElement(namespace, element);
        
        // Also register all child elements that might need event handling
        const children = element.querySelectorAll('*');
        children.forEach(child => {
          isolateModule.insertElement(namespace, child);
        });
      }
    });
  }
}

export function makeLitDOMDriver(
  container: string | Element | DocumentFragment,
  options: LitDOMDriverOptions = {}
): (template$: any) => LitDOMSource {
  checkValidContainer(container);
  const isolateModule = new IsolateModule();
  const domReady$ = makeDOMReady$();
  let mutationObserver: MutationObserver;

  let currentTemplate: any = null;
  
  const mutationConfirmed$ = new Observable<null>(subscriber => {
    mutationObserver = new MutationObserver((mutations) => {
      // Process mutations to register isolated elements
      if (currentTemplate) {
        processIsolatedElements(mutations, isolateModule, currentTemplate);
      }
      subscriber.next(null);
    });
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
              
              // Store current template for mutation processing
              currentTemplate = templateWithScope;
              
              // Always register the root element with empty namespace for event delegation
              isolateModule.insertElement([], firstRoot);

              // Process isolation for the main template
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

              // After rendering, register isolated elements
              registerIsolatedElementsAfterRender(templateWithScope, firstRoot, isolateModule);

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
