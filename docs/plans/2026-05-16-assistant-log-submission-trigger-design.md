# Assistant Log Submission Trigger Design

## Goal

Add a new assistant call-setting section that lets users trigger a background AI system turn after submitting a new log for selected tags.

This trigger should:

- apply to manual new-log saves
- apply to logs produced when a focus session ends
- not fire when editing an existing log
- include linked todo and linked scopes in the fixed system message when available

## Approved Scope

### Included

- New `日志提交触发` section under `AI 设置 -> 调用设置 -> 后台助理`
- One master toggle
- One multi-select activity/tag picker
- Fixed system message content
- Background assistant execution through the existing `assistantOrchestratorService.runSystemTurn(...)` path
- Support for linked todo and linked scopes in the generated message

### Excluded

- Editing existing logs
- Batch backfill
- User-authored custom templates for this trigger

## UX

The new section should live in the existing background-assistant settings area and expose:

1. `添加指定标签日志后触发 AI` toggle
2. A multi-select tag picker shown under the toggle

Behavior:

- If the toggle is off, no trigger is sent.
- If the toggle is on but no tags are selected, no trigger is sent.
- A newly created log triggers when its `activityId` matches any selected tag.

## Trigger Text

The generated trigger text is fixed and should follow this shape:

```text
System: 用户刚才完成了一条时间记录。
标签：{分类名} / {标签名}
时长：{分钟数} 分钟
开始：{HH:mm}
结束：{HH:mm}
关联待办：{todo 标题}
关联领域：{scope1 / scope2}
备注：{note}
请基于这条新完成记录做出简短反应。
```

Rules:

- Omit `关联待办` if the log has no linked todo.
- Omit `关联领域` if the log has no linked scopes.
- Omit `备注` if the note is empty.
- The tag line uses `分类 / 标签` to avoid ambiguity across duplicate activity names.

## Architecture

### Config

Extend `AssistantAgentConfig` with:

- `logSubmissionTriggerEnabled: boolean`
- `logSubmissionTriggerActivityIds: string[]`

These fields are normalized and persisted with the existing assistant-agent config storage.

### Event Bridge

Do not couple log persistence directly to AI orchestration.

Instead:

1. `useLogManager` detects whether a saved log is a new insertion.
2. When it is new, it dispatches a lightweight app event with the saved `log`.
3. `AIBackfillChatModal`, which is already mounted globally, listens for that event and decides whether to run a background assistant turn.

This keeps log CRUD logic independent from assistant orchestration and preserves one shared background execution path.

### Background Turn

When the event is received:

1. Verify assistant background mode is enabled.
2. Verify the new log matches the selected activity ids.
3. Build the fixed system message from the log plus current category/todo/scope dictionaries.
4. Merge the new log into the temporary background context so timeline/dictionary summaries can already see the just-saved record.
5. Run the existing `assistantOrchestratorService.runSystemTurn(...)`.

## Edge Rules

- Only brand-new logs trigger. Updates never do.
- Cross-day focus completion may split into multiple new logs, and each newly created split log is eligible independently.
- If there is no ordinary AI conversation with recent user activity, the trigger is skipped, matching the existing background assistant policy.
- If the trigger arrives before React state finishes re-rendering, the handler should still build context from a log list that is locally upserted with the just-saved log.

## Testing

Add focused coverage for:

- config normalization defaults and invalid persisted values
- new-log vs edit-log event eligibility
- selected-tag matching
- fixed trigger text assembly with tag, todo, scope, and note fields
- temporary log upsert used for assistant context hydration
