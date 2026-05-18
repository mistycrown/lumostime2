# Electron Tray Autostart Design

## Goal

Add a Windows desktop autostart toggle to the existing tray context menu so users can enable or disable launch-on-login without opening a separate settings screen.

The desired behavior is:

- the tray menu exposes a single `开机自启动` checkbox item
- the checkbox always reflects the real Windows login-item state
- toggling the checkbox updates the OS login-item registration immediately
- when the app is launched by the autostart entry, it should stay in the tray instead of forcing the main window open

## Scope

### In scope

- adding a tray checkbox item for launch-on-login
- reading and updating Electron login-item settings from the main process
- marking autostart launches with a startup argument
- suppressing the initial main-window show when the process was started by Windows login
- documenting the new tray behavior in the Electron README

### Out of scope

- adding a renderer-side settings entry
- adding macOS-specific login-item behavior
- syncing a separate custom preference file
- changing widget startup behavior

## Recommended Approach

Keep the feature entirely in `electron/main.ts` and use Electron's native Windows login-item API for both reading and writing the startup state.

Why this approach:

- it matches the user's requested entry point: tray menu only
- it avoids introducing duplicated state outside the operating system
- it keeps the implementation local to the desktop shell layer
- it fits naturally with the existing tray-resident close behavior

## Interaction Design

### Tray menu

The tray context menu should include:

- `显示主界面`
- `开机自启动` as a checkbox
- `退出 LumosTime`

When the tray menu is rebuilt, the checkbox state should come from the current login-item settings rather than from cached app memory.

### Startup behavior

- Manual app launches should continue to open the main window.
- Windows login-item launches should create the tray and keep the app resident in the background.
- The user can restore the main window from the tray icon click, double-click, or `显示主界面`.

## Architecture

### Main process changes

Update [electron/main.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/electron/main.ts:1) to add:

- a constant startup argument such as `--startup`
- a helper that detects whether the current process was launched from the login-item entry
- helpers for `app.getLoginItemSettings()` and `app.setLoginItemSettings()`
- a tray menu builder that reads the current autostart state and rebuilds after toggling

### Login-item registration

The login-item toggle should register the current executable path plus the startup argument so autostart launches can be distinguished from normal launches.

Expected flow:

1. User checks `开机自启动`.
2. Main process calls `app.setLoginItemSettings({ openAtLogin: true, path, args: ['--startup'] })`.
3. On next Windows login, the OS launches the app with `--startup`.
4. `app.whenReady()` creates the tray but skips the initial `createMainWindow()` call.

### Window lifecycle

- `ensureMainWindow()` and `focusMainWindow()` remain the restore path for tray interactions.
- `second-instance` should restore the main window even if the first instance was started silently into the tray.
- Normal explicit quit from the tray should still bypass the close interception via `isQuitting`.

## Error Handling

- If login-item state cannot be read, fall back to unchecked so the menu still renders.
- If setting the login item fails, log the error and rebuild the tray menu so the UI reflects the actual state.
- If a startup launch occurs without a main window, tray restore should recreate it through `focusMainWindow()`.

## Verification

Manual checks:

1. Launch the desktop app normally and confirm the tray menu shows `开机自启动`.
2. Enable `开机自启动`, reopen the tray menu, and confirm the checkbox remains checked.
3. Disable it again and confirm the checkbox updates back to unchecked.
4. Launch the app with `--startup` and confirm the app stays in the tray without opening the main window.
5. Click the tray icon or `显示主界面` after a startup launch and confirm the main window appears focused.

Build check:

- run `npm run build`

## Risks

- Windows login-item behavior can vary slightly between packaged and development builds, so the silent-start flow should be verified primarily against packaged desktop usage.
- If a future installer changes the executable path format, the login-item registration helper may need to be revisited to keep the startup argument wiring intact.
