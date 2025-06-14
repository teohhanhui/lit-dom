import {Observable} from 'rxjs';
import {distinctUntilChanged, debounceTime, throttleTime} from 'rxjs/operators';

// Performance optimization utilities

// Debounce templates to avoid excessive re-renders
export function debounceTemplate<T>(time: number = 16) {
  return (source: Observable<T>) => source.pipe(debounceTime(time));
}

// Throttle templates for high-frequency updates
export function throttleTemplate<T>(time: number = 16) {
  return (source: Observable<T>) => source.pipe(throttleTime(time));
}

// Only emit when template actually changes (deep comparison for objects)
export function distinctTemplates<T>() {
  return (source: Observable<T>) =>
    source.pipe(
      distinctUntilChanged((a, b) => {
        if (a === b) return true;
        if (typeof a !== typeof b) return false;
        if (typeof a === 'object' && a !== null && b !== null) {
          return JSON.stringify(a) === JSON.stringify(b);
        }
        return false;
      })
    );
}

// RequestAnimationFrame-based scheduling for smooth animations
export function animationFrame<T>() {
  return (source: Observable<T>) =>
    new Observable<T>(subscriber => {
      let rafId: number;
      let hasValue = false;
      let lastValue: T;

      const subscription = source.subscribe({
        next: value => {
          lastValue = value;
          if (!hasValue) {
            hasValue = true;
            rafId = requestAnimationFrame(() => {
              subscriber.next(lastValue);
              hasValue = false;
            });
          }
        },
        error: err => subscriber.error(err),
        complete: () => subscriber.complete(),
      });

      return () => {
        subscription.unsubscribe();
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
      };
    });
}

// Batch multiple template updates into a single render
export function batchTemplates<T>(windowTime: number = 0) {
  return (source: Observable<T>) =>
    new Observable<T>(subscriber => {
      let buffer: T[] = [];
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const subscription = source.subscribe({
        next: value => {
          buffer.push(value);

          if (timeoutId !== null) {
            clearTimeout(timeoutId);
          }

          timeoutId = setTimeout(() => {
            if (buffer.length > 0) {
              // Emit the last value in the buffer
              subscriber.next(buffer[buffer.length - 1]);
              buffer = [];
            }
          }, windowTime);
        },
        error: err => subscriber.error(err),
        complete: () => {
          if (buffer.length > 0) {
            subscriber.next(buffer[buffer.length - 1]);
          }
          subscriber.complete();
        },
      });

      return () => {
        subscription.unsubscribe();
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      };
    });
}

