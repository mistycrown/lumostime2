# Dream Month Conversation Design

## Background

The first Dream workflow asked the user to choose from several preset time ranges (`昨天 / 本周 / 本月 / 本年`) before the system refreshed Dream entries. That interaction did not match the intended product framing:

- Dream should now run against exactly one month at a time.
- The month should be chosen through the chat flow itself rather than through a button-picker modal.
- The prompt should look like an AI question even though it is a system-authored step.

## Goal

Replace the old multi-range Dream entry point with a conversational month-selection step:

1. User enters Dream mode by sending `dream` or tapping `运行 dream`.
2. The system inserts a chat message asking for a target month.
3. The user replies with a month identifier.
4. Only after that reply is parsed does the app send the real Dream workflow request.

## Interaction Design

### Entry

- Sending the exact command `dream` starts the Dream month-selection step.
- Tapping `运行 dream` should do the same thing and return the user to the chat view.

### Prompt

The system inserts a prewritten assistant-style message:

`要对哪个年月进行 dream？请回复 6 位阿拉伯数字，例如 202601。`

This is not an AI-generated turn. It is a local UI step.

### Accepted Input

The UI copy still asks for `YYYYMM`, but the parser should also accept common variants:

- `202601`
- `2026-01`
- `2026/01`
- `2026年1月`

All accepted inputs normalize to one canonical `YYYYMM` key.

### Invalid Input

If parsing fails, the app should not call AI. Instead it should add a local system-style reply:

`这个年月我没读懂。请回复 6 位阿拉伯数字，例如 202601。`

The conversation remains in the waiting state until a valid month is received.

## Time Window Rule

- Dream now always runs on the full natural month represented by the chosen `YYYYMM`.
- Example: `202601` maps to `2026-01-01` through `2026-01-31`.
- Other preset windows are removed from the Dream entry flow.

## Retry Rule

- Failed Dream replies should no longer store a range-option id.
- They should store the normalized `YYYYMM` instead.
- Retrying reuses that normalized month directly.

## Implementation Notes

- Keep `dreamService.runDreamWorkflow` date-window based, because it already accepts `rangeStartDate` and `rangeEndDate`.
- Move the behavior change into the chat modal by replacing the old range-picker state with a lightweight “awaiting Dream month input” state.
- Preserve the user’s real month reply as an actual chat message instead of synthesizing another fake user turn.

## Expected Outcome

- Dream becomes a one-month-only workflow.
- The user sees a natural chat exchange instead of a button picker.
- Retry and persistence align with the new month-based contract.
