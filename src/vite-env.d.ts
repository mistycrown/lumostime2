/// <reference types="vite/client" />

declare module '*?raw' {
  const content: string;
  export default content;
}

type DesktopWidgetBridgeAction =
  | { type: 'open_todo'; todoId: string }
  | { type: 'toggle_todo'; todoId: string }
  | { type: 'start_focus'; todoId: string }
  | { type: 'add_quick_todo'; title: string }
  | { type: 'stop_active_session_and_save'; sessionId: string };

type DesktopTodoQuickEditorBridgePayload = {
  todoId: string;
  theme: 'light' | 'dark';
  x: number;
  y: number;
};

interface Window {
  ipcRenderer?: {
    on: (...args: any[]) => any;
    off: (...args: any[]) => any;
    send: (...args: any[]) => any;
    invoke: (...args: any[]) => Promise<any>;
  };
  desktopWidget?: {
    open: () => void;
    close: () => void;
    openMonth: () => void;
    closeMonth: () => void;
    openQuick?: () => void;
    closeQuick?: () => void;
    openTimer?: () => void;
    closeTimer?: () => void;
    openTodoQuickEditor?: (payload: DesktopTodoQuickEditorBridgePayload) => void;
    closeTodoQuickEditor?: () => void;
    openMainApp: () => void;
    requestMainAction: (action: DesktopWidgetBridgeAction) => void;
    notifyMainReady: () => void;
    onMainAction: (
      listener: (action: DesktopWidgetBridgeAction) => void
    ) => (() => void);
    setOpacity?: (opacity: number) => void;
    setTheme?: (theme: 'light' | 'dark') => void;
    getBounds?: () => Promise<{ x: number; y: number; width: number; height: number } | null>;
    setBounds?: (bounds: { x: number; y: number; width: number; height: number }) => void;
    getTodoQuickEditorState?: () => Promise<DesktopTodoQuickEditorBridgePayload | null>;
    onTodoQuickEditorState?: (
      listener: (payload: DesktopTodoQuickEditorBridgePayload) => void
    ) => (() => void);
  };
}
