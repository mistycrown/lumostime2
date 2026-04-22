# Todo Schedule Parent Subtasks Design

## Goal

When a parent todo appears in the virtual schedule view, expanding it should reveal the complete direct-subtask set rather than only the subtasks that independently match the current schedule filter.

## Confirmed Behavior

- The parent todo still enters the schedule view only when the parent itself matches the active filter.
- Once expanded, the parent shows all direct subtasks.
- Expanded subtask ordering is:
  - unfinished subtasks first
  - completed subtasks after that
  - within each completion group, keep the existing sibling order

## Implementation Shape

- Add a hierarchy helper that returns direct children in display order with optional unfinished-first behavior.
- Reuse existing schedule entries for subtasks that already match the active filter.
- For unmatched subtasks, create lightweight fallback entries so they still render under the matched parent.

## Verification

- Add a utility test for unfinished-first child ordering.
- Run targeted Vitest coverage for todo hierarchy and schedule helpers.
- Run `npm run build`.
