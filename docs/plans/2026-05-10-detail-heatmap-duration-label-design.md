# Detail Heatmap Duration Labels Design

## Scope

Add compact per-day duration labels beneath the day number in the detail-page month heatmap only.

This applies through `DetailTimelineCard.tsx`, which is already shared by:

- category detail
- tag detail
- scope detail
- filter detail
- todo detail

This does not change:

- the collapsed week calendar
- the timeline home calendar
- gallery mode
- keyword mode

## Chosen Approach

Update the existing detail heatmap grid inside `DetailTimelineCard.tsx` instead of refactoring the page onto `CalendarWidget.tsx`.

Reason:

- the current detail heatmap is already rendered locally in `DetailTimelineCard`
- this keeps the change isolated to detail pages
- it avoids touching unrelated calendar consumers

## UI Behavior

- Keep the existing square heatmap cell layout.
- In heatmap mode, cells with logged duration render two lines:
  - top: day number
  - bottom: compact duration label like `4H5M`, `2H`, or `40M`
- Cells without duration continue to show only the day number.
- The duration label uses a smaller font and a darker theme-driven color via `var(--icon-button-icon)`.
- When the themed heatmap fill reaches the darker opacity tiers (`>= 0.7`), both lines switch to white automatically for contrast.

## Verification

- Confirm the label appears in category, tag, scope, filter, and todo detail views.
- Confirm gallery and keyword views remain unchanged.
- Confirm no-data days still look clean.
- Confirm the app still builds successfully.
