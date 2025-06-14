import test from 'ava';
import SymbolTree from '../lib/es6/SymbolTree.js';

test('SymbolTree should initialize with key function', t => {
  const tree = new SymbolTree(item => item.name);
  
  t.truthy(tree);
});

test('SymbolTree.set and get should work with simple path', t => {
  const tree = new SymbolTree(item => item.name);
  const path = [{name: 'test', id: 1}];
  
  tree.set(path, 'value');
  const result = tree.get(path);
  
  t.is(result, 'value');
});

test('SymbolTree.get should return undefined for non-existent path', t => {
  const tree = new SymbolTree(item => item.name);
  const path = [{name: 'nonexistent', id: 1}];
  
  const result = tree.get(path);
  
  t.is(result, undefined);
});

test('SymbolTree.get should return default value when provided', t => {
  const tree = new SymbolTree(item => item.name);
  const path = [{name: 'nonexistent', id: 1}];
  
  const result = tree.get(path, 'default');
  
  t.is(result, 'default');
});

test('SymbolTree.getDefault should create and return default value', t => {
  const tree = new SymbolTree(item => item.name);
  const path = [{name: 'test', id: 1}];
  
  const result = tree.getDefault(path, () => 'created');
  
  t.is(result, 'created');
  t.is(tree.get(path), 'created');
});

test('SymbolTree.delete should remove values', t => {
  const tree = new SymbolTree(item => item.name);
  const path = [{name: 'test', id: 1}];
  
  tree.set(path, 'value');
  t.is(tree.get(path), 'value');
  
  const deleted = tree.delete(path);
  
  t.true(deleted);
  t.is(tree.get(path), undefined);
});

test('SymbolTree.has should check existence', t => {
  const tree = new SymbolTree(item => item.name);
  const path = [{name: 'test', id: 1}];
  
  t.false(tree.has(path));
  
  tree.set(path, 'value');
  
  t.true(tree.has(path));
});

test('SymbolTree should handle complex paths', t => {
  const tree = new SymbolTree(item => item.name);
  const path = [
    {name: 'root', id: 1},
    {name: 'child', id: 2},
    {name: 'grandchild', id: 3}
  ];
  
  tree.set(path, 'deep value');
  const result = tree.get(path);
  
  t.is(result, 'deep value');
});

test('SymbolTree should handle max parameter in get', t => {
  const tree = new SymbolTree(item => item.name);
  const fullPath = [
    {name: 'root', id: 1},
    {name: 'child', id: 2},
    {name: 'grandchild', id: 3}
  ];
  const partialPath = [
    {name: 'root', id: 1},
    {name: 'child', id: 2}
  ];
  
  tree.set(partialPath, 'partial value');
  
  const result = tree.get(fullPath, undefined, 2);
  
  t.is(result, 'partial value');
});

test('SymbolTree should handle max parameter in getDefault', t => {
  const tree = new SymbolTree(item => item.name);
  const fullPath = [
    {name: 'root', id: 1},
    {name: 'child', id: 2},
    {name: 'grandchild', id: 3}
  ];
  
  const result = tree.getDefault(fullPath, () => 'created', 2);
  
  t.is(result, 'created');
  
  const partialPath = [{name: 'root', id: 1}, {name: 'child', id: 2}];
  t.is(tree.get(partialPath), 'created');
  t.is(tree.get(fullPath), undefined);
});