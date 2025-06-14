import { getSelectors } from './utils';
import { ScopeChecker } from './ScopeChecker';
function toElArray(input) {
    return Array.prototype.slice.call(input);
}
export class ElementFinder {
    constructor(namespace, isolateModule) {
        this.namespace = namespace;
        this.isolateModule = isolateModule;
    }
    call() {
        const namespace = this.namespace;
        const selector = getSelectors(namespace);
        const scopeChecker = new ScopeChecker(namespace, this.isolateModule);
        const topNode = this.isolateModule.getElement(namespace.filter(n => n.type !== 'selector'));
        if (topNode === undefined) {
            return [];
        }
        if (selector === '') {
            return [topNode];
        }
        return toElArray(topNode.querySelectorAll(selector))
            .filter(scopeChecker.isDirectlyInScope, scopeChecker)
            .concat(topNode.matches(selector) ? [topNode] : []);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRWxlbWVudEZpbmRlci5qcyIsInNvdXJjZVJvb3QiOiIvaG9tZS9mYm4vZGV2L2xpdC1kb20vIiwic291cmNlcyI6WyJzcmMvRWxlbWVudEZpbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sU0FBUyxDQUFDO0FBRXJDLE9BQU8sRUFBQyxZQUFZLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUU1QyxTQUFTLFNBQVMsQ0FBQyxLQUFVO0lBQzNCLE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBbUIsQ0FBQztBQUM3RCxDQUFDO0FBRUQsTUFBTSxPQUFPLGFBQWE7SUFDeEIsWUFDUyxTQUF1QixFQUN2QixhQUE0QjtRQUQ1QixjQUFTLEdBQVQsU0FBUyxDQUFjO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO0lBQ2xDLENBQUM7SUFFRyxJQUFJO1FBQ1QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNqQyxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFekMsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNyRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FDM0MsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQzdDLENBQUM7UUFFRixJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQixPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRCxJQUFJLFFBQVEsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUNwQixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkIsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUNqRCxNQUFNLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLFlBQVksQ0FBQzthQUNwRCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDeEQsQ0FBQztDQUNGIn0=