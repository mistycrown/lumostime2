# AIBackfillChatModal coordinator refactor

Date: 2026-09-22

## Goal

Continue reducing `AIBackfillChatModal.tsx` without changing its public behavior, persisted data, or visual output. The modal should remain the composition point for React state and view props rather than the owner of every assistant workflow.

## Considered approaches

1. Extract the entire modal into a feature controller in one change. This would shrink the component fastest, but would create a risky, difficult-to-review behavioral change.
2. Move individual React effects into hooks only. This keeps dependency management familiar, but leaves the core workflow callbacks and their supporting state tightly coupled.
3. Extract cohesive workflow coordinators incrementally, preserving React-owned state and dependencies in the modal. This is the selected approach because it makes boundaries explicit while keeping each change reviewable and testable.

## Design

First, move background-assistant trigger handling, native synchronization, diagnostics refresh, and related snapshot helpers to a dedicated hook. It will receive explicit dependencies and return only UI-facing state plus commands.

Second, move foreground tool-call application, rollback, and message writeback helpers into a dedicated coordinator. The modal will still own data-context setters and pass them in explicitly, avoiding hidden global state.

The existing modal will retain composition responsibilities: context access, primitive UI state, hook wiring, callback assembly, and JSX. All extracted modules will use the existing `ai-chat/` feature directory and preserve the repository's TypeScript headers.

## Error handling and verification

The extraction must preserve existing failure messages, retry/rollback behavior, storage updates, and Android/native fallbacks. Run targeted tests where present and `npm run build`; inspect the final diff and commit only task files.
