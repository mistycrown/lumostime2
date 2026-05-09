# AI Chat Mobile Keyboard Follow Design

Date: 2026-05-09

## Problem

On mobile, opening the soft keyboard inside `AIBackfillChatModal.tsx` raises the composer but leaves the conversation visually pinned too low, so the newest messages can sit under the keyboard edge instead of staying attached to the input area.

## Approved approach

Use a local visual-viewport keyboard inset for the shared AI chat shell, then keep the existing bottom-anchor scroll behavior.

- Measure the mobile soft-keyboard overlap from `window.visualViewport`.
- Apply that overlap as extra bottom padding on the root AI chat shell so both the message list and composer move upward together.
- When the composer is focused and the keyboard inset changes, run a lightweight scroll-to-latest pass so the newest turns stay visible above the keyboard.
- Keep the change scoped to `AIBackfillChatModal.tsx` instead of altering global app layout or Android-native window behavior.

## Scope

- Add mobile keyboard-inset tracking to `src/components/AIBackfillChatModal.tsx`.
- Reuse the existing `messagesEndRef` bottom anchor instead of introducing a new scrolling abstraction.
- Update component-level docs to record the new mobile keyboard behavior.

## Verification

- On a phone-sized viewport, focusing the AI composer should move both the composer and the visible end of the conversation upward together.
- While typing, the newest assistant and user messages should remain visible without manually dragging the list.
- Closing the keyboard should restore the original bottom spacing without affecting desktop layout or notification-linked message jumps.
