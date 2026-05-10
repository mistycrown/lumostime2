# Todo Month View Design

Date: 2026-05-10

## Goal

Replace the blank Todo monthly schedule placeholder with the reference `static/minimalist-monthly-calendar` UI style while switching all fake calendar data to real Todo schedule data.

## Approved Approach

- Keep the existing persisted `scheduleViewMode` entry in `TodoView`.
- Add a dedicated `TodoMonthView` component so the reference UI can be implemented without making `TodoView` even larger.
- Extend shared schedule utilities with a reusable day-entry builder that uses the same real-data rules as the current week view.

## Data Rules

Each month-view day must use the same visibility rules as the current week planner:

- `安排`
- `截止`
- `重复`
- `完成`
- `进行中`

The day grid and the expanded selected-day list both use real data from Todos and Logs. Fake seeded data is removed entirely.

## UI Rules

- Follow the reference monthly demo closely: continuous rolling week grid, sticky month header, weekday row, tap-to-expand selected date.
- Keep the current app shell, background treatment, and schedule-mode entry flow.
- Use a new month-view-only color system for the left marker lines on todo rows so each schedule type is visually distinct.

## Scope Limits

- No month-view drag-and-drop in this step.
- Do not change existing week-view drag/drop, quick actions, or schedule semantics.
- Preserve the persisted `周视图 / 月视图` choice.
