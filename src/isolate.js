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
//# sourceMappingURL=isolate.js.map