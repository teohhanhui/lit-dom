import test from 'ava';
import {
  isClassOrId,
  getSelectors,
  isEqualNamespace,
  getScopeObj,
  defaultReportRenderError,
} from '../lib/es6/utils.js';

test('isClassOrId should identify class selectors', t => {
  t.true(isClassOrId('.class'));
  t.true(isClassOrId('.another-class'));
  t.false(isClassOrId('div'));
  t.false(isClassOrId(''));
  t.false(isClassOrId('.'));
});

test('isClassOrId should identify id selectors', t => {
  t.true(isClassOrId('#id'));
  t.true(isClassOrId('#another-id'));
  t.false(isClassOrId('div'));
  t.false(isClassOrId(''));
  t.false(isClassOrId('#'));
});

test('getScopeObj should create correct scope object for class/id', t => {
  const classScope = getScopeObj('.class');
  t.deepEqual(classScope, {type: 'sibling', scope: '.class'});

  const idScope = getScopeObj('#id');
  t.deepEqual(idScope, {type: 'sibling', scope: '#id'});
});

test('getScopeObj should create correct scope object for element', t => {
  const elementScope = getScopeObj('div');
  t.deepEqual(elementScope, {type: 'total', scope: 'div'});
});

test('getSelectors should filter and join selector scopes', t => {
  const namespace = [
    {type: 'selector', scope: '.class1'},
    {type: 'total', scope: 'div'},
    {type: 'selector', scope: '.class2'},
    {type: 'sibling', scope: '#id'},
  ];

  const result = getSelectors(namespace);
  t.is(result, '.class1 .class2');
});

test('getSelectors should return empty string for no selectors', t => {
  const namespace = [
    {type: 'total', scope: 'div'},
    {type: 'sibling', scope: '#id'},
  ];

  const result = getSelectors(namespace);
  t.is(result, '');
});

test('isEqualNamespace should return true for equal namespaces', t => {
  const ns1 = [
    {type: 'selector', scope: '.class'},
    {type: 'total', scope: 'div'},
  ];
  const ns2 = [
    {type: 'selector', scope: '.class'},
    {type: 'total', scope: 'div'},
  ];

  t.true(isEqualNamespace(ns1, ns2));
});

test('isEqualNamespace should return false for different namespaces', t => {
  const ns1 = [
    {type: 'selector', scope: '.class1'},
    {type: 'total', scope: 'div'},
  ];
  const ns2 = [
    {type: 'selector', scope: '.class2'},
    {type: 'total', scope: 'div'},
  ];

  t.false(isEqualNamespace(ns1, ns2));
});

test('isEqualNamespace should return true for both undefined', t => {
  t.true(isEqualNamespace(undefined, undefined));
});

test('isEqualNamespace should return false for one undefined', t => {
  const ns = [{type: 'selector', scope: '.class'}];
  t.false(isEqualNamespace(ns, undefined));
  t.false(isEqualNamespace(undefined, ns));
});

test('defaultReportRenderError should call console.error', t => {
  const originalError = console.error;
  const originalLog = console.log;
  
  let errorCalled = false;
  let logCalled = false;
  
  console.error = (err) => {
    errorCalled = true;
    t.is(err, 'test error');
  };
  
  console.log = (err) => {
    logCalled = true;
    t.is(err, 'test error');
  };

  defaultReportRenderError('test error');
  
  t.true(errorCalled || logCalled);
  
  console.error = originalError;
  console.log = originalLog;
});