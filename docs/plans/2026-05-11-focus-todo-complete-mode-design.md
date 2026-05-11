# Focus Todo Complete Mode Design

## Goal

Add a one-shot `完成模式` control beside the shared associated-todo picker so saving a backfill record or completing a live focus session can also mark the currently linked todo as completed.

## Scope

- Add the control to the shared todo picker header area used by `AddLogModal` and `FocusDetailView`.
- Keep the control off by default every time either screen opens.
- Save the log/session first, then attempt one extra todo-completion action.
- If todo completion fails, keep the page closing behavior unchanged and show a toast only.

## Implementation

1. Extend `TodoAssociation.tsx` with an optional header action slot rendered to the right of `Associated Todo`.
2. Add local `完成模式` state to `AddLogModal.tsx` and `FocusDetailView.tsx`, reset it whenever the current linked todo becomes unavailable or already completed.
3. Reuse a shared utility that:
   - checks whether the linked todo is eligible for one-shot completion
   - runs the primary save action first
   - attempts the optional todo completion second
   - reports whether the follow-up action failed so the caller can toast
4. Add a dedicated `handleCompleteTodo` helper in `useTodoManager.ts` for idempotent "complete only" updates without toggling a finished todo back open.
5. Add focused regression coverage for the shared utility's gating and action ordering.

## Non-Goals

- No transactional rollback between log saving and todo completion.
- No persistent user preference for completion mode.
- No change to existing todo-completion behavior elsewhere in the app.
