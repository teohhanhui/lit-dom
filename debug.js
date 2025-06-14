// Debug script to test event delegation logic
const { JSDOM } = require('jsdom');

// Set up a DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div id="app">
    <div class="counter">
      <h2>Counter: 0</h2>
      <button class="increment">+</button>
      <button class="decrement">-</button>
      <button class="reset">Reset</button>
    </div>
  </div>
</body>
</html>
`);

global.window = dom.window;
global.document = dom.window.document;
global.Element = dom.window.Element;

// Import our driver
const { makeLitDOMDriver } = require('./lib/cjs/index.js');
const { Observable } = require('rxjs');

console.log('Testing DOM driver setup...');

// Create a driver
const driver = makeLitDOMDriver('#app');

// Test if we can create DOM sources
const rootElement = document.querySelector('#app');
console.log('Root element:', rootElement);

// Test button selection
const incrementButton = document.querySelector('.increment');
console.log('Increment button:', incrementButton);

if (incrementButton) {
  console.log('Button classes:', incrementButton.className);
  console.log('Button matches .increment:', incrementButton.matches('.increment'));
}