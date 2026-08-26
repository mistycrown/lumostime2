# Promo Storyboard Merge Design

## Goal

Keep the eight approved storyboard scene HTML pages and make `scene-01-from-a-start.html` the single entry point for a continuous product-film preview.

## Design

- The entry page hosts one full-screen iframe per scene and crossfades between them.
- Scene order is fixed from `scene-01-from-a-start.html` through `scene-08-from-start-to-self.html`.
- Each scene remains an independent source so its existing animation, typography, and p5.js rendering are preserved.
- The wrapper supplies a minimal playback bar with play/pause, previous/next, progress, and scene count.
- Existing scene-level controls are hidden when each iframe loads to prevent nested controls.
- Playback durations follow the source scene timelines: 10 seconds for scenes 01-07 and 8 seconds for scene 08.

## Cleanup

Delete generated preview captures, capture scripts, review notes, exported PNGs, and the obsolete storyboard index from `promo-output/storyboard-preview`. Keep the eight scene HTML pages plus the internal `scene-01-source.html` used by the merged entry page.

## Verification

Check that the entry HTML references all eight scenes, has no missing files, and that the cleanup leaves only the approved source pages and documentation.
