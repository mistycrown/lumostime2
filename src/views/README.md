# Views Layer

- Update 2026-09-12: `TodoView.tsx` adds explicit min-size constraints and contained touch scrolling to prevent schedule/list content clipping in Android WebView on Huawei P70-class devices.

- Update 2026-09-02: `RoutineSettingsView.tsx` now requires confirmation through the shared `ConfirmModal` before deleting a Routine.
- Update 2026-08-26: `RoutineSettingsView.tsx` uses nested back navigation, a shared emoji/UI icon row, cross-category tag selection that stays open until an Activity is chosen, and static per-step notes; `RecordView.tsx` renders the active note below the selected category header without placing it in timeline logs.
- Update 2026-08-26: Routine steps now store Markdown checklist templates; the active Routine card toggles checklist items and submits the current `[x] / [ ]` Markdown through the timeline log note.
- Update 2026-08-26: `RoutineSettingsView.tsx` now supports expandable `#标签`、`%领域`、`@待办` selectors, with Todo associations taking precedence over independent Activity and Scope choices; `RecordView.tsx` mirrors these markers in the active Routine card.
- Update 2026-08-26: Category and tag detail pages now show explicit archive status beside their archive/restore actions, while batch tag management can archive or restore a whole category with its child tags.
- Update 2026-08-26: `ScopeDetailView.tsx` now shows explicit domain archive status beside its archive/restore action.
- Update 2026-08-26: `TodoBatchManageView.tsx` archives and restores whole todo categories; the `已归档` section preserves and displays all historical todos under each archived category.

- Update 2026-08-26: `CategoryDetailView.tsx` now exposes category archive/restore controls; category state changes cascade to all child tags, and `TagsView.tsx` keeps archived categories in a restorable archive section.
- Update 2026-08-26: `BatchManageView.tsx` keeps tag deletions in the local batch draft, checks them only on submit, and opens a per-deleted-tag migration review using the app's custom dropdown pattern before atomically applying the batch changes.

The `views/` directory contains all the React components that represent the distinct screens or pages of the LumosTime application. This layer is responsible for the presentation logic and user interaction.

- Update 2026-08-24: `TagDetailView.tsx` now owns Activity custom attribute definition management and an actual-log-only attribute statistics tab; `FocusDetailView.tsx` persists the same fields into the active session.
- Update 2026-08-10: `DailyCheckOverviewView.tsx` caches each row's current value and manual history before rendering, renders one full-width detail button per row, and uses `/` for a missing daily-check snapshot.
- Update 2026-08-10: `DailyCheckOverviewView.tsx` and `DailyCheckDetailView.tsx` show `nightEarliestStart` checks against the completed previous night during the daytime.
- Update 2026-08-10: `DailyCheckDetailView.tsx` presents an immediate loading screen, renders the current-month data first, and defers all-history statistics plus the 30-day trend until after first paint.
- Update 2026-08-10: `DailyCheckDetailView.tsx` uses the selected daily-check theme color consistently for its progress ring, heatmap, and trend.
- Update 2026-08-10: `DailyCheckDetailView.tsx` now presents its 30-day trend as a static chart without hover tooltips, pointer interaction, or Recharts focus outlines.
- Update 2026-07-30: `TimelineView.tsx` and `DailyReviewView.tsx` now use the shared auto-check change detector so reorder-only refreshes do not trigger redundant review writes.
- Update 2026-07-31: `TimelineView.tsx` now receives the active Chronicle layout from the app shell, while the settings selector acts as the default layout for fresh Timeline entries.
- Update 2026-07-31: `TimelineView.tsx` keeps planned logs out of the pure timeline stream so idle gaps, exports, gallery data, and historical same-day links only reflect entity records.
- Update 2026-07-30: `TimelineView.tsx` now resizes both the todo and quick-color split sidebars by the same persisted 26%-70% workspace ratio.
- Update 2026-07-30: `TimelineView.tsx` passes the selected timeline date and logs into the split-workspace todo sidebar so it shares the schedule page's date-specific entries, including same-day completions and excluding Trace; future dates omit the daily-check list.
- Update 2026-07-30: `TimelineView.tsx` adds long-press resizing to the quick-color divider and unifies the todo and quick-color right sidebar minimum widths.
- Update 2026-07-30: `TimelineView.tsx` adds quick-color continuous-create state: the default one-shot mode clears the selected activity after one record, while checked continuous mode preserves it for repeated range creation.
- Update 2026-07-30: `TimelineView.tsx` scopes the right-edge split buttons by active panel: collapsed mode shows Plan Todo and Quick Color entries, Plan Todo shows Collapse plus Switch List, and Quick Color shows only Collapse.
- Update 2026-07-30: `TimelineView.tsx` makes the todo-plan and quick-color side panels mutually exclusive and groups their collapsed entry buttons into a tight right-edge control stack.
- Update 2026-07-30: `TimelineView.tsx` adds a second quick-color split panel with activity icon/collapse controls, click-to-range hints, and direct activity drag forwarding into the schedule canvas.
- Update 2026-07-30: `TimelineView.tsx` now forwards todo drops into the schedule canvas for virtual planning-block creation and hardens the long-press sidebar-resize cleanup path when a pointer session has already ended.
- Update 2026-07-30: `TimelineView.tsx` disables root swipe-date navigation only in the timeline-and-todo layout, preventing todo drag gestures from being claimed before they reach the schedule canvas.
- Update 2026-07-30: `TimelineView.tsx` forwards sidebar completion-circle clicks through the shared todo save flow, while todo bodies remain dedicated to quick editing and plan dragging.
- Update 2026-07-30: `TimelineView.tsx` routes plan-block start actions into the shared todo focus launcher and removes only the selected virtual plan block through a dedicated callback.
- Update 2026-07-30: `TimelineView.tsx` coordinates sidebar drag movement, cancellation, and drop outcomes with the schedule canvas so drag feedback remains live across both workspace panels.
- Update 2026-07-30: `TimelineView.tsx` continues to route direct mobile drag outcomes into the full-viewport plan action experience rendered by the schedule canvas.

- Update 2026-07-11: `AchievementView.tsx` now wires the records tab to the full achievement recomputation action for rebuilding archived and active ledger data together.

- Update 2026-07-11: `settings/CollectionSettingsView.tsx` now pauses its collection-detail hardware-back handler while global log or todo details are open, preserving the intended record > todo > collection detail > collection list return stack.

- Update 2026-06-21: `SettingsView.tsx` now builds manual cloud-sync uploads from the complete app sync payload passed by `App.tsx`, so settings-page uploads no longer omit collections, AI, achievements, stickers, or other backup-only fields.

- Update 2026-06-13: `DailyNewspaperView.tsx` now renders local per-annotation comment threads beneath AI newspaper annotations, keeping replies visually quiet in the existing print-inspired layout.

- Update 2026-06-13: `TodoView.tsx` now destructures and passes `handleQuickActionUpdateTitle` to `TodoQuickActionsModal` to enable inline title editing with auto-saving directly in the quick actions sheet.

- Update 2026-06-07: `WeeklyNewspaperView.tsx` and `MonthlyNewspaperView.tsx` now provide dedicated full-screen editorial pages for periodic AI newspapers, while `WeeklyReviewView.tsx` and `MonthlyReviewView.tsx` expose the same inline `AI 小报` entry, open, generate, and delete flow already used by the daily review.

- Update 2026-06-06: `BatchFocusRecordManageView.tsx` now documents `@待办/分类` in its batch-filter syntax hint, matching the shared custom-filter behavior where linked-log todo filters can hit both todo titles and todo category names.
- Update 2026-05-17 (桌面月历小组件): 将月历小组件（DesktopMonthWidgetView.tsx）计划栏的分类标签顺序调整为 maybe / arrange / due，并将标签文字“暂定/安排/截止”替换为英文 lowercase 形式，且在打开时默认选到 arrange 标签。
- Update 2026-05-17: 重构设置菜单布局，新增了“Windows 特性”分组，将“PC端小组件”与原在数据同步分类下的“导出到 Obsidian”归拢在此专有分组下，并确保其在安卓端不可见。
- Update 2026-05-17: 优化了显示条件，结合 !Capacitor.isNativePlatform() 逻辑彻底确保“PC端小组件”设置项在 Android 端隐藏。
- Update 2026-05-17: 进行了重命名与界面极简化修改，将设置项名称由“桌面今日小组件”更名为“PC端小组件”，并移除各小组件选项下的详细说明文字，仅保留标题。
- Update 2026-05-17: Added `DesktopMonthWidgetView.tsx` plus `desktop/DesktopMonthCalendar.tsx`, providing a premium dual-panel desktop month widget. The left side now reuses the app's rolling month planner so months scroll continuously instead of paging one fixed grid at a time, while the right side displays an interactive planning sidebar with tabs for `Arrange / Maybe / Due` to support HTML5 drag-and-drop scheduling with IndexedDB write-backs and BroadcastChannel cross-window synchronization.
- Update 2026-05-17: `DesktopTodayWidgetView.tsx` now provides a dedicated Electron-only today-task widget surface with compact `Pin / Today / Overdue` sections, while `SettingsView.tsx` adds a desktop launcher entry (Electron-only, in the Android features section) that directly opens the today-task widget window without navigating to a submenu.
- Update 2026-05-17 (桌面今日小组件): 在 `DesktopTodayWidgetView.tsx` 中新增“任务颜色”显示设置选项。支持用户在“排期类型”（基于任务状态如安排、截止、Maybe、完成等，并与周/月视图自定义配色实时同步）与“任务分类”（基于所属分组固有色）着色方案之间一键切换，并支持设置的本地持久化。

- Update 2026-05-21: `TodoView.tsx` now keeps the left sidebar's `排期 / 未来 / 小事` rail entries at the same fixed height in both collapsed and expanded states, preventing the bottom utility stack from being pushed down into the fixed navigation area when the rail opens.
- Update 2026-05-21: `settings/CollectionSettingsView.tsx` now sorts collection timeline task entries by the latest linked log start time, falling back to the todo's `createdAt` and only then to the time it joined the collection, so collection chronology follows real activity history instead of scheduled/completed date fields.
- Update 2026-05-21: `settings/CollectionSettingsView.tsx` now renders collection timeline preview images with their original aspect ratio inside a capped frame, replacing the previous square-only crop so cover art and screenshots keep their native composition.
- Update 2026-05-21: `settings/CollectionSettingsView.tsx` now stops click and keyboard bubbling on timeline preview-image buttons, so tapping a cover opens only the image lightbox and no longer also drills into the linked log/todo detail.
- Update 2026-05-21: `settings/CollectionSettingsView.tsx` now opens collection add-todo browsing at the category level with per-category expansion, while the add-log tab keeps results empty until users explicitly search, preventing huge record lists from rendering up front.

## Architecture

The views are designed as "dumb" or "presentational" components where possible, receiving their data and callbacks via props from the main container (`App.tsx`). This centralization of state management in `App.tsx` (or custom hooks) keeps the views focused on rendering.

### Key Classifications

- Update 2026-08-25: `TagDetailView.tsx` labels the attribute analytics route as `属性`, presents attribute settings as a card, and removes deleted attribute values from related logs after confirmation.

*   **Main Tabs**: High-level navigation roots (e.g., `TimelineView`, `StatsView`, `TodoView`, `TagsView`).
*   **Detail Views**: Dedicated pages for specific entities (e.g., `CategoryDetailView`, `TagDetailView`, `ScopeDetailView`).
*   **Modals/Overlays**: Specialized interaction flows (e.g., `SettingsView`, `RecordView`, `DailyReviewView`, `DailyNewspaperView`).
*   **Management Views**: Bulk editing interfaces (e.g., `BatchManageView`, `TodoBatchManageView`, `GoalBatchManageView`, `ScopeManageView`).

- Update 2026-05-16: `DailyNewspaperView.tsx` now renders every real log from the target day in time order instead of only annotated items, keeps orphaned annotation rows when source logs were deleted, and tightens the newspaper header/body spacing for a denser editorial layout.

> Note: color pickers in detail and batch management views should keep built-in theme colors and persisted custom HEX colors consistent, including todo category colors and scope colors used by stats.

- Update 2026-05-16: `DailyReviewView.tsx` now places the `小报` entry directly under the `AI 叙事` section, opens the shared AI chat with a prefilled `小报` request when that day has no newspaper yet, and requires confirmation before deleting an existing newspaper.

- Update 2026-05-18: `TodoView.tsx` 支持点击周视图一列（标准周视图）下循环排期的 Repeat 标签以唤起快捷编辑栏。
- Update 2026-05-14: `TodoView.tsx` now persists a shared `锁定/解锁` planner toggle and passes it through the standard week, bento week, and month schedule views, so all arrange/deadline/tentative entries can be frozen against drag-to-move until explicitly re-enabled.
- Update 2026-05-14: `TimelineView.tsx` now renders `◬ CollectionName` chips on any timeline log row that belongs to one or more collections, matching the existing linked-todo metadata badge styling instead of inventing a separate collection-only tag treatment.
- Update 2026-05-14: `TodoView.tsx` and planning components now support drag-and-drop for `Maybe` entries, and the standard week view plus month view `Maybe` badges now open the same quick-edit bar as Arrange/Due while multi-date drags replace only the moved tentative date.
- Update 2026-05-14: `TodoView.tsx`, `TodoBentoWeekView.tsx`, `TodoMonthView.tsx`, and `todoScheduleUtils.ts` now understand a sixth `Maybe` schedule type backed by today-or-future `maybeDates`, while recurring rows can suppress one generated date through `skipDates`.
- Update 2026-05-14: `TodoBentoWeekView.tsx` now mirrors the standard week planner's conservative horizontal swipe switching inside the `八宫格` day grid, while keeping the mini calendar, date buttons, badge buttons, and drag handles out of the swipe target set to reduce accidental week changes.
- Update 2026-05-14: `TodoView.tsx` and `TodoScheduleAssignModal.tsx` now expose a future-only `Maybe` quick-assign tab in the week/month day picker, let recurring todos reappear only inside that `Maybe` picker, and keep the `New` tab creating a task arranged on the chosen date instead of inheriting `Due` or `Maybe`.
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

> Last updated: 2026-05-13
- `TodoView.tsx`, `TodoQuickActionsModal.tsx`, `useTodoQuickActions.ts`: Quick-todo `升级为项目` now reuses the same centered category picker as `移动分类`, so upgrading a `小事` requires an explicit destination standard category instead of silently using a default project bucket.
- `TodoView.tsx`: Replaced the `小事` quick-add black `添加` button with a compact accent-colored check confirm button, keeping the disabled state subtle while matching the current theme color instead of rendering as a heavy dark block.
- `TodoView.tsx`, `TodoQuickActionsModal.tsx`, `useTodoQuickActions.ts`: The shared todo quick-actions flow now includes a centered `移动分类` picker for non-subtask todos, reusing only standard todo categories and saving the new category immediately without opening the detail page.
- `SettingsView.tsx`, `CollectionSettingsView.tsx`, `useHardwareBackButton.ts`: Collection mixed timelines now open linked log/todo detail overlays in place above `设置 > Collections`, and both software back plus Android hardware back close those topmost details first so users land back on the same collection screen instead of dropping out of settings.
- `TodoBatchManageView.tsx`: Todo batch management now supports touch drag-and-drop between category panels with live target highlighting and edge auto-scroll, so moving tasks across lists works again on mobile/WebView instead of relying on desktop-only HTML5 dragging.
- `TodoView.tsx`: Updated the reserved `小事` and `未来` empty-state copy so each list now explains its intended use and scheduling behavior when no items exist yet.
- `TodoView.tsx`, `TodoBatchManageView.tsx`, `todoQuickCategoryUtils.ts`, `todoScheduleAssignUtils.ts`: Added a reserved `未来` todo bucket alongside `小事`; it behaves like a normal project category for timing and subtasks, stays visible in Todo lists/batch management, and is filtered out of the quick arrange popup opened from week/month day numbers.
- `TodoView.tsx`: Trimmed the left sidebar's bottom reserve so the three utility buttons at the bottom sit a bit closer to the fixed navigation without overlapping its tap area.
- `TodoView.tsx`: Lowered the Todo sidebar utility trio again so its bottom expand/collapse button lands closer to the Record page's left-rail toggle position above the fixed navigation.
- `SettingsView.tsx`, `TimelineView.tsx`: Swapped the `Collections` entry icon in both settings and the timeline quick-action bar from archive/book styling to a star for a consistent shortcut cue.
- `TimelineView.tsx`, `timelineQuickActions.ts`: Added a `Collections` quick-action route so the timeline header can open `设置 > 内容 > Collections` through the same settings-subpage deep-link pattern already used by `原则库`.
- `TimelineView.tsx`: Added an always-leftmost `更多` menu for timeline shortcuts that are not pinned in the configurable header slots.
- `SettingsView.tsx`, `CollectionSettingsView.tsx`, and `DataCollectionSelector.tsx`: Moved the `Collection` feature entrance under `设置 > 内容`, then rebuilt the page around compact `◬`-led rows and a true mixed-item detail timeline that follows the app's detail-page timeline structure instead of oversized archive mock layouts.
- `AppAwarenessSettingsView.tsx`, `AutoRecordSettingsView.tsx`: Android hardware back now closes the active app binding, workflow editor, or app-rule editor first, matching the visible back controls before returning to Settings.
- `TodoView.tsx`, `TodoMonthView.tsx`: The Todo month planner now opens the shared quick-add schedule modal when users tap a day numeral, matching the week planner while preserving full-cell taps for expanding that day's detail rows.
- `TodoView.tsx`, `TodoMonthView.tsx`: Entering the Todo `月视图` now sends an explicit post-mount `本月` jump signal from the parent schedule screen, so the rolling calendar snaps to the current month on entry instead of sometimes staying at the loaded window's top month.
- `TodoView.tsx`, `TodoMonthView.tsx`, `filterUtils.ts`: The Todo month-view display settings now include one persisted `隐藏筛选式` field that reuses custom-filter syntax to hide matching entries by todo title/category, linked activity/category, scope, and note without changing week or list views.
- `SceneSettingsView.tsx`, `SceneView.tsx`, `sceneGroupStorage.ts`: Manual switch-mode management now lets users move scene groups up and down, and that saved order also drives the Scene page's top-right manual quick-switch dropdown.
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
- `TodoView.tsx`: The mobile `排期 -> 今` top `Pin` section now respects recurring `skipDates`, so a pinned repeat task skipped for today no longer appears there unless another explicit today match still applies.
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
- `FocusDetailView.tsx`: Added a one-shot `完成模式` pill beside the shared associated-todo picker so finishing a focus session can also complete the linked unfinished task after the session log is saved, while failed follow-up completion only surfaces as a toast.
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
- `TimelineView.tsx`, `TagDetailView.tsx`: Display ID-based activity attributes beneath notes and use activity theme color for attribute statistics.
- Update 2026-07-30: `TimelineView.tsx` sizes and resizes split sidebars as persisted 26%-70% workspace ratios, so mobile screens do not inherit fixed desktop pixel constraints.
