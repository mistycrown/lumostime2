# Electron Layer

The `electron/` directory contains the main process and preload scripts for running LumosTime as a desktop application.

## Architecture

*   **main.ts**: The entry point. Controls the application lifecycle, creates the browser window, and manages native desktop integrations (if any beyond standard navigation).
*   **preload.ts**: The bridge between the Node.js context (Main Process) and the Browser context (Renderer Process). It uses `contextBridge` to expose safe APIs (like `ipcRenderer`) to the frontend.

## Key Features

*   **Window Management**: Configures the main application window plus the dedicated desktop today-widget, month-widget, quick-widget, timer-widget, and transparent quick-editor windows, including widget focus/open-close IPC, persisted widget bounds, and a separate always-on-top editor surface that can exceed widget bounds without clipping.
*   **Security**: Disables Web Security (`webSecurity: false`) to allow WebDAV access across origins (critical for the Sync feature).
*   **IPC**: Sets up handlers for inter-process communication, including desktop-widget action forwarding back into the main renderer (toggling tasks, opening details, and launching timer focus using the `start_focus` action), widget open/close routes, and the dedicated quick-editor open/close plus payload-sync bridge used by the transparent external todo editor window.
*   **Obsidian Export Helpers**: Writes Markdown files and copies referenced log images into the user-selected Obsidian attachments folder on desktop builds.
