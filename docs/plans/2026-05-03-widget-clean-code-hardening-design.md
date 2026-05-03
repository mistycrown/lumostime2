# Widget Clean Code Hardening Design

## Context

The widget feature currently works, but the review surfaced three maintainability risks:

1. Template sanitization can mark unchanged templates as updated.
2. Widget settings load paths can trigger unnecessary saves and full native refreshes.
3. Native daily-slot and scene-checklist tap handling duplicate the same business rules.

## Goals

1. Preserve existing widget behavior.
2. Reduce unnecessary local/native writes during load and normalization.
3. Make template sanitization and equality checks easier to reason about.
4. Consolidate duplicated native daily/checklist tap logic.
5. Add regression coverage for the new sanitization behavior.

## Chosen Approach

Use a focused refactor instead of a large redesign:

1. In `src/services/widgetService.ts`, make sanitization decisions per template instead of sharing a mutable change flag across the whole array.
2. Introduce a shared normalized template equality helper so load and sync code can compare canonical widget data without spreading `JSON.stringify` logic.
3. In `src/views/settings/WidgetSettingsView.tsx`, avoid saving on load unless normalization or UI-icon sanitization actually changes persisted data.
4. In `android/.../WidgetTimerController.kt`, extract shared daily/checklist progress mutation and pending-action creation logic into one helper.
5. Add targeted tests for sanitization regressions.

## Non-Goals

1. No widget UX redesign.
2. No provider architecture rewrite.
3. No change to Android widget entry points or template schemas.

## Verification

1. Run `npx vitest run src/services/widgetService.test.ts`.
2. Run `npm run build`.
