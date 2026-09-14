# Android 5x2 Custom Slot Widget

## Goal

Add a new Android unified widget size with two rows and five columns (10 configurable slots) while preserving all existing widget sizes and template bindings.

## Design

- Add `5x2` to the shared frontend/native widget size lists.
- Map `5x2` to 10 slots and a 5-column, 2-row grid. Existing resize rules keep configured slots in order and pad new slots with empty values.
- Add a dedicated `QuickLogWidget5x2` provider, XML metadata, layout, and launcher preview. The provider delegates to the existing `WidgetProviderSupport`, so title template cycling, refresh, slot tap dispatch, and snapshot rendering remain shared.
- Keep the existing `4x2` provider and layout unchanged. New instances bind only to `5x2` templates through the existing size-based binding logic.
- Add focused tests for size normalization, slot count/grid mapping, and Android resource/provider registration. Run the web production build; Android compilation remains manual per repository policy.

## Compatibility

Existing templates and installed widgets retain their current sizes and bindings. A newly selected `5x2` template receives ten slots; resizing from another size preserves the leading slots and pads or truncates according to the existing normalization behavior.
