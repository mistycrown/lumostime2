# Scene 03 Relation Preview Design

## Goal

Make the three orthogonal relation blocks read like compact previews of the real product surfaces while preserving the single-record relationship diagram.

## Design

- Keep the record card and connector as the upper relationship spine, but reduce vertical gaps so the spine moves upward.
- Replace the tag block with a compact seven-day activity heatmap and a total-time readout.
- Replace the scope block with a goal-series preview for `2026 年英语学习计划`, including annual targets of 100 hours for classes and 200 hours for self-practice.
- Replace the todo block with a progress-tracking preview for `本学期的口语外教课`, showing lesson 03/16 and compact child-task states.
- Keep the tag heatmap unchanged.
- Use a natural reflection sentence in the record card instead of a generic recorded-duration sentence.
- Remove the decorative water-drop icon and the redundant “下一步” label from the todo preview.
- Remove the bottom equation line; the connector and labels already communicate the orthogonal relationship.

## Constraints

- Match the existing paper surface, serif display type, muted borders, and purple/green/blue accents.
- Keep all content static and illustrative; no new runtime dependencies or interaction are needed.
- Preserve the scene's ten-second animation and ensure the three previews remain legible at the existing minimum viewport.

## Verification

- Parse the inline script with Node.
- Render the scene at 1920x1080 and visually check that the tree sits higher and the three previews do not overlap.
