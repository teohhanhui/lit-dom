# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-XX-XX

### Added
- Initial implementation of lit-html DOM driver for Cycle.js
- RxJS-based stream handling with optimized operators
- Full isolation support compatible with @cycle/isolate
- Performance optimization utilities:
  - Template memoization with LRU caching
  - Component memoization with configurable equality checking
  - Stream debouncing, throttling, and batching
  - Animation frame synchronization
  - Distinct template emission
- Comprehensive TypeScript type definitions
- Event delegation system with proper isolation boundaries
- Support for all lit-html directives and features
- Memory-efficient element tracking and cleanup
- Mutation observer integration for DOM change detection

### Features
- **makeLitDOMDriver**: Main driver factory function
- **LitDOMSource**: DOM source with element selection and event handling
- **Performance utilities**: debounceTemplate, throttleTemplate, distinctTemplates, animationFrame, batchTemplates
- **Memoization utilities**: memoizeTemplate, memo, shallowEqual, clearMemoizationCaches
- **Full lit-html re-exports**: html, svg, render, directives, etc.

### Performance Optimizations
- LRU cache for template memoization (configurable size)
- Shallow equality checking for component props
- Efficient event delegation with virtual listener trees
- RequestAnimationFrame scheduling for smooth animations
- Batched template updates to reduce render frequency
- Distinct template filtering to avoid unnecessary renders

### Compatibility
- Compatible with Cycle.js run functions
- Works with @cycle/isolate for component isolation
- Supports all standard HTML events and custom events
- Compatible with all lit-html directives and features
- TypeScript 3.2+ support