# Month View Hidden Filter Design

## Goal

Add one hidden-filter expression field inside the month-view display settings so users can hide matching schedule entries without affecting other todo views.

## Scope

- Add one persisted `隐藏筛选式` input inside the month-view popup.
- Apply the expression only to month-view entry rendering.
- Reuse the existing custom-filter parser semantics:
  - Space = `AND`
  - `OR` = `OR`
  - `@` matches todo title or todo-category title
  - `#` matches linked activity title or linked activity-category title
  - `%` matches linked scope title
  - no prefix matches todo note

## Implementation

1. Extend `filterUtils.ts` with todo-target matching helpers built on top of `parseFilterExpression`.
2. Pass activity categories plus scopes into `TodoMonthView.tsx`.
3. Persist the month-view hidden-filter expression locally in `TodoMonthView.tsx`.
4. Filter `TodoDateEntry[]` after the shared schedule-entry map is built, leaving scheduling logic unchanged.
5. Add focused regression tests for the todo-target matching semantics.

## Non-Goals

- No reuse of the global custom-filter list UI.
- No effect on list view, week view, or bento view.
- No separate enable toggle in this pass; empty expression means disabled.
