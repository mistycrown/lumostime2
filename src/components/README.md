# Components Directory

This directory contains the reusable React components for the application. They are categorized by their primary function.

## Core UI
Components that form the structural or global UI elements.

- `CalendarWidget.tsx`: Versatile calendar component with Heatmap and Expand modes.
- `TimerFloating.tsx`: Global floating timer for active sessions.
- `Toast.tsx`: Notification system.

## Modals
Overlay components for complex interactions.

- `AddLogModal.tsx`: Main modal for logging time.
- `TodoDetailModal.tsx`: Detailed view and editing for Todos.
- `GoalEditor.tsx`: Goal creation and editing.
- `AIBatchModal.tsx`: AI-powered schedule generation.
- `AddActivityModal.tsx`: Creating new activities.
- `ConfirmModal.tsx`: specialized confirmation dialogs.
- `NarrativeStyleSelectionModal.tsx`: AI narrative style picker.

## Visualization
Charts and visual data representations.

- `FocusCharts.tsx`: Focus score analytics.
- `HeatmapCalendar.tsx`: Month-view intensity heatmap.
- `MatrixAnalysisChart.tsx`: Bar charts for activity ranking.

## Input & Forms
Specialized input controls.

- `FocusScoreSelector.tsx`: 5-point focus rater.
- `DateRangeFilter.tsx`: Tabbed date range picker.
- `CustomSelect.tsx`: Styled dropdown.
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
- `NavigationDecorationSelector.tsx`: 导航装饰选择器
- `UIIconSelector.tsx`: UI 图标主题选择器
- `PresetEditModal.tsx`: 主题预设编辑弹窗

## Recently Added (2026-02)
- `UiThemeButton.tsx`: 新增 - 从 SponsorshipView 中提取的可复用主题按钮组件
- `TimePalSettings.tsx`: 新增 - 从 SponsorshipView 中提取的时光小友设置组件

> ⚠️ 本文档最后更新：2026-02-09
