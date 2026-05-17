/// <reference types="vite/client" />

type DesktopWidgetBridgeAction =
  | { type: 'open_todo'; todoId: string }
  | { type: 'toggle_todo'; todoId: string }
  | { type: 'start_focus'; todoId: string };

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
  };
}
