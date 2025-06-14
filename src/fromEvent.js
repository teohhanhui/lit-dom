import { Observable } from 'rxjs';
export function fromEvent(element, eventType, useCapture = false, preventDefault = false, passive = false) {
    return new Observable(subscriber => {
        const handler = (event) => {
            preventDefaultConditional(event, preventDefault);
            subscriber.next(event);
        };
        const options = {
            capture: useCapture,
            passive,
        };
        element.addEventListener(eventType, handler, options);
        return () => {
            element.removeEventListener(eventType, handler, options);
        };
    });
}
export function preventDefaultConditional(event, preventDefault) {
    if (preventDefault === true) {
        event.preventDefault();
    }
    else if (typeof preventDefault === 'function') {
        if (preventDefault(event)) {
            event.preventDefault();
        }
    }
}
//# sourceMappingURL=fromEvent.js.map