import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.Element = dom.window.Element;
global.DocumentFragment = dom.window.DocumentFragment;

// Setup navigator separately to avoid getter issues
if (!global.navigator) {
  global.navigator = dom.window.navigator;
}