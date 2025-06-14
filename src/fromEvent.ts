import {Observable} from 'rxjs';
import {PreventDefaultOpt} from './types';

export function fromEvent(
  element: Element | Document | Window,
  eventType: string,
  useCapture: boolean = false,
  preventDefault: PreventDefaultOpt = false,
  passive: boolean = false
): Observable<Event> {
  return new Observable(subscriber => {
    const handler = (event: Event) => {
      preventDefaultConditional(event, preventDefault);
      subscriber.next(event);
    };

    const options: AddEventListenerOptions = {
      capture: useCapture,
      passive,
    };

    element.addEventListener(eventType, handler, options);

    return () => {
      element.removeEventListener(eventType, handler, options);
    };
  });
}

export function preventDefaultConditional(
  event: Event,
  preventDefault: PreventDefaultOpt
): void {
  if (preventDefault === true) {
    event.preventDefault();
  } else if (typeof preventDefault === 'function') {
    if (preventDefault(event)) {
      event.preventDefault();
    }
  }
}

