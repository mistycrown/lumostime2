# Timeline Todo Layout Design

## Goal

Add a selectable layout for the Chronicle (Timeline) view. The existing Downlist
timeline remains the default layout. A second layout combines the same timeline
with a read-only list of today's and pinned todos.

## Settings

- Add a `timelineLayout` preference with `timeline` and `timeline-todo` values.
- Persist it through the existing settings context and local storage.
- Surface it in Preferences > Display as a dropdown, reusing the existing
  settings dropdown pattern: trigger button, anchored listbox, selected dot,
  and outside-click overlay.
- Default existing users to `timeline` so current behaviour is unchanged.

## Layout

- On wide screens, `timeline-todo` uses a two-column workspace: the current
  timeline at left and a collapsible todo sidebar at right.
- The sidebar has independent scrolling and can collapse to a narrow rail;
  expanding it restores the previous todo list without changing the selected
  date or timeline state.
- On narrow screens, prioritize the timeline. Open the todo list in a drawer
  from a header action rather than compressing both columns.
- The new layout continues to use the existing background, calendar, date
  navigation, quick actions, and add-record flow.

## Todo Sidebar

- Show incomplete todos associated with today and incomplete pinned todos.
- Group the list into `Pinned` and `Today`, avoiding duplicates when a todo is
  in both groups.
- Reuse existing todo category colors and metadata where available: title,
  category color marker, pin/scheduled state, and labels.
- A todo row has no completion checkbox. Clicking it opens the same todo quick
  action editor used by the Todo view.

## Timeline Records

- Adding a record remains the existing Downlist/AddLog flow.
- Existing record title, activity/category color, note, linked todo, scope,
  and tag-like metadata retain their current rendering and editing behaviour.
- No drag interaction ships in this phase.

## Future Planned Blocks

- A future drag from the todo sidebar to the timeline will create a planned,
  virtual time block. It must be a distinct model/state from completed logs,
  never silently write a completion record, and can later support conversion
  into a real log.
- The first implementation should leave a narrow component boundary for this
  future feature without adding unused persisted data now.

## Architecture

- Keep `TimelineView` as the owner of date, logs, navigation, and modal entry
  points.
- Extract the layout shell and todo sidebar into focused components so the
  current timeline rendering is not duplicated and future drag behaviour is
  isolated from log rendering.
- Share the existing todo filtering and quick-action editor behaviour rather
  than duplicating Todo view data mutation code.

## Validation

- Verify the legacy layout remains visually and functionally unchanged.
- Verify the new layout on desktop wide, desktop narrow, and mobile widths.
- Verify sidebar collapse, mobile drawer open/close, and click-through to todo
  quick actions.
- Verify settings persist across reloads and fallback safely for unknown stored
  values.
- Run `npm run build` and add focused tests for preference normalization and
  sidebar filtering when the implementation lands.
