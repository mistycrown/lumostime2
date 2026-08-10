# Immersive Timer Diagnostics

## Goal

Identify why Android immersive timer entry returns to the normal application surface without changing timer, orientation, or back-navigation behavior.

## Design

Temporary `[ImmersiveDebug]` logs will trace the complete transition in `logcat`:

- React: focus-detail mount/unmount, immersive state changes, explicit exit callbacks, and registered hardware-back callbacks.
- App ownership: focus-detail open/close state changes in the parent flow.
- Android: immersive system-bar enter/exit calls and Activity lifecycle callbacks.

The logs are observational only. They do not alter system-bar, orientation, timer, navigation, or persistence behavior. They will be removed after the root cause is verified.

## Success Criteria

One reproduction identifies which event occurs first: an explicit immersive exit, a hardware-back callback, a parent focus-detail close/unmount, or an Android lifecycle interruption.
