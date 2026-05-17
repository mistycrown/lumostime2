# Desktop Timer Widget Design

Date: 2026-05-17

## Goal

Add a desktop-only Electron timer widget that acts as a minimal companion for the currently running focus session.

This widget must:

- stay always on top
- use a fixed size and allow dragging only, not resizing
- show only the elapsed time when idle or not hovered
- show `00:00` when no timer is running
- expand on hover to show the current activity label, `结束提交`, and `打开主页面`
- read the app's real timer state instead of introducing a second timer state machine
- end the active session by writing through the existing app-side stop-and-save flow

## Approved Decisions

- The widget is a new PC widget type, not a replacement for the current today, month, or quick widgets.
- If multiple sessions are active, the widget shows the most recently started one.
- Hover content shows only the activity label, not the linked todo title.
- `结束提交` directly stops the session and saves the log. It does not open the focus detail page first.
- The widget is fixed-size and draggable, but not resizable.

## Scope

### In scope

- a dedicated Electron timer-widget window
- a compact renderer view for the desktop timer widget
- latest-session snapshot loading from the app's persisted active session state
- hover reveal of activity label and two actions
- forwarding `stop and save` back into the main app
- opening or focusing the main app from the widget
- startup restore toggle in the existing PC widget settings
- persisted window position with off-screen recovery

### Out of scope for v1

- listing multiple active sessions
- editing note, focus score, mood score, or linked todo inside the widget
- resizing or visual customization controls
- opening the focus detail page from the widget as part of stop flow
- native Windows widgets-panel integration

## Current Code Anchors

The implementation should build on the current desktop widget foundation:

- `electron/main.ts` for widget window lifecycle and IPC routing
- `electron/preload.ts` for typed desktop widget bridge APIs
- `src/services/desktopWidgetService.ts` for desktop widget route detection and startup-toggle parsing
- `src/contexts/SessionContext.tsx` for the real active-session source of truth and stop/save behavior
- `src/utils/sessionPersistence.ts` for persisted active-session hydration
- `src/views/settings/DesktopWidgetSettingsView.tsx` for the PC widget settings entry point
- `src/App.tsx` for launch-time widget auto-restore and widget action handling

## Recommended Approach

Add a fourth desktop widget type: `timer`.

This should be implemented as a dedicated frameless Electron `BrowserWindow` plus a small React renderer view. The timer widget should follow the same open/close/startup-restore patterns as the existing desktop widget family while keeping its state model much smaller.

This is the best fit because:

- the project already has a working Electron widget system
- the timer widget behavior is distinct enough that forcing it into today/month/quick widget views would add coupling
- the widget can stay stateless except for hover UI and local elapsed-time display
- stop-and-save behavior can fully reuse the main app's existing session pipeline

## Window Model

The timer widget should be managed as its own Electron window alongside the current widget windows:

- `widgetWindow` for today
- `monthWidgetWindow` for month
- `quickWidgetWindow` for quick todos
- `timerWidgetWindow` for the timer widget

### Recommended window behavior

- `frame: false`
- `skipTaskbar: true`
- `resizable: false`
- `alwaysOnTop: true`
- draggable by a dedicated drag region
- remembers its last on-screen position
- clamps invalid saved bounds back into a visible work area on startup

### Size model

Keep the widget fixed-size in v1.

Do not implement resize handles or persisted width/height changes. The hover state should reveal additional content inside the same fixed outer window rather than resizing the window itself.

## Renderer Design

Add a dedicated renderer view:

- `src/views/desktop/DesktopTimerWidgetView.tsx`

The widget has two visual states:

### Resting state

- show only the elapsed time
- if there is no active session, show `00:00`

### Hover or focus-within state

- show the current activity label
- show `结束提交`
- show `打开主页面`

The hover-expanded state should remain visually minimal and feel closer to a desktop strip than a mini app screen.

## Data Flow

### Source of truth

The widget must not own session state.

The real source of truth remains `SessionContext.activeSessions`, which is already persisted through `sessionPersistence.ts`.

### Read model

The timer widget should load the persisted active sessions, sanitize them through existing session-persistence helpers, and select the latest session by `startTime`.

Recommended snapshot shape:

```ts
type DesktopTimerWidgetSnapshot = {
  session: {
    sessionId: string;
    activityName: string;
    startTime: number;
  } | null;
  syncedAt: number;
};
```

### Elapsed-time display

Do not push per-second timer updates from the main app.

Instead:

1. the widget loads the latest active session snapshot
2. the widget stores the selected session's `startTime`
3. the widget locally recomputes elapsed time every second with `Date.now() - startTime`

This keeps the main app simple while still ensuring the widget reflects the real session identity and lifecycle.

### Refresh model

The widget should refresh its snapshot through a lightweight combination of:

- initial load on mount
- refresh on window focus
- refresh on `storage` event when available
- a light polling fallback to cover IndexedDB-backed updates that do not emit storage events

This matches the existing desktop widget philosophy and is enough for v1.

## Interaction Model

### `打开主页面`

This action only focuses or opens the main Electron window.

It does not need to force-open the focus detail page.

### `结束提交`

This action should forward a typed desktop-widget action back to the main app, for example:

```ts
{ type: 'stop_active_session_and_save', sessionId: string }
```

The main app then resolves the action by reusing the existing stop pipeline:

- `handleStopActivityWrapper(sessionId)`
- `stopActivity(...)`
- existing log-save callback path

This preserves the current session-to-log behavior and avoids duplicating save logic inside the widget.

### Failure behavior

- If the session disappears before the stop action resolves, the widget should fail softly and simply refresh back to `00:00`.
- If the main app is not ready yet, the action can be queued through the existing desktop widget bridge pattern.
- If no session is active, the stop button should be hidden rather than disabled.

## Settings and Startup Restore

The timer widget should be added to the current PC widget settings page as a fourth toggle:

- `计时器小组件`

Required additions:

- a new startup preference key in `desktopWidgetService.ts`
- timer widget inclusion in `loadEnabledDesktopWidgetTypes(...)`
- timer widget open/close bridge functions in `preload.ts`
- timer widget open/close IPC handlers in `main.ts`
- launch-time auto-restore in `App.tsx`

This keeps timer-widget behavior aligned with the existing today/month/quick widget family.

## IPC and Routing Changes

### New route/window discriminator

Add a new desktop widget route discriminator:

- `desktop-timer`

### Preload API additions

Extend the existing `desktopWidget` bridge with:

- `openTimer()`
- `closeTimer()`

The existing `requestMainAction(...)` surface can be reused if the new stop action is added to the desktop-widget action union.

### Main process additions

Add:

- `timerWidgetWindow`
- open/close IPC handlers
- persisted bounds file for the timer widget
- `alwaysOnTop` timer window creation config

## Implementation Plan

### Phase 1: Extend desktop widget plumbing

- add `timer` to the desktop widget startup type union
- add a timer-widget storage key
- add timer route detection helpers
- extend Electron preload bridge with open/close timer APIs
- add timer widget window lifecycle in `electron/main.ts`

### Phase 2: Build timer snapshot helpers

- add a desktop timer snapshot type in `desktopWidgetService.ts`
- load persisted active sessions through existing session-persistence helpers
- select the latest session by `startTime`
- return `null` session when no timer is active

### Phase 3: Build `DesktopTimerWidgetView`

- create the dedicated renderer view
- show `00:00` when no session exists
- derive live elapsed time locally from `startTime`
- implement hover/focus-within reveal for activity label and actions
- keep the visual shell fixed-size and draggable

### Phase 4: Wire widget actions back into the app

- extend the desktop widget main-action union with `stop_active_session_and_save`
- handle the new action in `App.tsx`
- forward the stop request into `handleStopActivityWrapper(sessionId)`
- keep `打开主页面` on the existing open-main route

### Phase 5: Add settings and startup restore

- add `计时器小组件` to `DesktopWidgetSettingsView.tsx`
- wire the toggle to timer open/close bridge calls
- ensure startup restore opens the timer widget when enabled

### Phase 6: Validate and polish

- verify always-on-top behavior
- verify drag-only behavior with no resize affordance
- verify off-screen recovery
- refine hover timing, spacing, and empty-state display

## Testing and Verification

### Automated

Add focused tests for:

- timer widget startup-toggle parsing
- latest-session snapshot selection
- empty snapshot behavior when no session is active

### Manual smoke tests

Verify:

- enabling and disabling the timer widget from PC settings
- app restart restores the timer widget when enabled
- starting one session updates the widget to that activity
- starting multiple sessions shows the latest one only
- stopping from the widget saves the log and returns the widget to `00:00`
- opening the main app from the widget focuses the main window
- dragging persists position across reopen
- saved off-screen position is clamped back on startup
- the widget cannot be resized
- the widget stays above normal app windows

## Risks

- the current desktop widget refresh model is pull-based, so refresh timing must be tuned carefully enough that stop/start state feels immediate
- `alwaysOnTop` behavior can differ slightly across Windows environments, so manual smoke testing matters
- if the timer widget reads session state through a path that bypasses existing sanitization, stale or malformed persisted sessions could leak into the UI

## Recommendation Summary

Ship v1 as a dedicated fourth Electron desktop widget window named `timer`.

It should:

- read the latest real active session from persisted app state
- compute elapsed time locally from `startTime`
- remain fixed-size, draggable, and always on top
- forward `结束提交` into the existing app-side stop-and-save flow

This gives the cleanest architecture and the lowest-risk path while staying fully aligned with the desktop widget system already in the repository.
