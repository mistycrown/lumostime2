# Timeline Quick Color Split Design

## Goal

Add a second right-side split panel to the timeline workspace for quick coloring a day with formal time records. The existing todo split panel keeps its collapse control, but the collapsed icon should communicate that it opens todos.

## Approved Behavior

- Todo split control:
  - Collapsed state shows a todo icon.
  - Expanded state shows a collapse icon.
- Quick color split control:
  - Collapsed state shows a quick-color icon.
  - Expanded state shows a collapse icon.
- The quick color panel lists normal record labels by first-level category and second-level activity.
- User selects an activity in the right panel, then drags on the left timeline from start time to end time.
- User can also drag an activity directly from the quick color panel to the timeline. That path creates a default 30-minute formal record at the drop time, then the user can adjust the block boundary with the existing timeline handles.
- Releasing the drag creates a formal `Log`, not a planned block.

## Data Flow

- `TimelineView` owns the active quick-color activity selection and passes it to `TimelineScheduleCanvas`.
- `TimelineQuickColorSidebar` renders categories and activities in their existing persisted order.
- `TimelineScheduleCanvas` converts pointer positions into snapped timeline minutes and emits a new log request with category, activity, start time, and end time.
- The created log uses the existing record data model so it appears in the timeline, statistics, export, sync, and search flows.

## Interaction Details

- Time snapping follows the existing 5-minute grid.
- The minimum created record duration is 5 minutes.
- While dragging, the canvas shows a translucent preview block using the selected activity color.
- Clicking an activity keeps it selected and shows a brief hint telling the user to drag on the left timeline to create a record.
- Directly dragging an activity from the panel skips the hint.
- If no quick-color activity is selected, timeline dragging behaves normally.
- The todo drag-to-plan interaction remains unchanged.

## Verification

- Run `npm run build`.
- Smoke test the timeline split workspace:
  - Toggle todo panel collapsed and expanded states.
  - Toggle quick color panel collapsed and expanded states.
  - Select an activity and drag a range on the timeline.
  - Confirm the created entry is a normal log and can be opened/edited like other records.
