/**
 * @file preload.ts
 * @input Window Object
 * @output IPC Bridge
 * @pos Electron Preload
 * @description Exposes safe IPC methods to the renderer process via `contextBridge`, enabling communication between the web app and the main process.
 * @updated 2026-05-17: Added a dedicated desktop-widget bridge so Electron windows can open, close, and forward lightweight todo actions without reaching for raw IPC in every component.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { ipcRenderer, contextBridge } from 'electron'

type DesktopWidgetMainAction =
    | { type: 'open_todo'; todoId: string }
    | { type: 'toggle_todo'; todoId: string }
    | { type: 'start_focus'; todoId: string }

const DESKTOP_WIDGET_MAIN_ACTION_CHANNEL = 'desktop-widget:main-action'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args
        return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, ...omit] = args
        return ipcRenderer.off(channel, ...omit)
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args
        return ipcRenderer.send(channel, ...omit)
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args
        return ipcRenderer.invoke(channel, ...omit)
    },

    // You can expose other weird stuff here
})

contextBridge.exposeInMainWorld('desktopWidget', {
    open() {
        ipcRenderer.send('desktop-widget:open')
    },
    close() {
        ipcRenderer.send('desktop-widget:close')
    },
    openMainApp() {
        ipcRenderer.send('desktop-widget:open-main')
    },
    requestMainAction(action: DesktopWidgetMainAction) {
        ipcRenderer.send('desktop-widget:request-main-action', action)
    },
    notifyMainReady() {
        ipcRenderer.send('desktop-widget:main-ready')
    },
    onMainAction(listener: (action: DesktopWidgetMainAction) => void) {
        const wrappedListener = (_event: Electron.IpcRendererEvent, action: DesktopWidgetMainAction) => {
            listener(action)
        }

        ipcRenderer.on(DESKTOP_WIDGET_MAIN_ACTION_CHANNEL, wrappedListener)

        return () => {
            ipcRenderer.off(DESKTOP_WIDGET_MAIN_ACTION_CHANNEL, wrappedListener)
        }
    },
    setOpacity(opacity: number) {
        ipcRenderer.send('desktop-widget:set-opacity', opacity)
    },
    setTheme(theme: 'light' | 'dark') {
        ipcRenderer.send('desktop-widget:set-theme', theme)
    },
    getBounds() {
        return ipcRenderer.invoke('desktop-widget:get-bounds')
    },
    setBounds(bounds: { x: number; y: number; width: number; height: number }) {
        ipcRenderer.send('desktop-widget:set-bounds', bounds)
    }
})
