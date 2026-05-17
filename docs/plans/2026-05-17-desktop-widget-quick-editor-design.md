# Desktop Widget Quick Editor Design

## Context

The desktop widget surfaces currently treat task clicks as navigation:

1. `DesktopTodayWidgetView.tsx` opens the main app todo detail.
2. `DesktopQuickWidgetView.tsx` opens the main app todo detail.
3. `DesktopMonthWidgetView.tsx` opens the main app detail from calendar rows, while the right planning sidebar currently disables row-click detail navigation.

This makes the desktop widgets useful for viewing and scheduling, but not for lightweight in-place editing.

## Decision

Add one shared desktop quick editor popover that appears near the click position and is reused by the desktop today widget, desktop quick widget, and desktop month widget.

### Interaction

1. Single-clicking a widget todo row opens the quick editor beside the cursor instead of immediately opening the main app detail.
2. The quick editor keeps one explicit action for opening the full todo detail in the main app.
3. The title is editable inline and saves on `Enter` or blur.
4. The title area shows compact planning metadata under the input when schedule data exists.
5. Clicking outside the popover or pressing `Escape` closes it.
6. Month-widget drag scheduling keeps priority over the popover so drag interactions do not accidentally open inline editing.

### Content rules

The repo currently supports one-level todo hierarchy through `parentTodoId`, so the quick editor stays inside that model.

1. Root todo with direct children: show the direct child task list.
2. Child todo: show sibling tasks under the same parent as the related quick list.
3. Todo without hierarchy content: show the note/description area.
4. Month-widget sidebar rows that already flatten subtasks with `@parent` labels should still resolve back to the live todo record before rendering the popover.

## Data flow

1. Add a shared pure utility that resolves:
   - whether the selected todo is a root or child task,
   - which related list to render,
   - compact schedule summary text,
   - fallback note text.
2. Add a shared popover component that renders from the resolved model and receives callbacks for save, close, and open-detail.
3. The month widget can reuse its existing full `todos` state directly.
4. The today and quick widgets must also load and retain the full todo list locally, because the current snapshot payload is too small to render note text and hierarchy relationships.

## Persistence

Use the widget renderer to save title edits directly through `dataRepository.saveTodos(...)`, then publish `BroadcastChannel('lumostime-data-sync')` so all widget windows and the main app refresh consistently.

This avoids introducing a new Electron IPC mutation path just for inline title edits.

## Notes

- The quick editor intentionally stays lightweight and does not try to embed the full `TodoDetailModal`.
- The hierarchy remains one level deep and does not introduce nested subtasks under subtasks.
- If a child todo has no siblings beyond itself, the content falls back to note text when available.
