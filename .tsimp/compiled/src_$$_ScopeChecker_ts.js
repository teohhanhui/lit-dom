export class ScopeChecker {
    constructor(namespace, isolateModule) {
        this.isolateModule = isolateModule;
        this._namespace = namespace;
    }
    isDirectlyInScope(element) {
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
            }
            else if (currentScope.type === 'sibling') {
                if (currentScope.scope !== elementScope.scope) {
                    return false;
                }
            }
        }
        return true;
    }
    isInScope(element) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2NvcGVDaGVja2VyLmpzIiwic291cmNlUm9vdCI6Ii9ob21lL2Zibi9kZXYvbGl0LWRvbS8iLCJzb3VyY2VzIjpbInNyYy9TY29wZUNoZWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxPQUFPLFlBQVk7SUFHdkIsWUFBWSxTQUF1QixFQUFVLGFBQTRCO1FBQTVCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3ZFLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO0lBQzlCLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxPQUFnQjtRQUN2QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUzRCw0REFBNEQ7UUFDNUQsaUNBQWlDO1FBQ2pDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsd0ZBQXdGO1FBQ3hGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxDQUFDO1FBRXJGLDREQUE0RDtRQUM1RCxvREFBb0Q7UUFDcEQsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbEQsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFMUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMxQixPQUFPLEtBQUssQ0FBQztZQUNmLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbEMsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUNsQyxJQUFJLFlBQVksQ0FBQyxLQUFLLEtBQUssWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUM5QyxPQUFPLEtBQUssQ0FBQztnQkFDZixDQUFDO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzNDLElBQUksWUFBWSxDQUFDLEtBQUssS0FBSyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQzlDLE9BQU8sS0FBSyxDQUFDO2dCQUNmLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVNLFNBQVMsQ0FBQyxPQUFnQjtRQUMvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUzRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlDLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWxDLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDckMsU0FBUztZQUNYLENBQUM7WUFFRCxJQUFJLFlBQVksQ0FBQyxLQUFLLEtBQUssWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUM5QyxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0YifQ==