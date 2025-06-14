import { Scope } from './types';
import { IsolateModule } from './IsolateModule';
export declare class ElementFinder {
    namespace: Array<Scope>;
    isolateModule: IsolateModule;
    constructor(namespace: Array<Scope>, isolateModule: IsolateModule);
    call(): Array<Element>;
}
//# sourceMappingURL=ElementFinder.d.ts.map