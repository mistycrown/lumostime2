# Todo Row Interaction Fix Design

Date: 2026-05-05

## Problem

The todo list row currently mixes tap opening and swipe shortcuts inside one loose touch heuristic. In practice this causes two regressions:

- light finger drift or diagonal scrolls can be treated as swipe gestures, which may accidentally toggle completion and reorder a row;
- taps with a bit of movement can fall into a no-op gap, especially in the lower half of the list while the user is also trying to scroll.

## Approved approach

Keep the existing interaction model, but make the row gesture classifier more conservative.

- Lock the gesture direction early: once a movement is clearly vertical, treat the rest of the interaction as scroll-only.
- Only enter swipe mode for clearly horizontal motion with limited vertical drift.
- Make tap detection slightly more forgiving so minor movement still opens quick actions.
- Keep undo-complete inside the quick-actions sheet instead of a row-level left swipe, so completed items cannot be reopened by accidental touch drift.
- Keep mouse click behavior unchanged; this fix mainly stabilizes pointer/touch interactions without removing existing swipe shortcuts.

## Scope

- Add a small pure helper in `src/utils/` for todo-row gesture classification.
- Update `src/views/TodoView.tsx` to use the helper for touch pointer handling.
- Add regression tests for swallowed taps and accidental completion toggles during diagonal scrolls.

## Verification

- A light tap with minor drift still opens the quick-actions sheet.
- A vertical or diagonal scroll does not toggle completion.
- A deliberate right swipe still opens detail / duplicate.
- A deliberate left swipe still toggles completion for incomplete todos, while completed todos only undo from quick actions.
