# Todo Month Trace Week Bar Design

## Context

The monthly todo schedule currently builds each day independently. Daily items are sorted by schedule-kind priority and then by title, so `Trace` entries (`primaryKind === 'inProgress'`) can shift up and down from one day to the next when other items appear or disappear.

That makes repeated daily trace items render as separate short strips instead of a visually continuous bar.

## Approved Scope

- Only optimize `Trace` entries.
- Allow limited cross-type movement when it helps a `Trace` segment stay visually continuous.
- Keep `Trace` entries in the same normal row stack as other entries.
- Treat each rendered calendar week row independently.
- Do not try to preserve continuity across the line break between two calendar rows.

## Goal

Within a single rendered week row, if the same trace todo appears on adjacent days, it should stay at the same relative vertical row so it can be rendered as one horizontal bar.

Example:

- If todo `A` appears on day 1, 2, and 3 of the same week row, it should occupy the same row slot on all three days.
- If todo `B` appears on day 2, 3, and 4, it should also occupy a stable row slot on those days.
- When segments overlap on day 2 and 3, their relative order must remain stable across both days.

## Recommended Approach

Use a week-scoped two-phase layout:

1. Detect continuous `Trace` segments inside one rendered week row.
2. Assign each segment a stable lane index for that week row.
3. Rebuild each day’s final entry order by reserving those lane slots first, then backfilling non-trace items into the remaining gaps.

This gives `Trace` items stable per-day row positions without requiring a whole-month global optimization pass.

## Segment Detection

Work per rendered `TodoMonthWeek`, using only its seven day cells.

For each day:

- Start from the existing daily `TodoDateEntry[]` list.
- Separate entries into:
  - `traceEntries`: `primaryKind === 'inProgress'`
  - `normalEntries`: everything else

Then create continuous trace segments:

- Group by `todo.id`.
- Inside the week row, consecutive adjacent days count as one segment.
- A missing day breaks the segment.
- A day where the todo is not a pure `Trace` entry also breaks the segment.
- Crossing into the next rendered week row always starts a new segment.

Example:

- `A` on Tue/Wed/Thu becomes segment `A:[Tue-Thu]`
- `B` on Wed/Thu/Fri becomes segment `B:[Wed-Fri]`

## Preferred Row Heuristic

Each segment gets a preferred row based on the current unmodified per-day ordering.

For every day covered by the segment:

- Find the original index of that trace entry in that day’s original `entries` array.

Then compute:

- `spanLength`: number of covered days
- `preferredRow`: median of those original indices

This keeps the final layout close to the current reading order instead of always pushing traces to the very top.

## Lane Assignment

Assign a stable `laneIndex` to each trace segment inside the week row.

Sort segments before assignment by:

1. Longer `spanLength` first
2. Earlier `startDayIndex` first
3. Smaller `preferredRow` first
4. Stable tiebreaker by `todo.id`

For each segment:

- Search for the nearest available lane to `preferredRow`
- A lane is available only if none of the days covered by this segment already have another segment occupying that lane
- Reserve that lane across the full segment span

Result:

- A single segment keeps the same vertical row on every day it covers
- Overlapping segments also keep a stable mutual order

## Rebuilding Daily Order

After lane assignment, compute each day’s final entry order.

For each day in the week row:

1. Create a sparse row array
2. Place that day’s trace entries into their reserved `laneIndex`
3. Iterate the original day order again
4. For every non-trace entry, place it into the next empty row slot

This preserves two useful properties:

- Trace continuity is protected first
- Non-trace entries still stay as close as possible to the original order, only moving when a trace lane needs that row

## Rendering Model

Keep the existing day-cell stack model, but render trace continuity at the week-row level.

For one week row:

- Day cells still render date labels and handle day selection
- Non-trace entries render inside each day cell from the rebuilt final order
- Trace rows reserve space inside the day cells so vertical alignment stays correct
- Actual continuous trace bars render in a week-level overlay layer

Each overlay segment should include:

- `todoId`
- representative `entry`
- `laneIndex`
- `startDayIndex`
- `endDayIndex`
- covered `dateKeys`

The overlay bar position can be computed from:

- `left`: `startDayIndex / 7`
- `width`: `(endDayIndex - startDayIndex + 1) / 7`
- `top`: derived from `laneIndex` and row height

## Bar Styling

Recommended visual rules:

- Reuse the existing month-view `inProgress` color family
- Show the title only once, preferably on the segment’s starting day area
- Do not repeat the same label in every covered day cell
- Use rounded corners by segment role:
  - single-day: both ends rounded
  - start: left rounded, right straight
  - middle: both straight
  - end: left straight, right rounded

## Hidden Count Behavior

The month view already limits visible rows per day.

After final daily order is rebuilt:

- `visibleEntries` should be derived from the rebuilt order
- `hiddenCount` should be computed from the rebuilt order as well

This ensures that:

- Trace-reserved rows count as real visible rows
- Overflow counts still match what the user actually sees

## Expanded Day Detail

The expanded selected-day list should reuse the rebuilt per-day ordering rather than the old raw order.

That keeps the mental model consistent:

- The first visible strip in the cell is still the first item in the expanded list
- The same applies to second, third, and later rows

## Data Shape Proposal

Add a week-level layout helper in `src/utils/todoScheduleUtils.ts`.

Suggested output shape:

```ts
interface TodoWeekTraceSegment {
  todoId: string;
  entry: TodoDateEntry;
  laneIndex: number;
  startDayIndex: number;
  endDayIndex: number;
  dateKeys: string[];
}

interface TodoMonthWeekLayout {
  sortedEntriesByDate: Record<string, TodoDateEntry[]>;
  traceSegments: TodoWeekTraceSegment[];
  visibleRowCount: number;
  hiddenCountByDate: Record<string, number>;
}
```

Suggested helper responsibility:

- Input:
  - `week.days`
  - `entriesByDate` for those seven days
  - the current visible-entry limit
- Output:
  - rebuilt daily order
  - overlay-ready trace segments
  - counts needed by the month cell renderer

## Edge Rules

- Only `primaryKind === 'inProgress'` participates in week-bar layout.
- If a todo becomes `scheduled`, `deadline`, `recurring`, or `completed` on a day, that day does not belong to the trace segment.
- The same todo appearing in multiple logs on one day still maps to one trace day entry.
- Week rows are isolated; continuity does not carry across the next row.

## Testing Plan

Add regression coverage in `src/utils/todoScheduleUtils.test.ts` for:

- `1/2/3` and `2/3/4` overlapping segments keep stable relative order on overlap days
- Non-trace items yield to reserved trace lanes but otherwise preserve their internal order
- Crossing into the next rendered week row resets lane assignment
- A non-trace day in the middle correctly splits a trace segment
- Hidden counts remain correct after rebuilding daily order

## Why This Approach

This week-scoped lane model is a good fit for the actual month-view UI:

- It matches the visual unit the user perceives as continuous
- It avoids unnecessary whole-month optimization complexity
- It allows trace continuity without fully abandoning the existing reading order
- It creates a clean separation between layout computation and rendering
