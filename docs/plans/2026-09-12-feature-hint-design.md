# Feature Hint Design

## Goal

Add a reusable, compact help entry point for places where users may not know how a feature works. The first integration is beside the `属性作为关键字` setting in the Activity attribute manager.

## Interaction

- Render a small dark-red circular question-mark icon using Lucide's `CircleQuestionMark` icon.
- The caller controls the icon size and placement through component props so the entry point can fit different UI locations.
- Clicking the icon opens a library-consistent modal containing developer-provided hint text.
- The modal presents `不再显示` on the left and `好的` on the right.
- `好的` closes the modal and keeps the entry point available.
- `不再显示` closes the modal and persists dismissal for that hint's stable ID in `localStorage`; dismissed hints render no entry point after reload.

## Architecture

Create a focused `FeatureHint` React component with a stable hint ID, text, optional sizing/class props, and local state for open/dismissed status. Keep persistence local to the component using a namespaced storage key, with defensive parsing and storage failure handling. Use the existing modal visual language and keyboard/focus behavior where practical, while giving the two requested actions explicit labels and order.

## Integration

Place the first hint immediately after the `属性作为关键字` label in `ActivityAttributeManager`. The hint ID must remain stable across releases, and the copy should explain that the selected choice attribute can supply keywords for search/association behavior.

## Verification

- Build the application with `npm run build`.
- Verify the entry point is visible by default, opens the modal, closes with `好的`, and disappears after `不再显示`.
- Verify the dismissal survives a component remount through `localStorage`.
