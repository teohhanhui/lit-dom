# Cycle.js TODO List Example with Lit-DOM Driver + Component Isolation

A complete TODO list application demonstrating the lit-dom driver implementation for Cycle.js with deep component isolation using @cycle/isolate.

## Features

- ✅ Add new todos (Press Enter)
- ✅ Toggle todo completion status
- ✅ Remove individual todos
- ✅ Filter todos (All/Active/Completed)
- ✅ Clear all completed todos
- ✅ Live statistics (total, remaining, completed)
- ✅ Reactive state management with RxJS
- ✅ **Component isolation with @cycle/isolate**
- ✅ **Nested isolated components**
- ✅ **Scoped event handling**

## Architecture

This example demonstrates several important Cycle.js patterns:

### Reactive Programming
- **Unidirectional data flow**: User actions → State updates → View updates  
- **Reactive streams**: All user interactions flow through RxJS observables
- **Immutable state**: State changes create new state objects rather than mutating existing ones

### Component Design
- **Isolated components**: Each component has its own scoped DOM and events using @cycle/isolate
- **Props-based data flow**: Data flows down through props$ streams
- **Event bubbling**: Child component events bubble up to parent components
- **Nested isolation**: TodoList (scope: 'todoList') contains isolated TodoItems (scope: 'todo-{id}')
- **Template composition**: Building complex UIs from simple lit-html templates

### State Management
- **Centralized state**: Single source of truth for all todo data
- **Action-based updates**: All state changes flow through a reducer pattern
- **Derived state**: Computed values (stats, filtered todos) derived from main state
- **Component communication**: Isolated components communicate via streams and props

## Running the Example

From the root lit-dom directory:

```bash
# Run the example
./run-todo-example.sh

# Or manually:
cd todo-example
yarn install
yarn dev
```

Then open http://localhost:3002 in your browser.

## Code Structure

- `index.html` - Basic HTML structure and styling
- `main.js` - Main application logic with Cycle.js patterns
- `package.json` - Dependencies and scripts
- `vite.config.js` - Development server configuration

## Key Concepts Demonstrated

### Core Cycle.js Patterns
1. **DOM Sources**: Using `sources.DOM.select()` to capture user events
2. **Event Mapping**: Converting DOM events to application actions
3. **State Reduction**: Using `scan()` to manage application state
4. **Template Rendering**: Creating dynamic HTML with lit-html templates
5. **Stream Composition**: Combining multiple streams with `merge()` and `combineLatest()`

### Component Isolation Features
1. **Scoped Components**: Each TodoItem has its own isolated scope (`todo-{id}`)
2. **Event Isolation**: Component events don't conflict with each other
3. **DOM Isolation**: Each component only sees its own DOM subtree
4. **Props Passing**: Data flows down through `props$` streams
5. **Nested Isolation**: TodoList contains multiple isolated TodoItems
6. **Reusable Components**: Same component can be used multiple times safely

### Testing Isolation
To verify isolation is working:
1. Open browser dev tools
2. Inspect todo items - notice the isolation-specific CSS classes
3. Check that each component has its own scoped event handlers
4. Observe that components can't accidentally interfere with each other

This example serves as a comprehensive demonstration of how to build real applications with the lit-dom driver using proper component isolation patterns and Cycle.js best practices.
