# Background opacity range design

## Goal

Allow the main background image opacity in the fish-feeding experience to be adjusted from 0% through 100%.

## Selected approach

Update the range input and the persisted service validation together. The UI will show a 100% endpoint and calculate its fill using the same maximum. The service will clamp saved values to `0..1`, so direct callers, restored theme packages, and future UI changes share the same valid range.

## Scope and verification

The default opacity remains `0.1`; other opacity settings are unchanged. Add a service regression test for 100% persistence and out-of-range clamping, then run the focused test and production build.
