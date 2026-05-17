# Desktop Month Widget Continuous Scroll Design

Date: 2026-05-17

## Goal

Change the desktop month widget so the left calendar panel matches the in-app month view's continuous vertical scrolling behavior instead of using one fixed month per screen.

The right `Arrange / Maybe / Due` sidebar stays unchanged.

## Approved Scope

- Only the left calendar panel changes interaction model.
- The right planning sidebar remains fixed and keeps the existing drag source behavior.
- The desktop widget keeps its own outer title bar, opacity/theme settings, and resize behavior.
- The calendar should reuse the app month view's rolling-month logic instead of reimplementing a second independent version.

## Recommended Approach

Reuse `src/components/TodoMonthView.tsx` as the shared rolling calendar engine and add a small embedded-mode surface for the desktop widget.

### Why this approach

- It keeps desktop and in-app month scrolling behavior aligned.
- It avoids duplicating month-range loading, active-month tracking, and scroll-to-month logic.
- Future fixes in the app month view are more likely to benefit the widget too.

## Design

### Shared month view changes

`TodoMonthView.tsx` will gain a lightweight embedded mode so it can be mounted without its normal in-app toolbar while still rendering:

- the weekday header
- the rolling month grid
- day expansion rows
- drag/drop schedule movement

The shared component will also expose enough control for the desktop shell to:

- request a programmatic jump to a target month
- observe which month is currently active in the scroll viewport
- override rows-per-screen from widget settings

### Desktop widget changes

`DesktopMonthWidgetView.tsx` will stop treating the left panel as a standalone fixed-grid month.

Instead it will:

- keep an outer header label that reflects the currently visible month
- send prev/next/current-month jump requests into the embedded rolling month view
- keep the right sidebar exactly as the drag source for `scheduled / maybe / deadline`
- keep existing data reload, writeback, theme, opacity, and window-resize behavior

### Desktop calendar wrapper

`DesktopMonthCalendar.tsx` will become a thin adapter around `TodoMonthView` rather than its own calendar implementation.

It will map widget props into:

- shared todo/month-view data props
- embedded-mode configuration
- active-month callback wiring
- external drag state from the sidebar

## Risks And Mitigations

- `TodoMonthView` currently assumes an in-app toolbar.
  Mitigation: split toolbar visibility from weekday-header rendering so the desktop shell can own the outer controls.

- Parent month label updates could accidentally trigger unwanted auto-scroll loops.
  Mitigation: separate "visible month reporting" from explicit navigation requests by using a dedicated navigation signal.

- Widget rows-per-screen currently uses widget-local storage and window height presets.
  Mitigation: keep widget-local row settings in the desktop shell and pass the resolved row count into the shared month view as an override.

## Verification

- Open the desktop month widget and scroll the left panel vertically across multiple months.
- Confirm the header month label follows the visible month during manual scrolling.
- Confirm the prev/next/current-month controls now jump within the rolling calendar instead of replacing a fixed single-month screen.
- Confirm dragging from the right sidebar onto a calendar date still updates real todo schedule data.
- Run a build to catch TypeScript and integration regressions.
