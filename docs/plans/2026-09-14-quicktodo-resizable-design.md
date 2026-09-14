# Resizable QuickTodo Widget

## Goal

Allow the existing Android QuickTodo widgets to be resized horizontally and vertically by supported launchers.

## Design

- Change both `QuickTodo4x2` and `QuickTodo4x3` provider metadata from `resizeMode="none"` to `resizeMode="both"`.
- Keep each provider's current `minWidth`, `minHeight`, target cell size, layout, and data source unchanged.
- Handle `onAppWidgetOptionsChanged` in each provider by rebinding the existing `ListView` for the affected instance. The layout already uses `match_parent`, so larger bounds naturally expose more rows while smaller bounds clip to the available list area.
- Keep both providers registered separately for launcher compatibility; no data migration or new widget family is required.

## Validation

Add source-level regression checks for both metadata files and resize callbacks, run the QuickTodo/widget tests, and run `npm run build`. Android Gradle compilation remains manual per repository policy.
