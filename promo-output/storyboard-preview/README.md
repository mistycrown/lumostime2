# Storyboard Preview

`scene-01-from-a-start.html` is a 10-second, 16:9 constructed-motion preview for the first LumosTime product-film shot.

It validates the visual language only: an activity starts, the floating timer appears, and the action becomes a visible record. The product surface is rebuilt from the current `src/views/RecordView.tsx` structure and `src/components/TimerFloating.tsx` presentation rather than being a screenshot or a generic phone mockup.

The final product film must replace this constructed device surface with a sanitized Android emulator or device capture while preserving the shot's timing, typography, and time-to-record motion grammar.

Open the HTML file directly in a modern browser. The preview includes play, pause, replay, and scrubbing controls.

For a local static inspection at the six-second settled action frame, run:

```powershell
node_modules/.bin/electron.cmd promo-output/storyboard-preview/capture-scene-preview.cjs
```
