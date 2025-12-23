# Electron Layer

The `electron/` directory contains the main process and preload scripts for running LumosTime as a desktop application.

## Architecture

*   **main.ts**: The entry point. Controls the application lifecycle, creates the browser window, and manages native desktop integrations (if any beyond standard navigation).
*   **preload.ts**: The bridge between the Node.js context (Main Process) and the Browser context (Renderer Process). It uses `contextBridge` to expose safe APIs (like `ipcRenderer`) to the frontend.

## Key Features

*   **Window Management**: Configures the main application window (dimensions, icon, frame).
*   **Security**: Disables Web Security (`webSecurity: false`) to allow WebDAV access across origins (critical for the Sync feature).
*   **IPC**: Sets up handlers for inter-process communication if needed.
