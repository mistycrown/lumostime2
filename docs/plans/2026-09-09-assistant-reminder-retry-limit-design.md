# Assistant Reminder Retry Limit Design

## Goal

Prevent a failed background assistant reminder from issuing requests forever while preserving enough queue state for diagnosis and user cleanup.

## Design

- Add `failed` as a terminal assistant reminder status.
- Use one shared maximum of 3 dispatch attempts for both the Web fallback and Android native executor.
- Keep the existing one-minute delay between attempts.
- After the third failed attempt, mark the reminder `failed`, stop scheduling it, and retain `dispatchAttemptCount` and `lastDispatchAttemptAt` in the durable queue.
- Successful execution still removes the reminder as before.
- Failed reminders remain excluded from active-memory summaries and due-reminder dispatch, but remain visible to queue/debug consumers so the failure is not silently lost.

## Data Flow

1. A due pending reminder is dispatched and its attempt count is incremented.
2. A successful turn removes the reminder.
3. A failed turn/native request either waits one minute for the next attempt or transitions to `failed` at the limit.
4. Native queue synchronization carries the terminal status back to the Web queue, preventing the next sync from restarting the retry loop.

## Verification

- Unit-test due filtering at attempts 0, 2, and 3.
- Unit-test failure transition and persistence of attempt metadata.
- Run the relevant Vitest suite and the production Web build.

