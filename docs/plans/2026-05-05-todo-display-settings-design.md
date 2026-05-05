# Todo Display Settings Design

Date: 2026-05-05

## Problem

The Todo sidebar currently keeps three utility buttons too far above the fixed bottom navigation, which makes the lower-left controls feel detached from the nav bar. The first control also only toggles completed visibility directly, so there is no dedicated place to adjust compact-row display preferences.

## Approved approach

Keep the existing three-control structure in the Todo sidebar, but change the first control into a dedicated display-settings entry that opens a small modal.

- Move the sidebar utility-control group downward so it sits closer to the fixed bottom navigation while still clearing the safe area.
- Replace the old eye toggle button with a new display-settings control.
- Keep the `松散 / 紧缩` view toggle and the sidebar collapse toggle as separate controls.
- Add a lightweight display-settings modal with one top-level completed-visibility switch and one compact-mode section for metadata toggles.

## Scope

- Update `src/views/TodoView.tsx` to reposition the sidebar control group, open the new display-settings modal, and persist the new compact display preferences locally.
- Add a reusable `src/components/TodoDisplaySettingsModal.tsx` component for the modal UI and Android hardware-back dismissal.
- Keep the compact display preferences local to the Todo page, alongside the existing `todoViewMode` and `todoShowCompleted` persistence.
- Limit the new metadata switches to compact mode only.

## Compact-mode switches

- `关联标签`
- `关联领域`
- `排期类型`
- `进度图示`
- `排期时间`

## Verification

- The lower-left utility controls should sit visually closer to the fixed bottom navigation.
- Tapping the new display-settings control should open the modal and allow toggling completed visibility.
- The five compact-mode switches should immediately affect compact rows without changing loose-mode rendering.
- Refreshing the page should keep the selected compact display preferences.
