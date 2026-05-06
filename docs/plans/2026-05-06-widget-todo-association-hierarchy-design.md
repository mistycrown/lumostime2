# Widget Todo Association Hierarchy Design

## Context

The widget timer-slot editor reuses `TodoAssociation`, but it was not passing `enableHierarchy={true}`. That left widget todo selection flattened even though Add Log and Focus Detail already render the same shared picker as a parent/subtask tree.

There was a second mismatch inside the virtual `今天` picker category: if a subtask matched today on its own while its parent task did not appear in the current picker pool, the row rendered as a standalone item without any parent context. The schedule view already solves this by showing a compact `@parent` hint only for those standalone child rows.

## Decision

- Update the widget timer-slot editor to pass `enableHierarchy={true}` into `TodoAssociation`.
- Extend todo-association row models with optional `parentTitle` metadata for standalone subtasks whose parent exists in the broader todo source but is not visible in the current picker list.
- Render a compact `@parent` badge in `TodoAssociation` only when:
  - the row is a standalone subtask promoted to a root row because its parent is outside the current visible picker pool
  - and the parent title can be resolved safely
- Do not show the `@parent` badge for subtasks already rendered beneath an expanded parent row.

## Why This Approach

- It restores consistency across all existing `TodoAssociation` entry points without forking the picker.
- It matches the approved behavior boundary from the user: only standalone subtasks should repeat their parent context.
- It keeps hierarchy presentation and hidden-parent context in the shared pure row builder, so UI callers do not need custom one-off logic.

## Verification

- Add a regression test that confirms widget slots keep `TodoAssociation` in hierarchy mode.
- Add a regression test that confirms standalone subtasks receive `parentTitle` metadata when their parent is not visible in the current picker pool.
- Re-run targeted Vitest coverage and the production build.
