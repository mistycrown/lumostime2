# Focus Record Time Split Design

## Goal

Allow an existing focus record to be split at a user-selected point without
changing its total recorded time or linked todo progress.

## Entry And Modal Flow

- In the existing-record time controls, add a `Split` action between `To
  Previous End` and `To Now`, using the same compact control styling.
- Selecting it closes the record-detail modal and opens a dedicated split
  modal. Only the split modal remains mounted, so the screen never stacks two
  modal layers.
- The split modal follows the existing modal treatment: a mobile bottom sheet
  and a centered desktop dialog.

## Split Interaction

- The modal shows the record start and end times on a horizontal timeline.
- A draggable marker selects the split timestamp, initially at the exact
  midpoint of the record range.
- The marker is constrained to strictly inside the range. A split is disabled
  when no valid point exists, preventing zero- or negative-duration records.
- Cancel closes the modal without changing data. Confirm performs the split.

## Persistence Rules

- Confirm atomically replaces the source record with two new records that have
  new IDs.
- Both records inherit every source field, including activity, note, linked
  todo, attributes, scope links, scores, images, comments, and reactions.
- The first record covers `[start, split]`; the second covers `[split, end]`.
  Each duration is recalculated from its timestamps.
- If `progressIncrement` exists, allocate it in proportion to duration. The
  first record receives the rounded proportional value and the second receives
  the residual so both increments always sum exactly to the source value.
- Image files remain shared by reference; splitting never deletes an image.

## Verification

- Unit-test pure split calculation for midpoint and non-midpoint splits,
  invalid boundaries, source-field inheritance, duration totals, and progress
  conservation.
- Test the record manager replaces the source as one state update and adjusts
  linked-todo manual progress by the unchanged aggregate amount.
- Run affected Vitest tests and `npm run build`.
