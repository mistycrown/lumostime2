# Widget Slot Todo Auto-Apply Design

## Context

In widget settings, timer slots can already link to a specific todo, but choosing that todo only persisted `linkedTodoId`. The slot did not automatically inherit the todo's linked tag (`linkedCategoryId` + `linkedActivityId`) or its default scopes (`defaultScopeIds`), so users still had to manually reapply those associations.

## Decision

When a user selects a todo inside the timer-slot editor:

- Always persist the selected `linkedTodoId`.
- If the todo carries both `linkedCategoryId` and `linkedActivityId`, overwrite the slot draft's `categoryId` and `activityId` with those values.
- Always overwrite the slot draft's scopes from `defaultScopeIds`.
- If the todo has no default scopes, clear the slot draft's scopes.
- If the todo has no linked tag metadata, keep the slot's current tag selection instead of clearing it.
- If the user clears the todo selection, only clear `linkedTodoId`; leave tag and scope choices untouched.

## Why This Approach

- It matches the approved product behavior: selecting a todo should auto-apply its associations.
- It preserves a safe fallback for todos that were never linked to a tag.
- It keeps the behavior local to the editor draft, so preview updates immediately and the existing save pipeline can remain unchanged.

## Verification

- Add a regression test for the helper that applies todo metadata onto a timer-slot draft.
- Cover three cases: full inheritance, missing linked-tag fallback, and clearing the todo selection.
