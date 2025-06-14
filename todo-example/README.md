# Cycle.js TODO List Example with Lit-DOM Driver

A complete TODO list application demonstrating the lit-dom driver implementation for Cycle.js.

## Features

- ✅ Add new todos (Press Enter)
- ✅ Toggle todo completion status
- ✅ Remove individual todos
- ✅ Filter todos (All/Active/Completed)
- ✅ Clear all completed todos
- ✅ Live statistics (total, remaining, completed)
- ✅ Reactive state management with RxJS
- ✅ Clean component architecture

## Architecture

This example demonstrates several important Cycle.js patterns:

### Reactive Programming
- **Unidirectional data flow**: User actions → State updates → View updates  
- **Reactive streams**: All user interactions flow through RxJS observables
- **Immutable state**: State changes create new state objects rather than mutating existing ones

### Component Design
- **Functional components**: Pure functions that transform data streams
- **Event delegation**: Using data attributes and DOM traversal for event handling
- **Template composition**: Building complex UIs from simple lit-html templates

### State Management
- **Centralized state**: Single source of truth for all todo data
- **Action-based updates**: All state changes flow through a reducer pattern
- **Derived state**: Computed values (stats, filtered todos) derived from main state

## Running the Example

From the root lit-dom directory:

```bash
# Run the example
./run-todo-example.sh

# Or manually:
cd todo-example
pnpm install
pnpm run dev
```

Then open http://localhost:3002 in your browser.

## Code Structure

- `index.html` - Basic HTML structure and styling
- `main.js` - Main application logic with Cycle.js patterns
- `package.json` - Dependencies and scripts
- `vite.config.js` - Development server configuration

## Key Concepts Demonstrated

1. **DOM Sources**: Using `sources.DOM.select()` to capture user events
2. **Event Mapping**: Converting DOM events to application actions
3. **State Reduction**: Using `scan()` to manage application state
4. **Template Rendering**: Creating dynamic HTML with lit-html templates
5. **Stream Composition**: Combining multiple streams with `merge()` and `combineLatest()`

This example serves as a practical demonstration of how to build real applications with the lit-dom driver while following Cycle.js best practices.