import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.Element = dom.window.Element;
global.DocumentFragment = dom.window.DocumentFragment;

// Setup additional DOM APIs needed by @cycle/dom
global.MutationObserver = dom.window.MutationObserver;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;
global.HTMLElement = dom.window.HTMLElement;
global.Text = dom.window.Text;
global.Node = dom.window.Node;

// Setup navigator separately to avoid getter issues
if (!global.navigator) {
  global.navigator = dom.window.navigator;
}

// Suppress snabbdom DOM cleanup errors during testing
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  // Ignore snabbdom/JSDOM cleanup errors
  if (message.includes('removeChild') || 
      message.includes('TypeError: Failed to execute') ||
      message.includes('parameter 1 is not of type')) {
    return;
  }
  originalConsoleError.apply(console, args);
};