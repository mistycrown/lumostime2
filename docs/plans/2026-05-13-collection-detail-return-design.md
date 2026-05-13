## Collection Detail Return Design

### Goal

Make `Settings > Collections` timeline items open their linked log or todo detail pages, while ensuring both software back and Android hardware back return to the same collection detail screen.

### Chosen Approach

Keep the `Settings > Collections` overlay mounted underneath any opened detail modal instead of closing settings first.

This keeps the currently selected collection state alive and makes the close path simple:

- tap a collection timeline `log` item -> open the shared log edit modal above settings
- tap a collection timeline `todo` item -> open the shared todo detail modal above settings
- close/back from that detail modal -> reveal the original collection detail screen

### Back Behavior

Android hardware back must close top-most detail overlays before unwinding the underlying settings stack.

The priority order for this flow is:

1. `AddLogModal` / `TodoDetailModal` / focus overlay if present
2. `Settings > Collections` detail/list navigation
3. root settings close

### UI Layering

The collection page remains at `z-50`.
The shared detail overlays already mount at `z-[100]`, so they naturally cover the collection page without extra local portal work.
