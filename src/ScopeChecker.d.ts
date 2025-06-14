import { Scope } from './types';
import { IsolateModule } from './IsolateModule';
export declare class ScopeChecker {
    private isolateModule;
    _namespace: Array<Scope>;
    constructor(namespace: Array<Scope>, isolateModule: IsolateModule);
    isDirectlyInScope(element: Element): boolean;
    isInScope(element: Element): boolean;
}
//# sourceMappingURL=ScopeChecker.d.ts.map