# StatsView Date Transition Design

## Goal

Add a smooth date-switch animation to `StatsView` so both top navigation arrows and left/right swipe gestures feel consistent with the updated timeline experience.

## Scope

- Animate only top-level date navigation in `StatsView`
- Keep current range semantics unchanged
  - `day` by 1 day
  - `week` by 7 days
  - `month` by 1 month
  - `year` by 1 year
- Do not change view-type switching
- Do not change range switching
- Do not change nested `ScheduleView` internal gestures

## Approach

Use a synchronized enter/exit animation on the stats content area with `framer-motion`.

- Keep the control bar static
- Animate only the main stats content region
- Reuse a single navigation entry point for:
  - top prev/next buttons
  - swipe gestures
- Track whether a date transition is already in progress and ignore overlapping gestures until the transition completes

## Notes

- The animation should feel lighter than a full-page route transition
- The implementation should stay local to `src/views/StatsView.tsx`
- Update file header comments and `src/views/README.md` together with the code change
