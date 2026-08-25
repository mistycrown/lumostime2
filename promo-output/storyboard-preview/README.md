# Storyboard Preview

`scene-01-from-a-start.html` is a 10-second, 16:9 constructed-motion preview for the first LumosTime product-film shot.

It validates the visual language only: an activity starts, the floating timer appears, and the action becomes a visible record. The product surface is rebuilt from the current `src/views/RecordView.tsx` structure and `src/components/TimerFloating.tsx` presentation rather than being a screenshot or a generic phone mockup.

The final product film must replace this constructed device surface with a sanitized Android emulator or device capture while preserving the shot's timing, typography, and time-to-record motion grammar.

Open the HTML file directly in a modern browser. The preview includes play, pause, replay, and scrubbing controls.

For a local static inspection at the six-second settled action frame, run:

```powershell
node_modules/.bin/electron.cmd promo-output/storyboard-preview/capture-scene-preview.cjs
```

`scene-02-time-becomes-a-thread.html` is the second ten-second shot. It rebuilds the default TimelineView and CalendarWidget structure: calendar header, 70px time rail, vertical line, time nodes, record detail, and `@todo`, `#category`, `%scope` metadata.

For a static inspection at the eight-second settled frame, run:

```powershell
node_modules/.bin/electron.cmd promo-output/storyboard-preview/capture-scene-02.cjs
```

`scene-03-connected-purpose.html` is the third ten-second shot. It rebuilds the ScopeDetailView goal tab and MajorGoalCard structure: a scope header, tabs, a goal series, child goals, progress, and a linked todo record.

For a static inspection after the complete connection is visible, run:

```powershell
node_modules/.bin/electron.cmd promo-output/storyboard-preview/capture-scene-03.cjs
```

`scene-04-see-your-time.html` is the fourth ten-second shot. It rebuilds the weekly `StatsView` and `PieChartView` structure: range controls, navigation, icon-only view switching, the Tags donut, and category breakdown rows.

For a static inspection after the chart and breakdown have settled, run:

```powershell
node_modules/.bin/electron.cmd promo-output/storyboard-preview/capture-scene-04.cjs
```
