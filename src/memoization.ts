import {LitTemplate} from './types';

// LRU Cache for template memoization
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Template memoization for expensive template computations
const templateCache = new LRUCache<string, LitTemplate>(200);

export function memoizeTemplate<T extends any[]>(
  templateFn: (...args: T) => LitTemplate,
  keyFn?: (...args: T) => string
): (...args: T) => LitTemplate {
  const getKey = keyFn || ((...args: T) => JSON.stringify(args));

  return (...args: T): LitTemplate => {
    const key = getKey(...args);

    const cached = templateCache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = templateFn(...args);
    templateCache.set(key, result);
    return result;
  };
}

// Shallow comparison for props to avoid unnecessary re-renders
export function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

// Component memoization HOC
export function memo<T extends any[]>(
  component: (...args: T) => LitTemplate,
  areEqual?: (prevArgs: T, nextArgs: T) => boolean
): (...args: T) => LitTemplate {
  let lastArgs: T;
  let lastResult: LitTemplate;
  let hasLastArgs = false;

  const defaultAreEqual = (prevArgs: T, nextArgs: T): boolean => {
    if (prevArgs.length !== nextArgs.length) return false;
    for (let i = 0; i < prevArgs.length; i++) {
      if (!shallowEqual(prevArgs[i], nextArgs[i])) return false;
    }
    return true;
  };

  const isEqual = areEqual || defaultAreEqual;

  return (...args: T): LitTemplate => {
    if (hasLastArgs && isEqual(lastArgs, args)) {
      return lastResult;
    }

    lastArgs = args;
    lastResult = component(...args);
    hasLastArgs = true;

    return lastResult;
  };
}

// Clear all memoization caches
export function clearMemoizationCaches(): void {
  templateCache.clear();
}

