import {describe, it} from 'mocha';
import * as assert from 'assert';
import {makeLitDOMDriver, LitDOMSource, LitTemplate} from '../../src';
import {html} from 'lit-html';
import {Observable, of} from 'rxjs';

describe('Lit DOM Driver', () => {
  it('should be a function', () => {
    assert.strictEqual(typeof makeLitDOMDriver, 'function');
  });

  it('should throw error for invalid container', () => {
    assert.throws(() => {
      makeLitDOMDriver('invalid-selector');
    });
  });

  it('should create a driver function when given valid container', () => {
    // Create a mock container element
    const mockElement = {
      tagName: 'DIV',
      querySelector: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as any;

    const driver = makeLitDOMDriver(mockElement);
    assert.strictEqual(typeof driver, 'function');
  });
});

describe('LitTemplate types', () => {
  it('should accept html templates', () => {
    const template = html`<div>Hello World</div>`;
    assert.strictEqual(typeof template, 'object');
    assert.ok('template' in template);
  });

  it('should accept string templates', () => {
    const template: LitTemplate = 'Hello World';
    assert.strictEqual(typeof template, 'string');
  });

  it('should accept number templates', () => {
    const template: LitTemplate = 42;
    assert.strictEqual(typeof template, 'number');
  });

  it('should accept boolean templates', () => {
    const template: LitTemplate = true;
    assert.strictEqual(typeof template, 'boolean');
  });

  it('should accept null/undefined templates', () => {
    const template1: LitTemplate = null;
    const template2: LitTemplate = undefined;
    assert.strictEqual(template1, null);
    assert.strictEqual(template2, undefined);
  });
});

describe('Performance utilities', () => {
  const {memoizeTemplate, memo, shallowEqual} = require('../../src/memoization');
  
  it('should memoize template functions', () => {
    let callCount = 0;
    const expensiveTemplate = memoizeTemplate((name: string) => {
      callCount++;
      return html`<div>Hello ${name}</div>`;
    });

    expensiveTemplate('World');
    expensiveTemplate('World'); // Should use cache
    expensiveTemplate('Universe'); // Should compute new

    assert.strictEqual(callCount, 2);
  });

  it('should perform shallow equality check', () => {
    assert.ok(shallowEqual({a: 1, b: 2}, {a: 1, b: 2}));
    assert.ok(!shallowEqual({a: 1, b: 2}, {a: 1, b: 3}));
    assert.ok(shallowEqual('hello', 'hello'));
    assert.ok(!shallowEqual('hello', 'world'));
  });

  it('should memoize components', () => {
    let renderCount = 0;
    const TestComponent = memo((props: {name: string}) => {
      renderCount++;
      return html`<div>Hello ${props.name}</div>`;
    });

    TestComponent({name: 'World'});
    TestComponent({name: 'World'}); // Should use memo
    TestComponent({name: 'Universe'}); // Should render new

    assert.strictEqual(renderCount, 2);
  });
});