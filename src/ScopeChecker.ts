import {Scope} from './types';
import {IsolateModule} from './IsolateModule';

export class ScopeChecker {
  public _namespace: Array<Scope>;

  constructor(namespace: Array<Scope>, private isolateModule: IsolateModule) {
    this._namespace = namespace;
  }

  public isDirectlyInScope(element: Element): boolean {
    const namespace = this.isolateModule.getNamespace(element);

    // If we have no namespace restrictions (empty _namespace), 
    // then all elements are in scope
    if (this._namespace.length === 0) {
      return true;
    }

    // Filter out selector scopes - they are handled by CSS matching, not namespace matching
    const nonSelectorScopes = this._namespace.filter(scope => scope.type !== 'selector');
    
    // If we only have selector scopes and no isolation scopes, 
    // then all elements from the same root are in scope
    if (nonSelectorScopes.length === 0) {
      return true;
    }

    // If element has no namespace but we expect one, it's not in scope
    if (!namespace) {
      return false;
    }

    // Check only the non-selector scopes for namespace matching
    for (let i = 0; i < nonSelectorScopes.length; i++) {
      const currentScope = nonSelectorScopes[i];

      if (i >= namespace.length) {
        return false;
      }

      const elementScope = namespace[i];

      if (currentScope.type === 'total') {
        if (currentScope.scope !== elementScope.scope) {
          return false;
        }
      } else if (currentScope.type === 'sibling') {
        if (currentScope.scope !== elementScope.scope) {
          return false;
        }
      }
    }

    return true;
  }

  public isInScope(element: Element): boolean {
    const namespace = this.isolateModule.getNamespace(element);

    if (!namespace) {
      return false;
    }

    if (this._namespace.length === 0) {
      return true;
    }

    if (namespace.length < this._namespace.length) {
      return false;
    }

    for (let i = 0; i < this._namespace.length; i++) {
      const currentScope = this._namespace[i];
      const elementScope = namespace[i];

      if (currentScope.type === 'selector') {
        continue;
      }

      if (currentScope.scope !== elementScope.scope) {
        return false;
      }
    }

    return true;
  }
}

