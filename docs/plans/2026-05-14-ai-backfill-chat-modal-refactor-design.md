# AIBackfillChatModal Refactor Design

Date: 2026-05-14

## Goal

Reduce the maintenance risk of `src/components/AIBackfillChatModal.tsx` without changing user-visible behavior, persistence keys, AI request semantics, or assistant background logic.

## Problems

- One component currently owns too many concerns at once: session orchestration, persona settings, background assistant lifecycle, long-term memory tools, Dream tools, reminders, scheduled tasks, and all panel rendering.
- Stable model/types, low-level validators, and lightweight presentational helpers are mixed into the same file as fragile side effects.
- The render tree contains several self-contained overlays that make the bottom of the file hard to scan and harder to edit safely.

## Refactor Strategy

Use a behavior-preserving, staged extraction.

1. Extract shared domain types, draft-state shapes, validators, and tiny presentational helpers into `src/components/ai-chat/AIBackfillChatShared.tsx`.
2. Keep session persistence, AI request flow, and background agent orchestration in the modal for now.
3. In later passes, peel off independent overlays and panel blocks once the shared model layer is stable.

## Scope For This Pass

- Move chat message/session/persona-related interfaces into a shared module.
- Move reminder and scheduled-task form validation helpers into the shared module.
- Move avatar/revealing-bubble presentational helpers into the shared module.
- Update `AIBackfillChatModal.tsx` to import those shared pieces instead of defining them inline.
- Update component documentation to reflect the new internal structure.

## Non-Goals

- No AI protocol changes.
- No storage-key changes.
- No prompt changes.
- No redesign of the AI modal UI.
- No behavioral changes to reminder dispatch, background polling, Dream flow, or review-template flows.

## Risk Controls

- Start with pure data/helpers before touching orchestration.
- Keep exported type names and helper signatures aligned with current usage.
- Avoid changing call sites beyond imports unless required by TypeScript.
- Verify with a production build after the extraction.

## Follow-Up Candidates

- Extract background-history and debug overlays into their own components.
- Extract memory and Dream management views into separate panel components.
- Introduce focused hooks for session state and assistant background side effects.
