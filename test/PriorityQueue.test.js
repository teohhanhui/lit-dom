import test from 'ava';
import PriorityQueue from '../lib/es6/PriorityQueue.js';

test('PriorityQueue should initialize empty', t => {
  const queue = new PriorityQueue();
  
  t.is(queue.length, 0);
});

test('PriorityQueue.add should add items in priority order', t => {
  const queue = new PriorityQueue();
  
  queue.add('low', 1);
  queue.add('high', 3);
  queue.add('medium', 2);
  
  t.is(queue.length, 3);
  
  const items = [];
  queue.forEach(item => items.push(item));
  
  t.deepEqual(items, ['high', 'medium', 'low']);
});

test('PriorityQueue.add should handle equal priorities', t => {
  const queue = new PriorityQueue();
  
  queue.add('first', 2);
  queue.add('second', 2);
  queue.add('third', 2);
  
  const items = [];
  queue.forEach(item => items.push(item));
  
  t.deepEqual(items, ['first', 'second', 'third']);
});

test('PriorityQueue.forEach should iterate over all items', t => {
  const queue = new PriorityQueue();
  
  queue.add(1, 1);
  queue.add(2, 2);
  queue.add(3, 3);
  
  let sum = 0;
  queue.forEach(item => sum += item);
  
  t.is(sum, 6);
});

test('PriorityQueue.clear should empty the queue', t => {
  const queue = new PriorityQueue();
  
  queue.add('item1', 1);
  queue.add('item2', 2);
  
  t.is(queue.length, 2);
  
  queue.clear();
  
  t.is(queue.length, 0);
});

test('PriorityQueue should handle single item', t => {
  const queue = new PriorityQueue();
  
  queue.add('only', 5);
  
  t.is(queue.length, 1);
  
  const items = [];
  queue.forEach(item => items.push(item));
  
  t.deepEqual(items, ['only']);
});