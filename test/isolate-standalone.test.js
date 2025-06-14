import test from 'ava';
import {of} from 'rxjs';
import {map} from 'rxjs/operators';

// Standalone implementation of key isolation concepts for testing
class SimpleIsolateModule {
  constructor() {
    this.namespaceByElement = new Map();
    this.elementsByNamespace = new Map();
  }
  
  insertElement(namespace, element) {
    const key = JSON.stringify(namespace);
    this.namespaceByElement.set(element, namespace);
    this.elementsByNamespace.set(key, element);
  }
  
  getElement(namespace) {
    const key = JSON.stringify(namespace);
    return this.elementsByNamespace.get(key);
  }
  
  getNamespace(element) {
    return this.namespaceByElement.get(element);
  }
  
  removeElement(element) {
    const namespace = this.getNamespace(element);
    if (namespace) {
      const key = JSON.stringify(namespace);
      this.elementsByNamespace.delete(key);
    }
    this.namespaceByElement.delete(element);
  }
  
  getRootElement(element) {
    // Simple implementation: return element if registered, otherwise traverse up
    if (this.namespaceByElement.has(element)) {
      return element;
    }
    
    let current = element;
    while (current && current.parentNode) {
      current = current.parentNode;
      if (current.nodeType === Node.ELEMENT_NODE && this.namespaceByElement.has(current)) {
        return current;
      }
    }
    
    return undefined;
  }
}

function createScope(type, scope) {
  return {type, scope};
}

function makeSimpleIsolateSink(namespace) {
  return function(sink, scope) {
    if (scope === ':root') {
      return sink;
    }
    
    if (sink && typeof sink.pipe === 'function') {
      return sink.pipe(
        map(template => {
          if (template && typeof template === 'object') {
            return {
              ...template,
              _isolate: [...namespace, createScope('sibling', scope)]
            };
          }
          return template;
        })
      );
    }
    
    return sink;
  };
}

test('Simple isolate module should manage element registration', t => {
  const isolateModule = new SimpleIsolateModule();
  const element = document.createElement('div');
  const namespace = [createScope('sibling', '.component')];
  
  isolateModule.insertElement(namespace, element);
  
  const retrievedElement = isolateModule.getElement(namespace);
  t.is(retrievedElement, element);
  
  const retrievedNamespace = isolateModule.getNamespace(element);
  t.deepEqual(retrievedNamespace, namespace);
});

test('Isolate module should handle nested component hierarchies', t => {
  const isolateModule = new SimpleIsolateModule();
  
  // Create parent-child relationship
  const parent = document.createElement('div');
  parent.className = 'parent-component';
  const child = document.createElement('div');
  child.className = 'child-component';
  parent.appendChild(child);
  
  const parentNamespace = [createScope('sibling', '.parent')];
  const childNamespace = [createScope('sibling', '.parent'), createScope('sibling', '.child')];
  
  isolateModule.insertElement(parentNamespace, parent);
  isolateModule.insertElement(childNamespace, child);
  
  // Test element retrieval
  t.is(isolateModule.getElement(parentNamespace), parent);
  t.is(isolateModule.getElement(childNamespace), child);
  
  // Test root element discovery
  t.is(isolateModule.getRootElement(child), child);
  t.is(isolateModule.getRootElement(parent), parent);
});

test('Isolate module should handle conflicting class names in different scopes', t => {
  const isolateModule = new SimpleIsolateModule();
  
  // Create multiple elements with same class but different isolation scopes
  const button1 = document.createElement('button');
  button1.className = 'btn primary';
  const button2 = document.createElement('button');
  button2.className = 'btn primary'; // Same classes as button1
  const button3 = document.createElement('button');
  button3.className = 'btn secondary';
  
  // Different isolated scopes
  const modalScope = [createScope('sibling', '.modal'), createScope('sibling', '.primary-btn')];
  const sidebarScope = [createScope('sibling', '.sidebar'), createScope('sibling', '.primary-btn')];
  const footerScope = [createScope('sibling', '.footer'), createScope('sibling', '.secondary-btn')];
  
  isolateModule.insertElement(modalScope, button1);
  isolateModule.insertElement(sidebarScope, button2);
  isolateModule.insertElement(footerScope, button3);
  
  // All elements should be retrievable by their specific scopes
  t.is(isolateModule.getElement(modalScope), button1);
  t.is(isolateModule.getElement(sidebarScope), button2);
  t.is(isolateModule.getElement(footerScope), button3);
  
  // Verify isolation: elements with same classes have different namespaces
  t.deepEqual(isolateModule.getNamespace(button1), modalScope);
  t.deepEqual(isolateModule.getNamespace(button2), sidebarScope);
  t.notDeepEqual(isolateModule.getNamespace(button1), isolateModule.getNamespace(button2));
});

test('Isolate module should handle dynamic element addition and removal', t => {
  const isolateModule = new SimpleIsolateModule();
  
  // Create container
  const container = document.createElement('ul');
  const containerNamespace = [createScope('sibling', '.todo-list')];
  isolateModule.insertElement(containerNamespace, container);
  
  // Add dynamic items
  const items = [];
  for (let i = 0; i < 3; i++) {
    const item = document.createElement('li');
    item.className = 'todo-item';
    item.textContent = `Item ${i}`;
    
    const itemNamespace = [...containerNamespace, createScope('sibling', `.item-${i}`)];
    isolateModule.insertElement(itemNamespace, item);
    items.push({element: item, namespace: itemNamespace});
    
    container.appendChild(item);
  }
  
  // Verify all items are registered
  items.forEach(({element, namespace}) => {
    t.is(isolateModule.getElement(namespace), element);
  });
  
  // Remove items
  items.forEach(({element}) => {
    isolateModule.removeElement(element);
  });
  
  // Verify items are removed
  items.forEach(({element, namespace}) => {
    t.is(isolateModule.getElement(namespace), undefined);
    t.is(isolateModule.getNamespace(element), undefined);
  });
});

test('Simple isolate sink should apply isolation to RxJS streams', t => {
  const namespace = [createScope('sibling', '.todo-list')];
  const isolateSink = makeSimpleIsolateSink(namespace);
  
  const template = {
    strings: ['<div>', '</div>'],
    values: ['content']
  };
  
  const sink = of(template);
  const isolatedSink = isolateSink(sink, 'todo-item');
  
  t.truthy(isolatedSink);
  t.not(isolatedSink, sink);
  
  // Test that isolation metadata is applied
  let isolatedTemplate;
  isolatedSink.subscribe(template => {
    isolatedTemplate = template;
  });
  
  t.truthy(isolatedTemplate._isolate);
  t.deepEqual(isolatedTemplate._isolate, [
    ...namespace,
    createScope('sibling', 'todo-item')
  ]);
});

test('Isolate sink should handle :root scope specially', t => {
  const namespace = [createScope('sibling', '.component')];
  const isolateSink = makeSimpleIsolateSink(namespace);
  
  const sink = of('template');
  const result = isolateSink(sink, ':root');
  
  t.is(result, sink);
});

test('Complex nested todo app isolation scenario', t => {
  const isolateModule = new SimpleIsolateModule();
  
  // Simulate a complex todo app structure
  const app = document.createElement('div');
  app.className = 'todo-app';
  
  const header = document.createElement('header');
  header.className = 'app-header';
  
  const todoList = document.createElement('ul');
  todoList.className = 'todo-list';
  
  const footer = document.createElement('footer');
  footer.className = 'app-footer';
  
  app.appendChild(header);
  app.appendChild(todoList);
  app.appendChild(footer);
  
  // Create todo items with conflicting class names
  const todoItem1 = document.createElement('li');
  todoItem1.className = 'todo-item active'; // 'active' might conflict with other components
  
  const todoItem2 = document.createElement('li');
  todoItem2.className = 'todo-item completed';
  
  const todoItem3 = document.createElement('li');
  todoItem3.className = 'todo-item active'; // Same class as item1 but different scope
  
  todoList.appendChild(todoItem1);
  todoList.appendChild(todoItem2);
  todoList.appendChild(todoItem3);
  
  // Add interactive elements with potentially conflicting classes
  const addButton = document.createElement('button');
  addButton.className = 'btn primary active'; // 'active' conflicts with todo items
  header.appendChild(addButton);
  
  const clearButton = document.createElement('button');
  clearButton.className = 'btn secondary';
  footer.appendChild(clearButton);
  
  // Create isolated namespaces
  const appNamespace = [createScope('total', 'todo-app')];
  const headerNamespace = [...appNamespace, createScope('sibling', '.header')];
  const listNamespace = [...appNamespace, createScope('sibling', '.todo-list')];
  const footerNamespace = [...appNamespace, createScope('sibling', '.footer')];
  
  const item1Namespace = [...listNamespace, createScope('sibling', '.todo-1')];
  const item2Namespace = [...listNamespace, createScope('sibling', '.todo-2')];
  const item3Namespace = [...listNamespace, createScope('sibling', '.todo-3')];
  
  const addBtnNamespace = [...headerNamespace, createScope('sibling', '.add-btn')];
  const clearBtnNamespace = [...footerNamespace, createScope('sibling', '.clear-btn')];
  
  // Register all elements with their isolated scopes
  isolateModule.insertElement(appNamespace, app);
  isolateModule.insertElement(headerNamespace, header);
  isolateModule.insertElement(listNamespace, todoList);
  isolateModule.insertElement(footerNamespace, footer);
  isolateModule.insertElement(item1Namespace, todoItem1);
  isolateModule.insertElement(item2Namespace, todoItem2);
  isolateModule.insertElement(item3Namespace, todoItem3);
  isolateModule.insertElement(addBtnNamespace, addButton);
  isolateModule.insertElement(clearBtnNamespace, clearButton);
  
  // Test that all elements are properly isolated despite class conflicts
  t.is(isolateModule.getElement(item1Namespace), todoItem1);
  t.is(isolateModule.getElement(item3Namespace), todoItem3);
  t.is(isolateModule.getElement(addBtnNamespace), addButton);
  
  // Verify that elements with conflicting classes have different namespaces
  const item1Ns = isolateModule.getNamespace(todoItem1);
  const item3Ns = isolateModule.getNamespace(todoItem3);
  const addBtnNs = isolateModule.getNamespace(addButton);
  
  t.notDeepEqual(item1Ns, item3Ns); // Both have 'active' class but different scopes
  t.notDeepEqual(item1Ns, addBtnNs); // Both have 'active' class but different scopes
  
  // Test root element discovery in nested structure
  t.is(isolateModule.getRootElement(todoItem1), todoItem1);
  t.is(isolateModule.getRootElement(addButton), addButton);
  t.is(isolateModule.getRootElement(clearButton), clearButton);
});

test('Dynamic component creation with isolation', t => {
  const isolateModule = new SimpleIsolateModule();
  
  // Simulate dynamic component creation (like React keys or Vue.js list rendering)
  const container = document.createElement('div');
  const containerNamespace = [createScope('sibling', '.component-container')];
  isolateModule.insertElement(containerNamespace, container);
  
  // Function to create isolated component
  function createIsolatedComponent(id, content) {
    const element = document.createElement('div');
    element.className = 'dynamic-component';
    element.textContent = content;
    element.dataset.id = id;
    
    const namespace = [...containerNamespace, createScope('sibling', `.component-${id}`)];
    isolateModule.insertElement(namespace, element);
    
    return {element, namespace};
  }
  
  // Create multiple components with same class but different isolation
  const components = [
    createIsolatedComponent('a', 'Component A'),
    createIsolatedComponent('b', 'Component B'),
    createIsolatedComponent('c', 'Component C')
  ];
  
  // Verify each component is properly isolated
  components.forEach(({element, namespace}) => {
    t.is(isolateModule.getElement(namespace), element);
    t.deepEqual(isolateModule.getNamespace(element), namespace);
  });
  
  // Simulate component reordering (common in dynamic lists)
  const reorderedComponents = [components[2], components[0], components[1]];
  
  // Remove all components
  components.forEach(({element}) => {
    isolateModule.removeElement(element);
  });
  
  // Re-add in new order with new isolation scopes
  const newComponents = reorderedComponents.map(({element}, index) => {
    const newNamespace = [...containerNamespace, createScope('sibling', `.reordered-${index}`)];
    isolateModule.insertElement(newNamespace, element);
    return {element, namespace: newNamespace};
  });
  
  // Verify new isolation
  newComponents.forEach(({element, namespace}) => {
    t.is(isolateModule.getElement(namespace), element);
    t.deepEqual(isolateModule.getNamespace(element), namespace);
  });
  
  t.pass('Dynamic component isolation test completed successfully');
});