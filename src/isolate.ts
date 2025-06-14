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

    return sink.pipe(
      map(template => {
        if (!template || typeof template === 'string' || typeof template === 'number' || typeof template === 'boolean') {
          return addIsolationToTemplate(template, namespace, scope);
        }
        
        if (template && typeof template === 'object' && 'template' in template) {
          return addIsolationToLitTemplate(template as any, namespace, scope);
        }
        
        return template;
      })
    );
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
  
  if (template && template.template && template.values) {
    const newTemplate = {...template};
    
    newTemplate._$litType$ = template._$litType$;
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

export {getScopeObj};