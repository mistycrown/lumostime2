# Electron Layer

Update 2026-10-30: `compatibleS3Request.ts` handles signed compatible-S3 requests from the trusted main app and AI app windows (both run the sync lifecycle), limited to their expected top-level renderer frames. Native requests can set an optional standard `User-Agent`, preserve binary bodies and HTTP status, omit session cookies, reject redirects, and let Electron generate restricted Host/Content-Length headers. Empty User-Agent configurations continue using the renderer SDK transport.

Update 2026-10-16: Todo completion actions and quick-editor payloads accept an optional occurrence date, preserving the selected widget date across IPC and midnight boundaries.

The `electron/` directory contains the main process and preload scripts for running LumosTime as a desktop application.

## Architecture

*   **main.ts**: The entry point. Controls the application lifecycle, creates the browser window, and manages native desktop integrations (if any beyond standard navigation).
*   **preload.ts**: The bridge between the Node.js context (Main Process) and the Browser context (Renderer Process). It uses `contextBridge` to expose safe APIs (like `ipcRenderer`) to the frontend.
*   **feishuConnection.ts**: Restricts Feishu IPC to the main app frame and predefined actions at the configured service origin. Requests use the Electron session cookie jar; responses never include cookie headers. OAuth opens in the existing system-browser link handler.

## Key Features

*   **Window Management**: Configures the main application window plus the dedicated desktop today-widget, month-widget, quick-widget, timer-widget, desktop AI widget, and transparent quick-editor windows, including widget focus/open-close IPC, persisted widget bounds, compact AI edge-hide state, and a separate always-on-top editor surface that can exceed widget bounds without clipping.
*   **Tray Background Mode**: On Windows, minimizing still behaves normally, while closing the main window hides LumosTime to the system tray so it can keep running in the background until the tray `退出 LumosTime` action is used.
*   **Tray Autostart Toggle**: The Windows tray `开机自启动` checkbox checks both login-item registration and Windows startup approval. Toggling writes both flags explicitly under the same application identity. It is available in packaged builds; DEV requires the Vite server and cannot register a working standalone login launch.
*   **Native Widget Restore**: `desktopWidgetState.ts` keeps enabled state, bounds, and AI edge docking together in atomic UTF-8 snapshots. Widgets restore directly on app startup, including `--startup`, before main-renderer hydration. Existing localStorage preferences migrate once; manually closed widgets stay closed, while app quit and Windows session end preserve the startup selection. Pending opens are shared to avoid duplicate windows. `widgetWindowBounds.ts` compensates frameless constructor borders and fractional Windows DPI rounding so restarts do not grow or shift the saved layout.
*   **Desktop Startup Tests**: Run `npx vitest run --config vitest.desktop.config.ts` for native persistence, login-item approval, and desktop snapshot checks.
*   **DEV Data Isolation**: Redirects Electron `userData` into a dedicated `LumosTime Dev` directory whenever the Vite dev server is attached, so desktop development storage stays separate from the packaged app's localStorage, IndexedDB, and persisted widget JSON files.
*   **DEV Navigation Resilience**: Treats Electron `ERR_ABORTED` load interruptions as expected during renderer-triggered reloads in development, so startup data-repair refreshes do not surface as unhandled promise rejections.
*   **DEV Server Retry**: Retries transient `ERR_FAILED` and local connection-startup load errors against the Vite URL during development, which keeps Electron from marking the first window launch as failed while the dev server is still warming up.
*   **Security**: Disables Web Security (`webSecurity: false`) to allow WebDAV access across origins (critical for the Sync feature).
*   **IPC**: Sets up handlers for inter-process communication, including desktop-widget action forwarding back into the main renderer (toggling tasks, opening details, and launching timer focus using the `start_focus` action), widget open/close routes, and the dedicated quick-editor open/close plus payload-sync bridge used by the transparent external todo editor window.
*   **Obsidian Export Helpers**: Writes Markdown files and copies referenced log images into the user-selected Obsidian attachments folder on desktop builds.

2026-10-03: `feishuPersonalConnection.ts` runs private-app registration, device authorization and calendar imports locally in the main process. The trusted IPC bridge never returns application secrets or access/refresh tokens. AES-GCM SQLite uses a random key encrypted by OS-backed `safeStorage`; insecure storage is refused. Packaged desktop connections no longer require a public application or a remote service root.
