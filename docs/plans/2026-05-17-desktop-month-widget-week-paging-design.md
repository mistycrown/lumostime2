# Desktop Month Widget Week Paging Design

Date: 2026-05-17

## Goal

Change the desktop month widget from a fixed one-month screen to a week-paged calendar where one page can show 2, 3, or 4 whole weeks.

## Approved Decisions

- Page boundaries align to whole weeks and start on Monday.
- The widget keeps `本月`, but in week-paged mode it jumps to the page containing today.
- Display settings keep only `2 / 3 / 4` options.
- Those options now mean `一页两周 / 一页三周 / 一页四周`, not overall widget resizing semantics.
- Changing the weeks-per-page setting must not auto-resize the widget window. Overall widget size stays fixed unless the user resizes it manually.

## Recommended Approach

Update the existing desktop month widget directly instead of refactoring the app-wide month planner. This keeps the change local to the Electron widget and avoids unnecessary risk in the main todo views.

## Implementation Notes

- Replace `displayMonth` state with a page-start Monday date.
- Move previous/next navigation by `weeksPerPage` rather than by month.
- Render a dynamic `7 x 2/3/4` grid instead of a fixed `6 x 7` grid.
- Keep drag-and-drop scheduling behavior unchanged.
- Keep theme and opacity settings unchanged.
- Do not auto-adjust widget height when the weeks-per-page setting changes.

## Verification Focus

- Previous/next arrows move exactly one page.
- Mouse wheel paging matches the header arrows.
- `本月` lands on the page containing today.
- Cross-month page labels render correctly.
- Existing schedule drag/drop and sidebar flows still work.
- Legacy stored value `5` safely falls back to `4`.
