# Memoir Background Placement Design

## Goal

Place the Memoir mood-calendar background setting in the sponsorship page's Style tab, immediately after calendar-number styling, rather than under Navigation.

## Chosen approach

Keep the existing `MoodCalendarBackgroundSelector` component, persistence behavior, upload modes, and Memoir debugger callback unchanged. Move only its render location. In the Style tab, place it after `CalendarNumberStyleSelector` in the existing single-column settings flow; use a lightweight divider and padding so its unboxed layout aligns cleanly with the surrounding selector cards.

## Verification

Build the production bundle and confirm that the Navigation tab renders only its navigation-specific selector while the Style tab renders the Memoir background selector after calendar-number settings.
