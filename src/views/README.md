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

*   **TimelineView**: The core dashboard visualizing daily activities and reviews, with switchable styling for normal timeline record nodes, synchronized gesture/calendar day-switch animation in the main content area, and direct header entries to global search and custom filters.
*   **AchievementView**: Full-screen achievement bottle page entered from Timeline, combining the star container, frozen daily snapshots, editable rules, and reward redemption ledger.
*   **StatsView**: Comprehensive analytics with multiple visualization modes (Pie, Matrix, Line, Schedule, Check, Emoji), including a subtle top-level fade transition for swipe and header date navigation. Weekly ranges should reuse the shared stats date-range helper so cross-month matrix weeks stay capped at 7 days.
*   **SettingsView**: Central configuration hub for Sync, AI, and App preferences, including notification-aware floating-window startup and Android permission-return recovery.
*   **ReviewHubView**: Archive dashboard displaying monthly, weekly, and daily reviews.
*   **JournalView**: Journal-style view for daily entries, providing an alternative perspective to ReviewHubView, with shared timeline styling and per-style archive offset support.
*   **OnThisDayView**: Same-day-across-years archive view with shared timeline styling, schedule comparison, review content, and deletable persistent notes for a month-day.

> ⚠️ **Note**: When modifying views, ensure that new state requirements are coordinated with `App.tsx` if they affect global data (Logs, Categories, Todos).

> Last updated: 2026-04-13
- `SettingsView.tsx`, `WidgetSettingsView.tsx`: Localized widget settings entry, loading label, and widget settings UI text to Chinese.
- `SettingsView.tsx`: Added notification-aware floating-window startup, warning toasts when persistent notifications are unavailable, and automatic retry after returning from Android permission pages.
- `RecordView.tsx`, `TodoView.tsx`: Softened the shared sidebar utility buttons so the bottom controls feel lighter in both record and todo pages.
- `TodoView.tsx`: Added a persisted sidebar toggle for showing or hiding completed todos, while keeping the sidebar control spacing aligned with `RecordView`.
- `TodoView.tsx`: Matched the expanded left-sidebar button spacing with `RecordView` so the density toggle and collapse control keep the same right-side gutter.
- `OnThisDayView.tsx`: Switched historical review answers to a quote-style layout and preserved newline formatting for review and note content in the On This Day archive.
- `ObsidianExportView.tsx`: Added image folder configuration, image-section rendering, and attachment export flow for the desktop Obsidian export tool.
- `StatsView.tsx`: Reused the shared week range helper so matrix weeks no longer overflow when a week spans two months.
- `FocusDetailView.tsx`: Updated progress display logic to dynamically show progress increments.
