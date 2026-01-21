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
