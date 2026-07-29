# Timeline Schedule Canvas Design

## Goal

Replace the `timeline-todo` layout's list-like left pane with a full-day visual
schedule canvas. Keep the existing Downlist as the `timeline` layout.

## Time Canvas

- Render the entire local day from `00:00` through `24:00` as a vertical
  time-scale canvas.
- Position existing logs as blocks from their actual start and end timestamps.
  Continue using existing log title, category/activity color, note, tags, and
  linked-todo metadata; no data migration is needed.
- Initially scroll to a configurable default hour. The default is `08:00`.
  The setting controls only the initial viewport position, never the visible
  data range or scroll bounds.
- Add a Preferences > Display selector for the default hour.
- On touch devices, two fingers pinch to adjust the vertical pixels-per-hour
  scale within bounded limits. One finger retains normal vertical scrolling.
  Pinch handling must not trigger the existing one-finger date swipe gesture.
- Existing add-record behaviour remains available. Dragging todos or creating
  planned virtual blocks remains explicitly out of scope.

## Responsive Layout

- Wide screens keep the canvas at left and the existing todo sidebar at right.
- The sidebar independently scrolls and reserves a substantial bottom inset so
  the app's lower-right floating controls cannot hide its final rows.
- The desktop sidebar still collapses. Narrow screens present the canvas full
  width and open todos in the existing drawer.

## Review Stack

- Place review cards directly below the calendar and above the time canvas.
- Always render a Daily Review card for the selected date. If missing, it is a
  create-and-open placeholder. If present, it starts collapsed as an entry
  button and expands in place.
- The expanded daily card shows completion status for current daily checks plus
  the existing timeline-synced check groups and template answer content.
- On a week-ending selected date, append a Weekly Review card; on a
  month-ending selected date, append a Monthly Review card. Each has the same
  created/missing placeholder and collapse model.
- Clicking a missing card creates/opens the corresponding review for the
  selected date. Existing review callbacks remain the single entry point.
- Suppress the legacy review nodes inside the canvas layout to avoid duplicate
  rendering. The Downlist retains its existing review nodes.

## Components And State

- Add a focused schedule-canvas component for scale math, scroll positioning,
  pinch tracking, time grid rendering, and log-block placement.
- Add a review-stack component that receives the already-derived TimelineView
  review/check/template data and only owns expand/collapse presentation state.
- Persist only the default canvas hour in SettingsContext. Pinch zoom remains
  local view state for this phase.

## Validation

- Test default-hour validation and persisted fallback behaviour.
- Test canvas block geometry helpers for normal, short, and cross-day logs.
- Manually verify desktop sidebar scrolling/collapse and mobile drawer.
- Manually verify touch pinch boundaries and default scroll position on mobile.
- Verify all Daily/Weekly/Monthly created, missing, collapsed, and expanded
  card states, then run `npm run build`.
