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
- `TodoDetailModal.tsx`: Detailed view and editing for Todos.
- `GoalEditor.tsx`: Goal creation and editing.
- `AIBatchModal.tsx`: AI-powered schedule generation.
- `AddActivityModal.tsx`: Creating new activities.
- `ConfirmModal.tsx`: specialized confirmation dialogs.
- `NarrativeStyleSelectionModal.tsx`: AI narrative style picker.

## Visualization
Charts and visual data representations.

- `DetailTimelineCard.tsx`: Shared detail-page timeline card with day navigation in month view and month quick-switch navigation in all-record view.
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
- `TodoAssociation.tsx`: Todo linking selector.
- `CommentSection.tsx`: Comment system for focus logs.

## Display Items
Small, atomic display components.

- `ActivityItem.tsx`: Circular activity icon.
- `GoalCard.tsx`: Goal progress summary card.

## Theme & Customization
Components for theme and appearance customization.

- `UiThemeButton.tsx`: UI 主题选择按钮组件（用于投喂功能）
- `TimePalSettings.tsx`: 时光小友设置组件 - 可在多个页面复用
- `TimePalCard.tsx`: 时光小友卡片显示组件
- `BackgroundSelector.tsx`: 背景图片选择器
- `ColorSchemeSelector.tsx`: 配色方案选择器
- `CustomColorGroupManager.tsx`: 自定义色组（HEX 输入预览、回车提交、重复校验、上移下移排序、自动保存）
- `NavigationDecorationSelector.tsx`: 导航装饰选择器
- `UIIconSelector.tsx`: UI 图标主题选择器
- `PresetEditModal.tsx`: 主题预设编辑弹窗

## Recently Added (2026-02)
- `UiThemeButton.tsx`: 新增 - 从 SponsorshipView 中提取的可复用主题按钮组件
- `TimePalSettings.tsx`: 新增 - 从 SponsorshipView 中提取的时光小友设置组件

> ⚠️ 本文档最后更新：2026-02-09
## Recently Added (2026-03)
- `TimelineStyleSelector.tsx`: 时间线样式切换与参数调节组件。
- `TimelineStyleRail.tsx`: TimelineView、Memoir 与详情页共用的样式轨道渲染组件，支持摘要节点圆点对齐和页面级轨道宽度限制。
- `TimelineStyleAdjuster.tsx`: 时间线样式调节浮窗，使用更紧凑的半屏宽度布局，并支持档案页专用水平偏移。

> Last updated: 2026-03-22
