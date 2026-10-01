# Todo Completion Date Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在待办页中为已完成待办显示本地完成日期，并适配紧缩与松散两种列表模式。

**Architecture:** 复用 `todoListDisplayUtils` 的日期格式化边界，新增对 `completedAt` 的安全转换和紧缩摘要片段；`TodoView` 只负责把完成状态与共享格式化结果接入现有两种布局。完成日期不新增数据字段或设置项。

**Tech Stack:** React + TypeScript, lucide-react, Vitest, Vite
**Spec:** `docs/plans/2026-10-01-todo-completion-date-display-design.md`

## Global Constraints

- 完成日期仅在 `isCompleted && completedAt` 有效时显示。
- 日期使用本地日期和现有 `MM.DD` 格式；不改变安排日期、截止日期的现有格式。
- 紧缩模式沿用 `showScheduleTime` 开关；松散模式沿用现有右侧日期区域。
- 保持 UTF-8、2 空格缩进、单引号和分号风格。
- 保留现有未提交的 `CategoryDetailView.tsx`、`ScopeDetailView.tsx`、`TagDetailView.tsx`，不得将其纳入提交。
- 执行方式：Native，在当前会话中逐项完成。

## Review Focus

- 缺失 `completedAt`：不显示完成日期；由工具测试覆盖。
- 无效 ISO 时间：不渲染错误日期；由工具测试覆盖。
- 未完成待办带有历史 `completedAt`：仍不显示完成日期；由工具测试覆盖。
- 已完成待办同时拥有安排日期和截止日期：三类日期按安排、截止、完成顺序共存；由工具测试覆盖。
- 松散模式只有完成日期、没有安排/截止日期：仍需显示右侧日期区域；由构建检查和手动烟测覆盖。

### Task 1: Extend shared todo date formatting

**Files:**
- Modify: `src/utils/todoListDisplayUtils.ts`
- Test: `src/utils/todoListDisplayUtils.test.ts`

**Interfaces:**
- Consumes: `TodoItem.completedAt`, `TodoItem.isCompleted`, existing `formatTodoInlineDate` and `parseDateKey`.
- Produces: `formatTodoCompletionDate(completedAt?: string): string | null`; `formatTodoCompactScheduleSummary` accepts schedule fields plus completion state/time and returns an optional `{MM.DD}` completion segment.

- [ ] **Step 1: Write failing tests**

  Add coverage for:
  - `formatTodoCompletionDate('2026-05-09T23:30:00.000Z')` using the local date conversion path and returning the matching `MM.DD` text.
  - missing and invalid completion times returning `null`.
  - completed todo summary returning `(05.06)[05.09]{05.10}`.
  - incomplete todo with a stale `completedAt` omitting `{05.10}`.

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `npx vitest run src/utils/todoListDisplayUtils.test.ts`

  Expected: FAIL because the completion formatter and summary behavior do not exist yet.

- [ ] **Step 3: Implement the shared formatter**

  In `src/utils/todoListDisplayUtils.ts`, extend the display input type with `isCompleted` and `completedAt`, add `formatTodoCompletionDate` with invalid-date protection, and append `{${completionDate}}` only when the todo is completed and the parsed date is valid. Keep the existing schedule and deadline segments unchanged and in their current order.

- [ ] **Step 4: Run the focused test to verify it passes**

  Run: `npx vitest run src/utils/todoListDisplayUtils.test.ts`

  Expected: PASS for all existing and new display utility tests.

- [ ] **Step 5: Commit the shared formatting change**

  ```bash
  git add docs/superpowers/plans/2026-10-01-todo-completion-date-display.md src/utils/todoListDisplayUtils.ts src/utils/todoListDisplayUtils.test.ts
  git commit -m "支持待办完成日期格式化"
  ```

### Task 2: Render completion dates in todo rows

**Files:**
- Modify: `src/views/TodoView.tsx`

**Interfaces:**
- Consumes: `formatTodoCompletionDate` and the extended `formatTodoCompactScheduleSummary` from Task 1.
- Produces: compact `{MM.DD}` completion text and loose-mode `CheckCircle2 + MM.DD` metadata in `SwipeableTodoItem`.

- [ ] **Step 1: Add compact-mode integration**

  Import `formatTodoCompletionDate`, compute a completion label only for completed todos, and pass the todo into the extended compact summary. Keep the existing `showScheduleTime` guard so the new segment follows the current compact metadata toggle.

- [ ] **Step 2: Add loose-mode integration**

  Include the completion label in `hasLooseDateMarkers` and render it after the deadline row with a small `CheckCircle2` icon, using the same typography and accent treatment as the existing schedule rows. This must make a completed todo with only `completedAt` render the right-side metadata column.

- [ ] **Step 3: Run focused regression checks**

  Run: `npx vitest run src/utils/todoListDisplayUtils.test.ts`

  Expected: PASS, confirming the view consumes the shared summary contract without regressing date formatting.

- [ ] **Step 4: Build the application**

  Run: `npm run build`

  Expected: PASS with no TypeScript or Vite errors.

- [ ] **Step 5: Perform manual smoke checks**

  In the todo page, inspect both modes for: a completed todo with all three dates, a completed todo with only `completedAt`, an incomplete todo with no completion date, and a compact view with “排期时间” disabled. Confirm the completion date appears only in the intended cases and no existing schedule/deadline marker changes.

- [ ] **Step 6: Review and commit the row rendering change**

  Inspect `git diff` and `git status --short`; stage only `src/views/TodoView.tsx`, then commit:

  ```bash
  git add src/views/TodoView.tsx
  git commit -m "显示待办完成日期"
  ```

## Self-review

- Spec coverage: compact output, loose icon/date output, completed-only condition, existing toggle behavior, invalid-date handling, tests, and build verification are covered by Tasks 1–2.
- Type consistency: Task 1 defines the exact formatter and summary input contract consumed by Task 2.
- Scope: no data model, persistence, settings schema, or unrelated view changes are required.
