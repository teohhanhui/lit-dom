import {map} from 'rxjs/operators';
import {LitTemplate, Scope, IsolateSink} from './types';
import {getScopeObj} from './utils';


export function makeIsolateSink<T extends LitTemplate>(
  namespace: Array<Scope>
): IsolateSink<T> {
  return (sink, scope) => {
    if (scope === ':root') {
      return sink;
    }

    // Create the new namespace including the current scope
    const scopeObj = getScopeObj(scope);
    const newNamespace = namespace.concat([scopeObj]);

    const streamSink = sink as any;

    // Check if sink has pipe method (RxJS)
    if (streamSink && typeof streamSink.pipe === 'function') {
      // RxJS stream - use pipe and map
      return streamSink.pipe(
        map((template: any) => {
          return addIsolationToTemplate(template, newNamespace);
        })
      );
    } else if (streamSink && typeof streamSink.map === 'function') {
      // xstream or similar - use map directly
      return streamSink.map((template: any) => {
        return addIsolationToTemplate(template, newNamespace);
      });
    } else {
      // Fallback - return sink as-is
      console.warn('Unable to apply isolation - sink does not have pipe or map method', typeof streamSink, streamSink);
      return sink;
    }
  };
}

function addIsolationToTemplate(
  template: any,
  namespace: Array<Scope>
): any {
  // For simple templates (strings, numbers, null, etc.), return as-is
  if (!template || typeof template !== 'object') {
    return template;
  }
  
  // Handle lit-html templates (have _$litType$ and strings)
  if (template._$litType$ && template.strings) {
    const newTemplate = {...template};
    
    // Inject namespace marker into template strings
    newTemplate.strings = injectNamespaceMarker(template.strings, namespace);
    
    // Copy values and add isolation info to directives
    if (template.values) {
      newTemplate.values = template.values.map((value: any) => {
        if (typeof value === 'object' && value && '_$litDirective$' in value) {
          return {...value, _isolate: namespace};
        }
        return value;
      });
    }
    
    // Add isolation metadata to template
    newTemplate._isolate = namespace;
    
    return newTemplate;
  }
  
  // For other objects, return as-is
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