# Components Directory

This directory contains the reusable React components for the application. They are categorized by their primary function.

## Core UI
Components that form the structural or global UI elements.

- `CalendarWidget.tsx`: Versatile calendar component with heatmap display, animated expand/collapse, and week/month picker modes.
- `TimerFloating.tsx`: Global floating timer for active sessions.
- `Toast.tsx`: Notification system.

## Modals
Overlay components for complex interactions.

- `AddLogModal.tsx`: Main modal for logging time, including segmented start/end time inputs that auto-advance from hour to minute after two digits.
- `TodoDatePickerModal.tsx`: Lightweight planning picker shared by todo scheduling and Memoir, supporting both full date selection and a centered month-only modal with the duplicate footer close action removed.
- `TodoDetailModal.tsx`: Detailed view and editing for Todos, including planning fields for assigned date, deadline date, and lightweight recurrence rules.
- `TodoDuplicateModal.tsx`: Lightweight pre-copy modal for renaming duplicated todos and clearing dates, tags, or scopes before creation.
- `TodoQuickActionsModal.tsx`: Shared quick-actions bottom sheet for lightweight todo scheduling, completion, and detail-entry flows reused by list-row taps and week-plan badges.
- `GoalEditor.tsx`: Goal creation and editing.
- `AIBackfillChatModal.tsx`: Unified AI full-screen chat workspace with a theme-synced editorial shell driven by the current `--accent-color`, persistent session history, persona studio access from the title avatar, configurable AI/user avatars, reordered persona/avatar/context settings, per-session quick-context control, and direct local handling for chat, AI backfill, and AI todo creation plus edit/undo and debug inspection.
- `AddActivityModal.tsx`: Creating new activities.
- `ConfirmModal.tsx`: specialized confirmation dialogs.
- `NarrativeStyleSelectionModal.tsx`: AI narrative style picker.

## Visualization
Charts and visual data representations.

- `DetailTimelineCard.tsx`: Shared detail-page timeline card with day navigation in month view, month quick-switch navigation in all-record view, and English daily-total duration labels using `h`/`m` abbreviations.
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
- `ScopeAssociation.tsx`: Tag selection grid.
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

> ⚠️ 本文档最后更新：2026-02-09
## Recently Added (2026-03)
- `TimelineStyleSelector.tsx`: 时间线样式切换与参数调节组件。
- `TimelineStyleRail.tsx`: TimelineView、Memoir 与详情页共用的样式轨道渲染组件，支持摘要节点圆点对齐和页面级轨道宽度限制。
- `TimelineStyleAdjuster.tsx`: 时间线样式调节浮窗，使用更紧凑的半屏宽度布局，并支持档案页专用水平偏移。

- `CompactPreviewCardSelector.tsx`: 紧凑型卡片选择器，用于把样式页下拉替换成和配色区一致的小卡片预览网格。
- `ScheduleStyleSelector.tsx`: 日程图样式卡片选择器，提供默认、经典、极简、实色四种轻量预览。
- `achievement/AchievementBottleIconPackSelector.tsx`: 已改为成就瓶图标包卡片选择器，支持更紧凑的预览式切换。
- `achievement/AchievementBottleStyleSelector.tsx`: 已改为成就瓶样式卡片选择器，使用玻璃瓶身小预览区分不同气质。
> Last updated: 2026-04-25
- `AIBackfillChatModal.tsx`: Applied todo result cards now separate task category as `@`, linked activity hierarchy as `#`, and scope domains as `%`, and they respect the auto-link scope toggle when merging activity-based domains into newly created todos.
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
- `TodoAssociation.tsx`: Added an optional collapsed parent/subtask tree mode so Add Log and active focus todo pickers can expand child tasks beneath selectable parent rows.
- `TodoAssociation.tsx`: Added a first-position virtual `今天` category so shared todo pickers can surface pinned tasks plus todos arranged for today without switching into each source category.
- `TodoAssociation.tsx`: Updated progress display logic in associated parent modals/views (`AddLogModal`, `FocusDetailView`) to reflect active progress increments in real time with a distinct color.
- `NavigationDecorationSelector.tsx`: Added support for uploading and managing custom navigation decorations using Capacitor Filesystem.
