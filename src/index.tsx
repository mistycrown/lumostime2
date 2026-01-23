/**
 * @file index.tsx
 * @input App Component, DOM Element (#root)
 * @output Mounted React Application
 * @pos Entry Point (Bootstrapping)
 * @description The entry point that mounts the React App component to the DOM and handles polyfills.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { Buffer } from 'buffer';
// @ts-ignore
window.Buffer = window.Buffer || Buffer;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);