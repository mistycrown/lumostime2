# Focus Record Merge Design

## Goal

Extend the time-split flow into a combined split-and-merge flow for an existing
focus record.

## Entry And Choice

- Replace the standalone split entry with a `Split & Merge` entry in the
  existing record time controls.
- Its modal continues to offer timeline splitting and additionally exposes
  `Merge into previous` and `Merge into next` actions.
- Each merge action is available only when its adjacent actual record exists.
  `Merge into next` is visibly disabled when no next record exists.

## Merge Confirmation

- Choosing a merge first opens a confirmation state in the same single modal.
- It identifies the source and target record by activity name and time range,
  then shows the resulting combined time range.
- When the boundary gap is greater than one minute, the confirmation explicitly
  reports that gap and that it will be included in the merged record.

## Persistence Rules

- `Merge into previous` preserves the previous record's fields and changes its
  range to `[previous.startTime, current.endTime]`.
- `Merge into next` preserves the next record's fields and changes its range to
  `[current.startTime, next.endTime]`.
- In both cases, duration is recomputed from the full range, so a gap is part
  of the result.
- The target receives the sum of both `progressIncrement` values. The source
  record is removed.
- Every collection membership of the source is attached to the target, without
  changing target membership or deleting unrelated collection entries.

## Verification

- Unit-test previous and next merging, no-neighbor availability, gap detection,
  complete-range duration, progress aggregation, and collection migration.
- Run the affected Vitest tests and `npm run build`.
