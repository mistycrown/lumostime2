# Todo Auto Sync Design

## Problem

After a successful sync, creating a new todo can update local state and queue auto-sync, but the subsequent sync run may still classify local and cloud timestamps as `equal` when they are very close. In that case the fresh local todo is not uploaded, so task creation appears to not trigger auto-sync.

## Approach Options

### Option A: Force timestamp updates in every todo write path

- Add explicit timestamp bumps in todo save/create/delete handlers.
- Pros: direct and local to todo flows.
- Cons: duplicates existing context-level timestamp management and does not fully solve tolerance-based misclassification.

### Option B: Prefer local upload when auto-sync already detected a pending local change

- Keep current timestamp updates.
- When auto-sync has a confirmed pending local change and the local timestamp is at least as new as cloud, do not let tolerance collapse that state into `equal`.
- Pros: fixes the actual sync-decision bug, covers create/edit/delete task flows, and preserves existing architecture.
- Cons: requires careful guarding so startup restore logic is unchanged.

## Recommendation

Use Option B.

## Design

- Keep `DataContext` and todo write paths unchanged.
- In `useSyncManager`, after computing the base timestamp direction, add a narrow auto-sync override:
  - only for `mode === 'auto'`
  - only when `hadPendingAutoSync` is true
  - only when the base direction is `equal`
  - only when `localTimestamp > cloudTimestamp`
- In that case, treat the sync as `upload`.

This preserves the existing tolerance for passive checks while ensuring confirmed local edits are not swallowed.

## Validation

- Add regression coverage for the sync-decision helper path:
  - pending local auto-sync + local slightly newer than cloud => upload
  - no pending local auto-sync + same timestamps within tolerance => equal
