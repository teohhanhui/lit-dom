import {map} from 'rxjs/operators';
import {LitTemplate, Scope, IsolateSink} from './types';
import {getScopeObj} from './utils';

// Type for generic stream that could be RxJS or xstream
interface StreamLike<T> {
  pipe?: (operator: any) => StreamLike<T>;
  map?: (project: (value: T) => any) => StreamLike<any>;
}

export function makeIsolateSink<T extends LitTemplate>(
  namespace: Array<Scope>
): IsolateSink<T> {
  return (sink, scope) => {
    if (scope === ':root') {
      return sink;
    }

    const streamSink = sink as StreamLike<T>;

    // Check if sink has pipe method (RxJS) or map method (xstream)
    if (streamSink && typeof streamSink.pipe === 'function') {
      // RxJS stream
      return streamSink.pipe(
        map((template: any) => {
          if (!template || typeof template === 'string' || typeof template === 'number' || typeof template === 'boolean') {
            return addIsolationToTemplate(template as T, namespace, scope);
          }
          
          if (template && typeof template === 'object' && 'template' in template) {
            return addIsolationToLitTemplate(template as any, namespace, scope);
          }
          
          return template;
        })
      );
    } else if (streamSink && typeof streamSink.map === 'function') {
      // xstream or similar
      return streamSink.map((template: T) => {
        if (!template || typeof template === 'string' || typeof template === 'number' || typeof template === 'boolean') {
          return addIsolationToTemplate(template, namespace, scope);
        }
        
        if (template && typeof template === 'object' && ('_$litType$' in template || 'template' in template)) {
          return addIsolationToLitTemplate(template as any, namespace, scope);
        }
        
        return template;
      });
    } else {
      // Fallback - return sink as-is
      console.warn('Unable to apply isolation - sink does not have pipe or map method', sink);
      return sink;
    }
  };
}

function addIsolationToTemplate<T extends LitTemplate>(
  template: T,
  _namespace: Array<Scope>,
  _scope: string
): T {
  // For simple templates (strings, numbers, etc.), return as-is
  // Isolation is handled at the component level
  return template;
}

function addIsolationToLitTemplate(
  template: any,
  namespace: Array<Scope>,
  scope: string
): any {
  const scopeObj = getScopeObj(scope);
  const newNamespace = namespace.concat([scopeObj]);
  
  // Handle lit-html templates (have _$litType$ and values)
  if (template && template._$litType$ && template.values) {
    const newTemplate = {...template};
    
    newTemplate._$litType$ = template._$litType$;
    newTemplate.strings = injectNamespaceMarker(template.strings, newNamespace);
    newTemplate.values = template.values.map((value: any) => {
      if (typeof value === 'object' && value && '_$litDirective$' in value) {
        return {...value, _isolate: newNamespace};
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
    const newTemplate = {...template};
    
    newTemplate._$litType$ = template._$litType$;
    newTemplate.strings = injectNamespaceMarker(template.strings, newNamespace);
    newTemplate.values = template.values.map((value: any) => {
      if (typeof value === 'object' && value && '_$litDirective$' in value) {
        return {...value, _isolate: newNamespace};
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

function injectNamespaceMarker(strings: TemplateStringsArray, namespace: Array<Scope>): TemplateStringsArray {
  if (!strings || strings.length === 0) {
    return strings;
  }
  
  // Create a namespace ID from the scope chain
  const namespaceId = namespace.map(s => s.scope).join('-');
  
  // Clone the strings array
  const newStrings = [...strings];
  
  // Inject the marker in the first string (usually the opening tag)
  if (newStrings[0]) {
    // Look for the first opening tag and inject the marker
    const firstString = newStrings[0];
    const tagMatch = firstString.match(/^(\s*<[^>\s]+)/);
    
    if (tagMatch) {
      // Insert the marker attribute right after the tag name
      newStrings[0] = firstString.replace(
        tagMatch[1],
        `${tagMatch[1]} data-temp-ns="${namespaceId}"`
      );
    }
  }
  
  // Return as TemplateStringsArray-like object
  return Object.assign(newStrings, { raw: newStrings }) as TemplateStringsArray;
}

export {getScopeObj};