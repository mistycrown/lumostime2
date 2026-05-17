# Desktop Month Widget Design

Date: 2026-05-17

## Goal

Add a second Electron desktop widget that shows the existing Todo month schedule view as a desktop planning surface.

This widget must:

- coexist with the current desktop today widget
- reuse the existing month-view rendering and motion as-is wherever possible
- replace mobile day-click scheduling with a persistent desktop sidebar
- allow dragging tasks from the sidebar onto calendar cells
- write schedule changes back immediately to real Todo data

## Approved Decisions

- Keep the current desktop today widget. The new month widget is a second widget type, not a replacement.
- Dragging from the desktop sidebar writes through immediately to persisted Todo state.
- The month grid, rolling-scroll behavior, entry row rendering, and overall month-view UI should match the current `TodoMonthView` as closely as possible.
- The desktop widget does not use the mobile "tap date to open schedule assign modal" flow.
- In v1, clicking month cells is view-only. It may highlight or focus a date, but it does not open a task-assign popup.

## Scope

### In scope

- a new Electron desktop month widget window or window mode
- a dedicated desktop month widget React view
- reuse of the current month calendar rendering and schedule-entry presentation
- a persistent desktop sidebar with `Arrange`, `Maybe`, and `Due` modes
- drag-and-drop from sidebar tasks into month cells
- immediate writeback for `scheduledDate`, `deadlineDate`, and `maybeDates`
- refresh and synchronization with the main app when both windows are open

### Out of scope for v1

- full task editing inside the widget sidebar
- complex sidebar filters such as tags, labels, and priorities
- mobile month-view interaction changes beyond the refactor needed for sharing code
- Windows-native widget-panel integration
- redesigning the visual style away from the current month-view look

## Current Code Anchors

The implementation should start from the existing foundations below:

- `src/components/TodoMonthView.tsx` for the month grid, rolling range loading, schedule entry rendering, and current drag/drop semantics inside the app
- `src/views/desktop/DesktopTodayWidgetView.tsx` for desktop widget shell patterns and renderer-only desktop layout
- `src/services/desktopWidgetService.ts` for desktop widget route detection and lightweight snapshot loading
- `electron/main.ts` for desktop widget window lifecycle and IPC routing
- `electron/preload.ts` for typed widget bridge APIs exposed to the renderer

## Recommended Architecture

### Widget model

Extend the current desktop widget system from one widget type to two:

- `today` widget
- `month` widget

This can be implemented either as two dedicated Electron windows or as one reusable widget-window factory that accepts a widget type. The important constraint is that today and month widgets stay independently openable and do not share one renderer state bucket by accident.

### Renderer structure

Do not build the desktop month widget by duplicating the entire `TodoMonthView` file.

Instead, split the month feature into:

- a shared month-rendering core
- a mobile month shell
- a desktop month shell

Recommended shape:

- `TodoMonthCalendarCore` or equivalent shared layer
- existing mobile `TodoMonthView` refactored to use the core plus mobile interactions
- new `DesktopMonthWidgetView` using the same core plus desktop sidebar interactions

### Why this split

- The grid layout, month loading, row positioning, and entry UI are shared.
- The surrounding interaction shell is different.
- Mobile opens date-driven assignment UI.
- Desktop keeps a persistent sidebar and drag target model.
- This prevents month-view behavior from forking into two separate large files that drift over time.

## Shared Month Core Responsibilities

The shared core should own:

- loaded month-range calculation
- rolling week generation
- active month detection
- month header and weekday rendering
- day-cell layout
- schedule entry row rendering
- continuous trace rendering across week rows
- drop-zone wiring for calendar cells
- visual states such as hover, today, out-of-month, and drop target highlighting

The shared core should not own:

- mobile schedule-assign modal opening
- desktop sidebar content
- widget window controls
- persistence and snapshot loading

## Desktop Sidebar Design

The desktop month widget replaces mobile date-popup scheduling with a single persistent right sidebar.

### Sidebar structure

- top title area for the widget mode or current month context
- mode switcher with `Arrange`, `Maybe`, and `Due`
- task list below the switcher
- optional lightweight count or hint row if needed

### Sidebar behavior

- only one scheduling mode is active at a time
- the task list content changes with the active mode
- tasks are draggable from the sidebar into calendar cells
- dropping a task writes through immediately and refreshes both sidebar and month grid

### v1 simplification

The reference screenshot shows additional sidebar tabs such as list, tags, and priority. Those should stay out of scope for v1 unless they are already cheap to reuse. The first version only needs the scheduling-mode switcher plus task list.

## Scheduling Semantics

The desktop widget should follow the same Todo data model already used by the app.

### Arrange mode

- dropping onto a date sets `scheduledDate` to the target date
- if a task already has a different `scheduledDate`, the new date replaces it

### Due mode

- dropping onto a date sets `deadlineDate` to the target date
- if a task already has a different `deadlineDate`, the new date replaces it

### Maybe mode

- dropping onto a date appends that date to `maybeDates`
- if the date already exists in `maybeDates`, treat the drop as a no-op
- the widget should not allow `Maybe` drops onto past dates if current app rules already forbid that path

### Shared rule

- writeback is immediate
- there is no secondary confirm step in v1
- after mutation, the widget reloads or recomputes its current snapshot immediately

## Interaction Model

### Calendar interactions

- clicking a date cell does not open a scheduling popup
- clicking a date cell may select or highlight the date for context only
- clicking a task entry does not open the mobile assignment panel
- if needed, clicking a task entry may forward to the main app's todo detail view, but this is optional for v1

### Drag and drop

- drag source is the sidebar task list
- drop targets are month cells
- cells show a visible desktop hover state when they can accept the current dragged task
- failed or blocked drops should leave the task unchanged and clear visual drag state

### Desktop-only concerns

- support mouse-first interaction
- support auto-scroll if dragging near scroll edges
- do not accidentally trigger touch/mobile pathways

## Data Flow

### Source of truth

Todo data remains the single source of truth. The widget must not keep a parallel unsaved month schedule state.

### Read path

- desktop month widget loads todos and related metadata from the same repository-backed data sources as the today widget
- shared schedule utilities derive the entries shown in the month grid
- a dedicated desktop-month sidebar helper derives the draggable task list for the active mode

### Write path

- sidebar drop action resolves to a typed schedule mutation
- mutation updates the real Todo record immediately
- persistence runs through the existing app data path
- widget refreshes its local snapshot after the write
- if the main app window is open, notify it through the desktop widget bridge so both windows stay visually in sync

## Electron and Routing Changes

The existing desktop widget system currently boots a dedicated lightweight renderer route for the today widget. Extend that routing to support a second desktop widget route for the month widget.

Recommended additions:

- a query parameter or route discriminator for `today` vs `month`
- window open actions specific to the month widget
- optional separate persisted bounds for the month widget window
- separate display settings storage keys if the two widgets should remember different sizes or opacity

## Implementation Plan

### Phase 1: Extend desktop widget plumbing

- add a new widget type to desktop widget route detection
- extend Electron window creation and IPC open/close actions
- add a new settings entry for opening the month widget
- keep the current today widget untouched

### Phase 2: Extract the shared month-rendering core

- identify the pure rendering and range-loading pieces inside `TodoMonthView`
- move shared month-grid behavior into a reusable internal component or hook set
- preserve existing mobile visuals and behavior while refactoring

### Phase 3: Rebind the current mobile month view

- reconnect the mobile `TodoMonthView` to the shared core
- keep `onOpenDay` and existing mobile schedule assign behavior intact
- verify no visual regression in the app's existing month planner

### Phase 4: Build `DesktopMonthWidgetView`

- create the desktop renderer shell
- place the shared month core in the main content area
- add the persistent sidebar with the three scheduling modes
- add desktop widget controls such as close, open main app, and refresh only if needed

### Phase 5: Add sidebar derivation logic

- build a helper that returns draggable sidebar tasks for `Arrange`, `Maybe`, and `Due`
- keep sorting simple and predictable
- avoid duplicating month-entry derivation logic already handled by shared schedule utilities

### Phase 6: Wire drag-to-writeback

- allow sidebar tasks to drag into month cells
- resolve each drop into a real Todo mutation
- refresh widget state immediately after mutation
- surface drop blocking rules such as invalid `Maybe` targets

### Phase 7: Sync and polish

- ensure the main app refreshes if open
- add drag-edge auto-scroll if needed
- refine empty states, drop highlight states, and reduced-width layout

## Testing and Verification

At minimum, verify:

- existing mobile month view still behaves the same after refactor
- today desktop widget still opens and behaves the same
- month widget opens independently
- `Arrange` drop updates `scheduledDate`
- `Due` drop updates `deadlineDate`
- `Maybe` drop appends to `maybeDates`
- duplicate `Maybe` drops do not duplicate dates
- blocked `Maybe` past-date drops do not mutate data
- widget and main app stay in sync after changes
- `npm run build` passes
- manual Electron smoke test passes for open, close, drag, and refresh flows

## Risks

- `TodoMonthView` is already a large component, so extracting a shared core without regressions is the main technical risk.
- Desktop widget writes may fall out of sync with the main app if writeback and refresh pathways are split across too many layers.
- If the sidebar derivation logic duplicates schedule-entry logic instead of reusing shared helpers, month widget behavior may slowly diverge from the main planner.

## Open Items For Later

These are intentionally deferred and should not block v1:

- richer sidebar tabs like list, tags, and priority
- direct task-detail editing inside the month widget
- custom desktop month-widget themes beyond the current shared visual language
- task-box detail rules inside the sidebar
