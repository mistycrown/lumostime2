# AI Chat Keyboard Sticky Bottom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the newest AI chat message visible while the mobile keyboard resizes the conversation, but preserve the scroll position when the user is reading older messages.

**Architecture:** Track whether the message scroller is within 48 px of its bottom immediately before composer focus. While that intent is active and the composer remains focused, a `ResizeObserver` on the scroller re-aligns the message-end sentinel after keyboard-driven layout changes; scroll, blur, view-switch, and close events refresh or clear the intent.

**Tech Stack:** React 19, TypeScript, DOM `ResizeObserver`, Vitest 4, Vite
**Spec:** `docs/plans/2026-09-30-ai-chat-keyboard-sticky-bottom-design.md`

## Global Constraints

- Treat “default layout” as a message scroller no more than 48 px from its bottom before composer focus.
- Never force a user who is reading older messages back to the newest message.
- Do not add a Capacitor keyboard plugin or change Android-native code.
- Preserve the existing two-animation-frame focus scroll as the fallback when `ResizeObserver` is unavailable.
- Keep all edited files UTF-8 and update their existing `@updated` header history.

## Review Focus

- A scroller exactly 48 px from the bottom must still count as the default bottom layout; Task 1 pins the inclusive threshold.
- Negative residual distance caused by browser rounding or content shrink must count as bottom; Task 1 tests clamping/threshold behavior.
- A user more than 48 px from the bottom must not be moved by focus or later resize; Tasks 1 and 2 test the false intent path.
- Repeated resize callbacks during a keyboard animation must remain safe and keep aligning only while focus intent is active; Task 2 tests repeated guarded scheduling.
- Missing `ResizeObserver` support must not break focus behavior; Task 2 preserves and tests the two-frame fallback.

---

### Task 1: Bottom-position intent helpers

**Files:**
- Modify: `src/components/ai-chat/useAIBackfillChatViewport.ts`
- Create: `src/components/ai-chat/useAIBackfillChatViewport.test.ts`

**Interfaces:**
- Consumes: DOM-compatible scroll metrics `{ scrollHeight: number; scrollTop: number; clientHeight: number }`.
- Produces: `AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX = 48` and `isAIChatScrollNearBottom(metrics, threshold?): boolean` for the viewport hook and regression tests.

- [x] **Step 1: Write the failing bottom-threshold tests**

Add Vitest cases asserting that `isAIChatScrollNearBottom` returns `true` for zero residual distance, exactly 48 px, and a negative residual distance; returns `false` for 49 px; and respects an explicit custom threshold.

- [x] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run src/components/ai-chat/useAIBackfillChatViewport.test.ts`
Expected: FAIL because the helper exports do not exist.

- [x] **Step 3: Implement the metric helper**

In `useAIBackfillChatViewport.ts`, export `AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX` and `isAIChatScrollNearBottom(metrics, threshold = AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX): boolean`; compute `scrollHeight - scrollTop - clientHeight <= threshold` without DOM reads outside the supplied metrics.

- [x] **Step 4: Run the focused test and verify success**

Run: `npx vitest run src/components/ai-chat/useAIBackfillChatViewport.test.ts`
Expected: PASS for all bottom-threshold cases.

- [x] **Step 5: Commit the helper and tests**

```bash
git add src/components/ai-chat/useAIBackfillChatViewport.ts src/components/ai-chat/useAIBackfillChatViewport.test.ts
git commit -m "测试 AI 对话底部位置判断"
```

### Task 2: Follow keyboard-driven scroller resizing only from the default layout

**Files:**
- Modify: `src/components/ai-chat/useAIBackfillChatViewport.ts`
- Modify: `src/components/ai-chat/useAIBackfillChatViewState.ts`
- Modify: `src/components/ai-chat/AIBackfillChatConversationPane.tsx`
- Modify: `src/components/ai-chat/AIBackfillChatMainView.tsx`
- Modify: `src/components/ai-chat/AIBackfillChatComposer.tsx`
- Modify: `src/components/ai-chat/AIBackfillChatComposer.test.ts`
- Modify: `src/components/AIBackfillChatModal.tsx`

**Interfaces:**
- Consumes: `isAIChatScrollNearBottom` from Task 1, the message scroller ref, the composer textarea ref, and the existing `scrollToLatestMessage(behavior?)` callback.
- Produces: viewport callbacks `handleComposerFocus(): boolean`, `handleComposerBlur(): void`, and `handleConversationScroll(element: HTMLElement): void`; `messagesScrollContainerRef: MutableRefObject<HTMLDivElement | null>`; `shouldFollowAIChatViewportResize(shouldKeepLatestVisible, activeElement, composer): boolean`; keyboard-resize following guarded by composer focus and the stored bottom intent.

- [x] **Step 1: Extend the regression tests with focus-intent and fallback behavior**

Keep the existing `AIBackfillChatComposer.test.ts` assertion that the fallback scheduler performs both animation-frame scrolls without `ResizeObserver`. Add viewport cases asserting that `shouldFollowAIChatViewportResize` returns true only when bottom intent is true and `document.activeElement` is the composer, and remains stable across repeated calls; combine it with the 49 px bottom-helper case to cover the older-message path.

- [x] **Step 2: Run focused tests and verify the new cases fail**

Run: `npx vitest run src/components/ai-chat/AIBackfillChatComposer.test.ts src/components/ai-chat/useAIBackfillChatViewport.test.ts`
Expected: FAIL because the guarded callbacks and resize-follow interface are not implemented.

- [x] **Step 3: Add persistent DOM refs and bottom-follow intent**

In `useAIBackfillChatViewState.ts`, create and return `messagesScrollContainerRef` and `shouldKeepLatestMessageVisibleRef`; initialize the intent to `false` and update the file header.

- [x] **Step 4: Wire the scroll container through the rendering path**

Pass `messagesScrollContainerRef` and `handleConversationScroll` from `AIBackfillChatModal.tsx` through `AIBackfillChatMainView.tsx` to `AIBackfillChatConversationPane.tsx`. Attach the ref to the existing `overflow-y-auto` root and call `handleConversationScroll(event.currentTarget)` from `onScroll` so user movement continuously refreshes bottom intent.

- [x] **Step 5: Implement guarded focus, blur, and resize behavior**

Extend `useAIBackfillChatViewport` options with `isHomeView`, `messagesScrollContainerRef`, and `shouldKeepLatestMessageVisibleRef`. Return `handleComposerFocus`, `handleComposerBlur`, and `handleConversationScroll`; on focus capture and return the pre-keyboard bottom state, on blur/close/home-view clear it, and observe the mounted conversation scroller with `ResizeObserver`. Each observer callback must cancel its pending frame and schedule one replacement `auto` scroll only while the textarea is the active element and the stored intent is true; disconnect and cancel pending animation frames on cleanup.

- [x] **Step 6: Replace unconditional composer focus scrolling**

Pass the viewport focus/blur callbacks into `AIBackfillChatComposer.tsx`. On textarea focus, call `handleComposerFocus()` and invoke the existing `queueComposerFocusScroll` only when it returns true; call `handleComposerBlur()` on blur. This retains immediate/two-frame alignment on all platforms and supplies the no-`ResizeObserver` fallback without moving older-message positions.

- [x] **Step 7: Run focused tests and verify success**

Run: `npx vitest run src/components/ai-chat/AIBackfillChatComposer.test.ts src/components/ai-chat/useAIBackfillChatViewport.test.ts`
Expected: PASS, including the 48 px boundary, older-message path, repeated resize guard, and missing-observer fallback.

- [x] **Step 8: Run production build**

Run: `npm run build`
Expected: Vite and TypeScript build complete successfully with no new errors.

- [x] **Step 9: Inspect and commit only this fix**

Review `git status --short` and `git diff`; stage only the eight implementation/test files plus this plan, leaving all pre-existing unrelated changes unstaged.

```bash
git add src/components/AIBackfillChatModal.tsx src/components/ai-chat/AIBackfillChatComposer.tsx src/components/ai-chat/AIBackfillChatComposer.test.ts src/components/ai-chat/AIBackfillChatConversationPane.tsx src/components/ai-chat/AIBackfillChatMainView.tsx src/components/ai-chat/useAIBackfillChatViewport.ts src/components/ai-chat/useAIBackfillChatViewport.test.ts src/components/ai-chat/useAIBackfillChatViewState.ts docs/superpowers/plans/2026-09-30-ai-chat-keyboard-sticky-bottom.md
git commit -m "修复 AI 对话键盘升起滚动"
```
