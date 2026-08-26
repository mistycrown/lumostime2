# Scene 04 Statistics Detail Design

## Goal

Make the statistics scene communicate both category totals and the activity-level detail behind them, while keeping the editorial layout airy.

## Design

- Keep the four-color donut, adding a gap at the zero-degree seam so the final and first segments do not touch.
- Keep only the date range below the donut.
- Force the previous/next navigation controls into a non-wrapping horizontal row.
- Keep category rows with total duration, share, and week-over-week trend.
- Expand each category with two compact activity rows, each showing duration, share, and week-over-week trend.
- Leave the left-side copy unchanged for a later wording pass.

## Verification

- Parse the inline playback script with Node.
- Render at 1920x1080 and check donut gaps, horizontal controls, and activity rows for clipping or overlap.
