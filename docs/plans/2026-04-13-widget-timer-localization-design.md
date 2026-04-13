# Widget Timer Settings & Widget Rendering Fixes (Design)

Date: 2026-04-13

## Goals
- Localize widget timer settings UI to Simplified Chinese.
- Make widget preview circle backgrounds consistent with the timer activity color style.
- Fix desktop widget slots displaying literal "null" by ensuring safe defaults for label/icon/color.

## Non-Goals
- No changes to timer logic, activity/category data structures, or unrelated settings pages.
- No redesign of widget layout beyond color/label/defaults.

## Current Issues
- Widget settings page is fully in English.
- Preview circles in settings use raw slot color (too dark vs. timer activity background style).
- Desktop widget slots show "null" for label/icon, indicating missing defaults in data normalization.

## Approach
1. **Localization**
   - Replace all widget settings page strings with Simplified Chinese.
   - Update service-level default widget names to Chinese where displayed in UI.

2. **Preview Color Consistency**
   - Use the same color adaptation logic as timer activity background (soft circle style) for the settings preview circles.
   - Keep a consistent light fallback color for empty slots.

3. **Null-Safe Widget Data**
   - Normalize widget slot data to ensure `label`, `icon`, and `color` are never `null` when rendered.
   - Provide safe defaults for empty slots (e.g., dot icon, empty label, light background).

## Data Flow
- Widget settings page loads widget list from native bridge or local storage.
- Normalization applies defaults; settings UI uses normalized values.
- Preview circles derive background from normalized color via shared color adapter.

## Error Handling
- Preserve existing error handling for loading/saving widgets.
- Default to local preview when not on Android.

## Testing Plan
- Manual check on settings page:
  - All strings in Chinese.
  - Preview circles use lighter, consistent background color.
- Manual check on desktop widget:
  - No slot shows literal "null".
  - Empty slots show a neutral placeholder.

## Files
- `src/views/settings/WidgetSettingsView.tsx`
- `src/services/widgetTimerService.ts`
- `src/utils/colorAdapterUtils.ts` (reuse only, no changes unless necessary)
