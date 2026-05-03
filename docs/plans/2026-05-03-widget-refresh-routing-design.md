# Widget Refresh Routing Design

## Context

The widget bridge currently refreshes every widget provider after every sync call, even when only one widget family depends on the changed payload.

## Goals

1. Keep existing widget behavior unchanged.
2. Replace global refresh fan-out with widget-family-specific refresh routing where the dependency graph is already clear.
3. Add small regression coverage so future sync methods do not drift back to `refreshAll`.

## Chosen Approach

1. Extend `WidgetRefreshCoordinator` with focused refresh helpers for:
   - timer-grid widgets
   - tracking-calendar widgets
   - daily-runtime widgets
   - todo-pin widgets
   - scene widgets
2. Update `WidgetBridgePlugin` methods to call only the widget families that depend on each payload:
   - `saveTemplates` -> timer-grid + tracking-calendar
   - `syncRuntimeState` -> timer-grid + todo-pin + scene
   - `syncDailyWidgetData` -> timer-grid + scene
   - `syncDailyRuntimeWidgetData` -> daily-runtime
   - `syncTodoPinWidgetData` -> todo-pin
   - `syncTrackingCalendarWidgetData` -> tracking-calendar
   - `syncSceneWidgetData` -> scene
3. Keep `refreshAllAsync` and `refreshWidget` intact for generic fallback behavior.

## Verification

1. Run `npx vitest run src/services/widgetService.test.ts`.
2. Run `npm run build`.
