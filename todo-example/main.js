import {run} from '@cycle/run';
import {makeLitDOMDriver, html} from '../lib/es6/index.js';
import {map, scan, startWith, filter, shareReplay} from 'rxjs/operators';
import {merge, combineLatest} from 'rxjs';

// Main application
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

  // Todo item events using data attributes
  const toggleTodo$ = sources.DOM.select('.todo-checkbox')
    .events('click')
    .pipe(
      map(e => parseInt(e.target.closest('[data-todo-id]').dataset.todoId))
    );

  const removeTodo$ = sources.DOM.select('.todo-remove')
    .events('click')
    .pipe(
      map(e => parseInt(e.target.closest('[data-todo-id]').dataset.todoId))
    );

  const filter$ = merge(filterAll$, filterActive$, filterCompleted$).pipe(
    startWith('all')
  );

  const initialTodos = [
    {id: 1, text: 'Learn Cycle.js', completed: false},
    {id: 2, text: 'Build awesome apps', completed: false},
    {id: 3, text: 'Use lit-html templates', completed: true},
  ];

  // All todo actions
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

  const toggleTodoAction$ = toggleTodo$.pipe(
    map(id => ({type: 'TOGGLE', payload: id}))
  );

  const removeTodoAction$ = removeTodo$.pipe(
    map(id => ({type: 'REMOVE', payload: id}))
  );

  const clearCompletedAction$ = clearCompleted$.pipe(
    map(() => ({type: 'CLEAR_COMPLETED'}))
  );

  // State management
  const todos$ = merge(
    addTodo$,
    toggleTodoAction$,
    removeTodoAction$,
    clearCompletedAction$
  ).pipe(
    scan((todos, action) => {
      switch (action.type) {
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
    startWith(initialTodos),
    shareReplay(1)
  );

  // Filter todos based on current filter
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

  // Stats for display
  const stats$ = todos$.pipe(
    map(todos => ({
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      remaining: todos.filter(t => !t.completed).length,
    }))
  );

  // Clear input after adding a todo
  const inputValue$ = addInput$.pipe(
    map(() => ''),
    startWith('')
  );

  // Render function
  const vdom$ = combineLatest([
    filteredTodos$,
    filter$,
    stats$,
    inputValue$,
  ]).pipe(
    map(([todos, currentFilter, stats, inputValue]) => {
      return html`
        <div class="todo-app">
          <h1>📝 Cycle.js TODO List</h1>
          <p style="text-align: center; color: #666; margin-bottom: 20px;">
            Built with lit-html driver and component isolation
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
            <h3>🔒 Component Architecture Demo</h3>
            <p>
              This example demonstrates a TODO list built with the lit-html
              driver showing clean reactive patterns.
            </p>
            <p><strong>Features demonstrated:</strong></p>
            <ul>
              <li>Reactive state management with RxJS streams</li>
              <li>Event handling with proper DOM source selection</li>
              <li>Lit-html template composition and rendering</li>
              <li>Filter functionality (All/Active/Completed)</li>
              <li>Dynamic list updates and statistics</li>
              <li>Input clearing after todo creation</li>
            </ul>
            <p><strong>Architecture patterns:</strong></p>
            <ul>
              <li>
                <strong>Unidirectional data flow:</strong> User actions → State
                updates → View updates
              </li>
              <li>
                <strong>Reactive streams:</strong> All user interactions flow
                through RxJS observables
              </li>
              <li>
                <strong>Functional components:</strong> Pure functions that
                transform data streams
              </li>
              <li>
                <strong>Immutable state:</strong> State changes create new state
                objects
              </li>
            </ul>
          </div>
        </div>
      `;
    })
  );

  return {
    DOM: vdom$,
  };
}

const drivers = {
  DOM: makeLitDOMDriver('#app'),
};

run(main, drivers);

