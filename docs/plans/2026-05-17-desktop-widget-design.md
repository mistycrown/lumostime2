# Desktop Todo Widget Design

## Goal

Build a desktop-only Electron widget window that shows today's tasks in a phone-widget-like layout.

This widget should:

- stay available as a lightweight desktop companion window
- reuse the app's existing today-task business logic
- support light interaction only
- avoid introducing a second source of truth for todo state

This design is for the Windows desktop Electron build, not the Android native widget system.

## Scope

### In scope

- a dedicated Electron widget window
- a compact desktop widget React view for today's tasks
- display of `Pin`, `Today`, and optional `Overdue` sections
- direct task completion from the widget
- opening the main app and the target todo from the widget
- refresh and open-app controls
- widget position persistence and off-screen recovery

### Out of scope for v1

- Windows 11 official Widgets panel integration
- native desktop embedding into the wallpaper layer
- full todo editing inside the widget
- widget template editing reuse from Android widget settings
- changes to the Android `WidgetBridge` flow

## Recommended Approach

Use a second Electron `BrowserWindow` as a dedicated desktop widget.

Why this approach:

- It fits the current Electron shell, which already has a main window and IPC bridge.
- It avoids Windows-specific unsupported desktop-layer hacks.
- It lets the app reuse existing todo derivation logic from the React codebase.
- It keeps Android widget code isolated instead of forcing one abstraction across two very different platforms.

## Architecture

### Main process

Extend [electron/main.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/electron/main.ts:60) from a single main window model into:

- `mainWindow`
- `widgetWindow`

The widget window should be:

- frameless
- menu-less
- hidden from the taskbar
- fixed to one or two preset sizes
- movable by the user
- restored to its last valid on-screen position on startup

The main process should also expose dedicated IPC channels for:

- opening or focusing the widget
- closing or hiding the widget
- pushing widget payload updates to the widget renderer
- forwarding widget actions back to the main app renderer

### Preload

Extend [electron/preload.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/electron/preload.ts:13) with a small typed widget API instead of relying on generic raw `ipcRenderer` usage everywhere.

Recommended preload surface:

- `desktopWidget.getSnapshot()`
- `desktopWidget.onSnapshot(listener)`
- `desktopWidget.openTodo(todoId)`
- `desktopWidget.toggleTodo(todoId)`
- `desktopWidget.openMainApp()`
- `desktopWidget.refresh()`

### Renderer

Add a dedicated desktop widget view rather than reusing the full `TodoView`.

Recommended new view/component:

- `src/views/desktop/DesktopTodayWidgetView.tsx`

Reason:

- `TodoView` is optimized for full-screen planning, hierarchy management, and dense interaction.
- The widget needs a compact, one-purpose layout with much tighter behavioral constraints.

## Data Flow

### Source of truth

The main application renderer remains the only state writer for todos.

The widget renderer is a lightweight reader plus action sender.

This avoids:

- dual writes to storage
- drift between windows
- duplicated business logic

### Shared business logic

Reuse the existing today-task derivation in [src/utils/todoScheduleUtils.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/src/utils/todoScheduleUtils.ts:274).

Also reuse the existing TODAY+PIN mental model already reflected in [src/services/widgetService.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/src/services/widgetService.ts:1386), but do not route desktop behavior through the Android widget bridge.

### Widget payload

The desktop widget should receive a compact payload shaped for rendering, for example:

```ts
type DesktopTodayWidgetPayload = {
  date: string;
  summary: {
    total: number;
    completed: number;
    remaining: number;
  };
  pinned: DesktopWidgetTodoItem[];
  today: DesktopWidgetTodoItem[];
  overdue: DesktopWidgetTodoItem[];
  syncedAt: number;
};
```

Each item should contain only the data needed by the widget UI:

- `todoId`
- `title`
- `isCompleted`
- `badgeLabel`
- linked activity/category display metadata
- optional color/icon data

### Update model

Recommended flow:

1. Main app renderer derives the widget payload from live app state.
2. Main app renderer sends the payload to the main process.
3. Main process forwards the payload to the widget window.
4. Widget window renders the latest snapshot.

For widget actions:

1. Widget renderer sends `open_todo` or `toggle_complete`.
2. Main process forwards the action to the main app renderer.
3. Main app renderer executes the existing todo logic.
4. Main app renderer emits a fresh widget payload.

## Interaction Design

### Interaction level

This widget is intentionally light-interaction only.

Allowed in v1:

- view today's tasks
- directly complete or uncomplete a task
- click a task to open the main app and its detail
- open the main app
- manual refresh

Not allowed in v1:

- editing title, schedule, tags, or scopes
- creating todos from the widget
- dragging, reordering, or batch operations

### Opening a todo

Prefer desktop-specific IPC over extending the current deep-link parser for todo detail routing.

Current deep-link support in [src/utils/lumosTimeUrlParser.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/src/utils/lumosTimeUrlParser.ts:1) only covers record and widget shortcut actions, not desktop todo-detail navigation.

For v1, a focused IPC path is simpler and lower risk.

### Todo completion

Do not implement separate widget-side todo mutation logic.

The widget should request completion changes, and the main app should execute them through the existing todo manager and app state flow.

## UI Design

### Overall structure

The widget UI should have three sections:

1. Header
2. Task list
3. Footer actions

### Header

Show:

- today's date
- a lightweight title such as `Today`
- summary counts such as total, completed, and remaining

### Task list

Recommended sections:

- `Pin`
- `Today`
- `Overdue` when needed

Each row should contain:

- completion control
- title
- minimal linked activity/category hint
- lightweight badge such as `Pin`, `Today`, or `Due`

### Footer

Keep only:

- `Open App`
- `Refresh`

### Visual direction

The widget should feel like a phone widget, not a mini app screen:

- compact
- rounded
- high information density
- minimal chrome
- no explanatory helper copy
- only the most important rows visible before internal scrolling

## Window Behavior

The widget should behave like a desktop companion rather than a normal app page.

Recommended defaults:

- no taskbar icon
- no menu bar
- small fixed footprint
- remembers last position
- can be dragged
- can be reopened from the main app

Recommended non-goals for v1:

- free resize
- snap presets UI
- always-on-desktop-layer hacks

## Failure Handling

### Main app not ready

If the widget opens before the main app has produced a fresh payload, show the last cached snapshot if available.

### Refresh failure

Keep the last successful content and show a subtle stale-state indicator rather than a blocking error UI.

### Missing todo

If a task was deleted or changed before interaction resolves, opening it should fall back to focusing the main app without a hard failure.

### Repeated actions

Completion toggles should briefly lock the row while the request is in flight to reduce double toggles.

### Invalid saved position

If the saved widget bounds are off-screen, clamp the window back into the visible work area on startup.

## Testing Strategy

### Automated

Add focused tests around payload derivation and section grouping, especially:

- `Pin` ordering
- `Today` matching
- `Overdue` separation
- completed-state counts

These tests should stay near the shared todo scheduling logic and any new desktop payload builder.

### Manual smoke tests

Run desktop verification for:

- first widget open
- closing and reopening widget
- moving widget and restarting app
- completing a task from the widget
- opening a task from the widget
- main window minimized then reopened from widget
- multi-monitor position recovery

### Regression boundary

Desktop widget work must not alter the Android widget path centered on [src/hooks/useWidgetBridgeSync.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/src/hooks/useWidgetBridgeSync.ts:47).

## Implementation Notes

Recommended decomposition:

1. Electron shell support for widget window lifecycle and IPC
2. Desktop widget payload builder based on shared today-task logic
3. Dedicated React widget view
4. Main-app action routing for `open_todo` and `toggle_complete`
5. Position persistence and smoke-test hardening

## Recommendation Summary

Ship v1 as a dedicated Electron desktop widget window.

This gives the best balance of:

- architectural fit
- code reuse
- UI freedom
- low platform risk

while keeping the Android widget system and the desktop widget system cleanly separated.
