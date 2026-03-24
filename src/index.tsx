/**
 * @file index.tsx
 * @input App Component, DOM Element (#root)
 * @output Mounted React Application
 * @pos Entry Point (Bootstrapping)
 * @description The entry point that mounts the React App component, keeps the native loading screen until data hydration is ready, and handles polyfills.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App';
import './index.css';
import './styles/themes.css';

const APP_READY_EVENT = 'lumostime:app-ready';

// @ts-ignore
window.Buffer = window.Buffer || Buffer;

const removeLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen || loadingScreen.classList.contains('fade-out')) {
    return;
  }

  loadingScreen.classList.add('fade-out');
  window.setTimeout(() => {
    loadingScreen.remove();
  }, 300);
};

window.addEventListener(APP_READY_EVENT, removeLoadingScreen, { once: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
