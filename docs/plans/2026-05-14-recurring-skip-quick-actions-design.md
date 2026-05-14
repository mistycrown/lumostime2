# Recurring Skip Quick Actions Design

## Goal

Make the recurring-task shortcut row behave like the rest of the quick-actions sheet.

## Approved Approach

1. Replace the standalone skip icon cell with two normal quick-action buttons.
2. Put the skip icon and label inside each button so the structure matches other quick actions.
3. Close the quick-actions sheet after both recurring skip actions succeed to give immediate success feedback.

## Scope

- `src/components/TodoQuickActionsModal.tsx`
- `src/hooks/useTodoQuickActions.ts`

## Risks

- Keep the change layout-local so other quick actions and nested pickers are unaffected.
