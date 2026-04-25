# Widget UI Icon Rendering Design
## Background

The current Android widget slot editor only supports emoji input. The widget settings flow does not expose the existing UI icon selector, and the Android widget renderer only draws slot icons as text, so desktop widgets always fall back to system emoji rendering.

This project already has:

- a supporter unlock check via `RedemptionService.isVerified()`
- a reusable UI icon selector in the React app
- packaged local widget-safe icon assets under `android/app/src/main/assets/public/uiicon`
- widget slot fields for `uiIconAssetPath` and `uiIconFallbackAssetPath`

The missing work is the end-to-end chain from widget slot editing to native Android bitmap rendering.

## Goals

- Let widget slot editing choose between `emoji` and `UI icon` rendering.
- Show the `UI icon` option only when the supporter feature is unlocked by redemption code.
- Hide the switch entirely when the user is not unlocked.
- Persist enough slot data for native widget rendering to use local UI icon assets.
- Fall back to emoji immediately when unlock state is unavailable or later lost.
- Keep existing widget templates compatible without migration breakage.

## Non-Goals

- No attempt to render Lucide React components directly inside Android widgets.
- No network-based icon loading for widgets.
- No redesign of the overall widget settings page beyond the icon mode flow.
- No change to non-widget icon pickers in the app.

## Recommended Approach

Store widget icon configuration in a backward-compatible hybrid form:

- `icon`: always stores the emoji fallback used by native text rendering
- `customIcon`: stores the user-entered emoji override when emoji mode is active
- `uiIconAssetPath` and `uiIconFallbackAssetPath`: store local packaged asset paths when UI icon mode is active

This keeps emoji fallback centralized and allows native Android widget rendering to prefer bitmap assets when available.

## Product Rules

### Unlock Gating

- Widget slot editor checks `RedemptionService.isVerified()`.
- If unlocked:
  - show `emoji` / `UI icon` mode switch
  - allow opening the existing UI icon selector
- If not unlocked:
  - hide the mode switch entirely
  - keep only emoji editing UI

### Save Behavior

- Emoji mode:
  - save emoji fallback into `icon`
  - save emoji override into `customIcon`
  - clear `uiIconAssetPath` and `uiIconFallbackAssetPath`
- UI icon mode:
  - save mapped fallback emoji into `icon`
  - clear `customIcon`
  - save local asset paths into `uiIconAssetPath` and `uiIconFallbackAssetPath`

### Unlock Loss Behavior

- If a previously configured slot uses UI icon data but the user is no longer verified:
  - widget editing UI hides the UI icon switch
  - the slot editor treats the slot as emoji mode
  - saving or rebuilding clears `uiIconAssetPath` and `uiIconFallbackAssetPath`
  - desktop widget rendering falls back to `icon`

## Data Model Changes

Extend `WidgetSlotEditorDraft` with:

- `iconMode: 'emoji' | 'uiIcon'`
- `uiIcon: string | null`

`WidgetSettingsView` derives draft mode from slot data:

- if `uiIconAssetPath` exists and user is verified, draft mode is `uiIcon`
- otherwise draft mode is `emoji`

`widgetService` slot builders and rebuild helpers gain optional UI icon overrides:

- `uiIconAssetPath`
- `uiIconFallbackAssetPath`

When rebuild runs while UI icon data is unavailable or disallowed, the helper clears asset fields and preserves emoji fallback.

## React UI Changes

### Widget Slot Editor

For timer, daily, and shortcut slot types:

- add icon mode switch when verified
- emoji mode keeps the existing text input
- UI icon mode shows the existing `UIIconSelector`
- preview uses `IconRenderer` and prefers `uiIcon` string when in UI icon mode

To reuse the existing selector cleanly:

- store `ui:iconType` in draft-only state
- convert it to local asset paths during save
- derive fallback emoji with `uiIconService.convertUIIconToEmoji()`

### Visibility

- do not render disabled UI icon controls
- do not show upgrade teaser buttons inside this editor
- if not verified, the editor should look like emoji-only support is the normal state

## Native Android Changes

### Rendering

Update `WidgetSlotBitmapRenderer`:

- if `slot.uiIconAssetPath` exists, try to decode the packaged local asset from `assets/public/<path>`
- draw the bitmap centered inside the slot
- if decode fails, try `uiIconFallbackAssetPath`
- if both fail, fall back to current text-based emoji rendering

### Asset Source

The React side should save relative packaged asset paths such as:

- `uiicon/cat/01.webp`
- `uiicon/cat/01.png`

Native code resolves them against `android/app/src/main/assets/public/`.

### Performance

To avoid repeated decode overhead:

- add a small in-memory bitmap cache keyed by `assetPath + targetSize`
- decode close to slot display size instead of using full-size originals

This keeps widget refresh cost bounded even with multiple slots.

## Verification

- `npm run build`
- manual editor checks:
  - unverified user sees emoji-only UI
  - verified user sees emoji/UI icon switch
  - switching to UI icon updates preview
  - switching back to emoji clears UI icon selection
- native widget checks:
  - verified slot with UI icon renders local icon on desktop widget
  - missing asset gracefully falls back to emoji
  - clearing redemption state and reopening editor causes UI icon slot to save back to emoji-only data

## Risks

- Existing templates with stale `uiIconAssetPath` values must not crash native rendering.
- Asset decode path must match Capacitor Android packaged asset layout exactly.
- Some UI icon themes only have `.webp`; `.png` fallback paths may be absent, so native fallback must tolerate missing files.
