# AI Subtask Result Parent Label Design
## Background

The AI chat workspace can create subtasks directly from natural language. In the applied-result card, created todos currently show `@分类` only, which makes newly created subtasks look the same as standalone todos. The planner can also return `scheduledDate` for subtasks even when the user only asked to create child tasks.

## Goals

- Only for AI-created subtasks, show parent context in the applied-result `@` label.
- Keep standalone todo result cards unchanged.
- Do not auto-add subtask dates unless the user explicitly requested scheduling or a date.
- Keep changes scoped to the AI subtask flow.

## Decisions

### Result Card Label

- Standalone todo: `@分类`
- AI-created subtask: `@分类 / 父任务`

This applies only inside the AI applied-result card renderer.

### Date Strictness

- `create_subtask` planning should treat `scheduledDate` and `deadlineDate` as opt-in fields.
- If the user message does not explicitly mention scheduling or a concrete date signal, both fields are stripped before local application.
- On success without explicit dates, the confirmation reply should use a neutral fixed sentence instead of a planner-written schedule summary.

## Files

- `src/components/AIBackfillChatModal.tsx`
- `src/services/aiService.ts`

## Verification

- Create subtasks without mentioning dates:
  - result cards show `@分类 / 父任务`
  - no `安排 YYYY-MM-DD`
  - success reply does not claim dates were arranged
- Create subtasks with explicit date wording:
  - planner may keep `scheduledDate`
  - result cards still show `@分类 / 父任务`
