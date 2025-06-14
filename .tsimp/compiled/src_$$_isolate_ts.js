import { map } from 'rxjs/operators';
import { getScopeObj } from './utils';
export function makeIsolateSink(namespace) {
    return (sink, scope) => {
        if (scope === ':root') {
            return sink;
        }
        const streamSink = sink;
        // Check if sink has pipe method (RxJS) or map method (xstream)
        if (streamSink && typeof streamSink.pipe === 'function') {
            // RxJS stream
            return streamSink.pipe(map((template) => {
                if (!template || typeof template === 'string' || typeof template === 'number' || typeof template === 'boolean') {
                    return addIsolationToTemplate(template, namespace, scope);
                }
                if (template && typeof template === 'object' && 'template' in template) {
                    return addIsolationToLitTemplate(template, namespace, scope);
                }
                return template;
            }));
        }
        else if (streamSink && typeof streamSink.map === 'function') {
            // xstream or similar
            return streamSink.map((template) => {
                if (!template || typeof template === 'string' || typeof template === 'number' || typeof template === 'boolean') {
                    return addIsolationToTemplate(template, namespace, scope);
                }
                if (template && typeof template === 'object' && ('_$litType$' in template || 'template' in template)) {
                    return addIsolationToLitTemplate(template, namespace, scope);
                }
                return template;
            });
        }
        else {
            // Fallback - return sink as-is
            console.warn('Unable to apply isolation - sink does not have pipe or map method', sink);
            return sink;
        }
    };
}
function addIsolationToTemplate(template, _namespace, _scope) {
    // For simple templates (strings, numbers, etc.), return as-is
    // Isolation is handled at the component level
    return template;
}
function addIsolationToLitTemplate(template, namespace, scope) {
    const scopeObj = getScopeObj(scope);
    const newNamespace = namespace.concat([scopeObj]);
    // Handle lit-html templates (have _$litType$ and values)
    if (template && template._$litType$ && template.values) {
        const newTemplate = { ...template };
        newTemplate._$litType$ = template._$litType$;
        newTemplate.strings = template.strings;
        newTemplate.values = template.values.map((value) => {
            if (typeof value === 'object' && value && '_$litDirective$' in value) {
                return { ...value, _isolate: newNamespace };
            }
            return value;
        });
        if (!newTemplate._isolate) {
            newTemplate._isolate = newNamespace;
        }
        return newTemplate;
    }
    // Handle other template formats (legacy compatibility)
    if (template && template.template && template.values) {
        const newTemplate = { ...template };
        newTemplate._$litType$ = template._$litType$;
        newTemplate.values = template.values.map((value) => {
            if (typeof value === 'object' && value && '_$litDirective$' in value) {
                return { ...value, _isolate: newNamespace };
            }
            return value;
        });
        if (!newTemplate._isolate) {
            newTemplate._isolate = newNamespace;
        }
        return newTemplate;
    }
    return template;
}
export { getScopeObj };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNvbGF0ZS5qcyIsInNvdXJjZVJvb3QiOiIvaG9tZS9mYm4vZGV2L2xpdC1kb20vIiwic291cmNlcyI6WyJzcmMvaXNvbGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkMsT0FBTyxFQUFDLFdBQVcsRUFBQyxNQUFNLFNBQVMsQ0FBQztBQVFwQyxNQUFNLFVBQVUsZUFBZSxDQUM3QixTQUF1QjtJQUV2QixPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ3JCLElBQUksS0FBSyxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQXFCLENBQUM7UUFFekMsK0RBQStEO1FBQy9ELElBQUksVUFBVSxJQUFJLE9BQU8sVUFBVSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUN4RCxjQUFjO1lBQ2QsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNwQixHQUFHLENBQUMsQ0FBQyxRQUFhLEVBQUUsRUFBRTtnQkFDcEIsSUFBSSxDQUFDLFFBQVEsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxJQUFJLE9BQU8sUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUMvRyxPQUFPLHNCQUFzQixDQUFDLFFBQWEsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2pFLENBQUM7Z0JBRUQsSUFBSSxRQUFRLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxJQUFJLFVBQVUsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDdkUsT0FBTyx5QkFBeUIsQ0FBQyxRQUFlLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN0RSxDQUFDO2dCQUVELE9BQU8sUUFBUSxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxDQUNILENBQUM7UUFDSixDQUFD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