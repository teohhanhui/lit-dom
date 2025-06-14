import {Scope} from './types';

export function isClassOrId(str: string): boolean {
  return str.length > 1 && (str[0] === '.' || str[0] === '#');
}

export function checkValidContainer(
  container: string | Element | DocumentFragment
): void {
  if (typeof container === 'string') {
    const element = document.querySelector(container);
    if (!element) {
      throw new Error(`Cannot find element with selector "${container}"`);
    }
  } else if (
    !(container instanceof Element) &&
    !(container instanceof DocumentFragment)
  ) {
    throw new Error(
      'Container must be a DOM element, DocumentFragment, or CSS selector string'
    );
  }
}

export function getValidNode(
  container: string | Element | DocumentFragment
): Element {
  if (typeof container === 'string') {
    const element = document.querySelector(container);
    if (!element) {
      throw new Error(`Cannot find element with selector "${container}"`);
    }
    return element;
  } else if (container instanceof Element) {
    return container;
  } else if (container instanceof DocumentFragment) {
    return container.firstElementChild as Element;
  }
  throw new Error('Invalid container type');
}

export function getSelectors(namespace: Array<Scope>): string {
  return namespace
    .filter(n => n.type === 'selector')
    .map(n => n.scope)
    .join(' ');
}

export function isEqualNamespace(
  a: Array<Scope> | undefined,
  b: Array<Scope> | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i].type !== b[i].type || a[i].scope !== b[i].scope) {
      return false;
    }
  }
  return true;
}

export function getScopeObj(scope: string): Scope {
  return {
    type: isClassOrId(scope) ? 'sibling' : 'total',
    scope,
  };
}

export function defaultReportRenderError(err: any): void {
  (console.error || console.log)(err);
}

