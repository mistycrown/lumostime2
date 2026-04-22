# Todo Association Today Category Design

## Goal

Add a virtual `today` category to shared todo pickers so both `AddLogModal` and `FocusDetailView` can surface the same fast-access bucket.

## Confirmed Scope

- Keep the virtual category as the first category button.
- Include todos when either condition is true:
  - `todo.pin === true`
  - `todo.scheduledDate === today`
- Exclude overdue-but-not-today todos from this virtual category.
- Reuse the shared picker component instead of duplicating logic in each screen.

## Implementation Shape

- Add shared helpers in `src/utils/todoScheduleUtils.ts` for:
  - checking whether a todo belongs to the picker today category
  - building the visible today-category todo list with pinned items first
- Extend `src/components/TodoAssociation.tsx` to inject a first-position virtual category with a stable synthetic id.
- When a linked todo belongs to the virtual today category, auto-select that virtual category on open.
- Keep existing hierarchy rendering and parent expansion behavior unchanged.

## Sorting

- Pinned todos first
- Then title ascending with `zh-CN` locale compare

## Verification

- Add utility tests for membership and today-category list building.
- Run `npx vitest run src/utils/todoScheduleUtils.test.ts`.
- Run `npm run build`.
