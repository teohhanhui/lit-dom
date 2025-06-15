# @cycle/lit-dom

A Cycle.js DOM driver powered by [lit-html](https://lit.dev/docs/libraries/lit-html/) for modern, efficient template rendering with full component isolation support.

## Overview

`@cycle/lit-dom` provides a lit-html-based alternative to the native Cycle.js DOM driver (`@cycle/dom`). It leverages lit-html's efficient template literals and rendering engine while maintaining full compatibility with Cycle.js patterns including `@cycle/isolate` for component isolation.

## Architecture Comparison

### Native DOM Driver vs lit-dom

| Aspect | Native DOM (`@cycle/dom`) | lit-dom (`@cycle/lit-dom`) |
|--------|---------------------------|----------------------------|
| **Template Engine** | Snabbdom (Virtual DOM) | lit-html (Template Literals) |
| **Template Syntax** | JSX or hyperscript helpers | Tagged template literals |
| **Bundle Size** | Larger (includes Snabbdom) | Smaller (lit-html is lightweight) |
| **Performance** | Virtual DOM diffing | Efficient template updating |
| **Isolation Support** | ✅ Full support | ✅ Full support (our implementation) |
| **Ecosystem** | Mature, extensive | Growing, modern |

### Key Differences

1. **Template Syntax**:
   ```javascript
   // Native DOM (hyperscript)
   div('.my-class', [
     h1('Hello'),
     button({attrs: {type: 'button'}}, 'Click me')
   ])

   // lit-dom (template literals)
   html`
     <div class="my-class">
       <h1>Hello</h1>
       <button type="button">Click me</button>
     </div>
   `
   ```

2. **Rendering Engine**:
   - **Native DOM**: Uses Snabbdom's virtual DOM with diffing algorithms
   - **lit-dom**: Uses lit-html's efficient template literal parsing and targeted updates

3. **Bundle Impact**:
   - **Native DOM**: Includes Snabbdom (~15KB gzipped)
   - **lit-dom**: Uses lit-html (~8KB gzipped)

## Isolation System Implementation

### Overview

The isolation system in lit-dom ensures that components can be safely composed without interfering with each other. Each isolated component operates within its own "namespace" that scopes DOM selections and event handling.

### Source Isolation (`isolateSource`)

When a component is isolated, the DOM source is scoped to only see elements within that component's namespace:

```javascript
// Creates a new DOM source with extended namespace
isolateSource(source: LitDOMSource, scope: string): LitDOMSource {
  return new LitDOMSource(
    source._rootElement$,
    source._sanitation$,
    source._namespace.concat(getScopeObj(scope)), // Extended namespace
    source._isolateModule,
    source._eventDelegator,
    source._name
  );
}
```

**Key Features**:
- **Namespace Extension**: Each isolation scope adds to the namespace chain
- **Element Finding**: Uses `ElementFinder` to locate elements within the namespace
- **Event Filtering**: Only receives events from elements in the component's scope

### Sink Isolation (`isolateSink`)

The sink isolation processes lit-html templates to add isolation metadata:

```javascript
// Processes templates to add _isolate metadata
isolateSink(sink: Stream<LitTemplate>, scope: string): Stream<LitTemplate>
```

**Process**:
1. **Template Detection**: Identifies lit-html templates by checking for `_$litType$` property
2. **Metadata Addition**: Adds `_isolate` array with namespace information
3. **Recursive Processing**: Handles nested templates and template arrays

**Example**:
```javascript
// Input template
{
  _$litType$: 1,
  strings: ['<div class="item">', '</div>'],
  values: ['Hello']
}

// Output with isolation
{
  _$litType$: 1,
  strings: ['<div class="item">', '</div>'],
  values: ['Hello'],
  _isolate: [{type: 'sibling', scope: 'my-component'}] // Added isolation metadata
}
```

### Namespace Management

Namespaces in lit-dom are hierarchical arrays of scope objects:

```javascript
type Scope = {
  type: 'sibling' | 'total' | 'selector';
  scope: string;
};

// Example namespace for nested isolation
[
  {type: 'sibling', scope: 'app'},
  {type: 'sibling', scope: 'todo-list'}, 
  {type: 'sibling', scope: 'todo-item-1'}
]
```

**Namespace Types**:
- **`sibling`**: Isolates from sibling components at the same level
- **`total`**: Complete isolation (most common)
- **`selector`**: CSS selector-based scoping

### Element Registration Process

Unlike the native DOM driver (which hooks into Snabbdom's lifecycle), lit-dom uses a post-render registration approach:

#### 1. Template Processing
```javascript
// During isolation, templates get _isolate metadata
template._isolate = [{type: 'sibling', scope: 'todo-1'}]
```

#### 2. Post-Render Registration
```javascript
// After lit-html renders, scan for isolated elements
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
  
  // Find component elements (e.g., TodoItem components)
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

// Helper function to collect isolated template metadata
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
```

#### 3. Event Delegation
```javascript
// EventDelegator routes events based on registered namespaces
onEvent(eventType, event) {
  const namespace = isolateModule.getNamespace(event.target);
  if (namespace) {
    routeEventToComponents(event, namespace);
  }
}
```

### Dynamic Component Support

lit-dom supports dynamic component creation through:

1. **Stream-based Component Creation**:
   ```javascript
   const components$ = items$.pipe(
     map(items => items.map(item => 
       isolate(TodoItem, `todo-${item.id}`)({...sources, item$: of(item)})
     ))
   );
   ```

2. **Automatic Registration**: New components are automatically registered when templates re-render

3. **Cleanup**: Removed components are cleaned up through `isolateModule.processRemovals()`

## Pros and Cons

### Advantages of lit-dom

**🎯 Modern Template Syntax**
- Familiar HTML-like syntax with JavaScript expressions
- Better IDE support with syntax highlighting
- More readable for designers and frontend developers

**📦 Smaller Bundle Size**
- lit-html is more lightweight than Snabbdom
- Better for applications where bundle size matters
- Faster initial loading

**⚡ Performance Benefits**
- lit-html's template literal parsing is very efficient
- Targeted DOM updates without full virtual DOM diffing
- Better performance for frequent updates

**🔧 Advanced Template Features**
- Built-in directives (`repeat`, `guard`, `ifDefined`, etc.)
- Server-side rendering support
- Progressive enhancement friendly

**🌐 Ecosystem Integration**
- Works well with Lit components
- Compatible with web components
- Modern web standards alignment

### Disadvantages of lit-dom

**🆕 Newer Technology**
- Less battle-tested than the native DOM driver
- Smaller community and ecosystem
- Fewer third-party tools and extensions

**🐛 Different Debugging Experience**
- Template errors show differently than JSX/hyperscript
- Browser dev tools integration differs
- Learning curve for developers familiar with virtual DOM

**📚 Learning Curve**
- lit-html specific concepts and patterns
- Different mental model from virtual DOM
- Template literal constraints and gotchas

**🔄 Migration Complexity**
- Converting from native DOM driver requires template rewrites
- Different component patterns and best practices
- Potential integration issues with existing Cycle.js libraries

## Usage Examples

### Basic Component

```javascript
import {html} from '@cycle/lit-dom';

function Counter(sources) {
  const increment$ = sources.DOM.select('.increment').events('click');
  const decrement$ = sources.DOM.select('.decrement').events('click');
  
  const count$ = merge(
    increment$.pipe(map(() => +1)),
    decrement$.pipe(map(() => -1))
  ).pipe(
    startWith(0),
    scan((count, delta) => count + delta)
  );
  
  const vdom$ = count$.pipe(
    map(count => html`
      <div class="counter">
        <button class="decrement">-</button>
        <span class="count">${count}</span>
        <button class="increment">+</button>
      </div>
    `)
  );
  
  return {
    DOM: vdom$
  };
}
```

### Isolated Components

```javascript
import isolate from '@cycle/isolate';

function TodoItem(sources) {
  const props$ = sources.props$ || of({text: '', completed: false});
  
  const toggle$ = sources.DOM.select('.toggle').events('click');
  const remove$ = sources.DOM.select('.remove').events('click');
  
  const vdom$ = props$.pipe(
    map(props => html`
      <li class="todo-item ${props.completed ? 'completed' : ''}">
        <input type="checkbox" class="toggle" .checked=${props.completed}>
        <span class="text">${props.text}</span>
        <button class="remove">×</button>
      </li>
    `)
  );
  
  return {
    DOM: vdom$,
    toggle$: toggle$.pipe(mapTo(props.id)),
    remove$: remove$.pipe(mapTo(props.id))
  };
}

// Usage with isolation
function TodoList(sources) {
  const items$ = sources.items$ || of([]);
  
  const isolatedItems$ = items$.pipe(
    map(items => items.map(item => 
      isolate(TodoItem, `todo-${item.id}`)({
        ...sources,
        props$: of(item)
      })
    ))
  );
  
  // Collect sinks from isolated components
  const itemsDOM$ = isolatedItems$.pipe(
    map(items => items.map(item => item.DOM)),
    map(doms => doms.length > 0 ? combineLatest(doms) : of([])),
    switchAll()
  );
  
  const vdom$ = itemsDOM$.pipe(
    map(itemTemplates => html`
      <ul class="todo-list">
        ${itemTemplates}
      </ul>
    `)
  );
  
  return {
    DOM: vdom$
  };
}
```

### Dynamic Component Creation

```javascript
function App(sources) {
  const addItem$ = sources.DOM.select('.add').events('click');
  
  const items$ = addItem$.pipe(
    scan((items, _) => [...items, {
      id: Date.now(),
      text: `Item ${items.length + 1}`,
      completed: false
    }], [])
  );
  
  // Components are created dynamically as items change
  const dynamicComponents$ = items$.pipe(
    map(items => items.map(item => 
      isolate(TodoItem, `dynamic-${item.id}`)({
        ...sources,
        props$: of(item)
      })
    ))
  );
  
  // Handle component events
  const componentActions$ = dynamicComponents$.pipe(
    map(components => merge(
      ...components.map(c => c.remove$.pipe(map(id => ({type: 'REMOVE', id})))),
      ...components.map(c => c.toggle$.pipe(map(id => ({type: 'TOGGLE', id}))))
    )),
    switchAll()
  );
  
  return {
    DOM: vdom$,
    actions: componentActions$
  };
}
```

## Installation

```bash
npm install @cycle/lit-dom lit-html rxjs
```

## Basic Usage

```typescript
import {run} from '@cycle/run';
import {makeLitDOMDriver, html} from '@cycle/lit-dom';
import {map, scan, startWith} from 'rxjs/operators';

function main(sources) {
  const click$ = sources.DOM.select('.button').events('click');
  
  const count$ = click$.pipe(
    scan(count => count + 1, 0),
    startWith(0)
  );

  const vdom$ = count$.pipe(
    map(count => html`
      <div>
        <h1>Count: ${count}</h1>
        <button class="button">Click me</button>
      </div>
    `)
  );

  return {
    DOM: vdom$
  };
}

const drivers = {
  DOM: makeLitDOMDriver('#app')
};

run(main, drivers);
```

## Best Practices

### 1. Component Design
- Keep components pure and functional
- Use `isolate()` for reusable components
- Separate concerns: view, events, and state logic

### 2. Template Optimization
- Use template literal expressions efficiently
- Leverage lit-html directives for common patterns
- Avoid complex computations in templates

### 3. Performance Considerations
- Use `shareReplay(1)` for expensive computed streams
- Consider component granularity for update efficiency
- Profile template rendering in performance-critical applications

### 4. Debugging Tips
- Use browser dev tools to inspect template rendering
- Add debugging operators (`tap`, `do`) to trace stream flow
- Test isolated components independently

## Migration from Native DOM Driver

### 1. Template Conversion
```javascript
// Before (hyperscript)
div('.container', [
  h1('Title'),
  button({class: 'btn'}, 'Click')
])

// After (lit-html)
html`
  <div class="container">
    <h1>Title</h1>
    <button class="btn">Click</button>
  </div>
`
```

### 2. Event Handling
```javascript
// Before
sources.DOM.select('.btn').events('click')

// After (same)
sources.DOM.select('.btn').events('click')
```

### 3. Property Binding
```javascript
// Before
input({props: {value: text, checked: isChecked}})

// After
html`<input .value=${text} .checked=${isChecked}>`
```

## API Reference

### makeLitDOMDriver(container, options?)

Creates a lit-html DOM driver.

**Parameters:**
- `container: string | Element | DocumentFragment` - The DOM container
- `options?: LitDOMDriverOptions` - Optional configuration

**Returns:** `(template$: Observable<LitTemplate>) => LitDOMSource`

### LitDOMSource

The DOM source provides methods for querying the DOM and listening to events.

**Methods:**
- `select(selector: string): LitDOMSource` - Select elements by CSS selector
- `events(eventType: string, options?: EventsFnOptions): Observable<Event>` - Listen to events
- `elements(): Observable<Element[]>` - Get selected elements
- `element(): Observable<Element>` - Get first selected element

### Development Setup

```bash
yarn install
yarn build
yarn test
```

### Running Examples

```bash
cd examples/todo-isolate
yarn install
yarn dev
```

## License

MIT
