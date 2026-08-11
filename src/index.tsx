/**
 * @file index.tsx
 * @input App Component, DOM Element (#root)
 * @output Mounted React Application
 * @pos Entry Point (Bootstrapping)
 * @description The entry point that mounts the React App component, keeps the native loading screen until data hydration is ready, and handles polyfills.
 * @updated 2026-07-22: Desktop widget renderer windows now opt out of the main app's global dark-mode attribute.
 * @updated 2026-05-17: 扩展了桌面小组件的分流路由逻辑，新增对 DesktopTimerWidgetView（计时器小组件）的渲染路由分发。
 * @updated 2026-05-17: 扩展了桌面小组件的分流路由逻辑，新增对 DesktopQuickWidgetView（小事清单小组件）的渲染路由分发。
 * @updated 2026-05-17: Added a dedicated transparent desktop quick-editor window route to the widget boot switch.
 * @updated 2026-05-17: Added a dedicated desktop-widget boot path so Electron can render a lightweight today-tasks window or month planning calendar window without mounting the full app shell.
 * @updated 2026-08-11: Starts optional error reporting and records normal-app startup attempts for timeout diagnosis.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App';
import './index.css';
import './styles/themes.css';
import { isDesktopWidgetWindow, getDesktopWidgetType } from './services/desktopWidgetService';
import { DesktopTodayWidgetView } from './views/desktop/DesktopTodayWidgetView';
import { DesktopMonthWidgetView } from './views/desktop/DesktopMonthWidgetView';
import { DesktopQuickWidgetView } from './views/desktop/DesktopQuickWidgetView';
import { DesktopTimerWidgetView } from './views/desktop/DesktopTimerWidgetView';
import { DesktopTodoQuickEditorWindowView } from './views/desktop/DesktopTodoQuickEditorWindowView';
import { initializeErrorReporting } from './services/errorReporting';
import { startStartupDiagnostics } from './services/startupDiagnostics';

const APP_READY_EVENT = 'lumostime:app-ready';
const getRendererBootTimingNow = (): number => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);
const rendererBootStartedAt = getRendererBootTimingNow();

initializeErrorReporting();

// @ts-ignore
window.Buffer = window.Buffer || Buffer;

console.info(
  `[RendererBoot] index.tsx evaluated at ${rendererBootStartedAt.toFixed(1)}ms since renderer time origin`
);

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
console.info(
  `[RendererBoot] React root created at ${(getRendererBootTimingNow() - rendererBootStartedAt).toFixed(1)}ms after index evaluation`
);
const isDesktopWidgetRenderer = isDesktopWidgetWindow();

if (!isDesktopWidgetRenderer) {
  startStartupDiagnostics();
}

if (isDesktopWidgetRenderer) {
  const disableGlobalThemeMode = () => document.documentElement.removeAttribute('data-theme-mode');
  disableGlobalThemeMode();
  new MutationObserver(disableGlobalThemeMode).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme-mode']
  });
}

root.render(
  <React.StrictMode>
    {isDesktopWidgetRenderer ? (
      getDesktopWidgetType() === 'month' ? (
        <DesktopMonthWidgetView />
      ) : getDesktopWidgetType() === 'quick' ? (
        <DesktopQuickWidgetView />
      ) : getDesktopWidgetType() === 'editor' ? (
        <DesktopTodoQuickEditorWindowView />
      ) : getDesktopWidgetType() === 'timer' ? (
        <DesktopTimerWidgetView />
      ) : (
        <DesktopTodayWidgetView />
      )
    ) : <App />}
  </React.StrictMode>
);
