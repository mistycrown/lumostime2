# Components Directory

This directory contains the reusable React components for the application. They are categorized by their primary function.

## Core UI
- Update 2026-06-13: `TodoMonthView.tsx` now updates todo item colors so that Trace (inProgress) and Done (completed) items appear in muted gray tone, while other schedule types like Maybe, Arrange, Due, and Repeat appear in a darker tone for better visual differentiation.
- Update 2026-06-07: `AIBackfillChatModal.tsx`, `ai-chat/AIBackfillChatConversationPane.tsx`, `ai-chat/AIBackfillChatReviewCommands.ts`, and `ai-chat/AIBackfillChatReviewWriteback.ts` now support ordinary-chat `周小报` / `月小报` generation, overwrite confirmation, periodic writeback result cards, and direct opening of weekly/monthly newspaper pages from chat.
- Update 2026-06-07: `ReviewNarrativeTab.tsx` now acts as a shared `AI 小报` entry for daily, weekly, and monthly review narratives, with configurable empty-state copy while preserving the same one-line editorial entry treatment.
- Update 2026-06-07: `TodoMonthView.tsx` now lets collapsed month-grid `Trace` overlays ignore taps, so clicking any unexpanded calendar cell always opens that day's detail rail first instead of jumping straight into quick actions.
- Update 2026-06-07: `TodoMonthView.tsx` now renders `Arrange` / `Due` / `Repeat` entry titles with the same muted gray tone as `Trace` in both month-grid cells and expanded day details, so these unfinished schedule rows stay visually consistent and easier to scan.
- Update 2026-06-06: `achievement/AchievementRulesTab.tsx` now explains `@待办/分类` in filter-duration rule help text, keeping achievement filter syntax aligned with the shared custom-filter matcher.
- Update 2026-06-06: `TodoBentoWeekView.tsx` now reuses the shared schedule primary-kind priority for marker colors, so overlapping badges in the two-column week planner follow the same `Done > Due > Arrange > Repeat > Maybe > Trace` precedence as `TodoMonthView.tsx`.
- Update 2026-06-06: `TodoMonthView.tsx` now shows a compact `6月6日 周六 · 3 items` style summary line above each expanded month-day detail list, giving the open rail a lighter editorial header without adding extra framing.
- Update 2026-05-21: `ImagePreviewModal.tsx` and `ImagePreviewControls.tsx` now expose a shared preview-toolbar download action, so logs, timeline items, gallery entries, and collection previews can save the current full-size image to the device gallery or browser downloads from the same full-screen viewer.
- Update 2026-05-23: `TodoBentoWeekView.tsx` now swaps visible-month mini-calendar date numerals for a small `Flag` icon whenever that day contains at least one `Due` deadline, replacing the brief dot treatment with a cleaner, more even emphasis pattern.
- Update 2026-05-21: `TodoBentoWeekView.tsx` now gives today's 2x4 week cell the same gray inset ring used by `TodoMonthView.tsx`, making the current day easier to spot without changing the surrounding palette.
- Update 2026-05-19: `TodoDetailModal.tsx` now renders the monthly `31 -> 月末` fallback control as a pure button and blocks the default mouse-down focus jump, fixing the desktop detail-page white screen triggered by tapping that toggle.
- Update 2026-05-18: `TodoDatePickerModal.tsx` now strictly validates incoming `yyyy-MM-dd` / `yyyy-MM` values and only mounts its calendar body while open, so malformed short-month schedule strings no longer white-screen the shared picker tree.
- Update 2026-05-18: `achievement/AchievementCollectionsTab.tsx` now retries broken default bottle images against the current bundled bottle asset path before falling back to the placeholder, fixing Electron desktop bottle pickers when old file URLs go stale.
- Update 2026-05-18: `AIBackfillChatModal.tsx` now passes the source text into foreground `create_todo` execution so nested child tasks can be created inside the same parent action, and undoing that AI-created parent now removes the whole bundled parent-plus-subtasks set together.
- Update 2026-05-18: `TodoMonthView.tsx` now clips month-grid titles directly without rendering `...`, both for in-cell rows and continuous trace strips, so each entry keeps a little more usable text width on mobile.
- Update 2026-05-18: `TodoDisplaySettingsModal.tsx` 在最外层 `div` 上添加了 `bg-[rgba(15,23,42,0.12)] backdrop-blur-sm` 的全屏蒙层和背景虚化，解决显示设置弹出时背景没有虚化的问题，并保持与快捷操作弹窗一致的视觉体验。
- Update 2026-05-18: `TodoMonthView.tsx` 与 `TodoBentoWeekView.tsx` 支持点击循环排期（Repeat）标签以唤起快捷编辑栏（快捷操作弹窗），保持与其他类型标签一致的交互体验。
- Update 2026-05-18: `TodoMonthView.tsx` 支持在月视图格子中为如果是 recurring（循环）类型的任务靠右渲染 `Repeat2` 循环图标，模仿截止 (due) 条目的 Flag 样式，保持 UI 一致。
- Update 2026-05-18: `TodoMonthView.tsx` now keeps all unfinished month-view entry titles in black across in-cell rows, expanded details, and continuous trace strips, so recurring and arrange/due items no longer render as faded gray while completed rows still stay struck through and softened.
- Update 2026-05-18: `TodoMonthView.tsx` now removes the extra right padding from clickable expanded-row status tags, so right-edge labels like `ARRANGE` align flush with `REPEAT` and the rest of the month-detail rail on mobile.
- Update 2026-05-17: `AIBackfillChatModal.tsx` now marks persisted session/persona/custom-prompt/debug/user-profile edits as sync-relevant only when their serialized localStorage payload actually changes, so foreground AI-only changes can auto-sync into the main backup JSON without causing false sync churn on modal mount.
- Update 2026-05-17: `DesktopTodoQuickEditorPopover.tsx` now serves as the shared todo quick-editor surface inside the dedicated transparent desktop editor window, with inline title save, editable empty-note fallback, clickable parent navigation, viewport-clamped scrolling so larger content no longer clips itself, tightened space offsets/line-heights between titles and schedule metadata, and a quick toggle-complete action button right of the external-link button.
- Update 2026-05-17: `TodoMonthView.tsx` now renders an elegant dashed outline border around 'maybe' schedule items matching their color scheme, applies a strike-through (line-through) text decoration with slight opacity fading for 'completed' tasks in both month grid cells and detail lists, and wires up click handlers on monthly trace segments to trigger the quick actions sheet.
- Update 2026-05-17: `TodoMonthView.tsx` now supports displaying Lucide flag icons on 'due' schedule items with single-line flex clipping (keeping flag visible when task names truncate) and turns all 'trace' and continuous week-row trace segment titles to a light stone gray (`text-stone-400 dark:text-stone-500/90`).
- Update 2026-05-17: `TodoMonthView.tsx` now supports an optional `isDark` prop to dynamically adapt all date numbers, task titles, border dividers, expanded panels, and setting modals for seamless light/dark mode presentation inside transparent widgets.
- Update 2026-05-17: `TodoMonthView.tsx` now also supports an embedded desktop mode with an optional hidden toolbar, external month-navigation signal, active-month reporting callback, and rows-per-screen override so the desktop month widget can reuse the same continuous scroll engine as the in-app month view.
- Update 2026-05-17: `ai-chat/AIBackfillChatReviewWriteback.ts` now carries provider-native reasoning summaries through the ordinary-chat `日报` and `小报` writeback flows, so the final generated result message shows the same collapsible `推理过程` block as standard chat replies.
- Update 2026-05-16: `ReviewNarrativeTab.tsx` now renders the daily `小报` row directly under the `AI 叙事` section, keeps existing newspapers tappable into the newspaper page, exposes an empty-state `点击生成` entry, and supports a guarded delete action supplied by the parent review view.
- Update 2026-05-16: `AIBackfillChatModal.tsx` and `ai-chat/AIBackfillChatAssistantSettingsSection.tsx` now add a `日志提交触发` block under assistant call settings, let users select multiple trigger tags, listen for new-log submission events from shared log save flows, and run background assistant turns with fixed submitted-log summaries that include linked todo and scope context.
- Update 2026-05-16: `TodoAssociation.tsx` now hides the reserved `小事` bucket from shared `Associated Todo` pickers so non-timable quick reminders cannot be linked to logs or focus sessions, while still preserving an already-linked legacy quick todo during edit flows.
- Update 2026-05-15: `AIBackfillChatModal.tsx` now continues moving stable support code into `src/components/ai-chat/`, extracting the conversation pane, Dream command flow, review command/writeback helpers, weekly/monthly template session flow helpers, shared chat types and validators, the Dream/memory/debug/background/session/settings overlays, the persona/call/background-assistant settings sections, the session/template state helpers, and pure formatter/debug helper functions so the main modal reads more like orchestration code.
- Update 2026-05-14: `AIBackfillChatModal.tsx` now summarizes HTML/non-JSON AI failures directly in the error bubble and exposes `原始响应摘要 / 解析失败原因 / 原始响应文本 / 完整响应体` inside `查看调试`, so upstream gateway pages and malformed responses are diagnosable without guessing from a bare JSON parse error.
- Update 2026-05-14: `TodoBentoWeekView.tsx` and `TodoMonthView.tsx` now expose a shared schedule-lock toggle beside `本周/本月`, so Arrange / Due / Maybe rows can temporarily disable drag-to-move without losing quick-action access.
- Update 2026-05-14: `AIBackfillChatModal.tsx` now exposes complete raw server output (including HTML error pages) in the "查看调试" (View Debug) modal when requests fail, providing full transparency for troubleshooting AI communication issues.
- Update 2026-05-14: `AIBackfillChatModal.tsx` now lets Android reminder alarms wake natively but routes `reminder_due` execution back through the shared Web listener only, preserving the local-offset `+08:00` request path and removing the duplicate UTC-flavored native reminder run.
- Update 2026-05-16: `AIBackfillChatModal.tsx` now also supports the ordinary-chat command `小报`, confirms overwrite when today's Daily Review already has an AI newspaper, writes lightweight structured newspaper data back onto `DailyReview.aiNewspaper` through `dailyNewspaperService.ts`, preserves optional ordinary tool calls in the same response, and renders a dedicated in-chat result card that opens the new full-screen newspaper page.
- Update 2026-05-14: `AIBackfillChatModal.tsx` now intercepts the ordinary-chat command `日报`, confirms overwrite when today's Daily Review already has an AI narrative, writes back the new daily narrative through `dailyReviewTemplateService.ts`, and renders the same inline result-card style used by weekly/monthly review writebacks.
- Update 2026-05-14: `TodoDetailModal.tsx` now removes the extra nested recurrence-rule frame inside `时间安排`, so recurring fields render directly within the outer planning card instead of inside a second dashed box.
- Update 2026-05-14: `TodoQuickActionsModal.tsx` now keeps the main `Maybe` picker button but splits out adjacent `今天 / 明天 / +7` shortcut chips for faster tentative-date assignment, while the arrange/due shortcut label also shortens from `下周` to `+7`.
- Update 2026-05-14: `TodoBentoWeekView.tsx` now routes `Maybe` badge clicks into the same quick-actions sheet as Arrange/Due, completing the bento-week quick-edit path for tentative schedule entries.
- Update 2026-05-14: `TodoBentoWeekView.tsx` now lets the 2x4 day-grid switch to the previous/next week with the same conservative horizontal swipe thresholds as the standard week planner, while explicitly ignoring the mini calendar, date buttons, badge buttons, and drag handles to avoid accidental flips.
- Update 2026-05-14: `TodoQuickActionsModal.tsx` now shows `Maybe` in the title summary too, rendering every future candidate date in order instead of collapsing multiple `maybeDates` into a `+n` count.
- Update 2026-05-14: `TodoBentoWeekView.tsx`, `TodoMonthView.tsx`, and `TodoScheduleTypeColorSettings.tsx` now recognize the new `Maybe` schedule badge and color key, so tentative future dates render with their own marker styling alongside Arrange / Due / Repeat / Done / Trace in both week and month planners.
- Update 2026-05-14: `TodoDetailModal.tsx` now exposes a multi-select `Maybe Date` field under `时间安排`, and `TodoDatePickerModal.tsx` now supports a future-only `multi-date` mode so users can add or remove several tentative dates in one pass.
- Update 2026-05-14: `TodoScheduleAssignModal.tsx` now shows its quick `Maybe` tab for today as well as future dates, while still hiding that tab for past days; it also disables rows that already contain the selected date in `maybeDates`, allows recurring todos back into that `Maybe` picker only, and keeps `New` focused on creating an arranged task for the chosen day instead of inheriting the active quick-assign mode.
- Update 2026-05-14: `TodoQuickActionsModal.tsx` now adds a `Maybe` action that opens the shared future-only multi-date picker with the current task's existing `maybeDates`, so task-level quick actions can edit tentative dates for all task types, including recurring ones.
- Update 2026-05-13: `TodoQuickActionsModal.tsx` now routes quick-todo `升级为项目` through the same centered category picker as `移动分类`, so quick reminders must choose their destination standard category instead of silently falling into a default project bucket.
- Update 2026-05-13: `TodoQuickActionsModal.tsx` now matches the centered `移动分类` picker width and horizontal gutter to the parent quick-actions sheet, so the nested dialog reads as one aligned surface instead of a narrower floating card.
- Update 2026-05-13: `TodoQuickActionsModal.tsx` now adds a centered `移动分类` picker for non-subtask todos, reusing standard todo categories only and saving the new `categoryId` immediately from the shared quick-actions flow.
- Update 2026-05-13: `TodoQuickActionsModal.tsx` now shows a compact recurrence summary such as `每天` or `每周一三五` under recurring todo titles, reusing the shared formatter in `todoScheduleUtils.ts` so quick actions still communicate the repeat rule after arrange/due metadata is hidden.
- Update 2026-05-13: `TodoQuickActionsModal.tsx` now hides `安排到 / 截止到 / 清除日期` actions for recurring todos, and `TodoScheduleAssignModal.tsx` now filters recurring todos out of the arrange/due picker pool, so cycle-based tasks no longer show one-shot scheduling affordances.
- Update 2026-05-13: `TodoScheduleAssignModal.tsx` now filters out the reserved `未来` todo category from both assignable rows and quick-create category choices, so week/month day-number schedule popups only work with schedulable buckets.
- Update 2026-05-13: `TodoDetailModal.tsx` now reveals an extra monthly fallback toggle only when users enter day `31`, so recurring todos can optionally land on shorter months' last day without changing legacy skip behavior.
- Update 2026-05-12: `TodoDetailModal.tsx` now resolves subtask category, linked activity, and scope labels from the live parent todo and saves child records back with those inherited fields, so stale subtask metadata no longer shows `未关联活动` after the parent owns a tag.
- Update 2026-05-12: `TodoDetailModal.tsx` now compares auto-save edits against the latest live todo record and `useTodoManager.ts` now opens detail pages from live todo objects, preventing intermittent detail-page save loops that could spam `DataContext` updates and freeze the task screen.
- Update 2026-05-12: `DataCollectionSelector.tsx`, `AddLogModal.tsx`, and `TodoDetailModal.tsx` now render Collection membership inline on the detail page itself, so logs and todos can join one or more `Collection` containers without opening a separate picker modal.
- Update 2026-05-11: `TodoMonthView.tsx` now reuses the header `本月` jump path when the month planner first opens, so entering month view lands on the same current-month position as tapping that shortcut instead of inheriting the parent week offset.
- Update 2026-05-11: `TodoView.tsx` and `TodoMonthView.tsx` now use an explicit parent-to-child month-entry jump signal and replay the shared `本月` action after the calendar mounts, so opening `月视图` no longer occasionally sticks at the rolling month window's top.
- Update 2026-05-11: `TodoMonthView.tsx` now suppresses edge preloading while a programmatic `本月` jump is still settling, so the smooth entry scroll no longer prepends earlier months and snaps the viewport back up to March.
- Update 2026-05-11: `TodoMonthView.tsx` now dims only the cross-month date numerals instead of the whole off-month cell, so 30/31 next to 1/2 can keep their task strips readable, and the expanded-row schedule tags sit a touch lower for better vertical centering with the title line.
- Update 2026-05-11: `TodoMonthView.tsx` now leaves a hairline left/right inset around the weekday-and-grid calendar block, keeps completed month-view task titles on the same text color as the other schedule types, and shares one vertical row baseline between regular entries and `Trace` overlays so mixed rows stop looking slightly offset.
- Update 2026-05-11: `SceneCard.tsx` now restores timer/todo backs only from a dedicated manual-flip cache, so stale legacy auto-flip booleans no longer keep out-of-slot scene cards stuck on their back side while current-slot timeline forcing still locks swipe-back.
- Update 2026-05-11: `TodoMonthView.tsx` now treats each in-cell date numeral as a dedicated quick-add trigger wired to the same fast task-creation flow as the week planner, while taps on the rest of the month cell still expand that day's details.
- Update 2026-05-11: `TodoMonthView.tsx` now adds one persisted `隐藏筛选式` field inside the month-view settings popup, using the custom-filter syntax to hide matching todo entries by todo title/category, linked activity/category, scope, and note without affecting week or list views.
- Update 2026-05-11: `TodoMonthView.tsx` now squares off its week-row `Trace` overlay bars so they keep the left marker line plus a pale fill, but drop the rounded pill ends and sit flush against the covered day cells.
- Update 2026-05-11: `TodoMonthView.tsx` now runs each rendered week row through shared sparse trace-lane layout and paints adjacent `Trace` entries as one overlay bar, so repeated daily in-progress items read as a continuous strip instead of disconnected per-cell stubs while the expanded day list keeps the same final ordering.
- Update 2026-05-11: `TodoScheduleTypeColorSettings.tsx`, `TodoBentoWeekView.tsx`, and `TodoMonthView.tsx` now share one persisted `默认 / 自定义` schedule-type color editor, so choosing `按排期` coloring in either schedule popup lets users pick built-in or custom-group colors for the five Arrange / Due / Repeat / Done / Trace types and reuse the same palette in both week and month views.
- Update 2026-05-11: `TodoMonthView.tsx` now removes the fixed-width split between expanded-day todo titles and `@parent` hints, so the two text fragments stay visually adjacent instead of leaving a wide empty gap before the parent label.
- Update 2026-05-11: `TodoMonthView.tsx` now keeps expanded-day todo titles and `@parent` hints as one adjacent truncation group, and lets each in-cell month strip run flush to the tile edges so the marker line and tint fully span the available width.
- Update 2026-05-11: `TodoMonthView.tsx` now starts with only the current month plus two months on each side and appends another two-month chunk when scrolling nears either edge, so opening month view does less up-front schedule computation while keeping the same rolling calendar feel.
- Update 2026-05-11: `TodoMonthView.tsx` now gives each month-tile entry a soft same-color translucent fill behind the existing marker line, so small calendar items read as light tinted strips instead of bare text plus a single rule.
- Update 2026-05-11: `TodoMonthView.tsx` now moves the in-cell marker/title block closer to the left edge and clips overflow without ellipsis, so month-view tiles can show more task characters before cutting off on mobile.
- Update 2026-05-11: `TodoMonthView.tsx` now truncates expanded-day task titles to a single line and keeps the right-side status tags fixed, so long task names no longer spill past the month view on narrow mobile screens.
- Update 2026-05-11: `TodoBentoWeekView.tsx`, `TodoMonthView.tsx`, and `TodoDisplaySettingsModal.tsx` now keep their frost effect on a dedicated popup background layer instead of the full-screen overlay, which stops Android/WebView from giving display-settings text and buttons a fake glow while preserving the glass feel.
- Update 2026-05-11: `TodoBentoWeekView.tsx`, `TodoMonthView.tsx`, and `TodoDisplaySettingsModal.tsx` now add a separate full-screen blur scrim plus a more opaque popup fill, so display-settings modals soften the surrounding schedule background again without letting wallpaper texture bleed through the text surface.
- Update 2026-05-11: `TodoBentoWeekView.tsx` and `TodoMonthView.tsx` now restore the old content-layer blur when their display-settings popups open and drop the mistaken overlay blur scrim, so the calendar background softens without reintroducing the text-glow artifact.
- Update 2026-05-11: `TodoBentoWeekView.tsx`, `TodoMonthView.tsx`, and `TodoDisplaySettingsModal.tsx` now match the schedule shortcut menu's glass styling (`bg-[#faf9f6]/95`, `backdrop-blur-sm`, and the lighter menu shadow) and slightly enlarge display-settings typography so the popup feels visually consistent with the nearby quick menu.
- Update 2026-05-11: `TodoBentoWeekView.tsx` and `TodoMonthView.tsx` no longer animate the content-layer blur when opening display-settings popups, so the background softening and popup card now appear simultaneously instead of arriving a beat apart.
- Update 2026-05-10: `TodoBentoWeekView.tsx` now replaces its inline `单页 / 全部` toggle with a unified `显示设置` popup, and the popup controls both the bento display mode plus whether entry marker colors follow schedule type or todo category.
- Update 2026-05-10: `TodoBentoWeekView.tsx` now offers `单页 / 全部` modes, caps each day cell to the measured visible-entry count in single-page mode with a compact `+N` overflow badge, and lets the whole bento page grow into a vertically scrollable full-content layout in all-items mode.
- Update 2026-05-10: `TodoBentoWeekView.tsx` now lets its header range and previous/next/current-week controls follow the parent reference week directly, matching the standard week-view title-bar switching behavior.
- Update 2026-05-10: `TodoBentoWeekView.tsx` now reports week changes back to the parent using the visible week's Monday, keeping the bento header range, week picker, and mini-calendar on one shared week anchor.
- Update 2026-05-10: `TodoBentoWeekView.tsx` no longer shows the old `本月 / 本周 / 今天` footer shortcut buttons inside the mini-calendar cell, so that space now belongs fully to the calendar itself.
Components that form the structural or global UI elements.

- `SceneGroupOrderList.tsx`: Shared manual-mode scene-group ordering list used by Scene settings, with up/down controls that update the saved group sequence consumed by the Scene page quick-switch menu.
- `TodoScheduleTypeColorSettings.tsx`: Shared `默认 / 自定义` schedule-type color editor that reuses the built-in palette plus persisted custom color group for Arrange / Due / Repeat / Done / Trace markers across Todo schedule views.
- `TodoBentoWeekView.tsx`: One-screen-per-week `八宫格` planner that mirrors the 2x4 editorial reference layout, keeps a linked mini month navigator in the top-left cell, reads the same real Arrange / Due / Repeat / Done / Trace entries as the other schedule views, and supports desktop plus touch drag-to-move with horizontal edge auto-scroll.
- `TodoMonthView.tsx`: Reference-style rolling monthly todo schedule that mirrors the minimalist demo UI while reading real Arrange / Due / Repeat / Done / Trace day entries from shared schedule utilities, showing month-view-specific colored marker lines per schedule type, exposing inline expanded-row type tags where clickable tags reopen the shared todo quick editor, tuning density/typography dynamically so mobile cells show more readable text without wasting vertical space, supporting Arrange / Due drag-and-drop with edge auto-scroll in the expanded day list, letting users persist a `2/3/4/5 行/屏` month-row density plus font-size choice from the header controls, switching the in-cell left marker between schedule-type colors and native todo-category colors, and now rendering adjacent `Trace` entries inside one week row as continuous straight-edged overlay bars while the in-cell row slots stay aligned with the expanded-day ordering.
- `CalendarWidget.tsx`: Versatile calendar component with heatmap display, animated expand/collapse, and week/month picker modes.
- `TimerFloating.tsx`: Global floating timer for active sessions.
- `Toast.tsx`: Notification system.

## Modals
- Update 2026-05-18: `TodoDetailModal.tsx` now defaults the timeline metadata callback's optional `collectionNames` payload to an empty list, so detail-log chips keep rendering safely even when a caller omits that helper argument.
- Update 2026-05-18: `TodoDetailModal.tsx` now buffers task title inputs in a local draft state and only commits them to the live database on blur or enter, eliminating live-updating stutter on the header title during typing.
- Update 2026-05-14: `AIBackfillChatModal.tsx` now adds a guarded `重置` action inside the Dream manager, using the same inline danger-confirm pattern as existing delete flows to restore the built-in Dream topics/notes and clear every Dream observation entry at once.
- Update 2026-05-13: `AIBackfillChatModal.tsx` now treats one complete `assistantReply` string as the only AI-visible message payload across ordinary chat, weekly-review template turns, and Dream results, splitting that single reply into multiple bubbles from blank lines or line breaks instead of rendering a duplicate full-text reply beside separate model-authored parts.
- Update 2026-05-13: `AIBackfillChatModal.tsx` now starts `模板对话：周复盘` as a staged in-chat setup, immediately creating one weekly-review session that first asks for `本周 / 上周 / YYYYMMDD` and then asks for one of four analysis methods through local fake-AI turns plus composer shortcut chips, replacing the old popup-based range/method selectors before the real weekly-review AI conversation begins.
- Update 2026-05-13: `AIBackfillChatModal.tsx` now reveals an extra monthly fallback toggle only when assistant scheduled tasks use day `31`, and the saved summary text reflects the explicit `无则月末` behavior.
- Update 2026-05-13: `AIBackfillChatModal.tsx` now rebuilds native Android background request payloads into the shared debug viewer, so background-history entries and hydrated assistant messages expose the same prompt-level request detail as foreground AI calls.
- Update 2026-05-13: `AIBackfillChatModal.tsx` now starts Dream through a chat-native month prompt, asking for one target `YYYYMM` reply while tolerantly parsing common inputs like `2026-01`, `2026/01`, and `2026年1月`, and no longer shows the old multi-range Dream picker.
- Update 2026-05-13: `AIBackfillChatModal.tsx` now shows the newer longer Dream topic notes with UI-side ellipsis truncation in the Dream header, so richer prompt copy can live in topic metadata without overflowing the narrow viewer layout.
- Update 2026-05-12: `AIBackfillChatModal.tsx` now includes a separate Dream viewer with user-managed topic tabs, read-only Dream entry browsing, an explicit `dream` chat command that first opens a chat-like range picker (`昨天 / 本周 / 本月 / 本年`) before running the dedicated Dream workflow, and per-message Dream update cards, while ordinary chat and background assistant turns only read Dream context.
- Update 2026-05-13: `AIBackfillChatModal.tsx` now keeps each debug-viewer prompt block collapsed by default and expands it per tap, so long system/context payloads remain browsable without flooding the screen on open.
- Update 2026-05-12: `TodoScheduleAssignModal.tsx` now adds a one-row instant title search above the arrange/due picker list, and matching a subtask keeps its parent row visible so the quick-add hierarchy stays intact while filtering.
- Update 2026-05-12: `AIBackfillChatModal.tsx` now exposes a user-editable four-digit night protection window for background assistant settings, and that window only suppresses random check-in requests without blocking reminder_due dispatch.
- Update 2026-05-12: `AIBackfillChatModal.tsx` now performs one cold-start reminder catch-up after native reminder hydration, immediately replaying any overdue pending reminder_due items that expired while the app was fully closed.
- Update 2026-05-12: `AIBackfillChatModal.tsx` now picks its background polling/reminder target strictly from ordinary conversations by latest user-authored message time, excludes all template sessions from background persona/context reuse, and clears the native snapshot when no eligible ordinary chat remains.
- Update 2026-05-11: `AIBackfillChatModal.tsx` now also forces Weekly Review result-card route state to commit before the AI overlay closes, and marks the card actions as explicit top-hit mobile tap targets to avoid transparent sibling layers swallowing the jump.
- Update 2026-05-11: `AIBackfillChatModal.tsx` now clamps Weekly Review result-card titles to one line with ellipsis, and its `打开` action closes the AI overlay before jumping straight into the matching Weekly Review `叙事` view.
- Update 2026-05-13: `AIBackfillChatModal.tsx` now flattens `新建对话` into two first-level choices (`普通对话` and `模板对话：周复盘`), gives weekly-review setup direct `上周 / 本周 / 输入数字` range buttons plus a second-step analysis-method picker, routes weekly-review sessions through a dedicated prompt/data package backed by `src/constants/weeklyReviewTemplatePrompts.ts` instead of the generic assistant prompt stack, and exposes a composer-side `写入 AI 叙事` quick-fill button plus strict local `是 / 否` overwrite confirmation before Weekly Review narrative writeback.
- Update 2026-05-10: `AIBackfillChatModal.tsx` now skips the extra visual-viewport keyboard inset on native Android, because the Capacitor WebView already resizes with the soft keyboard and the additional shell padding was leaving a large blank gap above the composer on real devices.
- Update 2026-05-09: `AIBackfillChatModal.tsx` now tracks the mobile visual viewport and adds a keyboard bottom inset to the shared AI shell, so the composer and latest messages rise together above the soft keyboard while typing.
- Update 2026-05-09: `AIBackfillChatModal.tsx` now retries failed assistant turns in place, reusing the original errored bubble and replacing it with the second attempt result instead of appending a duplicate assistant block.
- Update 2026-05-09: `AIBackfillChatModal.tsx` now adds a `定时任务` subsection under AI call settings, reuses shared todo recurrence rules for recurring assistant schedules, and keeps one next native reminder seeded per enabled task so reminder_due stays on the existing assistant trigger path.
- Update 2026-05-09: `WidgetTrackingCalendarEditorModal.tsx` now sorts scope-source options with the shared scope-order helper so widget scope pickers stay aligned with scope management and batch scope tools.
- Update 2026-05-06: `AIBackfillChatModal.tsx` now imports its six built-in persona system prompts from `src/constants/aiPersonaSystemPrompts.ts`, so prompt copy no longer lives inline inside the modal component.
- Update 2026-05-06: `AIBackfillChatModal.tsx` now sends concrete activity-log summaries for both today and yesterday in assistant state context, stops duplicating cached conversation history into the provider message list, and removes the old 30-turn cap from persona context settings.
- Update 2026-05-06: `AIBackfillChatModal.tsx` now replaces the six built-in persona system prompts with the user-authored versions and standardizes in-prompt user references to `用户`.
- Update 2026-05-06: `AIBackfillChatModal.tsx` now sends the assistant-facing `todayTimelineSummary` as the concrete same-day log list, passes the broader today/yesterday digest separately as `timelineReviewSummary`, includes structured same-day log candidates for `edit_log`, and blocks foreground log-edit replies from claiming success when no `edit_log` action actually applied.
- Update 2026-05-06: `AIBackfillChatModal.tsx` now preserves foreground AI failure debug payloads on the errored assistant message whenever debug mode is on, so failed requests still render the per-message `查看调试` entry instead of losing the trace.
- Update 2026-05-06: `AIBackfillChatModal.tsx` now hides the custom prompt editor for built-in personas while still allowing their name, addressing, and avatar fields to be edited; only custom personas can edit prompt text.
- Update 2026-05-06: `AIBackfillChatModal.tsx` now keeps user chat bubbles on the right while forcing wrapped or manually line-broken user text to stay left-aligned inside the bubble.
- Update 2026-05-05: `AIBackfillChatModal.tsx` now runs a dedicated reopen-time scroll-to-latest pass, so entering the AI chat returns to the newest turn by default while exact notification-linked message jumps still win.
- Update 2026-05-05: `AIBackfillChatModal.tsx` now keeps applied-result, memory-update, reminder-update, and retry blocks inside the main message column, so narrow mobile layouts no longer squeeze assistant bubbles into single-character vertical text.
- Update 2026-05-05: `ImmersiveTimer.tsx` now leaves Android EdgeToEdge inset tracking enabled during immersive enter/exit and only lets system-bar visibility change, because manually disabling and re-enabling the native inset listener could leave the app header stack shifted downward after returning.
- Update 2026-05-05: `ImmersiveTimer.tsx` now lets the Android immersive plugin own system-bar visibility during fullscreen entry/exit, avoiding the extra status-bar show/hide toggles that could leave app headers shifted after tapping the immersive close button.
- Update 2026-05-05: `ImmersiveTimer.tsx` now restores Android system bars before closing the fullscreen layer, so the app shell returns through one consistent immersive teardown path.
- Update 2026-05-05: `FocusDetailView.tsx` now lets the shared Android hardware-back stack exit immersive focus mode before closing the whole focus detail overlay, so system back follows the same fullscreen teardown path as the in-view exit button.
- Update 2026-05-04: `AIBackfillChatModal.tsx` now opens a brand-new empty conversation whenever the user switches to another persona, so each chat window stays bound to one persona instead of changing persona in place.
- Update 2026-05-04: `AIBackfillChatModal.tsx` now uses a WeChat-like grouped chat row layout, keeping the avatar beside the bubble, removing the per-message speaker label, and reusing the same avatar slot across consecutive turns from the same side.
- Update 2026-05-04: `ImmersiveTimer.tsx` now anchors all top controls to one shared toolbar row and skips the managed `--status-bar-height` fallback in both portrait and landscape mode, fixing the immersive top-button drift that appeared after entering fullscreen on some mobile layouts.
- Update 2026-05-03: `AIBackfillChatModal.tsx` now declares the background-notification visibility helper before native diagnostics hydration, so production bundles no longer crash on startup with `Cannot access 'Re' before initialization`.
- Update 2026-05-03: `ImmersiveTimer.tsx` now imports the Android EdgeToEdge plugin through its ESM entry, so Capacitor WebView builds no longer hit `require is not defined` during immersive timer setup.
- Update 2026-05-01: `AIBackfillChatModal.tsx` now filters persisted null-like assistant message content during session normalization, so older malformed native-backfilled entries stop rendering standalone `null` bubbles after reload.
- Update 2026-05-01: `AIBackfillChatModal.tsx` now uses a flatter editorial treatment across the AI workspace, tightening the composer to a two-line feel, removing extra divider framing, simplifying history delete confirmations into inline horizontal actions, and reducing nested-card radii/shadows across the AI panels.
- Update 2026-05-01: `AIBackfillChatModal.tsx` now keeps the active persona row in AI settings neutral, removing the tinted selected background so the checkmark alone carries selection state.
- Update 2026-05-01: `AIBackfillChatModal.tsx` now organizes AI settings into top-level tabs with smaller in-section tabs, so persona picking, persona editing, user-avatar editing, background-agent controls, and context options no longer read as one long stacked form.
- Update 2026-05-01: `AIBackfillChatModal.tsx` now applies the same small-radius corner treatment across the remaining AI boxes, keeping history rows, the composer surface, and edit/confirmation panels visually aligned.
- Update 2026-05-01: `AIBackfillChatModal.tsx` now rehydrates completed Android-native background replies back into the persisted chat session when diagnostics refresh, so successful direct-native check-ins render in the main AI conversation and restore unread state instead of only appearing in background history.
- Update 2026-04-30: `AIBackfillChatModal.tsx` now gives grouped assistant reply bubbles a more visible sequential entrance by increasing the stagger and adding a clearer lift/scale/highlight settle animation for each newly revealed segment.
- Update 2026-04-30: `AIBackfillChatModal.tsx` now exposes a unified Android back-navigation chain, so hardware back closes nested AI panels first and only dismisses the root AI chat after returning to the main conversation.
- Update 2026-04-27: `AIBackfillChatModal.tsx` now renders both user and assistant avatars above each message group as a light outside-the-bubble header, freeing more horizontal space for the conversation body without bringing back the old side avatar rail.
- Update 2026-04-27: `AIBackfillChatModal.tsx` now labels each assistant message group with the active persona name instead of the generic `AI 回答` fallback whenever a persona name is available.
- Update 2026-04-27: `AIBackfillChatModal.tsx` now keeps per-message `记忆更新` cards collapsed by default and expands their detailed section list only when the user taps the header row.
- Update 2026-04-27: `AIBackfillChatModal.tsx` now also collapses `提醒结果` by default, and both summary rows use the same light metadata-style typography as the message timestamp/context line instead of pill-heavy controls.
- Update 2026-04-27: `AIBackfillChatModal.tsx` now trims the AI workspace, AI settings panel, long-term-memory viewer, background-history viewer, and debug-viewer title bars down to the same compact single-line pattern used by other external pages, removing the extra subtitle copy and oversized heading treatment.
- Update 2026-04-27: `AIBackfillChatModal.tsx` now compresses the background history drawer into a single request-chain view that focuses on wake time, request start, request result, returned content, and an optional request debugger for completed web calls.
- Update 2026-04-27: `AIBackfillChatModal.tsx` now renders one assistant turn as grouped multi-bubble chat bursts when structured reply parts are available, and the background history drawer shows readable silent-decision summaries plus post-silent side effects instead of bare `silent` outcomes.
- Update 2026-04-27: `AIBackfillChatModal.tsx` now skips foreground reminder-summary injection when background polling is off, omits long-term-memory prompt sections when memory is disabled, and blocks foreground memory writes while long-term memory is off.
- Update 2026-04-27: `AIBackfillChatModal.tsx` now uses plus-only icon buttons for adding long-term-memory notes and reminders, replacing the repeated `新增一条` labels in that management view.
Overlay components for complex interactions.

- `AIBackfillChatModal.tsx`: Shared AI workspace for generic chat plus the first weekly-review template conversation flow, now supporting one-step `普通对话 / 模板对话：周复盘` session creation, week-bound template sessions with direct range buttons and method selection, template-specific weekly data/context injection sourced from the shared TS weekly-review prompt constants, a composer-side `写入 AI 叙事` quick-fill path that still goes through local overwrite/merge gating before Weekly Review narrative writeback, and background assistant routing that only follows the latest user-active ordinary conversation instead of any template or assistant-only thread.
- `AIBackfillChatModal.tsx`: The same shared AI workspace now also exposes a separate Dream system where users manage concern topics, Dream entries live under per-topic tabs, the explicit `dream` command now enters a conversational month-selection step before refreshing one chosen month of data, and ordinary foreground/background assistant turns consume Dream as read-only continuity context.
- `AIBackfillChatModal.tsx`: The long-term-memory viewer now renders `用户画像记忆`, `偏好记忆`, and `活跃 reminders` as readable note/reminder cards with manual add/delete controls; reminder due-times stay normalized onto a single canonical timeline, cold app launch now performs one overdue-reminder catch-up after native hydration, foreground turns receive explicit local/UTC current-time anchors for reminder math, background assistant replies can persist per-message debug payloads, the check-in interval inputs keep editable draft text with inline validation so invalid intermediate states never auto-save, and the built-in persona roster ships with six richer voices while allowing AI self-address and user-address fields to stay intentionally empty.
- `AddLogModal.tsx`: Main modal for logging time, including segmented start/end time inputs that auto-advance from hour to minute after two digits, direct camera capture, and multi-image picker uploads from desktop file dialogs or mobile galleries.
- `TodoDatePickerModal.tsx`: Lightweight planning picker shared by todo scheduling and Memoir, supporting both full date selection and a centered month-only modal with the duplicate footer close action removed.
- `TodoDetailModal.tsx`: Detailed view and editing for Todos, including planning fields for assigned date, deadline date, and lightweight recurrence rules.
- `TodoDuplicateModal.tsx`: Lightweight pre-copy modal for renaming duplicated todos and clearing dates, tags, or scopes before creation.
- `TodoQuickActionsModal.tsx`: Shared quick-actions bottom sheet for lightweight todo scheduling, completion, and detail-entry flows reused by list-row taps and week-plan badges.
- `GoalEditor.tsx`: Goal creation and editing.
- `AddActivityModal.tsx`: Creating new activities.
- `ConfirmModal.tsx`: specialized confirmation dialogs.
- `NarrativeStyleSelectionModal.tsx`: AI narrative style picker.

## Visualization
Charts and visual data representations.

- `DetailTimelineCard.tsx`: Shared detail-page timeline card with month heatmap duration captions under each active day, automatic white text on darker heatmap cells, day navigation in month view, month quick-switch navigation in all-record view, and English daily-total duration labels using `h`/`m` abbreviations.
- `FocusCharts.tsx`: Focus score analytics.
- `HeatmapCalendar.tsx`: Month-view intensity heatmap.
- `MatrixAnalysisChart.tsx`: Bar charts for activity ranking.
- `stats/CheckView.tsx`: Habit check statistics with support for manual count mode (shows completed counts).
- `TimelineStyleRail.tsx`: Styled rail and node renderer shared by TimelineView, Memoir, and detail-page history timelines, with last-node line truncation, centered summary dots, optional page-level rail-width caps, and Memoir-side offset support.
- `TimelineItem.tsx`: Shared Memoir/timeline entry renderer with media grids that keep single-image, two-image, and multi-image cards visually aligned.

## Input & Forms
Specialized input controls.

- `FocusScoreSelector.tsx`: 5-point focus rater.
- `DateRangeFilter.tsx`: Tabbed date range picker.
- `CustomSelect.tsx`: Styled dropdown.
- `TagAssociation.tsx`: Single tag selector with custom HEX soft-color support.
- `TagMultipleAssociation.tsx`: Multi-tag selector with custom HEX soft-color support.
- `ScopeAssociation.tsx`: Scope selection grid that follows the shared scope-order helper so scope chips match management ordering.
- `TodoAssociation.tsx`: Todo linking selector with a virtual today category for pinned and today-arranged tasks.
- `CommentSection.tsx`: Comment system for focus logs.
- `RecommendedNoteTemplates.tsx`: Inline recommendation strip that lets note fields insert context-aware templates without opening a selector modal.

## Display Items
Small, atomic display components.

- `ActivityItem.tsx`: Circular activity icon.
- `GoalCard.tsx`: Goal progress summary card.
- `NoteTemplateManager.tsx`: Capsule-based note template manager shared by category, scope, and activity detail views.
- `NoteTemplateEditorModal.tsx`: Shared add/edit modal for note template names and contents.
- `achievement/AchievementEntryCard.tsx`: Timeline 顶部的成就入口卡片，展示当前可用光点并进入成就页。
- `achievement/AchievementBottle.tsx`: 成就页光点瓶主容器，使用物理引擎驱动光点碰撞效果。
- `achievement/AchievementRecordsTab.tsx`: 每日快照记录列表，支持展开查看规则命中明细。
- `achievement/AchievementRulesTab.tsx`: 成就规则编辑区，按活动标签配置获星与扣星规则。
- `achievement/AchievementRedeemTab.tsx`: 奖励兑换与兑换记录管理区。

## Theme & Customization
Components for theme and appearance customization.

- `UiThemeButton.tsx`: UI 主题选择按钮组件（用于投喂功能）
- `TimePalSettings.tsx`: 时光小友设置组件 - 可在多个页面复用
- `TimePalCard.tsx`: 时光小友卡片显示组件
- `BackgroundSelector.tsx`: 背景图片选择器
- `ColorSchemeSelector.tsx`: 配色方案选择器
- `CustomColorGroupManager.tsx`: 自定义色组（HEX 输入实时预览、回车提交、重复校验、上移下移排序、自动保存）
- `NavigationDecorationSelector.tsx`: 导航装饰选择器
- `UIIconSelector.tsx`: UI 图标主题选择器
- `PresetEditModal.tsx`: 主题预设编辑弹窗

 - `achievement/AchievementBottleIconPackSelector.tsx`: 投喂页中切换成就瓶图标资源包的下拉选择器，与瓶身样式独立保存。

- `achievement/AchievementBottleStyleSelector.tsx`: 投喂页中切换成就瓶瓶身样式的下拉选择器，当前包含更浅的暖金、海盐、藏蓝、雾粉，以及新增的灰白、奶霜、薄荷系。

## Recently Added (2026-02)
- `UiThemeButton.tsx`: 新增 - 从 SponsorshipView 中提取的可复用主题按钮组件
- `TimePalSettings.tsx`: 新增 - 从 SponsorshipView 中提取的时光小友设置组件

> ⚠️ 本文档最后更新：2026-05-15
## Recently Added (2026-03)
- `TimelineStyleSelector.tsx`: 时间线样式切换与参数调节组件。
- `TimelineStyleRail.tsx`: TimelineView、Memoir 与详情页共用的样式轨道渲染组件，支持摘要节点圆点对齐和页面级轨道宽度限制。
- `TimelineStyleAdjuster.tsx`: 时间线样式调节浮窗，使用更紧凑的半屏宽度布局，并支持档案页专用水平偏移。

- `CompactPreviewCardSelector.tsx`: 紧凑型卡片选择器，用于把样式页下拉替换成和配色区一致的小卡片预览网格。
- `ScheduleStyleSelector.tsx`: 日程图样式卡片选择器，提供默认、经典、极简、实色四种轻量预览。
- `achievement/AchievementBottleIconPackSelector.tsx`: 已改为成就瓶图标包卡片选择器，支持更紧凑的预览式切换。
- `achievement/AchievementBottleStyleSelector.tsx`: 已改为成就瓶样式卡片选择器，使用玻璃瓶身小预览区分不同气质。
> Last updated: 2026-05-06
- `AddLogModal.tsx`, `TodoAssociation.tsx`: Backfill logging now exposes a one-shot `完成模式` pill beside `Associated Todo`, letting the current save also complete the linked unfinished task while still saving the record first and only warning if the follow-up completion fails.
- `TodoAssociation.tsx`: Shared todo pickers now hide completed todos by default, but keep the currently linked completed todo visible so edit flows do not lose their existing association mid-session.
- `WidgetSlotEditorModal.tsx`: Timer widget slots now opt into the shared hierarchical todo picker so parent/subtask rows match Add Log instead of flattening child tasks.
- `TodoAssociation.tsx`: Standalone subtasks inside the virtual `今天` picker now show an `@parent` hint when the parent row is outside the current visible picker pool, while expanded child rows still avoid repeating that badge.
- `WidgetSlotEditorModal.tsx`: Timer widget slots now inherit the selected todo's linked tag and default scopes inside the editor, overwriting prior tag/scope picks when the todo carries that metadata and clearing scopes when it does not.
- `TodoDisplaySettingsModal.tsx`: Added a dedicated Todo display-settings modal that groups completed-task visibility with compact-row metadata toggles and closes cleanly on backdrop tap or Android back.
- `TodoQuickActionsModal.tsx`: The shared quick-actions sheet now ignores the same touch-generated follow-up click that opened it, so tapping a lower todo row no longer flashes the sheet and instantly fires `完成 / 取消完成 / Pin` actions under the finger.
- `TodoQuickActionsModal.tsx`: Added an inline `删除任务 -> 确认删除？` two-step action so shared todo quick actions can remove a task directly from the sheet without opening the full detail editor first.
- `TodoQuickActionsModal.tsx`: Android back now dismisses the shared quick-actions sheet before app-level navigation runs, and tapping the blurred backdrop closes the sheet without leaking the tap through to the todo row underneath.
- `TodoQuickActionsModal.tsx`: Backdrop dismissal now happens on the backdrop click itself, so tapping the blurred outside area closes the current quick-actions sheet without click-through opening the todo row underneath, while the existing open-time guard still blocks same-tap flash closes.
- `TodoAssociation.tsx`, `TodoScheduleAssignModal.tsx`: Shared todo pickers now hide unfinished subtasks whenever their parent todo is completed, so completed parents no longer leave orphan child rows in association or schedule-selection lists.
- `TodoScheduleAssignModal.tsx`: The arrange/due picker now renders direct subtasks beneath their parent row with expandable hierarchy controls instead of flattening children into standalone cards.
- `MainLayout.tsx`: The floating Tag/Scope and Chronicle/Memoir switch buttons now let fallback Lucide icons inherit the floating button color, so the default UI theme stays visible on white accent-theme buttons.
- `AIBackfillChatModal.tsx`: Applied todo result cards now separate task category as `@`, linked activity hierarchy as `#`, and scope domains as `%`, and they respect the auto-link scope toggle when merging activity-based domains into newly created todos.
- `AIBackfillChatModal.tsx`: The shared AI workspace now distinguishes create-vs-edit intents, can update existing todos, create subtasks under parent todos, and patch existing logs by returning only target ids plus changed fields for local application.
- `AIBackfillChatModal.tsx`: Changed applied-result metadata to the same `# / % / @` text-prefix convention used by context views, removing the extra category icon so association lines read more consistently.
- `AIBackfillChatModal.tsx`: Added a dedicated grayscale fallback for the `default` color scheme so the AI workspace no longer keeps the warm tinted surfaces that are used by accent themes.
- `AIBackfillChatModal.tsx`: Simplified the AI settings panel by flattening the user-avatar and current-persona layouts, removing redundant helper copy, and tightening the visuals around the existing accent-driven theme tokens.
- `AIBackfillChatModal.tsx`: The shared AI window can now stay mounted at the app level while hidden, so closing the modal does not abort requests that are already running in the background.
- `AIBackfillChatModal.tsx`, `aiService.ts`: Simplified intent routing into a lightweight message-only classification step, removed apply-success toasts because result cards already reflect tool execution, and now only pass unfinished todos into backfill planning context.
- `AIBackfillChatModal.tsx`: Replaced the old delete-style top-right action with a history drawer, keeps users in one default conversation flow, and only allows creating a new session from the history panel.
- `AIBackfillChatModal.tsx`: The todo-page magic button now opens this same shared dialog, replacing the older dedicated AI todo parse/confirm modals with one unified conversation entry.
- `AIBackfillChatModal.tsx`: History-session cards now support inline rename plus guarded delete, and deleting the last session automatically recreates a clean fallback conversation.
- `AIBackfillChatModal.tsx`: Added persona presets plus editable avatar/name/addressing/system-prompt settings, with session-level persona binding so different conversations can keep different assistant styles.
- `AIBackfillChatModal.tsx`: AI settings now keep avatar editing inside the same panel, replacing the old emoji prompt with an inline editor plus quick emoji choices and a clearer two-column settings layout.
- `AIBackfillChatModal.tsx`: The emoji-avatar editor now removes the redundant draft preview tile, and emoji avatars render more centrally inside the round chat/header avatar containers.
- `AIBackfillChatModal.tsx`: Recent dialogue rounds are now pulled through an explicit per-session conversation-history cache before formal AI requests, and persona selection uses a subtle checkmark state instead of turning the whole card black.
- `MainLayout.tsx`: Added a `min-h-0` flex guard on the main content shell so nested scene-mode card lists can scroll instead of being clipped on some mobile WebViews.
- `AIBackfillChatModal.tsx`: The empty-chat state is now reduced to concise backfill/todo examples, and the built-in personas have been refreshed into more distinctive presets with customized user call names.
- `AIBackfillChatModal.tsx`: Custom personas can now be deleted from the settings panel with inline confirmation, and any sessions using that persona automatically fall back to the default built-in preset.
- `AIBackfillChatModal.tsx`: Added a quick-context cache toggle that can send the most recent `n` conversation rounds with each AI request, where `n` is configured by the active persona.
- `AIBackfillChatModal.tsx`: The shared AI dialog now runs a lightweight intent-classification pass before formal execution, can directly create todos alongside logs, and exposes quick open-detail / undo actions for AI-created todos.
- `AIBackfillChatModal.tsx`: AI-applied logs and todos now re-check auto-link rules before saving so missing rule-based domains are merged in even when the model returns incomplete scope data.
- `AIBackfillChatModal.tsx`: AI backfill chat now defaults to today, passes latest-log and todo hierarchy context into tool planning, applies per-call dated records locally, and shows full date-aware results for cross-day or past-day backfills.
- `TodoDetailModal.tsx`: Overlay-mode todo details now mount as a fixed `z-[100]` viewport layer so they stay above the shared AI chat window instead of rendering behind it.
- `TodoDetailModal.tsx`: Styled the inherited parent-task jump target with a dashed underline so the subtask detail page makes that link state more obvious.
- `TodoDetailModal.tsx`: Parent todo timeline tabs now aggregate direct child-task logs into the same history list and duration stats while keeping manual progress recalculation scoped to the current todo's own logs.
- `TodoDetailModal.tsx`: Parent todo timeline entries now add an `@子任务标题` badge whenever a record comes from a direct child task, so merged history stays attributable.
- `TodoDetailModal.tsx`: Fixed the subtask-to-parent navigation regression so tapping a parent task from inherited info opens the parent detail page without crashing.
- `TodoDetailModal.tsx`: Renamed subtask inherited-field copy from `范围` to `领域` so the detail page matches the actual association concept.
- `TodoDetailModal.tsx`: Recurring todos now hide the `子任务` tab entirely, so only non-recurring parent todos can manage or create child tasks.
- `TodoDetailModal.tsx`: Added a dedicated `子任务` tab alongside `细节 / 时间线`, so parent todos can manage children in their own pane while child todos show inherited parent-owned fields as read-only.
- `TodoDetailModal.tsx`: Added a detail-level `Pin` toggle so todos can be marked for top placement in the `排期 -> 今` list without leaving the detail screen.
- `TodoQuickActionsModal.tsx`: Added a lightweight `Pin / 取消 Pin` row and pinned-state metadata so quick actions can toggle the today-schedule priority flag directly.
- `TimerFloating.tsx`: Matched Todo-view floating timers to the narrower Record-style avoidance width and responsive control hiding so they leave clear space for the bottom-right floating action button.
- `TodoQuickActionsModal.tsx`: Switched backdrop dismissal to pointer-down handling and stops panel pointer events from bubbling so desktop row clicks no longer open and instantly dismiss the shared quick-actions sheet.
- `TodoQuickActionsModal.tsx`: Extracted the todo quick-actions sheet from `TodoView` so list rows and week badges now share the same lightweight action panel.
- `TodoScheduleAssignModal.tsx`: Fixed the week-planning schedule modal to a stable three-quarter viewport height so the panel no longer grows or shrinks with its content.
- `TodoDuplicateModal.tsx`: Trimmed the duplicate modal helper copy so the quick-copy flow stays lightweight without extra explanatory text.
- `AddLogModal.tsx`: Added direct camera capture functionality, now preferring native camera file-path persistence before falling back to `webPath`.
- `AddLogModal.tsx`: Added batch image selection in the log/backfill modal so desktop file pickers and mobile galleries can append multiple images in one upload pass with summary feedback.
- `TodoAssociation.tsx`: Added an optional collapsed parent/subtask tree mode so Add Log and active focus todo pickers can expand child tasks beneath selectable parent rows.
- `TodoAssociation.tsx`: Added a first-position virtual `今天` category so shared todo pickers can surface pinned tasks plus todos arranged for today without switching into each source category.
- `TodoAssociation.tsx`: Updated progress display logic in associated parent modals/views (`AddLogModal`, `FocusDetailView`) to reflect active progress increments in real time with a distinct color.
- `NavigationDecorationSelector.tsx`: Added support for uploading and managing custom navigation decorations using Capacitor Filesystem.
