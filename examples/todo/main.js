import {run} from '@cycle/run';
import isolate from '@cycle/isolate';
import {makeLitDOMDriver, html} from '../lib/es6/index.js';
import {map, scan, startWith, filter, shareReplay} from 'rxjs/operators';
import {merge, combineLatest, of} from 'rxjs';

// Simple TodoItem component for isolation testing
function TodoItem(sources) {
  const props$ =
    sources.props$ || of({todo: {id: 0, text: '', completed: false}});

  const toggle$ = sources.DOM.select('.todo-checkbox').events('click');
  const remove$ = sources.DOM.select('.todo-remove').events('click');

  const vdom$ = props$.pipe(
    map(props => {
      const {todo} = props;
      return html`
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

  // Create isolated TodoItem components
  const todo1 = isolate(
    TodoItem,
    'todo-1'
  )({
    ...sources,
    props$: of({todo: {id: 1, text: 'Isolated Todo 1', completed: false}}),
  });

  const todo2 = isolate(
    TodoItem,
    'todo-2'
  )({
    ...sources,
    props$: of({todo: {id: 2, text: 'Isolated Todo 2', completed: true}}),
  });

  const todo3 = isolate(
    TodoItem,
    'todo-3'
  )({
    ...sources,
    props$: of({todo: {id: 3, text: 'Isolated Todo 3', completed: false}}),
  });

  // Collect events from isolated components
  const isolatedToggles$ = merge(
    todo1.toggle$.pipe(map(() => 1)),
    todo2.toggle$.pipe(map(() => 2)),
    todo3.toggle$.pipe(map(() => 3))
  );

  const isolatedRemoves$ = merge(
    todo1.remove$.pipe(map(() => 1)),
    todo2.remove$.pipe(map(() => 2)),
    todo3.remove$.pipe(map(() => 3))
  );

  // Simple state management
  const toggleTodoAction$ = isolatedToggles$.pipe(
    map(id => ({type: 'TOGGLE', payload: id}))
  );

  const removeTodoAction$ = isolatedRemoves$.pipe(
    map(id => ({type: 'REMOVE', payload: id}))
  );

  const clearCompletedAction$ = clearCompleted$.pipe(
    map(() => ({type: 'CLEAR_COMPLETED'}))
  );

  const allActions$ = merge(
    of({type: 'INIT', payload: initialTodos}),
    addTodo$,
    toggleTodoAction$,
    removeTodoAction$,
    clearCompletedAction$
  );

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

  // Stats
  const stats$ = todos$.pipe(
    map(todos => ({
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      remaining: todos.filter(t => !t.completed).length,
    }))
  );

  // Clear input
  const inputValue$ = addTodo$.pipe(
    map(() => ''),
    startWith('')
  );

  // Render
  const vdom$ = combineLatest([
    filteredTodos$,
    filter$,
    stats$,
    inputValue$,
    todo1.DOM,
    todo2.DOM,
    todo3.DOM,
  ]).pipe(
    map(
      ([
        todos,
        currentFilter,
        stats,
        inputValue,
        todo1Dom,
        todo2Dom,
        todo3Dom,
      ]) => html`
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

            <div class="isolation-demo-section">
              <h4>🔒 Isolated Components Demo</h4>
              <p>
                These three todo items are isolated components, each with their
                own scope:
              </p>
              <ul class="todo-list">
                ${todo1Dom} ${todo2Dom} ${todo3Dom}
              </ul>
            </div>

            <div class="regular-todos-section">
              <h4>📋 Regular Todo List</h4>
              <ul class="todo-list">
                ${todos.map(
                  todo => html`
                    <li
                      class="todo-item ${todo.completed ? 'completed' : ''}"
                      data-todo-id="${todo.id}"
                    >
                      <input
                        type="checkbox"
                        class="todo-checkbox"
                        .checked=${todo.completed}
                      />
                      <span class="todo-text">${todo.text}</span>
                      <button class="todo-remove">Remove</button>
                    </li>
                  `
                )}
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
  };
}

const drivers = {
  DOM: makeLitDOMDriver('#app'),
};

run(main, drivers);
