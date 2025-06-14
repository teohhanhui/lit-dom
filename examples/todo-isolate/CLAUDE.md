# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `yarn dev` - Start development server on port 3002
- `yarn build` - Build for production using Vite
- `yarn preview` - Preview production build
- Development server URL: http://localhost:3002

## Architecture Overview

This is a Cycle.js TODO application demonstrating component isolation using the lit-dom driver and @cycle/isolate. The application showcases reactive programming patterns with RxJS and unidirectional data flow.

### Key Components

- **TodoItem**: Isolated component with scoped DOM and events using `isolate(TodoItem, 'todo-${id}')`
- **Main Application**: Orchestrates state management and component composition
- **Reactive State**: Centralized state using scan() operator with action-based updates

### Core Patterns

- **Component Isolation**: Each TodoItem has its own isolated scope preventing event conflicts
- **Stream Composition**: Heavy use of RxJS operators (merge, combineLatest, switchAll, defer)
- **Template Rendering**: lit-html templates with property binding (.checked, .value)
- **Props Flow**: Data flows down through props$ streams to isolated components
- **Event Bubbling**: Child component events (toggle$, remove$) bubble up to parent

### Dependencies

- `@cycle/isolate`: Component isolation
- `@cycle/run`: Cycle.js runtime
- `rxjs`: Reactive programming
- Custom lit-dom driver: `../../lib/es6/index.js`

### File Structure

- `main.js`: Complete application logic with TodoItem component and main function
- `index.html`: UI styles and basic structure
- `vite.config.js`: Development server configuration (port 3002)
- `package.json`: Scripts and dependencies

### State Management Pattern

State flows through a reducer pattern using RxJS scan():
- Actions: ADD, TOGGLE, REMOVE, CLEAR_COMPLETED, INIT
- Immutable updates: Always return new state objects
- Derived state: Stats and filtered todos computed from main state

### Isolation Implementation

Components are isolated using `isolate(TodoItem, scope)` which:
- Creates scoped DOM selectors
- Prevents event conflicts between components
- Enables safe component reuse
- Maintains encapsulation of component logic