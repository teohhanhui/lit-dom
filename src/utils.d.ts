import { Scope } from './types';
export declare function isClassOrId(str: string): boolean;
export declare function checkValidContainer(container: string | Element | DocumentFragment): void;
export declare function getValidNode(container: string | Element | DocumentFragment): Element;
export declare function getSelectors(namespace: Array<Scope>): string;
export declare function isEqualNamespace(a: Array<Scope> | undefined, b: Array<Scope> | undefined): boolean;
export declare function getScopeObj(scope: string): Scope;
export declare function defaultReportRenderError(err: any): void;
//# sourceMappingURL=utils.d.ts.map