import {run} from '@cycle/run';
import {
  makeLitDOMDriver,
  html,
  memo,
  debounceTemplate,
  distinctTemplates,
  memoizeTemplate,
} from '../lib/es6/index.js';
import {map, scan, startWith} from 'rxjs/operators';
import {merge, interval, combineLatest} from 'rxjs';

// Memoized expensive component
const ExpensiveList = memo(({items, title}) => {
  console.log(`Rendering ${title} with ${items.length} items`);
  return html`
    <div class="performance-demo">
      <h3>${title}</h3>
      <ul>
        ${items.map(
          item =>
            html`
              <li>${item.name} - ${item.value}</li>
            `
        )}
      </ul>
    </div>
  `;
});

// Memoized template function
const counterTemplate = memoizeTemplate((count, label) => {
  return html`
    <div class="counter">
      <h2>${label}: ${count}</h2>
      <button class="increment">+</button>
      <button class="decrement">-</button>
      <button class="reset">Reset</button>
    </div>
  `;
});

function main(sources) {
  // Counter logic
  const increment$ = sources.DOM.select('.increment').events('click');
  const decrement$ = sources.DOM.select('.decrement').events('click');
  const reset$ = sources.DOM.select('.reset').events('click');

  // Debug: let's see if events are being captured
  increment$.subscribe(e => console.log('Increment clicked!', e));
  decrement$.subscribe(e => console.log('Decrement clicked!', e));
  reset$.subscribe(e => console.log('Reset clicked!', e));
  
  // Let's also debug the DOM selections
  console.log('DOM source:', sources.DOM);
  console.log('Increment elements:', sources.DOM.select('.increment'));
  console.log('Decrement elements:', sources.DOM.select('.decrement'));
  console.log('Reset elements:', sources.DOM.select('.reset'));

  const count$ = merge(
    increment$.pipe(map(() => 1)),
    decrement$.pipe(map(() => -1)),
    reset$.pipe(map(() => 0))
  ).pipe(
    scan((acc, delta) => (delta === 0 ? 0 : acc + delta), 0),
    startWith(0)
  );

  // Performance demo - rapidly changing data
  const rapidData$ = interval(100).pipe(
    map(i => ({
      items: Array.from({length: 10}, (_, j) => ({
        name: `Item ${j}`,
        value: Math.floor(Math.random() * 1000),
      })),
      title: `Fast Updates (${i})`,
    }))
  );

  // Slow data that doesn't change often
  const slowData$ = interval(2000).pipe(
    map(i => ({
      items: Array.from({length: 5}, (_, j) => ({
        name: `Stable Item ${j}`,
        value: j * 100,
      })),
      title: `Slow Updates (${Math.floor(i / 2)})`,
    })),
    startWith({
      items: Array.from({length: 5}, (_, j) => ({
        name: `Stable Item ${j}`,
        value: j * 100,
      })),
      title: 'Slow Updates (0)',
    })
  );

  const vdom$ = combineLatest([count$, rapidData$, slowData$]).pipe(
    map(
      ([count, rapidData, slowData]) => html`
        <div>
          <h1>Cycle.js Lit-HTML Driver Demo</h1>

          ${counterTemplate(count, 'Memoized Counter')}

          <div style="display: flex; gap: 20px;">
            <div style="flex: 1;">
              <h2>Performance Demo</h2>
              <p>
                The list below updates every 100ms but uses memoization to avoid
                unnecessary re-renders when data is the same.
              </p>
              ${ExpensiveList(rapidData)}
            </div>

            <div style="flex: 1;">
              <p>
                This list updates every 2 seconds and demonstrates memoization
                working across different update frequencies.
              </p>
              ${ExpensiveList(slowData)}
            </div>
          </div>

          <div class="performance-demo">
            <h3>Features Demonstrated</h3>
            <ul>
              <li>Template memoization with <code>memoizeTemplate()</code></li>
              <li>Component memoization with <code>memo()</code></li>
              <li>Efficient event handling with proper delegation</li>
              <li>RxJS stream composition</li>
              <li>Lit-html template rendering</li>
            </ul>
          </div>
        </div>
      `
    ),
    // Apply performance optimizations
    distinctTemplates(),
    debounceTemplate(16)
  );

  return {
    DOM: vdom$,
  };
}

const drivers = {
  DOM: makeLitDOMDriver('#app'),
};

run(main, drivers);
