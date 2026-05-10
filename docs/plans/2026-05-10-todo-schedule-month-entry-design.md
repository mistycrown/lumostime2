# Todo Schedule Month Entry Design

Date: 2026-05-10

## Goal

Add the first entry point for the monthly calendar integration inside the Todo schedule screen without changing the existing week scheduling behavior yet.

## Approved Approach

Use a nested schedule sub-view mode inside `TodoView`:

- Keep the existing top-level `screenMode` as `list | week`.
- Add a persisted `scheduleViewMode` as `week | month`.
- Store `scheduleViewMode` in `localStorage` so the last selected schedule sub-view is restored.

## UI Behavior

- In the Todo schedule header, keep the existing `本周` button.
- Add a small triangle button beside `本周`.
- Clicking the triangle opens a lightweight dropdown with `周视图` and `月视图`.
- Choosing `周视图` preserves the current week-view behavior unchanged.
- Choosing `月视图` opens a blank monthly view surface for now.

## Scope Limits

- Do not integrate the demo calendar content yet.
- Do not change week drag-and-drop, filters, or todo data flow.
- Do not change the bottom-right list/schedule switch interaction beyond making it compatible with the persisted schedule sub-view.

## Notes

- The existing `todo-schedule-mode-changed` event should still treat both week and month sub-views as being inside the Todo schedule screen, so the surrounding layout keeps the same full-screen schedule treatment.
