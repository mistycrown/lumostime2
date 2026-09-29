# Android AI Chat Keyboard Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Android AI chat composer and latest message visible whenever auto-focus opens the software keyboard.

**Architecture:** Android owns keyboard layout resizing through `adjustResize`. The shared chat composer schedules a second latest-message scroll after the native resize can settle; the viewport hook continues to reserve `visualViewport` keyboard inference for non-Android platforms only.

**Tech Stack:** Android manifest, Capacitor WebView, React, TypeScript, Vitest, Vite.

**Spec:** `docs/plans/2026-09-29-android-ai-chat-keyboard-resize-design.md`

## Global Constraints

- Use UTF-8 encoding and preserve existing source-file header comments.
- Do not add dependencies or change Android build tooling.
- Do not build the Android project in this workspace.
- Preserve Android's existing `visualViewport` exclusion to prevent duplicate keyboard insets.

## Review Focus

- Auto-focus timing: a keyboard animation that completes after the focus event must still finish with the latest message visible.
- Keyboard dismissal: no stale Web-layer inset or new blank space may remain.
- Non-Android browser: existing `visualViewport` keyboard inset behavior must be unchanged.
- Desktop widget: the fixed composer must retain its current scroll behavior.
- Long chat: scrolling must target the message anchor, not move the whole document.

---

### Task 1: Enable native main-window resize for Android keyboards

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml:18-27`

**Interfaces:**
- Consumes: Android Activity window soft-input policy.
- Produces: A `MainActivity` WebView whose layout height is reduced while the IME is visible.

- [ ] **Step 1: Verify the current MainActivity declaration lacks a soft-input policy**

Run: `rg -n -C 3 'MainActivity|windowSoftInputMode' android/app/src/main/AndroidManifest.xml`

Expected: `QuickTodoAddActivity` has `adjustResize`; `MainActivity` does not.

- [ ] **Step 2: Add `android:windowSoftInputMode="adjustResize"` to the MainActivity element**

Keep the attribute scoped to `MainActivity`; do not modify `QuickTodoAddActivity` or activity aliases.

- [ ] **Step 3: Verify the manifest declaration**

Run: `rg -n -C 3 'MainActivity|windowSoftInputMode' android/app/src/main/AndroidManifest.xml`

Expected: both activities explicitly request `adjustResize`.

### Task 2: Re-anchor the chat after Android keyboard layout settles

**Files:**
- Modify: `src/components/ai-chat/AIBackfillChatComposer.tsx:130-136`
- Test: `src/components/ai-chat/AIBackfillChatComposer.test.tsx`

**Interfaces:**
- Consumes: `scrollToLatestMessage(behavior?: ScrollBehavior): void` passed by `AIBackfillChatModal`.
- Produces: An `onFocus` handler that calls `scrollToLatestMessage('auto')` in the focus frame and one subsequent animation frame.

- [ ] **Step 1: Write a failing focus-handler test**

Mock `requestAnimationFrame`, render the composer with required inert props, focus its textarea, and assert one immediate plus one deferred `scrollToLatestMessage('auto')` call after running the queued frame.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/components/ai-chat/AIBackfillChatComposer.test.tsx`

Expected: FAIL because the existing handler calls the scroll helper only once.

- [ ] **Step 3: Update the textarea focus handler**

Retain the current first `requestAnimationFrame`. Inside that callback, scroll once, then schedule one additional `requestAnimationFrame` that scrolls once more. Do not introduce timers, keyboard-height state, or platform branching.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npx vitest run src/components/ai-chat/AIBackfillChatComposer.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: PASS with no TypeScript or Vite errors.

- [ ] **Step 6: Manually smoke-test Android after `npx cap sync android`**

Open a long existing AI conversation from a mobile AI button; confirm keyboard opening leaves the composer and newest reply visible, then dismiss the keyboard and confirm the layout restores without a bottom gap.

- [ ] **Step 7: Commit the completed fix**

Stage only the manifest, composer, its test, and these two plan documents, then create commit `修复 AI 对话键盘遮挡`.
