# Assistant Scheduled Tasks Design

Date: 2026-05-09

## Goal

Add a new `定时任务` subsection under AI call settings so users can configure recurring assistant-triggered tasks such as:

- 每天早上 8 点
- 每周一早上 8 点
- 每三天 12 点
- 每月 19 号

When the scheduled time arrives, the app should reuse the existing assistant reminder pipeline so the native Android assistant agent can fire a `reminder_due` trigger and reopen the foreground AI conversation.

## Key Clarification

This feature must not piggyback on background check-in intervals.

- Background polling controls check-in cadence.
- Reminder dispatch is its own native-timed path.
- Scheduled tasks should therefore act as a template layer that continuously materializes the next native reminder in advance.

## Reuse Strategy

Reuse the existing todo recurrence model and matching logic instead of inventing a second recurrence schema:

- `TodoRecurrenceRule` from `src/types.ts`
- `matchesRecurrenceRule(...)` from `src/utils/todoScheduleUtils.ts`

Reuse the existing reminder dispatch path:

- `assistantReminderQueueService`
- native reminder sync via `AssistantAgent.syncNativeReminders(...)`
- native `reminder_due` execution in `AssistantAgentService`

## Data Model

Add `AssistantScheduledTask` in `src/types/assistant.ts`.

Fields:

- `id`
- `text`
- `time` (`HH:mm`)
- `recurrenceRule` (`TodoRecurrenceRule`)
- `enabled`
- `createdAt`
- `updatedAt`
- `nextTriggerAt`
- `lastTriggeredAt?`
- `pendingReminderId?`

Notes:

- `nextTriggerAt` is the next concrete datetime to materialize.
- `pendingReminderId` links the template to the currently active generated reminder so deletion and dedupe stay stable.

## Service Layer

Add `src/services/assistantScheduledTaskService.ts`.

Responsibilities:

- persist scheduled-task templates
- normalize and validate stored task records
- compute the next matching trigger datetime from `recurrenceRule + time`
- materialize due scheduled tasks into one-shot assistant reminders
- advance each template to its next `nextTriggerAt`
- remove a linked pending reminder when a scheduled task is deleted
- clear stale `pendingReminderId` values after reminders are consumed

## Trigger Semantics

At any time, each enabled scheduled task should have at most one active generated reminder.

Materialization flow:

1. Read scheduled tasks.
2. If an enabled task is due and has no live linked reminder, create one pending assistant reminder.
3. Advance the task to its next concrete trigger time.
4. Persist the new reminder queue, which already syncs to the native reminder store.

Native Android remains responsible for the exact reminder firing moment.

## UI Placement

Add a `定时任务` section under:

- `AI 设置`
- `调用设置`
- `后台助理`

The section should support:

- list existing scheduled tasks
- create a task
- enable or disable a task
- delete a task

Composer fields:

- task text
- trigger time
- recurrence frequency
- interval
- weekday selection for weekly rules
- day-of-month for monthly rules

For the first version, recurrence start date will default to the task creation date.

## Edge Rules

- Scheduled tasks remain editable even if background polling is off, but they should indicate that auto execution depends on the assistant background service being enabled.
- Monthly rules with day 29/30/31 skip months without that calendar day instead of silently moving to month-end.
- If no future trigger can be computed because the recurrence has ended, the task auto-disables after materializing its final reminder.

## Validation

Add focused tests for:

- next trigger calculation for daily, weekly, every-N-days, and monthly rules
- monthly skipping behavior for missing calendar days
- one-time materialization per due task
- deletion of a task removing its linked pending reminder
