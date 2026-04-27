# Assistant Background Diagnostics Design

Date: 2026-04-27

## Problem

The background assistant currently only leaves visible history after the web layer receives an `assistantSystemTrigger` and successfully runs a background system turn. When the Android polling service wakes up but skips a check-in, or when it dispatches a trigger that the web layer never consumes, the UI shows no evidence that anything happened. This makes it hard to answer three basic questions:

- Did the native poll loop wake up?
- If it woke up, why did it skip or dispatch?
- If it dispatched, did the web layer actually send an AI request, and what was sent?

## Goals

- Make native background polling observable even when no AI request is sent.
- Keep web AI execution history separate from native polling diagnostics.
- Preserve enough request/response detail to inspect completed background AI calls.
- Keep the change diagnostic-first without changing the check-in strategy itself.

## Chosen Approach

Implement a dual-layer diagnostics model:

1. Native diagnostics
   - Persist Android-side poll events in `SharedPreferences`.
   - Record poll ticks, skip reasons, dispatches, manual nudges, and activity throttling updates.
   - Expose list/clear APIs through `AssistantAgentPlugin`.
   - Emit a lightweight plugin update event when new native diagnostics arrive and the web layer is active.

2. Web AI call history
   - Keep using `assistantOrchestratorService` background call history for actual web-layer system turns.
   - Extend each entry with the trigger id and request/response debug exchange.
   - Continue recording completed and failed calls so web-side AI execution remains traceable.

3. UI surfacing
   - Split the existing “后台调用记录” drawer into:
     - 原生轮询诊断
     - Web AI 调用历史
   - Allow opening a debug viewer directly from Web AI history entries that contain a persisted debug exchange.

## Data Flow

1. Android `AssistantAgentService` wakes on poll.
2. Native service writes a diagnostic entry for the tick.
3. If the check-in is skipped, native writes a skip entry with the skip reason and timing context.
4. If the check-in is dispatched, native writes a dispatch entry and includes the shared trigger id.
5. If the web layer receives that trigger and runs `assistantOrchestratorService.runSystemTurn`, the web history entry stores the same trigger id plus the AI debug exchange.
6. The UI can now tell whether the chain stopped at native polling, trigger dispatch, or web AI execution.

## Non-Goals

- Do not change quiet-hours logic, minimum-gap logic, or random check-in scheduling behavior.
- Do not add Android compilation tasks in this workspace.
- Do not attempt to replay missed triggers automatically in this change.

## Verification

- `npm run build`
- `npx vitest run src/services/assistantOrchestratorService.test.ts`
- Manual Android smoke test later by the user:
  - open background history drawer
  - verify native poll diagnostics appear
  - verify manual trigger produces both a native dispatch entry and a web AI call entry
  - verify skipped polls show a concrete skip reason instead of disappearing silently
