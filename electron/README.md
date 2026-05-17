# Electron Layer

The `electron/` directory contains the main process and preload scripts for running LumosTime as a desktop application.

## Architecture

*   **main.ts**: The entry point. Controls the application lifecycle, creates the browser window, and manages native desktop integrations (if any beyond standard navigation).
*   **preload.ts**: The bridge between the Node.js context (Main Process) and the Browser context (Renderer Process). It uses `contextBridge` to expose safe APIs (like `ipcRenderer`) to the frontend.

## Key Features

*   **Window Management**: Configures the main application window plus the dedicated desktop today-widget and month-widget windows, including widget focus/open-close IPC and persisted widget bounds. Optimized widget resizing on Windows by disabling standard transparency (`transparent: false`) and utilizing solid background to restore native OS resizing boundaries.
*   **Security**: Disables Web Security (`webSecurity: false`) to allow WebDAV access across origins (critical for the Sync feature).
*   **IPC**: Sets up handlers for inter-process communication, including desktop-widget action forwarding back into the main renderer (toggling tasks, opening details, and launching timer focus using the `start_focus` action), along with new month-widget routes (`desktop-widget:open-month`, `desktop-widget:close-month`).
*   **Obsidian Export Helpers**: Writes Markdown files and copies referenced log images into the user-selected Obsidian attachments folder on desktop builds.
