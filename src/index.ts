export {makeLitDOMDriver} from './makeLitDOMDriver';
export {LitDOMSource} from './LitDOMSource';
export {
  LitTemplate,
  EventsFnOptions,
  LitDOMDriverOptions,
  Scope,
  IsolateSink,
} from './types';
export {makeIsolateSink, getScopeObj} from './isolate';

// Re-export useful lit-html types and functions
export {html, svg, render, TemplateResult} from 'lit-html';
export {directive, Directive} from 'lit-html/directive.js';
export {asyncReplace} from 'lit-html/directives/async-replace.js';
export {asyncAppend} from 'lit-html/directives/async-append.js';
export {cache} from 'lit-html/directives/cache.js';
export {classMap} from 'lit-html/directives/class-map.js';
export {guard} from 'lit-html/directives/guard.js';
export {ifDefined} from 'lit-html/directives/if-defined.js';
export {repeat} from 'lit-html/directives/repeat.js';
export {styleMap} from 'lit-html/directives/style-map.js';
export {unsafeHTML} from 'lit-html/directives/unsafe-html.js';
export {until} from 'lit-html/directives/until.js';
