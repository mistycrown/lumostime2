# Views Layer

The `views/` directory contains all the React components that represent the distinct screens or pages of the LumosTime application. This layer is responsible for the presentation logic and user interaction.

## Architecture

The views are designed as "dumb" or "presentational" components where possible, receiving their data and callbacks via props from the main container (`App.tsx`). This centralization of state management in `App.tsx` (or custom hooks) keeps the views focused on rendering.

### Key Classifications

*   **Main Tabs**: High-level navigation roots (e.g., `TimelineView`, `StatsView`, `TodoView`, `TagsView`).
*   **Detail Views**: Dedicated pages for specific entities (e.g., `CategoryDetailView`, `TagDetailView`, `ScopeDetailView`).
*   **Modals/Overlays**: Specialized interaction flows (e.g., `SettingsView`, `RecordView`, `DailyReviewView`).
*   **Management Views**: Bulk editing interfaces (e.g., `BatchManageView`, `TodoBatchManageView`).

## Key Components

*   **TimelineView**: The core dashboard visualizing daily activities and reviews.
*   **StatsView**: Comprehensive analytics with multiple visualization modes (Pie, Matrix, Line, Schedule, Check).
*   **SettingsView**: Central configuration hub for Sync, AI, and App preferences.

> ⚠️ **Note**: When modifying views, ensure that new state requirements are coordinated with `App.tsx` if they affect global data (Logs, Categories, Todos).
