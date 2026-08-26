# Scene 03 Relation Preview Design

## Goal

Make the three orthogonal relation blocks read like compact previews of the real product surfaces while preserving the single-record relationship diagram.

## Design

- Keep the record card and connector as the upper relationship spine, but reduce vertical gaps so the spine moves upward.
- Replace the tag block with a compact seven-day activity heatmap and a total-time readout.
- Replace the scope block with a goal-series preview: overall completion, fraction, and a slim progress rail.
- Replace the todo block with a progress-tracking preview: a water-drop/ink progress mark, current step, and next action.
- Remove the bottom equation line; the connector and labels already communicate the orthogonal relationship.

## Constraints

- Match the existing paper surface, serif display type, muted borders, and purple/green/blue accents.
- Keep all content static and illustrative; no new runtime dependencies or interaction are needed.
- Preserve the scene's ten-second animation and ensure the three previews remain legible at the existing minimum viewport.

## Verification

- Parse the inline script with Node.
- Render the scene at 1920x1080 and visually check that the tree sits higher and the three previews do not overlap.
