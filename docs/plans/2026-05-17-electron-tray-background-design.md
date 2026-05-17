# Electron Tray Background Design

## Goal

Make the Windows desktop Electron app feel like a native background-running application.

The desired behavior is:

- clicking minimize keeps the app in the normal Windows taskbar
- clicking the main window close button hides the window instead of quitting the app
- the app stays available from the system tray and can be restored quickly
- quitting should still be explicit and predictable

## Scope

### In scope

- main desktop window close interception
- system tray creation for Electron desktop builds
- tray actions for restore and explicit quit
- keeping the process alive after the main window is hidden
- restoring and focusing the existing main window from the tray

### Out of scope

- changing widget window behavior
- adding a settings toggle for tray behavior
- macOS-specific menu bar patterns
- Linux desktop environment customizations

## Recommended Approach

Keep the existing main `BrowserWindow`, then add a single application-level `Tray` controller in the Electron main process.

Why this approach:

- It is the standard Electron solution for Windows background-running apps.
- It keeps the change local to `electron/main.ts` without disturbing renderer code.
- It preserves the current minimize behavior while only changing the close behavior the user called out.
- It avoids introducing a second hidden main window or a custom process manager.

## Interaction Design

### Main window

- Minimize uses the existing native behavior and stays visible in the taskbar.
- Close hides the main window and leaves the app running in the background.
- Reopening from the tray should restore a minimized window before focusing it.

### Tray

- The app shows a tray icon while running.
- Clicking or double-clicking the tray icon restores the main window.
- The tray context menu includes:
  - `显示主界面`
  - `退出 LumosTime`

### Exit rules

- `退出 LumosTime` from the tray performs a real application quit.
- Normal close should not quit the app.
- `window-all-closed` should no longer shut down the app on Windows when the tray is active.

## Architecture

### Main process changes

Update [electron/main.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/electron/main.ts:1) to add:

- a shared `tray` instance
- an `isQuitting` flag so explicit exit can bypass the close interception
- a tray bootstrap function
- a small helper that hides the main window instead of destroying it

The main window `close` event becomes:

- allow close when `isQuitting === true`
- otherwise `preventDefault()` and `hide()`

### Window lifecycle

- `ensureMainWindow()` continues to recreate the window if it was ever really destroyed
- normal tray restore should usually reuse the hidden window
- hidden main-window state should not clear app-level readiness flags unless the renderer is actually gone

## Error Handling

- If the tray icon fails to initialize, the app should still open normally instead of crashing.
- If the main window does not exist when the tray restore action runs, the tray action should recreate it through `ensureMainWindow()`.

## Verification

Manual checks:

1. Click minimize and confirm the window stays in the taskbar.
2. Click close and confirm the window disappears but the process and tray icon remain.
3. Click the tray icon or use `显示主界面` and confirm the window returns focused.
4. Use tray `退出 LumosTime` and confirm the process exits fully.

Build check:

- run `npm run build`

## Risks

- Some Windows environments render tray icons differently from taskbar icons, so the existing `.ico` asset may need a later tray-specific variant.
- If future code calls `mainWindow.close()` expecting destruction, that path will now hide instead of destroy unless it first marks the quit intent explicitly.
