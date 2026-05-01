# Assistant Segment Reveal Design

## Goal

Make multi-part assistant replies feel more clearly sequential inside the AI chat window without changing the existing reply-part data flow.

## Chosen Approach

Keep the current per-part reveal pipeline in `AIBackfillChatModal.tsx`, but strengthen the presentation layer:

1. Increase the stagger between assistant reply parts so the next bubble reads as a deliberate follow-up instead of a near-simultaneous paint.
2. Upgrade each entering bubble from a light fade to a clearer lift-and-settle motion with a small scale change.
3. Add a short highlight wash that fades away after mount so newly arrived assistant bubbles have a more obvious "just landed" moment.

## Why This Approach

- It preserves the current `displayParts` model and timeout-based reveal logic.
- It avoids touching persistence, orchestration, or streaming behavior.
- It improves perceived sequencing with low regression risk because the change stays local to rendering.

## Validation

- `npm run build`
