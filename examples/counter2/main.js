import {run} from '@cycle/run';
import {makeLitDOMDriver, html} from '../lib/es6/index.js';
import {map, scan, startWith} from 'rxjs/operators';
import {merge} from 'rxjs';

// Memoized template function
const counterTemplate = (count, label) => {
  return html`
    <div class="counter">
      <h2>${label}: ${count}</h2>
      <button class="increment">+</button>
      <button class="decrement">-</button>
      <button class="reset">Reset</button>
    </div>
  `;
};

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

  const vdom$ = count$.pipe(
    map(
      count => html`
        <div>
          <h1>Cycle.js Lit-HTML Driver Demo</h1>
          ${counterTemplate(count, 'Memoized Counter')}
        </div>
      `
    )
  );

  return {
    DOM: vdom$,
  };
}

const drivers = {
  DOM: makeLitDOMDriver('#app'),
};

run(main, drivers);
