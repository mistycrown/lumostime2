# Scene Widget Card Compatibility Design

## Goal

Ensure the Android 4x3 scene widget renders timer and daily-check cards on launchers that do not reliably bind a `RemoteViewsService` collection.

## Approach

On Android 12 and later, render the scene card grid through `RemoteViews.RemoteCollectionItems` during the widget update. This keeps the card payload in the provider update transaction and avoids an asynchronous launcher-to-service bind.

On Android 11 and earlier, retain the existing `RemoteViewsService` implementation for compatibility.

Both paths use one shared native card renderer. It receives the selected slot item, daily progress, active runtime state, and tap animation state, then produces the same card bitmap, title, and fill-in click intent.

## Failure Handling

An empty scene or slot remains a valid zero-item collection. The provider still renders tabs, the selected-slot label, and the refresh action, so the widget remains usable and can refresh after the app next syncs data.

## Verification

Add source-level regression coverage for the Android-version split, the in-process card collection, and the legacy service fallback. Run the focused widget tests and the production web build. Android compilation remains a manual local-device step for this repository.
