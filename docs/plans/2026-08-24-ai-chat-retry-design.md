# AI Chat Retry Design

## Goal

Allow users to retry a completed foreground AI reply in place. The retried request must regenerate the response from the original user message and undo every successfully applied foreground tool action from the replaced reply before the new request begins.

## Interaction

- Show a retry control on every foreground assistant message that has retry metadata, not only failed responses.
- When selected, replace the original assistant message in place with its existing pending state.
- The new request uses the original user message and only the conversation before that user message. The replaced reply is excluded from the new model context.
- The original reply is not retained as a second message or alternate branch.

## Rollback

- Save and use each message's existing `appliedActions` snapshots.
- Roll back only actions whose status is `applied`, in reverse execution order.
- Restore logs and todos from their snapshots as one coherent state update, and restore or remove principle and self-belief entries through their stored snapshots.
- Mark successfully reverted actions as `undone` before starting the new request.
- If a rollback cannot be completed, keep the original reply and do not send the retry request. This prevents duplicate or partially superseded changes.

## Scope

The first implementation covers ordinary foreground replies and all existing `AppliedChatAction` kinds: logs, planned logs, todos, todo updates, subtasks, log edits, principles, and self-beliefs. Read-only local-query rounds need no rollback. Dedicated review/newspaper writeback commands are excluded because they do not yet carry a writeback-before snapshot sufficient for safe reversal.

## Verification

- Unit-test reverse-order rollback across dependent todo/log actions.
- Unit-test that an assistant reply with no tool actions can still retry in place.
- Verify a retried request excludes the old reply from conversation history.
- Run the production build and manually smoke-test a normal reply and a tool-calling reply.
