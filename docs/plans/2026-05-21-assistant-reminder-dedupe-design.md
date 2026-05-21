# Assistant Reminder Dedupe Design

## Context

Recurring assistant scheduled tasks already auto-seed the next pending reminder after a `reminder_due` trigger is consumed. During the same background turn, the AI can also return a structured follow-up reminder for the same visible next occurrence. Those two reminders currently survive side by side when their `source` or `scheduledTaskId` differ, which creates duplicate entries such as two identical `每天早上九点提醒我起床`.

## Decision

Treat pending reminders as the same visible reminder when these fields match:

- `type`
- `dueAt`
- `text`
- `todoId`

Ignore `source` for duplicate detection. Ignore `scheduledTaskId` only when one side is unlinked; if both reminders are linked to different scheduled tasks, keep them separate.

When collapsing duplicates, prefer keeping the reminder that already carries `scheduledTaskId` so recurring-task linkage remains intact and `pendingReminderId` does not become stale.

## Implementation

1. Update `assistantReminderQueueService.ts` pending-reminder equivalence and save-time dedupe logic.
2. Keep queue sorting behavior unchanged.
3. Add regression coverage for:
   - `agent` reminder enqueue against an existing scheduled-task reminder.
   - Scheduled-task sync when an equivalent unlinked reminder already exists.

## Verification

- Run the reminder queue and scheduled-task Vitest suites.
- Confirm only one next reminder remains after a recurring reminder triggers and the AI also proposes the same next occurrence.
