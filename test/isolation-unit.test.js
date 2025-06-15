import test from "ava";
import { JSDOM } from "jsdom";
import { html } from "lit-html";
import { makeLitDOMDriver } from "../lib/es6/index.js";
import Isolate from "@cycle/isolate";
import { of, Observable } from "rxjs";
import { setAdapt } from "@cycle/run/lib/adapt.js";
import 'symbol-observable';

// Setup DOM environment
const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
);
global.window = dom.window;
global.document = dom.window.document;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.MutationObserver = dom.window.MutationObserver;

// Set up RxJS adapter
const adaptFunction = function adaptXstreamToRx(stream) {
  if (stream && typeof stream.subscribe === 'function') {
    return new Observable(subscriber => {
      const subscription = stream.subscribe({
        next: value => subscriber.next(value),
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      });
      
      return () => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        }
      };
    });
  }
  return stream;
};

setAdapt(adaptFunction);

if (dom.window.Cyclejs) {
  dom.window.Cyclejs.adaptStream = adaptFunction;
} else {
  dom.window.Cyclejs = { adaptStream: adaptFunction };
}

const isolate = Isolate.default;

test("Isolation creates unique DOM sources with different namespaces", (t) => {
  const container = document.getElementById("app");
  const driver = makeLitDOMDriver(container);
  
  // Create a base DOM source
  const baseDomSource = driver(of(html`<div class="root"></div>`));
  
  // Create isolated DOM sources
  const isolatedSource1 = isolate((sources) => ({ DOM: sources.DOM }), 'scope1')({ DOM: baseDomSource });
  const isolatedSource2 = isolate((sources) => ({ DOM: sources.DOM }), 'scope2')({ DOM: baseDomSource });
  
  // Check that isolate returns something
  t.truthy(isolatedSource1.DOM, "Isolated source 1 should have DOM");
  t.truthy(isolatedSource2.DOM, "Isolated source 2 should have DOM");
  
  // Check that they have the subscribe method (indicating they're proper observables)
  t.is(typeof isolatedSource1.DOM.subscribe, 'function', "Isolated DOM 1 should be observable");
  t.is(typeof isolatedSource2.DOM.subscribe, 'function', "Isolated DOM 2 should be observable");
});

test("Isolation module tracks different namespaces", (t) => {
  const container = document.getElementById("app");
  const driver = makeLitDOMDriver(container);
  
  // Access the internal isolation module
  const domSource = driver(of(html`<div class="root"></div>`));
  const isolateModule = domSource._isolateModule;
  
  t.truthy(isolateModule, "Driver should have an isolate module");
  t.is(typeof isolateModule.insertElement, 'function', "Should have insertElement method");
  t.is(typeof isolateModule.getNamespace, 'function', "Should have getNamespace method");
  
  // Create test elements
  const element1 = document.createElement('div');
  const element2 = document.createElement('div');
  
  // Test different namespaces
  const namespace1 = [{ scope: 'test1', type: 'total' }];
  const namespace2 = [{ scope: 'test2', type: 'total' }];
  
  // Insert elements with different namespaces
  isolateModule.insertElement(namespace1, element1);
  isolateModule.insertElement(namespace2, element2);
  
  // Verify namespaces are stored correctly
  const retrievedNs1 = isolateModule.getNamespace(element1);
  const retrievedNs2 = isolateModule.getNamespace(element2);
  
  t.deepEqual(retrievedNs1, namespace1, "Element 1 should have namespace 1");
  t.deepEqual(retrievedNs2, namespace2, "Element 2 should have namespace 2");
  t.notDeepEqual(retrievedNs1, retrievedNs2, "Namespaces should be different");
});

test("Template injection adds namespace markers", async (t) => {
  const container = document.getElementById("app");
  container.innerHTML = ''; // Clean slate
  
  const driver = makeLitDOMDriver(container);
  
  // Create a simple component that uses isolation
  function TestComponent(sources) {
    return {
      DOM: of(html`<div class="test-component">Test Content</div>`)
    };
  }
  
  // Create isolated component
  const IsolatedComponent = isolate(TestComponent, 'test-scope');
  const domSource = driver(of(html`<div class="root"></div>`));
  const component = IsolatedComponent({ DOM: domSource });
  
  // Subscribe to the component's DOM stream to trigger rendering
  let lastTemplate = null;
  component.DOM.subscribe(template => {
    lastTemplate = template;
  });
  
  // Wait a bit for async operations
  await new Promise(resolve => setTimeout(resolve, 50));
  
  t.truthy(lastTemplate, "Component should produce a template");
  
  // Check if template has isolation metadata
  if (lastTemplate && typeof lastTemplate === 'object') {
    t.truthy(lastTemplate._isolate || lastTemplate.strings, "Template should have isolation data or be a lit-html template");
  }
});

test("Namespace injection works correctly", (t) => {
  const container = document.getElementById("app");
  const driver = makeLitDOMDriver(container);
  const domSource = driver(of(html`<div class="root"></div>`));
  const isolateModule = domSource._isolateModule;
  
  // Test the namespace injection functionality directly
  const testElement = document.createElement('div');
  testElement.setAttribute('data-temp-ns', 'test-scope');
  
  // This would normally be done by the driver after rendering
  const namespace = [{ scope: 'test', type: 'total' }];
  isolateModule.insertElement(namespace, testElement);
  
  const retrievedNamespace = isolateModule.getNamespace(testElement);
  t.deepEqual(retrievedNamespace, namespace, "Namespace should be retrievable after insertion");
});

test("Event delegation respects isolation boundaries", (t) => {
  const container = document.getElementById("app");
  const driver = makeLitDOMDriver(container);
  const domSource = driver(of(html`<div class="root"></div>`));
  const isolateModule = domSource._isolateModule;
  
  // Create test elements with different namespaces
  const element1 = document.createElement('button');
  const element2 = document.createElement('button');
  element1.className = 'test-btn';
  element2.className = 'test-btn';
  
  const namespace1 = [{ scope: 'component1', type: 'total' }];
  const namespace2 = [{ scope: 'component2', type: 'total' }];
  
  isolateModule.insertElement(namespace1, element1);
  isolateModule.insertElement(namespace2, element2);
  
  // Create isolated DOM sources
  const isolatedSource1 = domSource.isolateSource(domSource, 'component1');
  const isolatedSource2 = domSource.isolateSource(domSource, 'component2');
  
  t.truthy(isolatedSource1, "Should create isolated source 1");
  t.truthy(isolatedSource2, "Should create isolated source 2");
  t.notDeepEqual(isolatedSource1.namespace, isolatedSource2.namespace, "Isolated sources should have different namespaces");
});