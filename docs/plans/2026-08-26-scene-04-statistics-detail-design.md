# Scene 04 Statistics Detail Design

## Goal

Make the statistics scene communicate both category totals and the activity-level detail behind them, while keeping the editorial layout airy.

## Design

- Keep the playback control outside the product window and horizontally centred against the film's bottom edge, matching the first scenes.
- Use a fixed left donut column and a deliberately narrower statistics column. Increase the gap between them and the breathing room at the statistics column's right edge.
- Keep the closing sentence in the left copy column, immediately beneath the supporting paragraph; it must not read as a caption for the donut.
- Use the product's default category taxonomy: `生活` (commute, meals, housework), `学习` (classes, self-study, books), `与自己` (exercise, reflection), `与他人`, and `探索世界`.
- Keep sleep out of this active-investment donut.
- Use a five-color donut, adding a gap at the zero-degree seam so the final and first segments do not touch.
- Keep only the date range below the donut.
- Force the previous/next navigation controls into a non-wrapping horizontal row.
- Keep category rows with total duration, share, and week-over-week trend.
- Expand each category with compact activity rows that use the same duration, share, and week-over-week treatment as the category total.
- Leave the left-side copy unchanged for a later wording pass.

## Verification

- Parse the inline playback script with Node.
- Render at 1920x1080 and check donut gaps, horizontal controls, and activity rows for clipping or overlap.
