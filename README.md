# @cycle/lit-dom

A high-performance DOM driver for Cycle.js based on lit-html and RxJS.

## Features

- **Lit-html rendering**: Leverage lit-html's efficient template rendering with native DOM updates
- **RxJS integration**: Built specifically for RxJS observables with optimized operators
- **Isolation support**: Full support for Cycle.js isolation patterns for component encapsulation  
- **Performance optimized**: Includes memoization, debouncing, and batching utilities
- **Type-safe**: Written in TypeScript with comprehensive type definitions
- **Small bundle size**: Efficient implementation focused on performance

## Installation

```bash
npm install @cycle/lit-dom lit-html rxjs
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- RxJS >= 7.0.0
- lit-html >= 3.0.0

## Basic Usage

```typescript
import {run} from '@cycle/run';
import {makeLitDOMDriver, html} from '@cycle/lit-dom';
import {map} from 'rxjs/operators';

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

## Performance Features

### Template Memoization

```typescript
import {memoizeTemplate, memo} from '@cycle/lit-dom';

// Memoize expensive template computations
const expensiveTemplate = memoizeTemplate((data: ComplexData) => {
  return html`<div>${processComplexData(data)}</div>`;
});

// Memoize entire components
const MemoizedComponent = memo((props: {items: Item[]}) => {
  return html`
    <ul>
      ${props.items.map(item => html`<li>${item.name}</li>`)}
    </ul>
  `;
});
```

### Stream Optimization

```typescript
import {debounceTemplate, throttleTemplate, distinctTemplates, animationFrame} from '@cycle/lit-dom';

const optimizedTemplate$ = template$.pipe(
  distinctTemplates(), // Only emit when template actually changes
  debounceTemplate(16), // Debounce rapid changes
  animationFrame() // Sync with animation frames
);
```

## Isolation

The driver fully supports Cycle.js isolation for component encapsulation:

```typescript
import {isolate} from '@cycle/isolate';

function Counter(sources) {
  // Component implementation
  return {DOM: vdom$};
}

function main(sources) {
  const counter1 = isolate(Counter, 'counter1')(sources);
  const counter2 = isolate(Counter, 'counter2')(sources);
  
  const vdom$ = combineLatest([counter1.DOM, counter2.DOM]).pipe(
    map(([vdom1, vdom2]) => html`
      <div>
        <div class="counter1">${vdom1}</div>
        <div class="counter2">${vdom2}</div>
      </div>
    `)
  );
  
  return {DOM: vdom$};
}
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

### Performance Utilities

- `debounceTemplate(time?: number)` - Debounce template updates
- `throttleTemplate(time?: number)` - Throttle template updates  
- `distinctTemplates()` - Only emit distinct templates
- `animationFrame()` - Sync with requestAnimationFrame
- `batchTemplates(windowTime?: number)` - Batch template updates
- `memoizeTemplate(fn, keyFn?)` - Memoize template functions
- `memo(component, areEqual?)` - Memoize components
- `shallowEqual(a, b)` - Shallow equality comparison

## Differences from @cycle/dom

1. **Rendering Engine**: Uses lit-html instead of Snabbdom for more efficient updates
2. **Stream Library**: Built specifically for RxJS instead of xstream
3. **Performance**: Includes built-in performance optimization utilities
4. **Bundle Size**: Smaller footprint due to focused implementation
5. **Type Safety**: Enhanced TypeScript support throughout

## License

MIT