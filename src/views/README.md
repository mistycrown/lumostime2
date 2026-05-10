# Views Layer

The `views/` directory contains all the React components that represent the distinct screens or pages of the LumosTime application. This layer is responsible for the presentation logic and user interaction.

## Architecture

The views are designed as "dumb" or "presentational" components where possible, receiving their data and callbacks via props from the main container (`App.tsx`). This centralization of state management in `App.tsx` (or custom hooks) keeps the views focused on rendering.

### Key Classifications

*   **Main Tabs**: High-level navigation roots (e.g., `TimelineView`, `StatsView`, `TodoView`, `TagsView`).
*   **Detail Views**: Dedicated pages for specific entities (e.g., `CategoryDetailView`, `TagDetailView`, `ScopeDetailView`).
*   **Modals/Overlays**: Specialized interaction flows (e.g., `SettingsView`, `RecordView`, `DailyReviewView`).
*   **Management Views**: Bulk editing interfaces (e.g., `BatchManageView`, `TodoBatchManageView`, `GoalBatchManageView`, `ScopeManageView`).

> Note: color pickers in detail and batch management views should keep built-in theme colors and persisted custom HEX colors consistent, including todo category colors and scope colors used by stats.
> Note: scope-related views should use the shared rule where each linked scope receives the full duration of a log.

## Key Components

*   **TimelineView**: The core dashboard visualizing daily activities and reviews, with switchable styling for normal timeline record nodes, synchronized gesture/calendar day-switch animation in the main content area, direct header entries to global search and custom filters, and plain-text `子任务 @父任务` labels in the trailing `Done` node for completed subtasks.
*   **AchievementView**: Full-screen achievement bottle page entered from Timeline, combining the star container, frozen daily snapshots, editable rules, and reward redemption ledger.
*   **StatsView**: Comprehensive analytics with multiple visualization modes (Pie, Matrix, Line, Schedule, Check, Emoji), including a subtle top-level fade transition for swipe and header date navigation. Weekly ranges should reuse the shared stats date-range helper so cross-month matrix weeks stay capped at 7 days.
*   **SettingsView**: Central configuration hub for Sync, AI, and App preferences, including notification-aware floating-window startup and Android permission-return recovery.
*   **ReviewHubView**: Archive dashboard displaying monthly, weekly, and daily reviews.
*   **JournalView**: Journal-style view for daily entries, providing an alternative perspective to ReviewHubView, with shared timeline styling, per-style archive offset support, and a centered shared month picker modal for Memoir navigation.
*   **OnThisDayView**: Same-day-across-years archive view with shared timeline styling, schedule comparison, review content, and deletable persistent notes for a month-day.

> ⚠️ **Note**: When modifying views, ensure that new state requirements are coordinated with `App.tsx` if they affect global data (Logs, Categories, Todos).

> Last updated: 2026-05-10
- `TodoView.tsx`, `TodoBentoWeekView.tsx`: The Todo schedule week navigation now uses one parent-owned Monday week start as the single source of truth, so the standard week view and `八宫格` share the same header range, week picker date, and explicit week-switch actions.
- `TodoView.tsx`, `TodoBentoWeekView.tsx`: Unified week navigation around a Monday-based reference date so the Todo schedule header, week picker, and `八宫格` mini-calendar all switch the same week without drifting to an internal midweek anchor.
- `TodoView.tsx`, `TodoBentoWeekView.tsx`, `TodoMonthView.tsx`: The Todo schedule screen now offers `周视图 / 八宫格 / 月视图`, with the new `八宫格` mode using a one-screen-per-week 2x4 editorial layout, linked mini-calendar navigation, and the same real Arrange / Due / Repeat / Done / Trace data plus drag-to-move rules as the other planning views.
- `TodoView.tsx`, `todoScheduleUtils.ts`: Week schedule rows now append subtask parent context inline as `子任务 @父任务`, and the combined title stays on one truncating line instead of splitting parent context into a separate badge.
- `SceneView.tsx`, `SceneCard.tsx`: Timer and todo scene cards now auto-flip only when the current slot already has a matching timeline record, while those timeline-forced backs block swipe-to-front and purely manual flips still swipe back normally.
- `TodoView.tsx`, `TodoMonthView.tsx`, `todoScheduleUtils.ts`: The Todo schedule `月视图` now uses a rolling editorial calendar adapted from the minimalist reference demo, replaces all seeded fake entries with the same real Arrange / Due / Repeat / Done / Trace day data used by the week planner, and marks each item with a month-view-specific colored left rule by schedule type.
- `TodoView.tsx`: The Todo schedule screen now remembers its nested `周视图 / 八宫格 / 月视图` choice, keeps a small dropdown trigger beside the week header actions, and lets all three schedule presentations share the same real todo data plus quick-action entry points.
- `BatchFocusRecordManageView.tsx`: Batch record management now supports note deletion, note appends with automatic newline separation, and note text find-and-replace across selected records.
- `SettingsView.tsx`, `settings/PreferencesSettingsView.tsx`: Replaced the old boolean `开始计时后自动跳转` toggle with a three-option selector that can keep the current page, open the active timer detail, or enter immersive timer immediately while preserving existing scene-card immersive overrides.
- `BatchFocusRecordManageView.tsx`, `AutoLinkView.tsx`, `MemoirSettingsView.tsx`: Scope pickers and filter chips now share one saved scope-order helper so batch tools and scope selectors stay aligned.
- `TodoView.tsx`: Removed the small top-right status dot from the display-settings sidebar button so it now matches the other Lucide icon controls in the left utility stack.
- `SettingsView.tsx`: Moved the Android `小组件` entry below the `开启悬浮球` toggle while keeping both items in the same settings group.
- `TodoView.tsx`, `TodoDisplaySettingsModal.tsx`: Lowered the Todo sidebar utility cluster closer to the fixed footer, replaced the old eye toggle with a display-settings modal, and added persisted compact-mode toggles for linked tag, scope, schedule-type, progress-ring, and date-suffix visibility.
- `TodoView.tsx`: Category lists now only group incomplete todos before completed ones and otherwise preserve the saved incoming todo order from batch management, while compact inline symbol-based date suffixes like `(05.06)[05.09]` stay fully visible by truncating the title before the dates.
- `TodoView.tsx`: Completed todo rows now undo on the same left-swipe path as incomplete-row completion toggles, while right swipe still keeps `DETAIL / DUPLICATE` and lower-row taps still pass through the shared quick-actions open guard.
- `TodoView.tsx`, `TodoQuickActionsModal.tsx`: Lower todo rows now pass the quick-actions open timestamp into the shared sheet so the same touch cannot immediately hit a freshly mounted quick-action button.
- `TodoView.tsx`: List mode now reserves the fixed footer's height just like week mode, so lower todo rows no longer sit underneath the bottom navigation hit area.
- `TodoView.tsx`: Completed todo rows no longer undo via left swipe, and ambiguous light drifts now still fall back to opening quick actions instead of landing in a no-op gap.
- `SceneView.tsx`, `RecordView.tsx`, `TodoView.tsx`: Reworked the custom-background layout stack so each page now uses one shared whole-page warm scrim plus a second right-panel overlay, giving the left rail its own tint without separate sidebar patches and removing the visible seam between the sidebar and the rounded content panel.
- `TodoView.tsx`: Todo rows now use a conservative axis-locked gesture classifier, so light lower-list taps keep opening quick actions while diagonal scrolls no longer misfire into completion toggles or swallowed presses.
- `RecordView.tsx`: Matched the expanded record-page left-rail width rule to `TodoView`, so the sidebar scrim and main-panel bridge now occupy the same footprint on both pages.
- `RecordView.tsx`, `TodoView.tsx`: Refined the custom-background left-rail scrim into a warmer gradient bridge that blends into the main panel, removing the visible seam between the sidebar wallpaper and the rounded content surface while keeping sidebar buttons readable.
- `RecordView.tsx`, `TodoView.tsx`: When a custom background is active, the left sidebar now gets its own local translucent scrim so category and utility buttons stay readable without tinting the main content panel.
- `TimelineView.tsx`: The trailing `Done` node now renders completed subtasks as plain text in `子任务 @父任务` form so parent context is visible without adding new UI chrome.
- `TodoView.tsx`: The shared quick-actions sheet now includes an inline `删除任务 -> 确认删除？` entry, so both list rows and week-view badges can remove a todo without opening the full detail editor.
- `TodoView.tsx`: Todo-list rendering now hides unfinished subtasks whenever their parent task is completed, without mutating the child tasks; undoing the parent completion restores those child rows through the existing expand state.
- `TodoBatchManageView.tsx`: The todo batch-management screen now hides subtasks entirely, while save operations still preserve hidden child todos and completed todos unless their parent task or category is removed.
- `TimelineView.tsx`, `TodoView.tsx`: Their AI entry buttons now open one app-level shared AI window that stays mounted in the background, so closing the modal UI no longer interrupts an in-flight AI request.
- `TimelineView.tsx`: Replaced the floating AI backfill button's old parse modal with a new chat-first dialog that keeps local per-day conversation history while sending each message as an independent AI turn.
- `TodoView.tsx`: Replaced the old dedicated `AI 添加待办` parse/confirm modals with the same shared AI chat workspace used elsewhere, so the todo-page magic button now opens one unified conversation flow.
- `TodoView.tsx`: Virtual-schedule parent rows now reuse the hierarchy toggle so a `0/1` badge can expand matching child todos inline, while absorbed child rows stop rendering as duplicate standalone schedule items.
- `TodoView.tsx`: Compact virtual-schedule badges now abbreviate long labels like `Arrange` and `Repeat` to three-letter forms such as `Arr` and `Rep`.
- `TodoView.tsx`: Nudged the compact `0/1` hierarchy capsule upward again so it sits a bit higher against the compact row center line.
- `TodoView.tsx`: Compact todo rows now stack flush without extra gaps between adjacent parent groups, and the compact `0/1` hierarchy capsule is nudged a bit further upward.
- `TodoView.tsx`: Nudged the compact-mode hierarchy capsule upward by one pixel so the `0/1` badge sits closer to the visual midline of adjacent inline tags.
- `TodoView.tsx`: Normalized loose-mode hierarchy and metadata badge heights so the parent-task `0/1` capsule stays vertically centered with adjacent tag containers.
- `TodoView.tsx`: Removed the remaining compact-mode subtask branch marker so child rows no longer show any curved connector before the title.
- `TodoView.tsx`: Child rows inside the expanded parent tree no longer repeat their parent badge, while standalone scheduled subtasks now show an `@`-prefixed four-character parent-title hint.
- `TodoView.tsx`: Removed the loose-mode curved branch marker before subtasks, while preserving the compact-mode hierarchy connector.
- `TodoView.tsx`: Merged loose-mode hierarchy chips, pin badges, linked activity tags, and scope tags into one shared wrapping row so badges stay on a single line whenever width allows and only wrap as needed.
- `TodoView.tsx`: Simplified hierarchy badges so parent rows show only compact counts like `0/1`, while child rows show a four-character ellipsized parent title without extra `子任务` wording.
- `TodoView.tsx`: Restored parent/subtask hierarchy cues inside the virtual `排期` list so scheduled parent rows show child progress badges and scheduled subtasks show their parent context plus a subtle branch marker.
- `TodoView.tsx`: Category lists now render one-level parent/subtask trees, defaulting subtasks to collapsed rows with an inline progress summary and expandable child rows.
- `TodoView.tsx`: Category-specific todo lists now also pin pinned todos to the top and render the pin chip as icon-only in compact mode versus icon plus `Pin` in loose mode.
- `TodoView.tsx`: The `排期 -> 今` page now includes pin-only todos in a top `Pin` section, while deduplicating todos that are both pinned and already arranged/due today.
- `TodoView.tsx`: Added a boolean `pin` flag to todo scheduling so `排期 -> 今` now lifts pinned items to the top and shows a matching `Pin` label in the same lightweight badge style as `Arrange` / `Due`.
- `TodoView.tsx`: Let the week-view `Trace` and `Done` badges open the shared quick-actions sheet, matching the existing `Arrange` and `Due` badge behavior.
- `TodoView.tsx`: Kept week-view multi-badge abbreviations on a single compact line so `Arr / Tra / Rep` no longer wrap into stacked rows.
- `TodoView.tsx`: Tightened the week-view multi-badge right rail so abbreviated labels no longer leave wide trailing blanks, and split the virtual `今` schedule list into `今天` plus `过期未完成` sections.
- `TodoView.tsx`: Shortened week-view right-rail status labels to three-letter abbreviations whenever a row shows multiple badges, while keeping `Due` and `Done` fully spelled out.
- `TodoView.tsx`: Switched the week-view left date numerals to `Bilbo Swash Caps` using the bundled `/public/fonts/BilboSwashCaps-Regular.ttf` asset.
- `TimerFloating.tsx`: Narrowed Todo-view floating timers to the same avoidance scale used by the Record page so the bottom-right list/week floating button no longer overlaps the timer pill.
- `TodoView.tsx`: Excluded the inline start-focus button from row-level quick-action tap handling so the play button still launches focus on mobile instead of opening the quick-actions sheet.
- `TodoView.tsx`, `TodoQuickActionsModal.tsx`: Stopped todo-row open clicks from bubbling and switched quick-actions backdrop dismissal to pointer-down handling so desktop taps no longer flash the sheet open and closed.
- `TodoView.tsx`: Shortened the virtual `排期` filter chips under the header from `今天 / 明天 / 本周` to `今 / 明 / 周` for a tighter mobile layout.
- `TodoView.tsx`: Unified todo-row tap targets across the full foreground card and only suppresses follow-up clicks after real touch gestures, fixing mobile quick-actions taps that were intermittently swallowed on active items.
- `TodoView.tsx`: Added conservative left/right week-switch swipes inside the week planning scroll area, with stronger horizontal thresholds and explicit opt-outs for row drag handles, badge taps, and date buttons to reduce accidental switches.
- `TodoView.tsx`: Moved the week-view `本周` action into the header's top-right corner so it reads as a separate jump-to-current-week control.
- `TodoView.tsx`: Split the right-swipe background styling so the light detail-open state and deeper duplicate state now use clearly different colors.
- `TodoView.tsx`: Lowered completed progress-fill opacity so finished progress-tracking cards read more softly in both loose and compact views.
- `TodoView.tsx`: Mounted the shared todo quick-actions sheet above both list and week layouts so list-row taps now show the sheet in the active screen instead of the hidden week branch.
- `TodoView.tsx`: Extracted the todo quick-actions sheet into shared component and hook files, and moved list-row touch handling onto a unified pointer gesture flow.
- `TodoView.tsx`: Let loose-mode progress bars span the full card width so top-right arranged/due markers no longer compress them.
- `TodoView.tsx`: Prevented touch ghost-clicks from immediately dismissing the todo quick-actions sheet after a mobile tap-open.
- `TodoView.tsx`: Fixed mobile todo-row taps so they reliably open quick actions, and split right-swipe into a light open-detail gesture plus a deeper duplicate gesture.
- `TodoView.tsx`: Changed todo-row primary taps to open the shared quick-actions sheet first, while keeping full detail editing available from the sheet header button.
- `TodoView.tsx`: Moved arranged/due date markers into the detailed card's right action rail as stacked icon-plus-date rows, removed their outlines, and clamped loose-mode titles to two lines.
- `TodoView.tsx`: Shortened the quick-action move labels to `今 / 明 / 下周` and widened the `下周` action column so the sheet no longer wraps the week shortcut.
- `TodoView.tsx`: Added a `明天` shortcut beside `今天` and `下周` in the week-view quick-actions sheet for both Arrange and Due date moves.
- `TodoView.tsx`: Added an undo-complete action to the week-view quick-actions sheet so completed todos can be restored without opening the full detail editor.
- `TodoView.tsx`: Added a top-pinned virtual `排期` sidebar category that opens by default, with in-panel `今天 / 明天 / 本周` filters and lightweight schedule badges that reuse the existing Arrange / Due / Repeat semantics.
- `TodoView.tsx`: Added touch edge auto-scroll for mobile week-view dragging and let the week rows use normalized badge combinations so redundant Arrange/Trace labels are suppressed when Due/Done are present.
- `TodoView.tsx`: Tightened week-view overdue warning icons so Arrange/Due only show the alert when the date has passed and no completion date exists.
- `TodoView.tsx`: Added extra bottom padding to the week-planning scroll content so the floating action button no longer blocks the last scheduled rows.
- `TodoView.tsx`: Hid empty quick-action Arrange/Due/Completed metadata rows in the week-view badge editor so unset dates no longer render `None`.
- `TodoView.tsx`: Added a quick duplicate-edit modal before creating todo copies, with default date cleanup plus optional tag and scope clearing.
- `SceneView.tsx`, `RecordView.tsx`, `TodoView.tsx`: Moved custom background rendering onto a shared preloaded display hook, removed per-view 500ms background polling, dropped duplicate inner background layers, and reduced heavy blur on lower-end mobile devices to smooth scrolling and background switches.
- `SceneView.tsx`, `RecordViewContainer.tsx`: Added `min-h-0` and `flex-1` guards around the scene sidebar and card stack so long scene-card lists keep scrolling correctly on some Android WebViews instead of being cut off.
- `RecordViewContainer.tsx`, `TodoView.tsx`, `DailyReviewView.tsx`, `WeeklyReviewView.tsx`, `MonthlyReviewView.tsx`: Floating switch buttons now let default-theme fallback icons inherit the button color instead of forcing white, so non-default color schemes keep those buttons legible on white surfaces.
- `TodoView.tsx`: The bottom-right list/week floating switcher now keeps the active color-scheme button shell even when the UI icon theme remains `default`, so accent themes no longer fall back to the old black-and-white button.
- `TodoView.tsx`: Added a first-pass week planning mode with a floating list/week switcher, seven horizontal day rows, and separate badges for assigned, deadline, recurring, completed, and in-progress todo states.
- `CategoryDetailView.tsx`, `ScopeDetailView.tsx`, `TagDetailView.tsx`: Added inline note template management in detail pages so template editing lives beside the related category/scope/tag instead of in settings.
- `FocusDetailView.tsx`: Added note template recommendations directly below the note input to keep active-session note capture one-tap.
- `ReviewHubView.tsx`: Replaced Chronicle card `color-mix` shadows and blur-only surfaces with Android-safe fallbacks so HarmonyOS no longer renders abnormal themed gradients behind archive cards.
- `SettingsView.tsx`, `WidgetSettingsView.tsx`: Localized widget settings entry, loading label, and widget settings UI text to Chinese.
- `SettingsView.tsx`: Added notification-aware floating-window startup, warning toasts when persistent notifications are unavailable, and automatic retry after returning from Android permission pages.
- `RecordView.tsx`, `TodoView.tsx`: Softened the shared sidebar utility buttons so the bottom controls feel lighter in both record and todo pages.
- `TodoView.tsx`: Added a persisted sidebar toggle for showing or hiding completed todos, while keeping the sidebar control spacing aligned with `RecordView`.
- `TodoView.tsx`: Matched the expanded left-sidebar button spacing with `RecordView` so the density toggle and collapse control keep the same right-side gutter.
- `OnThisDayView.tsx`: Switched historical review answers to a quote-style layout and preserved newline formatting for review and note content in the On This Day archive.
- `ObsidianExportView.tsx`: Added image folder configuration, image-section rendering, and attachment export flow for the desktop Obsidian export tool.
- `StatsView.tsx`: Reused the shared week range helper so matrix weeks no longer overflow when a week spans two months.
- `FocusDetailView.tsx`: Updated progress display logic to dynamically show progress increments.
