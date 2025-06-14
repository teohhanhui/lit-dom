import {run} from '@cycle/run';
import isolate from '@cycle/isolate';
import {makeLitDOMDriver, html} from '../lib/es6/index.js';
import {map, scan, startWith, filter, shareReplay} from 'rxjs/operators';
import {
  tap,
  defer,
  merge,
  combineLatest,
  of,
  switchAll,
  withLatestFrom,
  from,
} from 'rxjs';

function TodoItem(sources) {
  console.log('TodoItem created with sources:', {
    DOM: sources.DOM,
    namespace: sources.DOM ? sources.DOM.namespace : 'no DOM',
    isolateModule: sources.DOM ? !!sources.DOM._isolateModule : 'no isolateModule',
    isolateSink: sources.DOM ? typeof sources.DOM.isolateSink : 'no isolateSink'
  });

  // Patch isolateSink to debug
  if (sources.DOM && sources.DOM.isolateSink) {
    const originalIsolateSink = sources.DOM.isolateSink;
    sources.DOM.isolateSink = function(sink, scope) {
      console.log('TodoItem isolateSink called with:', {sink, scope});
      const result = originalIsolateSink.call(this, sink, scope);
      console.log('TodoItem isolateSink result:', result);
      return result;
    };
  }

  const props$ =
    sources.todo$ || of({todo: {id: 0, text: '', completed: false}});

  const toggle$ = sources.DOM.select('.todo-checkbox')
    .events('click')
    .pipe(
      tap((e) => {
        console.log('TodoItem toggle clicked, target:', e.target);
        console.log('TodoItem toggle DOM source namespace:', sources.DOM.namespace);
        console.log('TodoItem toggle IsolateModule getNamespace result:', sources.DOM._isolateModule.getNamespace(e.target));
      }),
      withLatestFrom(sources.todo$),
      map(([e, todo]) => {
        console.log('TodoItem toggle mapping:', todo);
        return todo.todo.id;
      }),
      tap(id => console.log('TodoItem toggle id:', id))
    );

  const removeSelector = sources.DOM.select('.todo-remove');
  console.log('TodoItem remove selector created:', {
    selector: removeSelector,
    namespace: removeSelector.namespace
  });
  
  // Test if elements can be found
  removeSelector.elements().subscribe(elements => 
    console.log('TodoItem found remove elements:', elements.length, elements)
  );

  const remove$ = removeSelector
    .events('click')
    .pipe(
      tap((e) => {
        console.log('TodoItem remove clicked, target:', e.target);
        console.log('DOM source namespace:', sources.DOM.namespace);
        console.log('IsolateModule getNamespace result:', sources.DOM._isolateModule.getNamespace(e.target));
      }),
      withLatestFrom(sources.todo$),
      map(([e, todo]) => {
        console.log('TodoItem remove mapping:', todo);
        return todo.todo.id;
      }),
      tap(id => console.log('TodoItem remove id:', id))
    );

  console.log('TodoItem streams created, subscribing to test...');
  remove$.subscribe(x => console.log('remove$ emitted:', x));

  const vdom$ = props$.pipe(
    map(props => {
      const {todo} = props;
      const template = html`
        <li class="todo-item ${todo.completed ? 'completed' : ''}">
          <input
            type="checkbox"
            class="todo-checkbox"
            .checked=${todo.completed}
          />
          <span class="todo-text">${todo.text}</span>
          <button class="todo-remove">Remove</button>
        </li>
      `;
      console.log('TodoItem template created:', template, '_isolate' in template ? template._isolate : 'no _isolate');
      return template;
    })
  );

  return {
    DOM: vdom$,
    toggle$,
    remove$,
  };
}

// Main application with isolated components
function main(sources) {
  const addInput$ = sources.DOM.select('.todo-input')
    .events('keydown')
    .pipe(filter(e => e.key === 'Enter' && e.target.value.trim()));

  const filterAll$ = sources.DOM.select('.filter-all')
    .events('click')
    .pipe(map(() => 'all'));
  const filterActive$ = sources.DOM.select('.filter-active')
    .events('click')
    .pipe(map(() => 'active'));
  const filterCompleted$ = sources.DOM.select('.filter-completed')
    .events('click')
    .pipe(map(() => 'completed'));
  const clearCompleted$ = sources.DOM.select('.clear-completed').events(
    'click'
  );

  const filter$ = merge(filterAll$, filterActive$, filterCompleted$).pipe(
    startWith('all')
  );

  const initialTodos = [
    {id: 1, text: 'Learn Cycle.js', completed: false},
    {id: 2, text: 'Build awesome apps', completed: false},
    {id: 3, text: 'Use lit-html templates', completed: true},
    {id: 4, text: 'Test component isolation', completed: false},
  ];

  // Actions
  const addTodo$ = addInput$.pipe(
    map(e => ({
      type: 'ADD',
      payload: {
        id: Date.now(),
        text: e.target.value.trim(),
        completed: false,
      },
    }))
  );
  // Simple state management

  const clearCompletedAction$ = clearCompleted$.pipe(
    map(() => ({type: 'CLEAR_COMPLETED'}))
  );

  // Use defer to break circular dependency
  const componentActions$ = defer(() => {
    console.log('defer evaluating component actions');
    return merge(
      componentsToggle$.pipe(tap(a => console.log('toggle action:', a))),
      componentsRemove$.pipe(tap(a => console.log('remove action:', a)))
    );
  });

  const allActions$ = merge(
    of({type: 'INIT', payload: initialTodos}),
    addTodo$,
    clearCompletedAction$,
    componentActions$
  ).pipe(tap(action => console.log('all actions:', action)));

  // Stats

  const todos$ = allActions$.pipe(
    scan((todos, action) => {
      switch (action.type) {
        case 'INIT':
          return action.payload;
        case 'ADD':
          return [...todos, action.payload];
        case 'TOGGLE':
          return todos.map(todo =>
            todo.id === action.payload
              ? {...todo, completed: !todo.completed}
              : todo
          );
        case 'REMOVE':
          return todos.filter(todo => todo.id !== action.payload);
        case 'CLEAR_COMPLETED':
          return todos.filter(todo => !todo.completed);
        default:
          return todos;
      }
    }, initialTodos),
    shareReplay(1)
  );
  const stats$ = todos$.pipe(
    map(todos => ({
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      remaining: todos.filter(t => !t.completed).length,
    }))
  );
  // Filter todos
  const filteredTodos$ = combineLatest([todos$, filter$]).pipe(
    map(([todos, filter]) => {
      switch (filter) {
        case 'active':
          return todos.filter(todo => !todo.completed);
        case 'completed':
          return todos.filter(todo => todo.completed);
        default:
          return todos;
      }
    })
  );

  const isolatedComponents$ = filteredTodos$.pipe(
    map(todos =>
      todos.map((todo, index) => {
        console.log('Creating isolated component for todo:', todo.id);
        const IsolatedTodoItem = isolate(TodoItem, `todo-${todo.id}`);
        const componentSinks = IsolatedTodoItem({...sources, todo$: of({todo})});
        console.log('Isolated component sinks:', componentSinks);
        return componentSinks;
      })
    ),
    shareReplay(1)
  );

  const componentsToggle$ = isolatedComponents$.pipe(
    map(components => components.map(c => c.toggle$)),
    map(toggles => (toggles.length > 0 ? merge(...toggles) : of())),
    switchAll(),
    tap(todoId => console.log('toggle event', todoId)),
    map(todoId => ({type: 'TOGGLE', payload: todoId})),
    tap(action => console.log('toggle action:', action)),
    shareReplay(1)
  );
  // Clear input
  const inputValue$ = addTodo$.pipe(
    map(() => ''),
    startWith('')
  );

  const componentsDOMs$ = isolatedComponents$.pipe(
    map(components => {
      console.log('Components:', components.length);
      return components.map(c => c.DOM);
    }),
    map(doms => {
      console.log('DOM streams:', doms.length, doms);
      if (doms.length > 0) {
        // Need to convert xstreams back to RxJS for combineLatest
        const rxjsDoms = doms.map(d => from(d));
        return combineLatest(rxjsDoms);
      }
      return of([]);
    }),
    switchAll(),
    tap(templates => {
      console.log('Combined templates:', templates);
      templates.forEach((t, i) => console.log(`Template ${i}:`, t, '_isolate' in t ? t._isolate : 'no _isolate'));
    })
  );

  const componentsRemove$ = isolatedComponents$.pipe(
    map(components => components.map(c => c.remove$)),
    map(removes => (removes.length > 0 ? merge(...removes) : of())),
    switchAll(),
    tap(e => {
      console.log('remove event', e);
    }),
    map(todoId => ({type: 'REMOVE', payload: todoId})),
    shareReplay(1)
  );

  // Render
  const vdom$ = combineLatest([
    componentsDOMs$,
    filter$,
    stats$,
    inputValue$,
  ]).pipe(
    map(
      ([todoComponents, currentFilter, stats, inputValue]) => html`
        <div class="todo-app">
          <h1>📝 Cycle.js TODO List with Isolation</h1>
          <p style="text-align: center; color: #666; margin-bottom: 20px;">
            Built with lit-html driver and @cycle/isolate for component
            isolation
          </p>

          <input
            type="text"
            class="todo-input"
            placeholder="What needs to be done? (Press Enter to add)"
            .value=${inputValue}
          />

          <div class="todo-list-container">
            <div class="filter-buttons">
              <button
                class="filter-button filter-all ${currentFilter === 'all'
                  ? 'active'
                  : ''}"
              >
                All (${stats.total})
              </button>
              <button
                class="filter-button filter-active ${currentFilter === 'active'
                  ? 'active'
                  : ''}"
              >
                Active (${stats.remaining})
              </button>
              <button
                class="filter-button filter-completed ${currentFilter ===
                'completed'
                  ? 'active'
                  : ''}"
              >
                Completed (${stats.completed})
              </button>
            </div>

            <div class="regular-todos-section">
              <h4>📋 Regular Todo List</h4>
              <ul class="todo-list">
                ${todoComponents.map((template, index) => html`<div data-component="${index}">${template}</div>`)}
              </ul>
            </div>

            <div class="todo-stats">
              <p>
                ${stats.remaining} of ${stats.total} tasks remaining
              </p>
              ${stats.completed > 0
                ? html`
                    <button class="clear-completed">Clear Completed</button>
                  `
                : ''}
            </div>
          </div>

          <div class="isolation-demo">
            <h3>🔒 Component Isolation Demo</h3>
            <p>
              This example demonstrates component isolation using @cycle/isolate
              with the lit-dom driver.
            </p>
            <p><strong>Isolation features demonstrated:</strong></p>
            <ul>
              <li>
                <strong>Scoped components:</strong> The first three todos are
                isolated with scopes: todo-1, todo-2, todo-3
              </li>
              <li>
                <strong>Event isolation:</strong> Component events don't
                conflict with each other
              </li>
              <li>
                <strong>DOM isolation:</strong> Each component only sees its own
                DOM subtree
              </li>
              <li>
                <strong>Reusable components:</strong> Same TodoItem component
                used 3 times safely
              </li>
            </ul>
            <p><strong>Compare:</strong></p>
            <ul>
              <li>
                <strong>Isolated todos:</strong> First section - each has its
                own scope and event handling
              </li>
              <li>
                <strong>Regular todos:</strong> Second section - uses
                traditional event delegation
              </li>
            </ul>
            <p>
              <strong>Try this:</strong> Open browser dev tools, inspect the
              isolated todo elements, and notice the isolation-specific CSS
              classes!
            </p>
          </div>
        </div>
      `
    )
  );

  return {
    DOM: vdom$,
    // Make sure component actions are subscribed to by including them as sinks
    componentActions: componentActions$,
  };
}

const drivers = {
  DOM: makeLitDOMDriver('#app'),
};

run(main, drivers);
