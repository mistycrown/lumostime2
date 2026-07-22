# Dark Background Layering Design

## Goal

Improve dark-mode custom background visibility and content readability across the Record, Todo, and Scene pages.

## Design

The shared page overlay will use a 72% warm-black surface in dark mode. Scene will use the same isolated stacking context and shared page overlay as the other main tabs. Record and Todo content panels will receive a dedicated 82% dark translucent surface so their right-side content remains readable while the selected background image remains visible behind it.

## Verification

Build the web bundle and synchronize Capacitor Android assets. Confirm the generated CSS includes the page, scene, and content-panel selectors.
