# Desktop Month Widget Arrange Sidebar Reschedule Design

## Context

The desktop month widget's right-side `arrange` tab currently filters out unfinished todos that already have a `scheduledDate`. That makes first-time scheduling easy, but it blocks the rescheduling use case.

## Approved Behavior

- The `arrange`, `maybe`, and `due` tabs should show all unfinished, non-recurring todos.
- Todo sections remain grouped by todo category.
- Within each category, todos without a date for the active tab appear before todos that already have a date for the active tab.
- Within each date-state bucket, preserve the source todo order.
- Existing hierarchy rules stay intact:
  - visible subtasks remain attached under their visible parent row
  - unfinished subtasks stay hidden when their parent todo is completed
  - if a parent row is filtered out, the visible child still renders as `child @parent`
- When an item in any planning tab already has an active date, render a compact trailing date label such as `5/20`.
- For `maybe`, use the earliest `maybeDates` value as the trailing display date.

## Implementation Notes

- Update `desktopMonthWidgetSidebarUtils.ts` to keep all unfinished todos visible across `scheduled`, `maybe`, and `deadline`, derive one active date per tab, and sort undated rows before dated rows.
- Add row metadata for compact trailing date display.
- Apply undated-first ordering to both top-level rows and visible child rows inside every planning tab.
- Update `DesktopMonthWidgetView.tsx` to render the compact trailing date on the right side whenever a row exposes one.
- Add regression tests for visibility, ordering, and trailing-date metadata across all three tabs.
