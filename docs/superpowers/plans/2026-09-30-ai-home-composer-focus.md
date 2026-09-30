# AI Home Composer Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make focusing the AI home composer open the conversation view with the draft preserved and the conversation composer focused.

**Architecture:** `AIChatHome` reports its composer focus to `AIBackfillChatMainView`. The parent selects the most recently updated session, copies the homepage draft into the shared conversation state, switches views, and invokes the existing deferred composer focus helper. No request flow changes are needed.

**Tech Stack:** React, TypeScript, Vitest, Vite.
**Spec:** `docs/plans/2026-09-30-ai-home-composer-focus-design.md`

## Global Constraints

- Use UTF-8 source files, 2-space indentation, single quotes, and semicolons.
- Preserve existing source-file header comments and add an accurate update entry when changing a source file.
- Do not auto-send a user message when focus opens the conversation view.
- Preserve an existing homepage draft in the conversation composer.

## Review Focus

- Empty homepage composer: focus opens chat and focuses its composer without sending a request; test in Task 1.
- Non-empty homepage composer: its exact draft becomes the conversation draft without trimming or sending; test in Task 1.
- Existing homepage send behavior: Enter and the send button continue through `onSendShortcut`; test in Task 1.
- Homepage overlay state: the composer remains absent while an overlay is open, so it cannot cause an unexpected navigation; preserve existing conditional render in Task 1.
- Template session safety: focus navigation only sets the draft/view state and does not create or replace a session; test in Task 1 through the callback contract.

---

### Task 1: Wire homepage composer focus to the shared conversation state

**Files:**
- Modify: `src/components/ai-chat/AIChatHome.tsx`
- Modify: `src/components/ai-chat/AIChatHome.test.tsx`
- Modify: `src/components/ai-chat/AIBackfillChatMainView.tsx`

**Interfaces:**
- Consumes: `setInputText(text: string)`, `setIsHomeView(isHomeView: boolean)`, and `focusComposerAtEnd(): void` already supplied to `AIBackfillChatMainView`.
- Produces: `AIChatHomeProps.onFocusChat(text: string): void`, called by the home `<input>` focus event and selecting `sortedSessions[0]` when available.

- [ ] **Step 1: Write the failing regression test**

In `src/components/ai-chat/AIChatHome.test.tsx`, add a test asserting that the homepage `<input>` binds `onFocus` to the new focus callback and still calls `sendQuickChat` only from the Enter handler.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/components/ai-chat/AIChatHome.test.tsx`

Expected: FAIL because the composer has no focus callback.

- [ ] **Step 3: Implement the focus callback contract**

In `AIChatHome.tsx`, add `onFocusChat` to `AIChatHomeProps` and invoke it with `quickChatText` from the input `onFocus` handler. In `AIBackfillChatMainView.tsx`, pass a handler that selects `sortedSessions[0]` when available, then calls `setInputText(text)`, `setIsHomeView(false)`, and `focusComposerAtEnd()`. Update each edited source-file header with this behavior.

- [ ] **Step 4: Run focused verification**

Run: `npx vitest run src/components/ai-chat/AIChatHome.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run production verification**

Run: `npm run build`

Expected: PASS with no TypeScript or Vite build errors.

- [ ] **Step 6: Commit the completed implementation**

Stage only the three implementation files and commit with subject `聚焦 AI 输入框进入对话`.
