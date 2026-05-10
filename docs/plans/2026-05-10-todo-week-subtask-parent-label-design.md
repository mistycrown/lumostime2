# Todo Week Subtask Parent Label Design

## Goal

In the Todo week schedule view only, when a visible scheduled item is a subtask, render its parent task immediately after the subtask title as `子任务标题 @父任务标题`.

## Scope

- Apply only to the week schedule page rows.
- Do not change the todo list view.
- Do not change the month schedule view.
- Keep the title area on a single line with ellipsis truncation when space is limited.

## Recommended Approach

1. Extend the shared week-bucket data so each week row can access the resolved parent title for a subtask.
2. Update the week-row title renderer to append ` @parentTitle` inline only when a parent exists.
3. Keep the whole title block inside one truncating line so long combinations collapse cleanly.
4. Add regression coverage in the shared schedule utility tests to confirm week buckets carry parent titles for subtasks and leave root todos unchanged.

## Rationale

- This keeps the change tightly scoped to the requested screen.
- The week row stays visually minimal because the parent cue is inline rather than a separate badge.
- Putting parent-title resolution into the shared week-bucket builder makes the UI code simpler and easier to test.
