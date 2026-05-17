/**
 * @file preload.ts
 * @input Window Object
 * @output IPC Bridge
 * @pos Electron Preload
 * @description Exposes safe IPC methods to the renderer process via `contextBridge`, enabling communication between the web app and the main process.
 * @updated 2026-05-17: 扩展了桌面小组件的 IPC 桥接，暴露了 openTimer() 和 closeTimer() 以支持桌面计时器小组件（timer widget）的启用与停用。
 * @updated 2026-05-17: 扩展了桌面小组件的 IPC 桥接，暴露了 openQuick() 和 closeQuick() 方法以支持小事清单小组件的打开与关闭。并在 DesktopWidgetMainAction 中新增了 add_quick_todo 动作支持。
 * @updated 2026-05-17: Added quick-editor IPC bridge methods so widget clicks can open and close a transparent external todo editor window.
 * @updated 2026-05-17: Added a dedicated desktop today-widget and monthly-widget bridge so Electron windows can open, close, and forward lightweight todo actions without reaching for raw IPC in every component.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { ipcRenderer, contextBridge } from 'electron'

type DesktopWidgetMainAction =
    | { type: 'open_todo'; todoId: string }
    | { type: 'toggle_todo'; todoId: string }
    | { type: 'start_focus'; todoId: string }
    | { type: 'add_quick_todo'; title: string }
    | { type: 'stop_active_session_and_save'; sessionId: string }

type DesktopTodoQuickEditorPayload = {
    todoId: string
    theme: 'light' | 'dark'
    x: number
    y: number
}

const DESKTOP_WIDGET_MAIN_ACTION_CHANNEL = 'desktop-widget:main-action'
const DESKTOP_TODO_QUICK_EDITOR_STATE_CHANNEL = 'desktop-widget:todo-quick-editor-state'

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
    openMonth() {
        ipcRenderer.send('desktop-widget:open-month')
    },
    closeMonth() {
        ipcRenderer.send('desktop-widget:close-month')
    },
    openQuick() {
        ipcRenderer.send('desktop-widget:open-quick')
    },
    closeQuick() {
        ipcRenderer.send('desktop-widget:close-quick')
    },
    openTimer() {
        ipcRenderer.send('desktop-widget:open-timer')
    },
    closeTimer() {
        ipcRenderer.send('desktop-widget:close-timer')
    },
    openTodoQuickEditor(payload: DesktopTodoQuickEditorPayload) {
        ipcRenderer.send('desktop-widget:open-todo-quick-editor', payload)
    },
    closeTodoQuickEditor() {
        ipcRenderer.send('desktop-widget:close-todo-quick-editor')
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
    },
    getTodoQuickEditorState() {
        return ipcRenderer.invoke('desktop-widget:get-todo-quick-editor-state')
    },
    onTodoQuickEditorState(listener: (payload: DesktopTodoQuickEditorPayload) => void) {
        const wrappedListener = (_event: Electron.IpcRendererEvent, payload: DesktopTodoQuickEditorPayload) => {
            listener(payload)
        }

        ipcRenderer.on(DESKTOP_TODO_QUICK_EDITOR_STATE_CHANNEL, wrappedListener)

        return () => {
            ipcRenderer.off(DESKTOP_TODO_QUICK_EDITOR_STATE_CHANNEL, wrappedListener)
        }
    }
})
