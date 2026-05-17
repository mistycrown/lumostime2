/**
 * @file main.ts
 * @input App Lifecycle
 * @output Window Management
 * @pos Electron Main
 * @description Entry point for the Electron application. Handles main-window and desktop-widget creation, lifecycle events, and inter-process communication (IPC).
 * @updated 2026-05-17: 扩展了 Electron 主进程，新增对桌面计时器小组件（timer widget）独立窗口的生命周期管理（常驻置顶、固定大小、不可缩放、拖动坐标持久化）以及配套 IPC 接口。
 * @updated 2026-05-17: 扩展了 Electron 主进程小组件管理器，新增对桌面小事清单小组件（quick widget）独立窗口的生命周期、拖拽缩放边界持久化和 IPC 调起/关闭支持。并支持了 add_quick_todo 动作的透明转发。
 * @updated 2026-05-17: Added a dedicated transparent desktop quick-editor window so widget todo clicks can open one always-on-top editor beyond the source widget bounds.
 * @updated 2026-05-17: Added a dedicated desktop today-widget and monthly-widget windows with persisted bounds, main-renderer action forwarding, and widget open/close IPC handlers for Electron builds.
 * @updated 2026-04-09: Added Obsidian image attachment export IPC handler for desktop builds.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { app, BrowserWindow, ipcMain, screen, shell } from 'electron';
import fs from 'fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type DesktopWidgetMainAction =
  | { type: 'open_todo'; todoId: string }
  | { type: 'toggle_todo'; todoId: string }
  | { type: 'start_focus'; todoId: string }
  | { type: 'add_quick_todo'; title: string }
  | { type: 'stop_active_session_and_save'; sessionId: string };

type DesktopTodoQuickEditorPayload = {
  todoId: string;
  theme: 'light' | 'dark';
  x: number;
  y: number;
};

type PersistedWidgetWindowState = {
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// 鈹溾攢鈹?dist-electron
// 鈹?鈹溾攢鈹?main
// 鈹?鈹?鈹斺攢鈹€ index.js    > Electron-Main
// 鈹?鈹斺攢鈹?preload
// 鈹?  鈹斺攢鈹€ index.mjs   > Preload-Scripts
// 鈹溾攢鈹?dist
// 鈹?鈹斺攢鈹€ index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

const DESKTOP_WIDGET_QUERY_KEY = 'window';
const DESKTOP_WIDGET_QUERY_VALUE = 'desktop-widget';
const DESKTOP_MONTH_WIDGET_QUERY_VALUE = 'desktop-month';
const DESKTOP_QUICK_WIDGET_QUERY_VALUE = 'desktop-quick';
const DESKTOP_TIMER_WIDGET_QUERY_VALUE = 'desktop-timer';
const DESKTOP_EDITOR_WIDGET_QUERY_VALUE = 'desktop-editor';
const DESKTOP_WIDGET_MAIN_ACTION_CHANNEL = 'desktop-widget:main-action';
const DESKTOP_TODO_QUICK_EDITOR_STATE_CHANNEL = 'desktop-widget:todo-quick-editor-state';
const DEFAULT_WIDGET_WIDTH = 360;
const DEFAULT_WIDGET_HEIGHT = 520;
const DEFAULT_MONTH_WIDGET_WIDTH = 880;
const DEFAULT_MONTH_WIDGET_HEIGHT = 640;
const DEFAULT_TIMER_WIDGET_WIDTH = 80;
const DEFAULT_TIMER_WIDGET_HEIGHT = 32;
const TODO_QUICK_EDITOR_WIDTH = 296;
const TODO_QUICK_EDITOR_HEIGHT = 300;
const TODO_QUICK_EDITOR_OFFSET_PX = 12;
const TODO_QUICK_EDITOR_BLUR_GUARD_MS = 250;
const TODO_QUICK_EDITOR_HIDE_DELAY_MS = 120;
const WIDGET_STATE_FILENAME = 'desktop-widget-state.json';
const MONTH_WIDGET_STATE_FILENAME = 'desktop-month-widget-state.json';
const QUICK_WIDGET_STATE_FILENAME = 'desktop-quick-widget-state.json';
const TIMER_WIDGET_STATE_FILENAME = 'desktop-timer-widget-state.json';

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let widgetWindow: BrowserWindow | null = null;
let monthWidgetWindow: BrowserWindow | null = null;
let quickWidgetWindow: BrowserWindow | null = null;
let timerWidgetWindow: BrowserWindow | null = null;
let todoQuickEditorWindow: BrowserWindow | null = null;
let isMainRendererReady = false;
let pendingDesktopWidgetActions: DesktopWidgetMainAction[] = [];
let desktopTodoQuickEditorPayload: DesktopTodoQuickEditorPayload | null = null;
let isTodoQuickEditorReady = false;
let todoQuickEditorIgnoreBlurUntil = 0;
let todoQuickEditorHideTimeout: ReturnType<typeof setTimeout> | null = null;

// Preload script is in the same directory as main.js after build
const preload = path.join(__dirname, 'preload.mjs');
const indexHtml = path.join(RENDERER_DIST, 'index.html');

const getIconPath = () => path.join(process.env.VITE_PUBLIC || '', 'icon.ico');

const getWidgetStatePath = () => path.join(app.getPath('userData'), WIDGET_STATE_FILENAME);
const getMonthWidgetStatePath = () => path.join(app.getPath('userData'), MONTH_WIDGET_STATE_FILENAME);
const getQuickWidgetStatePath = () => path.join(app.getPath('userData'), QUICK_WIDGET_STATE_FILENAME);
const getTimerWidgetStatePath = () => path.join(app.getPath('userData'), TIMER_WIDGET_STATE_FILENAME);

const buildRendererUrl = (windowType?: string): string => {
  if (VITE_DEV_SERVER_URL) {
    const devUrl = new URL(VITE_DEV_SERVER_URL);
    if (windowType) {
      devUrl.searchParams.set(DESKTOP_WIDGET_QUERY_KEY, windowType);
    }
    return devUrl.toString();
  }

  const fileUrl = pathToFileURL(indexHtml);
  if (windowType) {
    fileUrl.searchParams.set(DESKTOP_WIDGET_QUERY_KEY, windowType);
  }
  return fileUrl.toString();
};

const focusWindow = (targetWindow: BrowserWindow | null) => {
  if (!targetWindow) {
    return;
  }

  if (targetWindow.isMinimized()) {
    targetWindow.restore();
  }
  targetWindow.show();
  targetWindow.focus();
};

const clampWidgetBounds = (bounds?: PersistedWidgetWindowState['bounds']) => {
  const fallbackWidth = DEFAULT_WIDGET_WIDTH;
  const fallbackHeight = DEFAULT_WIDGET_HEIGHT;

  if (!bounds) {
    const primaryWorkArea = screen.getPrimaryDisplay().workArea;
    return {
      width: fallbackWidth,
      height: fallbackHeight,
      x: primaryWorkArea.x + primaryWorkArea.width - fallbackWidth - 32,
      y: primaryWorkArea.y + 32
    };
  }

  const desiredWidth = Math.max(180, Math.floor(bounds.width || fallbackWidth));
  const desiredHeight = Math.max(200, Math.floor(bounds.height || fallbackHeight));
  const display = screen.getDisplayMatching({
    x: bounds.x,
    y: bounds.y,
    width: desiredWidth,
    height: desiredHeight
  });
  const workArea = display.workArea;
  const width = Math.min(desiredWidth, workArea.width);
  const height = Math.min(desiredHeight, workArea.height);
  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const maxY = workArea.y + Math.max(0, workArea.height - height);

  return {
    width,
    height,
    x: Math.min(Math.max(bounds.x, workArea.x), maxX),
    y: Math.min(Math.max(bounds.y, workArea.y), maxY)
  };
};

const clampMonthWidgetBounds = (bounds?: PersistedWidgetWindowState['bounds']) => {
  const fallbackWidth = DEFAULT_MONTH_WIDGET_WIDTH;
  const fallbackHeight = DEFAULT_MONTH_WIDGET_HEIGHT;

  if (!bounds) {
    const primaryWorkArea = screen.getPrimaryDisplay().workArea;
    return {
      width: fallbackWidth,
      height: fallbackHeight,
      x: primaryWorkArea.x + Math.max(32, Math.floor((primaryWorkArea.width - fallbackWidth) / 2)),
      y: primaryWorkArea.y + Math.max(32, Math.floor((primaryWorkArea.height - fallbackHeight) / 2))
    };
  }

  const desiredWidth = Math.max(400, Math.floor(bounds.width || fallbackWidth));
  const desiredHeight = Math.max(300, Math.floor(bounds.height || fallbackHeight));
  const display = screen.getDisplayMatching({
    x: bounds.x,
    y: bounds.y,
    width: desiredWidth,
    height: desiredHeight
  });
  const workArea = display.workArea;
  const width = Math.min(desiredWidth, workArea.width);
  const height = Math.min(desiredHeight, workArea.height);
  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const maxY = workArea.y + Math.max(0, workArea.height - height);

  return {
    width,
    height,
    x: Math.min(Math.max(bounds.x, workArea.x), maxX),
    y: Math.min(Math.max(bounds.y, workArea.y), maxY)
  };
};

const readMonthWidgetWindowState = async (): Promise<PersistedWidgetWindowState> => {
  try {
    const raw = await fs.readFile(getMonthWidgetStatePath(), 'utf-8');
    return JSON.parse(raw) as PersistedWidgetWindowState;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error('[Electron] Failed to read desktop month widget state', error);
    }
    return {};
  }
};

const saveMonthWidgetWindowState = async (targetWindow: BrowserWindow | null) => {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  try {
    const bounds = clampMonthWidgetBounds(targetWindow.getBounds());
    await fs.writeFile(
      getMonthWidgetStatePath(),
      JSON.stringify({ bounds }, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('[Electron] Failed to save desktop month widget state', error);
  }
};

const readWidgetWindowState = async (): Promise<PersistedWidgetWindowState> => {
  try {
    const raw = await fs.readFile(getWidgetStatePath(), 'utf-8');
    return JSON.parse(raw) as PersistedWidgetWindowState;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error('[Electron] Failed to read desktop widget state', error);
    }
    return {};
  }
};

const saveWidgetWindowState = async (targetWindow: BrowserWindow | null) => {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  try {
    const bounds = clampWidgetBounds(targetWindow.getBounds());
    await fs.writeFile(
      getWidgetStatePath(),
      JSON.stringify({ bounds }, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('[Electron] Failed to save desktop widget state', error);
  }
};

const readQuickWidgetWindowState = async (): Promise<PersistedWidgetWindowState> => {
  try {
    const raw = await fs.readFile(getQuickWidgetStatePath(), 'utf-8');
    return JSON.parse(raw) as PersistedWidgetWindowState;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error('[Electron] Failed to read desktop quick widget state', error);
    }
    return {};
  }
};

const saveQuickWidgetWindowState = async (targetWindow: BrowserWindow | null) => {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  try {
    const bounds = clampWidgetBounds(targetWindow.getBounds());
    await fs.writeFile(
      getQuickWidgetStatePath(),
      JSON.stringify({ bounds }, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('[Electron] Failed to save desktop quick widget state', error);
  }
};

const clampTimerWidgetBounds = (bounds?: PersistedWidgetWindowState['bounds']) => {
  const fallbackWidth = DEFAULT_TIMER_WIDGET_WIDTH;
  const fallbackHeight = DEFAULT_TIMER_WIDGET_HEIGHT;

  if (!bounds) {
    const primaryWorkArea = screen.getPrimaryDisplay().workArea;
    return {
      width: fallbackWidth,
      height: fallbackHeight,
      x: primaryWorkArea.x + primaryWorkArea.width - fallbackWidth - 32,
      y: primaryWorkArea.y + 32
    };
  }

  const display = screen.getDisplayMatching({
    x: bounds.x,
    y: bounds.y,
    width: fallbackWidth,
    height: fallbackHeight
  });
  const workArea = display.workArea;
  const width = fallbackWidth;
  const height = fallbackHeight;
  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const maxY = workArea.y + Math.max(0, workArea.height - height);

  return {
    width,
    height,
    x: Math.min(Math.max(bounds.x, workArea.x), maxX),
    y: Math.min(Math.max(bounds.y, workArea.y), maxY)
  };
};

const readTimerWidgetWindowState = async (): Promise<PersistedWidgetWindowState> => {
  try {
    const raw = await fs.readFile(getTimerWidgetStatePath(), 'utf-8');
    return JSON.parse(raw) as PersistedWidgetWindowState;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error('[Electron] Failed to read desktop timer widget state', error);
    }
    return {};
  }
};

const saveTimerWidgetWindowState = async (targetWindow: BrowserWindow | null) => {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  try {
    const bounds = clampTimerWidgetBounds(targetWindow.getBounds());
    await fs.writeFile(
      getTimerWidgetStatePath(),
      JSON.stringify({ bounds }, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('[Electron] Failed to save desktop timer widget state', error);
  }
};

const flushPendingDesktopWidgetActions = () => {
  if (!mainWindow || mainWindow.isDestroyed() || !isMainRendererReady) {
    return;
  }

  const queuedActions = [...pendingDesktopWidgetActions];
  pendingDesktopWidgetActions = [];
  queuedActions.forEach((action) => {
    mainWindow?.webContents.send(DESKTOP_WIDGET_MAIN_ACTION_CHANNEL, action);
  });
};

const queueDesktopWidgetAction = (action: DesktopWidgetMainAction) => {
  pendingDesktopWidgetActions.push(action);
  flushPendingDesktopWidgetActions();
};

const configureExternalLinks = (targetWindow: BrowserWindow) => {
  targetWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
};

const attachWidgetShowFallback = (
  targetWindow: BrowserWindow,
  label: 'today' | 'month' | 'quick' | 'timer' | 'editor'
) => {
  let didShow = false;

  const showWindow = (reason: string) => {
    if (didShow || targetWindow.isDestroyed()) {
      return;
    }

    didShow = true;
    targetWindow.show();
    console.info(`[Electron] Showed ${label} widget via ${reason}`);
  };

  targetWindow.once('ready-to-show', () => {
    showWindow('ready-to-show');
  });

  targetWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      showWindow('did-finish-load-fallback');
    }, 120);
  });

  targetWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Electron] ${label} widget failed to load`, { errorCode, errorDescription });
  });

  targetWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Electron] ${label} widget renderer exited`, details);
  });
};

async function createMainWindow() {
  const iconPath = getIconPath();
  console.log('Icon Path:', iconPath);

  mainWindow = new BrowserWindow({
    title: 'LumosTime',
    icon: iconPath,
    width: 600,
    height: 900,
    resizable: true,
    webPreferences: {
      preload,
      webSecurity: false
    }
  });
  isMainRendererReady = false;

  mainWindow.setMenuBarVisibility(false);
  configureExternalLinks(mainWindow);
  mainWindow.webContents.on('did-start-loading', () => {
    isMainRendererReady = false;
  });

  if (VITE_DEV_SERVER_URL) {
    console.log('Loading URL:', VITE_DEV_SERVER_URL);
  } else {
    console.log('Loading File:', indexHtml);
  }
  await mainWindow.loadURL(buildRendererUrl());

  if (VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    isMainRendererReady = false;
  });

  return mainWindow;
}

const ensureMainWindow = async () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return createMainWindow();
  }
  return mainWindow;
};

const focusMainWindow = async () => {
  const targetWindow = await ensureMainWindow();
  focusWindow(targetWindow);
  return targetWindow;
};

async function createWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    focusWindow(widgetWindow);
    return widgetWindow;
  }

  const widgetState = await readWidgetWindowState();
  const widgetBounds = clampWidgetBounds(widgetState.bounds);

  widgetWindow = new BrowserWindow({
    title: 'LumosTime Widget',
    icon: getIconPath(),
    width: widgetBounds.width,
    height: widgetBounds.height,
    x: widgetBounds.x,
    y: widgetBounds.y,
    frame: false,
    transparent: true,
    resizable: true,
    thickFrame: false,
    minimizable: true,
    maximizable: true,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload,
      webSecurity: false
    }
  });

  widgetWindow.setMenuBarVisibility(false);
  configureExternalLinks(widgetWindow);
  attachWidgetShowFallback(widgetWindow, 'today');
  await widgetWindow.loadURL(buildRendererUrl(DESKTOP_WIDGET_QUERY_VALUE));

  widgetWindow.on('move', () => {
    void saveWidgetWindowState(widgetWindow);
  });
  widgetWindow.on('resize', () => {
    void saveWidgetWindowState(widgetWindow);
  });
  widgetWindow.on('close', () => {
    void saveWidgetWindowState(widgetWindow);
  });
  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });

  return widgetWindow;
}

async function createMonthWidgetWindow() {
  if (monthWidgetWindow && !monthWidgetWindow.isDestroyed()) {
    focusWindow(monthWidgetWindow);
    return monthWidgetWindow;
  }

  const widgetState = await readMonthWidgetWindowState();
  const widgetBounds = clampMonthWidgetBounds(widgetState.bounds);

  monthWidgetWindow = new BrowserWindow({
    title: 'LumosTime Month Widget',
    icon: getIconPath(),
    width: widgetBounds.width,
    height: widgetBounds.height,
    x: widgetBounds.x,
    y: widgetBounds.y,
    frame: false,
    transparent: true,
    resizable: true,
    thickFrame: false,
    minimizable: true,
    maximizable: true,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload,
      webSecurity: false
    }
  });

  monthWidgetWindow.setMenuBarVisibility(false);
  configureExternalLinks(monthWidgetWindow);
  attachWidgetShowFallback(monthWidgetWindow, 'month');
  await monthWidgetWindow.loadURL(buildRendererUrl(DESKTOP_MONTH_WIDGET_QUERY_VALUE));

  monthWidgetWindow.on('move', () => {
    void saveMonthWidgetWindowState(monthWidgetWindow);
  });
  monthWidgetWindow.on('resize', () => {
    void saveMonthWidgetWindowState(monthWidgetWindow);
  });
  monthWidgetWindow.on('close', () => {
    void saveMonthWidgetWindowState(monthWidgetWindow);
  });
  monthWidgetWindow.on('closed', () => {
    monthWidgetWindow = null;
  });

  return monthWidgetWindow;
}

async function createQuickWidgetWindow() {
  if (quickWidgetWindow && !quickWidgetWindow.isDestroyed()) {
    focusWindow(quickWidgetWindow);
    return quickWidgetWindow;
  }

  const widgetState = await readQuickWidgetWindowState();
  const widgetBounds = clampWidgetBounds(widgetState.bounds);

  quickWidgetWindow = new BrowserWindow({
    title: 'LumosTime Quick Widget',
    icon: getIconPath(),
    width: widgetBounds.width,
    height: widgetBounds.height,
    x: widgetBounds.x,
    y: widgetBounds.y,
    frame: false,
    transparent: true,
    resizable: true,
    thickFrame: false,
    minimizable: true,
    maximizable: true,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload,
      webSecurity: false
    }
  });

  quickWidgetWindow.setMenuBarVisibility(false);
  configureExternalLinks(quickWidgetWindow);
  attachWidgetShowFallback(quickWidgetWindow, 'quick');
  await quickWidgetWindow.loadURL(buildRendererUrl(DESKTOP_QUICK_WIDGET_QUERY_VALUE));

  quickWidgetWindow.on('move', () => {
    void saveQuickWidgetWindowState(quickWidgetWindow);
  });
  quickWidgetWindow.on('resize', () => {
    void saveQuickWidgetWindowState(quickWidgetWindow);
  });
  quickWidgetWindow.on('close', () => {
    void saveQuickWidgetWindowState(quickWidgetWindow);
  });
  quickWidgetWindow.on('closed', () => {
    quickWidgetWindow = null;
  });

  return quickWidgetWindow;
}

async function createTimerWidgetWindow() {
  if (timerWidgetWindow && !timerWidgetWindow.isDestroyed()) {
    focusWindow(timerWidgetWindow);
    return timerWidgetWindow;
  }

  const widgetState = await readTimerWidgetWindowState();
  const widgetBounds = clampTimerWidgetBounds(widgetState.bounds);

  timerWidgetWindow = new BrowserWindow({
    title: 'LumosTime Timer Widget',
    icon: getIconPath(),
    width: widgetBounds.width,
    height: widgetBounds.height,
    x: widgetBounds.x,
    y: widgetBounds.y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    thickFrame: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload,
      webSecurity: false
    }
  });

  timerWidgetWindow.setMenuBarVisibility(false);
  configureExternalLinks(timerWidgetWindow);
  attachWidgetShowFallback(timerWidgetWindow, 'timer');
  await timerWidgetWindow.loadURL(buildRendererUrl(DESKTOP_TIMER_WIDGET_QUERY_VALUE));

  timerWidgetWindow.on('move', () => {
    void saveTimerWidgetWindowState(timerWidgetWindow);
  });
  timerWidgetWindow.on('close', () => {
    void saveTimerWidgetWindowState(timerWidgetWindow);
  });
  timerWidgetWindow.on('closed', () => {
    timerWidgetWindow = null;
  });

  return timerWidgetWindow;
}

const getTodoQuickEditorBounds = (payload: DesktopTodoQuickEditorPayload) => {
  const display = screen.getDisplayNearestPoint({
    x: Math.round(payload.x),
    y: Math.round(payload.y)
  });
  const workArea = display.workArea;
  const width = TODO_QUICK_EDITOR_WIDTH;
  const height = TODO_QUICK_EDITOR_HEIGHT;
  const maxX = workArea.x + Math.max(0, workArea.width - width);
  const maxY = workArea.y + Math.max(0, workArea.height - height);

  return {
    width,
    height,
    x: Math.min(
      Math.max(Math.round(payload.x + TODO_QUICK_EDITOR_OFFSET_PX), workArea.x),
      maxX
    ),
    y: Math.min(
      Math.max(Math.round(payload.y + TODO_QUICK_EDITOR_OFFSET_PX), workArea.y),
      maxY
    )
  };
};

const publishTodoQuickEditorState = () => {
  if (
    !todoQuickEditorWindow
    || todoQuickEditorWindow.isDestroyed()
    || !desktopTodoQuickEditorPayload
  ) {
    return;
  }

  todoQuickEditorWindow.webContents.send(
    DESKTOP_TODO_QUICK_EDITOR_STATE_CHANNEL,
    desktopTodoQuickEditorPayload
  );
};

const clearTodoQuickEditorHideTimeout = () => {
  if (todoQuickEditorHideTimeout) {
    clearTimeout(todoQuickEditorHideTimeout);
    todoQuickEditorHideTimeout = null;
  }
};

const armTodoQuickEditorBlurGuard = () => {
  todoQuickEditorIgnoreBlurUntil = Date.now() + TODO_QUICK_EDITOR_BLUR_GUARD_MS;
};

const hideTodoQuickEditorWindow = () => {
  clearTodoQuickEditorHideTimeout();
  if (
    todoQuickEditorWindow
    && !todoQuickEditorWindow.isDestroyed()
    && todoQuickEditorWindow.isVisible()
  ) {
    todoQuickEditorWindow.hide();
  }
};

const scheduleHideTodoQuickEditorWindow = () => {
  clearTodoQuickEditorHideTimeout();
  todoQuickEditorHideTimeout = setTimeout(() => {
    if (
      todoQuickEditorWindow
      && !todoQuickEditorWindow.isDestroyed()
      && !todoQuickEditorWindow.isFocused()
    ) {
      todoQuickEditorWindow.hide();
    }
  }, TODO_QUICK_EDITOR_HIDE_DELAY_MS);
};

const showTodoQuickEditorWindow = () => {
  if (!todoQuickEditorWindow || todoQuickEditorWindow.isDestroyed()) {
    return;
  }

  clearTodoQuickEditorHideTimeout();
  armTodoQuickEditorBlurGuard();
  todoQuickEditorWindow.show();
  todoQuickEditorWindow.focus();
};

const closeTodoQuickEditorWindow = () => {
  hideTodoQuickEditorWindow();
};

async function createTodoQuickEditorWindow() {
  if (!desktopTodoQuickEditorPayload) {
    return null;
  }

  const editorBounds = getTodoQuickEditorBounds(desktopTodoQuickEditorPayload);

  if (todoQuickEditorWindow && !todoQuickEditorWindow.isDestroyed()) {
    todoQuickEditorWindow.setBounds(editorBounds);
    if (isTodoQuickEditorReady) {
      publishTodoQuickEditorState();
      showTodoQuickEditorWindow();
    }
    return todoQuickEditorWindow;
  }

  isTodoQuickEditorReady = false;
  todoQuickEditorWindow = new BrowserWindow({
    title: 'LumosTime Quick Editor',
    icon: getIconPath(),
    width: editorBounds.width,
    height: editorBounds.height,
    x: editorBounds.x,
    y: editorBounds.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    hasShadow: false,
    thickFrame: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload,
      webSecurity: false
    }
  });

  todoQuickEditorWindow.setMenuBarVisibility(false);
  configureExternalLinks(todoQuickEditorWindow);
  todoQuickEditorWindow.webContents.once('did-finish-load', () => {
    isTodoQuickEditorReady = true;
    publishTodoQuickEditorState();
    showTodoQuickEditorWindow();
  });
  await todoQuickEditorWindow.loadURL(buildRendererUrl(DESKTOP_EDITOR_WIDGET_QUERY_VALUE));

  todoQuickEditorWindow.on('focus', () => {
    clearTodoQuickEditorHideTimeout();
  });
  todoQuickEditorWindow.on('blur', () => {
    if (!todoQuickEditorWindow || todoQuickEditorWindow.webContents.isDevToolsOpened()) {
      return;
    }
    if (Date.now() < todoQuickEditorIgnoreBlurUntil) {
      return;
    }
    scheduleHideTodoQuickEditorWindow();
  });
  todoQuickEditorWindow.on('closed', () => {
    clearTodoQuickEditorHideTimeout();
    todoQuickEditorWindow = null;
    isTodoQuickEditorReady = false;
  });

  return todoQuickEditorWindow;
}

app.whenReady().then(() => {
  void createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('second-instance', () => {
  if (mainWindow) {
    focusWindow(mainWindow);
    return;
  }

  if (widgetWindow || monthWidgetWindow || quickWidgetWindow || timerWidgetWindow || todoQuickEditorWindow) {
    void focusMainWindow();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    focusWindow(mainWindow);
    return;
  }

  void createMainWindow();
});

// New window example arg: new windows url
ipcMain.handle('open-win', async (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (VITE_DEV_SERVER_URL) {
    await childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`);
  } else {
    await childWindow.loadURL(`${buildRendererUrl()}#${arg}`);
  }
});

ipcMain.on('desktop-widget:open', () => {
  void createWidgetWindow();
});

ipcMain.on('desktop-widget:close', () => {
  widgetWindow?.close();
  closeTodoQuickEditorWindow();
});

ipcMain.on('desktop-widget:open-month', () => {
  void createMonthWidgetWindow();
});

ipcMain.on('desktop-widget:close-month', () => {
  monthWidgetWindow?.close();
  closeTodoQuickEditorWindow();
});

ipcMain.on('desktop-widget:open-quick', () => {
  void createQuickWidgetWindow();
});

ipcMain.on('desktop-widget:close-quick', () => {
  quickWidgetWindow?.close();
  closeTodoQuickEditorWindow();
});

ipcMain.on('desktop-widget:open-timer', () => {
  void createTimerWidgetWindow();
});

ipcMain.on('desktop-widget:close-timer', () => {
  timerWidgetWindow?.close();
});

ipcMain.on('desktop-widget:open-todo-quick-editor', (_, payload: DesktopTodoQuickEditorPayload) => {
  desktopTodoQuickEditorPayload = payload;
  void createTodoQuickEditorWindow();
});

ipcMain.on('desktop-widget:close-todo-quick-editor', () => {
  closeTodoQuickEditorWindow();
});

ipcMain.on('desktop-widget:open-main', () => {
  void focusMainWindow();
});

ipcMain.on('desktop-widget:request-main-action', (_, action: DesktopWidgetMainAction) => {
  if (action.type === 'open_todo') {
    void focusMainWindow().then(() => {
      queueDesktopWidgetAction(action);
    });
  } else {
    queueDesktopWidgetAction(action);
  }
});

ipcMain.on('desktop-widget:set-opacity', (_, _opacity: number) => {
  // 空操作，避免原生整窗透明度导致文字/按钮变虚。完全在前端 CSS 层控制背景的 rgba 透明度。
});

ipcMain.on('desktop-widget:set-theme', (event, _theme: 'light' | 'dark') => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    // 强制使用完全透明底色，避免遮挡渲染层 CSS 的背景半透明透底效果
    win.setBackgroundColor('#00000000');
  }
});

ipcMain.handle('desktop-widget:get-bounds', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    return win.getBounds();
  }
  return null;
});

ipcMain.handle('desktop-widget:get-todo-quick-editor-state', () => {
  return desktopTodoQuickEditorPayload;
});

ipcMain.on('desktop-widget:set-bounds', (event, bounds: { x: number; y: number; width: number; height: number }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.setBounds(bounds);
  }
});

ipcMain.on('desktop-widget:main-ready', () => {
  isMainRendererReady = true;
  flushPendingDesktopWidgetActions();
});

ipcMain.handle('write-obsidian-file', async (_, { filePath, content }) => {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    let finalContent = content;

    try {
      const existingContent = await fs.readFile(filePath, 'utf-8');
      finalContent = existingContent + '\n\n---\n\n' + content;
      console.log(`[Electron] Appending Obsidian file content: ${filePath}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`[Electron] Creating Obsidian file: ${filePath}`);
      } else {
        throw error;
      }
    }

    await fs.writeFile(filePath, finalContent, 'utf-8');

    console.log(`[Electron] Obsidian file write succeeded: ${filePath}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Electron] Failed to write Obsidian file:', error);
    throw new Error(`File write failed: ${error.message}`);
  }
});

ipcMain.handle('write-obsidian-images', async (_, { rootPath, imageFolderName, files }) => {
  try {
    if (!rootPath || !imageFolderName || !Array.isArray(files)) {
      throw new Error('Invalid parameters for image export');
    }

    const safeRoot = path.resolve(rootPath);
    const targetDir = path.resolve(safeRoot, imageFolderName);
    const relativeDir = path.relative(safeRoot, targetDir);
    if (relativeDir.startsWith('..') || path.isAbsolute(relativeDir)) {
      throw new Error('Image folder must stay within the configured root path');
    }

    await fs.mkdir(targetDir, { recursive: true });

    let saved = 0;
    for (const file of files) {
      if (!file?.filename || !file?.base64Data) continue;
      const buffer = Buffer.from(file.base64Data, 'base64');
      const destPath = path.join(targetDir, file.filename);
      await fs.writeFile(destPath, buffer);
      saved += 1;
    }

    return { success: true, saved };
  } catch (error: any) {
    console.error('Failed to write Obsidian images:', error);
    throw new Error(`Image file write failed: ${error.message}`);
  }
});

// App icon update support for the Electron desktop build.
ipcMain.on('update-app-icon', (_, iconPath) => {
  try {
    if (mainWindow) {
      console.log('[Electron] Received app icon update request:', iconPath);

      const cleanPath = iconPath.startsWith('/') ? iconPath.slice(1) : iconPath;
      console.log('[Electron] Sanitized icon path:', cleanPath);

      const fullIconPath = path.join(process.env.VITE_PUBLIC || '', cleanPath);
      console.log('[Electron] Resolved icon path:', fullIconPath);
      console.log('[Electron] Icon exists:', require('fs').existsSync(fullIconPath));

      if (!require('fs').existsSync(fullIconPath)) {
        console.log('[Electron] Icon file missing, falling back to default icon');
        const defaultIcon = getIconPath();
        mainWindow.setIcon(defaultIcon);
        return;
      }

      console.log('[Electron] Applying icon path:', fullIconPath);

      mainWindow.setIcon(fullIconPath);
      console.log('[Electron] Window icon updated');

      if (process.platform === 'win32') {
        mainWindow.setOverlayIcon(fullIconPath, 'LumosTime');
        console.log('[Electron] Taskbar overlay icon updated');
      }

      console.log('[Electron] App icon update succeeded');
    } else {
      console.log('[Electron] Main window is unavailable for icon updates');
    }
  } catch (error: any) {
    console.error('[Electron] Failed to update app icon:', error);
    console.error('[Electron] Error stack:', error.stack);
  }
});
