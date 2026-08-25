# Storyboard Preview

`scene-01-from-a-start.html` is a 10-second constructed-motion preview for the first LumosTime product-film shot.

It validates the visual language only: a time point lands, an activity starts, and the action becomes a visible record. The phone screen is a constructed representation of the product's Record view, not a captured Android screen recording.

The final product film must replace this constructed device surface with a sanitized Android emulator or device capture while preserving the shot's timing, typography, and time-to-record motion grammar.

Open the HTML file directly in a modern browser. The preview includes play, pause, replay, and scrubbing controls.

For a local static inspection at the five-second action frame, run:

```powershell
node_modules/.bin/electron.cmd promo-output/storyboard-preview/capture-scene-preview.cjs
```
