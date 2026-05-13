# Todo Quick Action Category Move Design

## Goal

Add a lightweight `移动分类` action inside the shared todo quick-actions sheet so users can move a task from one todo category to another without opening the full detail editor.

## Scope

- Add one new quick action to `TodoQuickActionsModal.tsx`
- Add one shared save handler to `useTodoQuickActions.ts`
- Pass selectable todo categories from `TodoView.tsx`
- Keep the interaction available only for non-subtask todos
- Reuse the same picker for quick-todo `升级为项目`, so upgrades also require choosing a target standard category

## UX

- The quick-actions sheet shows a new `移动分类` row
- Tapping it opens a centered picker dialog above the current sheet
- The picker lists standard todo categories using the same icon-plus-name language already used in the detail editor
- The current category is shown as `当前` and is not clickable
- Picking another category saves immediately and closes both the picker and the quick-actions sheet
- Quick-todo `升级为项目` uses the same centered picker shell, but after choosing a category it saves both `kind: 'project'` and the new `categoryId`

## Rules

- Subtasks do not show `移动分类`
- Reserved system buckets such as `未来` are excluded from the picker
- No extra confirmation step is added
- The full detail editor remains unchanged

## Data Flow

1. `TodoView.tsx` computes the standard selectable todo categories and passes them into the shared quick-actions modal.
2. `TodoQuickActionsModal.tsx` opens a local centered picker overlay when the user taps `移动分类`.
3. Selecting a category calls the new shared handler from `useTodoQuickActions.ts`.
4. The handler saves the active todo with an updated `categoryId` and force-closes the quick-actions flow.

## Testing

- Verify the hook can save a new `categoryId`
- Verify subtasks do not render the move entry
- Verify the modal opens the category picker and marks the current category as non-clickable
