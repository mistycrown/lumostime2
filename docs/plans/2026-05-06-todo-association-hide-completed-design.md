# Todo Association Hide Completed Design

## Context

After restoring hierarchy and parent-context cues in `TodoAssociation`, the picker could still surface completed todos through its broader child-expansion source. That made completed subtasks appear in add-log, widget, and focus todo pickers even though users should only choose unfinished tasks in normal flows.

The approved edge case is that an already-linked completed todo must remain visible while editing, so the current association does not disappear from the picker.

## Decision

- Hide completed todos from todo-association picker pools by default.
- Preserve the currently linked completed todo when its id matches `linkedTodoId`.
- Apply the same filtered pool to expanded child rows, so completed subtasks do not re-enter through hierarchy expansion unless the linked completed subtask is the one being edited.
- Keep hierarchy counters based on the broader count source so parent `completed/total` badges stay accurate.

## Why This Approach

- It matches the user's expected selection behavior: completed todos should not be selectable in normal cases.
- It avoids a jarring edit-state regression where an existing completed association would vanish from the modal.
- It keeps the rule centralized in the shared picker data-preparation path instead of forking widget, add-log, or focus-specific behavior.

## Verification

- Add regression coverage for completed-todo filtering in todo-association picker pools.
- Add regression coverage to ensure expanded parent rows do not surface unrelated completed subtasks.
- Add regression coverage to ensure the currently linked completed subtask still appears when editing.
