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
*   **StatsView**: Comprehensive analytics with multiple visualization modes (Pie, Matrix, Line, Schedule, Check, Emoji), including a subtle top-level fade transition for swipe and header date navigation.
*   **SettingsView**: Central configuration hub for Sync, AI, and App preferences.
*   **ReviewHubView**: Archive dashboard displaying monthly, weekly, and daily reviews.
*   **JournalView**: Journal-style view for daily entries, providing an alternative perspective to ReviewHubView, with shared timeline styling and per-style archive offset support.
*   **OnThisDayView**: Same-day-across-years archive view with shared timeline styling, schedule comparison, review content, and persistent notes for a month-day.

> ⚠️ **Note**: When modifying views, ensure that new state requirements are coordinated with `App.tsx` if they affect global data (Logs, Categories, Todos).
