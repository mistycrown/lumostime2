# Widget Clean Code Follow-Up Design

## Context

The second review pass found three focused cleanup items that are worth fixing now:

1. Shortcut widget actions no longer share one clear default-color rule.
2. Scene card title truncation is less Unicode-safe than the main widget grid.
3. `WidgetSceneTabsRemoteViewsService` appears to be leftover wiring after the scene widget moved to fixed tab views.

## Goals

1. Keep shortcut action defaults consistent between editor, saved template data, and native rendering.
2. Reuse code-point-safe truncation behavior for scene card labels.
3. Remove scene-widget dead code that no longer participates in rendering.
4. Add small regression coverage for the fixed behaviors.

## Chosen Approach

1. Restore action-specific shortcut default colors as the shared fallback in `widgetService`.
2. Update the slot editor so shortcut color preview/save behavior follows the selected action default unless the user picked a different color.
3. Replace scene card `substring` truncation with the same code-point-aware approach already used by the main widget provider.
4. Remove the unused scene tabs remote-views service file and manifest registration.
5. Extend the widget regression test file with shortcut-color and scene-truncation checks.

## Verification

1. Run `npx vitest run src/services/widgetService.test.ts`.
2. Run `npm run build`.
