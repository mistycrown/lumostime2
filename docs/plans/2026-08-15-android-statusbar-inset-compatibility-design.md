# Android Status-Bar Inset Compatibility Design

## Problem

The Android EdgeToEdge plugin applies the system-bar inset as a native top margin on the Capacitor WebView. Some Android WebViews also expose a non-zero `env(safe-area-inset-top)` value to the page. Pages that add both offsets leave a visible blank band below the status bar.

## Decision

Android will have one owner for the top system-bar inset: the native WebView margin applied by EdgeToEdge. The web layer will use a shared `--app-safe-area-top` variable that resolves to `0px` on Android and to `env(safe-area-inset-top)` elsewhere.

Bottom safe-area behavior remains unchanged because it is not involved in the reported top inset duplication and it protects gesture navigation and keyboard-adjacent controls.

## Implementation

1. Add a small platform utility that marks the root document as Android only when Capacitor reports an Android native platform.
2. Define `--app-safe-area-top` in the global stylesheet and override it to `0px` for that root marker.
3. Replace all direct top safe-area references with the shared variable. This covers regular pages, full-screen overlays, and modal layouts consistently.
4. Keep direct bottom safe-area references unchanged.

## Verification

- Unit-test the platform marker decision for Android, iOS, web, and non-native Capacitor environments.
- Run the production build.
- On Android devices, verify normal pages, a full-screen settings page, modals, orientation changes, and the immersive timer. The content must begin exactly once below the status bar with no blank band.
