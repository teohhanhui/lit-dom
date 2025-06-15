import { Observable, merge, NEVER, Subject, from } from "rxjs";
import {
  map,
  startWith,
  shareReplay,
  takeUntil,
  switchMap,
} from "rxjs/operators";
import { render } from "lit-html";
import { LitTemplate, LitDOMDriverOptions, Scope } from "./types";
import { LitDOMSource } from "./LitDOMSource";
import { IsolateModule } from "./IsolateModule";
import { EventDelegator } from "./EventDelegator";
import {
  checkValidContainer,
  getValidNode,
  defaultReportRenderError,
} from "./utils";

function domDriverInputGuard(view$: any): void {
  if (!view$) {
    throw new Error(
      `The lit-html DOM driver function expects as input a stream of ` +
        `lit-html templates`,
    );
  }
}

function dropCompletion<T>(input: Observable<T>): Observable<T> {
  return merge(input, NEVER);
}

function makeDOMReady$(): Observable<null> {
  return new Observable((subscriber) => {
    if (document.readyState === "loading") {
      const handler = () => {
        const state = document.readyState;
        if (state === "interactive" || state === "complete") {
          subscriber.next(null);
          subscriber.complete();
        }
      };
      document.addEventListener("readystatechange", handler);
      return () => document.removeEventListener("readystatechange", handler);
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
  namespace: Array<Scope>,
): LitTemplate {
  if (template && typeof template === "object" && "_isolate" in template) {
    return template;
  }

  if (template && typeof template === "object") {
    return {
      ...(template as any),
      _isolate: namespace,
    };
  }

  return template;
}

// WeakMap to store element-to-scope mappings
const elementToScope = new WeakMap<Element, Array<Scope>>();

function processIsolatedElements(
  mutations: MutationRecord[],
  isolateModule: IsolateModule,
  template: any,
): void {
  // Collect all isolated template metadata
  const isolatedTemplates = new Map<string, Array<Scope>>();
  collectIsolatedTemplates(template, isolatedTemplates);

  if (isolatedTemplates.size === 0) {
    return;
  }

  // Process each mutation to register newly added elements
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Check if this element or any of its children have namespace markers
          const markedElements = element.hasAttribute("data-temp-ns") 
            ? [element]
            : Array.from(element.querySelectorAll("[data-temp-ns]"));
          
          markedElements.forEach((markedEl) => {
            const namespaceId = markedEl.getAttribute("data-temp-ns");
            if (namespaceId) {
              const namespace = findNamespaceById(namespaceId, isolatedTemplates);
              if (namespace) {
                walkDOMTree(markedEl, namespace, isolateModule);
              }
              markedEl.removeAttribute("data-temp-ns");
            }
          });
        }
      });
    }
  });
}

function collectIsolatedTemplates(
  template: any,
  isolated: Map<string, Array<Scope>>,
): void {
  if (!template) return;

  // Handle arrays of templates
  if (Array.isArray(template)) {
    template.forEach((t) => collectIsolatedTemplates(t, isolated));
    return;
  }

  // Handle lit-html templates with _isolate metadata
  if (
    template &&
    typeof template === "object" &&
    "_isolate" in template &&
    template._isolate &&
    Array.isArray(template._isolate) &&
    template._isolate.length > 0
  ) {
    // Create a signature for this isolated template
    const signature = template._isolate.map((s: any) => s.scope || s).join("-");
    isolated.set(signature, template._isolate);
  }

  // Recursively process template values
  if (template && typeof template === "object" && template.values) {
    template.values.forEach((value: any) => {
      collectIsolatedTemplates(value, isolated);
    });
  }
}

function assignScopeToElement(
  element: Element,
  scope: Array<Scope>,
  isolateModule: IsolateModule,
): void {
  elementToScope.set(element, scope);
  isolateModule.insertElement(scope, element);
}

function registerIsolatedElementsAfterRender(
  template: any,
  rootElement: Element,
  isolateModule: IsolateModule,
): void {
  // Collect all isolated template metadata
  const isolatedTemplates = new Map<string, Array<Scope>>();
  collectIsolatedTemplates(template, isolatedTemplates);

  if (isolatedTemplates.size === 0) {
    return;
  }

  // Find all elements with temporary namespace markers
  const markedElements = Array.from(rootElement.querySelectorAll("[data-temp-ns]"));
  
  markedElements.forEach((element) => {
    const namespaceId = element.getAttribute("data-temp-ns");
    if (namespaceId) {
      // Find the corresponding namespace from our collected templates
      const namespace = findNamespaceById(namespaceId, isolatedTemplates);
      if (namespace) {
        // Walk the DOM tree starting from this element
        walkDOMTree(element, namespace, isolateModule);
      }
      // Clean up the temporary marker
      element.removeAttribute("data-temp-ns");
    }
  });
}

function findNamespaceById(namespaceId: string, isolatedTemplates: Map<string, Array<Scope>>): Array<Scope> | null {
  // Convert namespace ID back to scope array by finding matching template
  for (const namespace of isolatedTemplates.values()) {
    const expectedId = namespace.map(s => s.scope).join('-');
    if (expectedId === namespaceId) {
      return namespace;
    }
  }
  return null;
}

function walkDOMTree(
  element: Element,
  namespace: Array<Scope>,
  isolateModule: IsolateModule,
): void {
  // Assign this element to the namespace
  assignScopeToElement(element, namespace, isolateModule);
  
  // Recursively assign all children to the same namespace
  // unless they have their own namespace marker
  Array.from(element.children).forEach((child) => {
    if (!child.hasAttribute("data-temp-ns")) {
      // Child doesn't start a new namespace, so it inherits the parent's
      walkDOMTree(child, namespace, isolateModule);
    }
    // If child has data-temp-ns, it will be processed in its own iteration
  });
}

export function makeLitDOMDriver(
  container: string | Element | DocumentFragment,
  options: LitDOMDriverOptions = {},
): (template$: any) => LitDOMSource {
  checkValidContainer(container);
  const isolateModule = new IsolateModule();
  const domReady$ = makeDOMReady$();
  let mutationObserver: MutationObserver;

  let currentTemplate: any = null;

  const mutationConfirmed$ = new Observable<null>((subscriber) => {
    mutationObserver = new MutationObserver((mutations) => {
      // Process mutations to register isolated elements
      if (currentTemplate) {
        processIsolatedElements(mutations, isolateModule, currentTemplate);
      }
      subscriber.next(null);
    });
    return () => mutationObserver.disconnect();
  });

  function LitDOMDriver(template$: any, name = "LitDOM"): LitDOMSource {
    domDriverInputGuard(template$);
    const sanitation$ = new Subject<null>();

    const firstRoot$ = domReady$.pipe(
      map(() => {
        const firstRoot = getValidNode(container) || document.body;
        return firstRoot;
      }),
    );

    // Convert the SinkProxy/xstream to RxJS Observable
    const templateObservable$ = from(
      template$ as any,
    ) as Observable<LitTemplate>;
    const rememberedTemplate$ = templateObservable$.pipe(shareReplay(1));

    mutationConfirmed$.subscribe();

    const elementAfterRender$ = firstRoot$.pipe(
      map((firstRoot) => {
        return merge(
          rememberedTemplate$.pipe(takeUntil(sanitation$)),
          sanitation$,
        ).pipe(
          map((template) => {
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
                typeof templateWithScope === "object" &&
                "_isolate" in templateWithScope
              ) {
                const namespace = (templateWithScope as any)
                  ._isolate as Array<Scope>;
                if (namespace && namespace.length > 0) {
                  isolateModule.insertElement(namespace, firstRoot);
                }
              }

              render(templateWithScope as any, firstRoot as HTMLElement);

              // After rendering, register isolated elements
              registerIsolatedElementsAfterRender(
                templateWithScope,
                firstRoot,
                isolateModule,
              );

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
          dropCompletion,
        );
      }),
      switchMap((x) => x),
    );

    const rootElement$ = merge(domReady$, mutationConfirmed$).pipe(
      takeUntil(sanitation$),
      switchMap(() => elementAfterRender$),
      shareReplay(1),
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
      name,
    );
  }

  return LitDOMDriver;
}
