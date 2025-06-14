# Cycle.js Lit-HTML Driver Example

This example demonstrates the usage of `@cycle/lit-dom` with performance optimizations.

## Running the Example

### Prerequisites

1. Make sure the lit-dom package is built:
   ```bash
   cd ../..
   yarn build
   ```

2. Install example dependencies:
   ```bash
   yarn install
   ```

3. Start the development server:
   ```bash
   yarn dev
   ```

The example will open in your browser (usually at `http://localhost:3000` or `http://localhost:3001`).

## What the Example Demonstrates

- **Template Memoization**: Using `memoizeTemplate()` for expensive computations
- **Component Memoization**: Using `memo()` to prevent unnecessary re-renders
- **Performance Optimizations**: `debounceTemplate()` and `distinctTemplates()`
- **Event Handling**: Click events with proper delegation
- **RxJS Integration**: Streams with modern RxJS operators
- **Real-time Updates**: Fast-updating data with efficient rendering

## Features Shown

1. **Memoized Counter**: Template function cached to avoid re-computation
2. **Fast Updates Demo**: List that updates every 100ms but uses memoization
3. **Slow Updates Demo**: List that updates every 2 seconds 
4. **Event Handling**: Button clicks for increment/decrement/reset
5. **Performance Monitoring**: Console logs show when components actually re-render

Open the browser console to see the memoization in action!
