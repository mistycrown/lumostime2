# AI Chat Open Scroll Design

Date: 2026-05-05

## Problem

The shared AI chat modal already scrolls to the latest message when conversation data changes, and it can also jump to a specific reply when Android opens the chat from a notification. But a normal reopen does not trigger a dedicated enter-time scroll pass, so the modal can reopen at an older scroll position when no new messages were added.

## Approved approach

Keep the current message-update scrolling and exact-message navigation behavior, then add one small enter-time scroll action for the normal reopen case.

- When the AI chat modal changes from closed to open, scroll to the latest message once.
- If the reopen includes a valid target session or target message, let the existing navigation flow win and do not force the list to the bottom first.
- Keep the change local to `AIBackfillChatModal.tsx` so message persistence, background execution, and session structure stay untouched.

## Scope

- Add a small open-state scroll effect in `src/components/AIBackfillChatModal.tsx`.
- Reuse the existing bottom-anchor behavior instead of introducing a new scroll container API.
- Update component-level docs to reflect the fix.

## Verification

- Closing and reopening the AI chat without new messages should land on the latest turn.
- Opening from an exact background-reply notification should still focus the target message.
- Existing new-message auto-scroll behavior should remain intact.
