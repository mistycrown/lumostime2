# Electron Layer

The `electron/` directory contains the main process and preload scripts for running LumosTime as a desktop application.

## Architecture

*   **main.ts**: The entry point. Controls the application lifecycle, creates the browser window, and manages native desktop integrations (if any beyond standard navigation).
*   **preload.ts**: The bridge between the Node.js context (Main Process) and the Browser context (Renderer Process). It uses `contextBridge` to expose safe APIs (like `ipcRenderer`) to the frontend.

## Key Features

*   **Window Management**: Configures the main application window plus the dedicated desktop today-widget, month-widget, quick-widget, timer-widget, desktop AI widget, and transparent quick-editor windows, including widget focus/open-close IPC, persisted widget bounds, compact AI edge-hide state, and a separate always-on-top editor surface that can exceed widget bounds without clipping.
*   **Tray Background Mode**: On Windows, minimizing still behaves normally, while closing the main window hides LumosTime to the system tray so it can keep running in the background until the tray `退出 LumosTime` action is used.
*   **Tray Autostart Toggle**: The Windows tray context menu now includes a `开机自启动` checkbox backed by Electron login-item settings. When Windows launches LumosTime from that login item, the app starts silently in the tray until the user restores the main window.
*   **DEV Data Isolation**: Redirects Electron `userData` into a dedicated `LumosTime Dev` directory whenever the Vite dev server is attached, so desktop development storage stays separate from the packaged app's localStorage, IndexedDB, and persisted widget JSON files.
*   **DEV Navigation Resilience**: Treats Electron `ERR_ABORTED` load interruptions as expected during renderer-triggered reloads in development, so startup data-repair refreshes do not surface as unhandled promise rejections.
*   **DEV Server Retry**: Retries transient `ERR_FAILED` and local connection-startup load errors against the Vite URL during development, which keeps Electron from marking the first window launch as failed while the dev server is still warming up.
*   **Security**: Disables Web Security (`webSecurity: false`) to allow WebDAV access across origins (critical for the Sync feature).
*   **IPC**: Sets up handlers for inter-process communication, including desktop-widget action forwarding back into the main renderer (toggling tasks, opening details, and launching timer focus using the `start_focus` action), widget open/close routes, and the dedicated quick-editor open/close plus payload-sync bridge used by the transparent external todo editor window.
*   **Obsidian Export Helpers**: Writes Markdown files and copies referenced log images into the user-selected Obsidian attachments folder on desktop builds.
