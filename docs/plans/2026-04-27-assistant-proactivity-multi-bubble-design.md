# Assistant Proactivity And Multi-Bubble Design

Date: 2026-04-27

## Goal

Make the assistant feel more proactive and more human without increasing foreground noise.

This pass focuses on two product changes:

- Background `silent` turns should still produce visible internal value by updating state, memory, or reminders, and by recording a readable explanation of why the assistant stayed quiet.
- A single assistant reply should be able to render as multiple short chat bubbles so the conversation feels more natural and less monolithic.

## Scope

- Extend background decision data so `silent` no longer means "nothing happened".
- Upgrade the background call history and "recent agent decision" surfaces to show readable summaries.
- Extend unified assistant output to support structured multi-part replies.
- Extend chat message rendering so one stored assistant message can display as multiple bubbles.
- Keep backward compatibility with existing stored messages and current unified-turn callers.

## Non-Goals

- Do not surface background `silent` results into the main chat flow.
- Do not split one assistant reply into multiple persisted message records.
- Do not add independent retry/debug metadata per sub-bubble.
- Do not expand `recentDecisions` into a long history list in memory.
- Do not change polling frequency or quiet-hours policy in this pass.

## Current Problem

Today the background assistant can already choose `silent`, update memory, and enqueue reminders, but the visible product result is too opaque:

- `silent` often reads like complete inactivity.
- `recentDecisions` currently collapses to a terse machine-like summary such as `system_turn:checkin:silent`.
- Background call history records the action but not the reasoning.
- Foreground replies render as one large bubble even when the natural tone would be better as two or three short bursts.

This makes the assistant feel less present than it actually is.

## Design

### 1. Background `silent` should become an explained outcome

Every background turn should be able to describe three things even when no message is sent:

- why the assistant chose not to interrupt
- what it updated or preserved internally
- what follow-up state remains active

Add the following optional fields to the background decision/output path:

- `decisionSummary?: string`
- `silentReason?: AssistantSilentReason`
- `silentSideEffects?: string[]`

Recommended `AssistantSilentReason` values:

- `active_focus_protection`
- `likely_do_not_disturb`
- `state_still_clear`
- `insufficient_confidence`
- `waiting_for_stronger_signal`
- `followup_already_scheduled`

These fields should be available when the outcome is `silent`. They may also be reused for sent-message turns later if we want richer decision inspection, but the first pass should optimize for the silent path.

### 2. Human-readable decision summaries should replace opaque silent markers

`recentDecisions` should remain a latest-only memory slot, but the content should become readable product text instead of an internal trace string.

Example:

`这次先不打扰：时间轴看起来仍连续，已更新当前状态摘要，并保留后续观察。`

This summary becomes the default payload shown in:

- the "最近 agent 决策" card
- background call history entries

If the model omits `decisionSummary`, the orchestrator should generate a fallback summary from:

- action
- silent reason
- memory update result
- reminder count

This guarantees that a silent turn never looks empty in product surfaces.

### 3. Background history should record side effects, not only actions

Extend the background call history entry shape in `assistantOrchestratorService` with:

- `decisionSummary?: string`
- `silentReason?: string`
- `sideEffects?: string[]`

`sideEffects` should describe what actually happened after the decision, for example:

- `更新了 lastKnownState`
- `更新了 workingMemorySummary`
- `写入了最近决策摘要`
- `新增了 1 条 follow-up reminder`

These are user-facing strings for inspection UIs, not low-level debug traces.

### 4. One assistant reply should support multiple display bubbles

We should keep the persistence model stable:

- one assistant turn
- one stored chat message
- one debug attachment set
- one applied-action group

But the visible rendering can become multi-bubble by adding:

- unified turn output field: `assistantReplyParts?: string[]`
- persisted/rendered chat message field: `displayParts?: string[]`

Rendering rule:

- If `displayParts` exists and contains valid content, render one visual bubble per part.
- If not, render the legacy single bubble using `content`.

This preserves all existing features that are attached at the message level:

- debug sections
- applied actions
- memory updates
- reminder updates
- retry input
- notification navigation target

### 5. Structured output should be primary, frontend splitting should be fallback

Preferred behavior:

- The model may explicitly return `assistantReplyParts` when it wants a multi-bubble cadence.

Fallback behavior:

- If `assistantReplyParts` is absent, derive `displayParts` from `assistantReply` with conservative splitting.

Recommended fallback splitting order:

1. Split by double line break.
2. Split by a small set of strong delimiters only when the result stays natural.
3. Abort splitting if it would create fragments that are too short, too many, or obviously mechanical.

This keeps the feature resilient while still letting prompt design drive the best rhythm.

## Data Model Changes

### Assistant types

Update [src/types/assistant.ts](/d:/2026%20ai_assist/lumostime/src/types/assistant.ts) to add:

- `AssistantSilentReason`
- `decisionSummary?: string` on background decision/output types
- `silentReason?: AssistantSilentReason`
- `silentSideEffects?: string[]`
- `assistantReplyParts?: string[]` on `AssistantUnifiedTurnOutput`

### Chat message shape

Update the local message type in [src/components/AIBackfillChatModal.tsx](/d:/2026%20ai_assist/lumostime/src/components/AIBackfillChatModal.tsx) to add:

- `displayParts?: string[]`

This field is optional and backward-compatible.

### Background history shape

Update the history entry in [src/services/assistantOrchestratorService.ts](/d:/2026%20ai_assist/lumostime/src/services/assistantOrchestratorService.ts) to add:

- `decisionSummary?: string`
- `silentReason?: string`
- `sideEffects?: string[]`

## Prompt Changes

Update the background prompt and memory rules so the model explicitly understands that:

- `silent` is still an active decision, not a null result
- silent turns should explain why they stayed quiet
- silent turns should summarize any internal updates in user-readable form
- reply turns may optionally provide `assistantReplyParts`
- each part should be short and natural rather than arbitrary sentence fragmentation

Files involved:

- [public/assistant/background-mode.md](/d:/2026%20ai_assist/lumostime/public/assistant/background-mode.md)
- [public/assistant/memory-rules.md](/d:/2026%20ai_assist/lumostime/public/assistant/memory-rules.md)
- [src/services/assistantPromptService.ts](/d:/2026%20ai_assist/lumostime/src/services/assistantPromptService.ts)

## Orchestrator Flow

In [src/services/assistantOrchestratorService.ts](/d:/2026%20ai_assist/lumostime/src/services/assistantOrchestratorService.ts):

1. Run the unified background turn as today.
2. Apply memory patch if requested.
3. Enqueue reminders if returned.
4. Build a user-readable side-effect list from the actual applied result.
5. Resolve a `decisionSummary`:
   - prefer model-provided summary
   - otherwise generate a fallback summary
6. Persist the latest readable summary into assistant memory as the latest recent decision.
7. Append the richer background call history entry.
8. Only persist a chat message if the outcome is `reply`.

Important behavior rule:

- `silent` updates decision UIs and memory, but never inserts a system bubble into the main chat thread.

## Rendering Flow

In [src/components/AIBackfillChatModal.tsx](/d:/2026%20ai_assist/lumostime/src/components/AIBackfillChatModal.tsx):

- Normalize `displayParts` on load.
- When creating a new assistant message from unified output:
  - prefer `assistantReplyParts`
  - otherwise derive `displayParts` from the full reply text
- Render a shared avatar/timestamp group for the message
- Render one visual bubble per display part
- Keep applied actions, reminders, memory updates, debug controls, and retry controls attached below the grouped message

This should feel like "the assistant sent several short messages in a row" while still being technically one message object.

## Error Handling

- If a silent turn omits `decisionSummary`, generate a fallback summary automatically.
- If `assistantReplyParts` is present but empty after trimming, fall back to `assistantReply`.
- If `assistantReplyParts` and `assistantReply` disagree, use parts for rendering and keep `content` as the full-text storage fallback.
- If old stored messages do not contain `displayParts`, render them with the old single-bubble path.
- If side-effect text cannot be derived, store an empty list rather than a misleading fabricated one.

## Testing

Minimum tests for this pass:

1. `assistantOrchestratorService`
   - silent turn with memory update records `decisionSummary`, `silentReason`, and side effects
2. `assistantOrchestratorService`
   - silent turn without model summary uses orchestrator fallback summary
3. `assistantMemoryService`
   - latest decision stores readable summary text instead of old trace-style text
4. `AIBackfillChatModal`
   - `displayParts` renders as multiple assistant bubbles inside one grouped message
5. `AIBackfillChatModal`
   - missing `displayParts` remains backward-compatible
6. Optional utility test
   - fallback text splitting does not over-fragment short replies

Project-level verification:

- run `npm run build`
- manually smoke test one foreground multi-part reply
- manually smoke test one background silent check-in and inspect:
  - recent decision card
  - background history viewer
  - no new main-chat system bubble

## Recommended Implementation Order

1. Extend assistant types and background history types.
2. Extend prompt assets and fallback prompt text.
3. Update orchestrator summary/side-effect persistence.
4. Update assistant memory latest-decision writing.
5. Add `assistantReplyParts` and `displayParts` support.
6. Update grouped chat rendering.
7. Add tests.
8. Run build and smoke checks.

## Risks

- Overly verbose decision summaries could make the background ledger feel noisy.
- Weak splitting rules could create awkward micro-bubbles.
- Prompt drift could cause inconsistent use of `assistantReplyParts`.

## Mitigations

- Keep `decisionSummary` to one short readable sentence.
- Limit rendered display parts to a small count and drop low-quality splits.
- Use structured parts when available and rely on frontend fallback only as a safety net.

## Conclusion

This design keeps the current assistant architecture intact while making two important behavior upgrades:

- background silence becomes visible, interpretable, and stateful
- foreground replies gain short-message rhythm without fragmenting persistence or tooling

That should make the assistant feel more present and more human without making it noisier or harder to maintain.
