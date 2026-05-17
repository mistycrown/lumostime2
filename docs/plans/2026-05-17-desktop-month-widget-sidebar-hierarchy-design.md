# Desktop Month Widget Sidebar Hierarchy Design

## Context

The right planning sidebar in the desktop month widget was rendering one flat task list. That caused three UX problems:

1. Tasks from different todo groups were mixed together.
2. Each row showed a linked-category line that was usually empty or misleading.
3. Subtasks disappeared because the sidebar did not render one-level parent/child hierarchy.

## Decision

Use a grouped sidebar data model before rendering:

1. Filter todos by the active planning tab (`Arrange`, `Maybe`, `Due`).
2. Group visible todos by their todo-category id.
3. Within each group, render root tasks first and attach visible direct subtasks underneath.
4. If a subtask stays visible but its parent is filtered out of the current tab, render it as a standalone row with plain-text `子任务 @父任务` context.
5. Remove the extra linked-category line so each task row is just one line of title text.

## Notes

- The hierarchy remains one level deep, matching the repo's existing todo hierarchy rules.
- Completed-parent visibility rules should stay aligned with the main todo views so unfinished subtasks do not resurface under completed parents.
- Section ordering follows todo-category order first, then source todo order as a fallback.
