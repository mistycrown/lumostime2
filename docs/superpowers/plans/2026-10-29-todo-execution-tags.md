# 待办执行标签 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为待办增加可选的执行标签（精力、场景、时段和自定义），并在任务详情/创建编辑流程中提供轻量标签选择器。

**Architecture:** 保留现有 `linkedActivityId` 活动标签语义，在 `TodoItem` 上新增可选的结构化 `executionTags` 数组。新增纯数据预置/规范化工具和可复用的 `TodoExecutionTagPicker`，由 `TodoDetailModal` 在编辑草稿上直接使用；复制任务保留标签，子任务不继承。

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest.
**Spec:** `docs/plans/2026-10-29-todo-execution-tags-design.md`

## Global Constraints

- 所有代码和文档使用 UTF-8 编码。
- 遵循现有 TypeScript 风格：2 空格、单引号、分号。
- 执行标签必须与 `linkedActivityId` 分离，不能改变现有活动标签统计和日志关联。
- 不增加必填字段；旧待办缺少执行标签时保持正常显示和保存。
- 不运行 Android 编译；至少运行相关 Vitest 测试和 `npm run build`。

## Review Focus

- 低/中/高精力标签只能同时存在一个；场景、时段和自定义标签可以多选。
- 重复添加同一预置或自定义标签不会产生重复项，删除最后一个标签后字段可恢复为空。
- 自定义标签首尾空格会被清理，空字符串和超过合理长度的输入不会被保存。
- 复制待办保留执行标签，创建子任务不意外继承父任务标签。
- 旧数据、缺失字段和未知标签分组不会让任务详情渲染或保存崩溃。

---

### Task 1: 执行标签数据模型与纯函数

**Files:**
- Modify: `src/types.ts`
- Create: `src/utils/todoExecutionTags.ts`
- Test: `src/utils/todoExecutionTags.test.ts`

**Interfaces:**
- Produces `TodoExecutionTag`, `TodoExecutionTagGroup`, `TODO_EXECUTION_TAG_PRESETS`, `normalizeTodoExecutionTags`, `toggleTodoExecutionTag` and `createCustomTodoExecutionTag` for UI and persistence code.

- [x] **Step 1: Write failing tests** for preset grouping, energy single-select replacement, multi-select toggling, custom-name trimming/deduplication, and malformed legacy values.
- [x] **Step 2: Run the focused test** with `npx vitest run src/utils/todoExecutionTags.test.ts`; verify it fails because the model/helpers are missing.
- [x] **Step 3: Implement the type and helpers** with stable IDs (`energy:low|medium|high`, `scene:*`, `time:*`), optional `TodoItem.executionTags`, and defensive normalization that returns a de-duplicated array.
- [x] **Step 4: Run the focused test** and verify all assertions pass.

### Task 2: Reusable execution-tag picker

**Files:**
- Create: `src/components/TodoExecutionTagPicker.tsx`
- Create: `src/components/TodoExecutionTagPicker.test.tsx`
- Modify: `vitest.todo.config.ts`

**Interfaces:**
- Consumes `executionTags?: TodoExecutionTag[]` and `onChange(nextTags: TodoExecutionTag[])`.
- Produces a compact chip row, grouped preset popover, custom-tag input, and accessible remove controls.

- [x] **Step 1: Write component coverage** for rendering the add entry and existing chips.
- [x] **Step 2: Run the focused component test** and verify it fails before the component exists.
- [x] **Step 3: Implement the picker** using the helper functions; use concise labels, no explanatory microcopy, immediate `onChange`, and keep the popover usable on narrow screens.
- [x] **Step 4: Run the focused component test** and verify it passes.

### Task 3: Wire tags into todo creation, editing, and duplication

**Files:**
- Modify: `src/components/TodoDetailModal.tsx`
- Modify: `src/views/TodoView.tsx`
- Modify: `src/components/TodoDuplicateModal.tsx` (only if its duplicate payload explicitly selects fields)
- Test: `src/components/TodoDetailModal.test.tsx` and/or an existing todo harness

**Interfaces:**
- Consumes the picker from Task 2 and the optional `TodoItem.executionTags` field from Task 1.
- Produces persisted execution tags for new and edited todos, copies tags during duplication, and leaves child-task creation without inherited tags.

- [x] **Step 1: Add integration assertions** for duplicate preservation/clearing and detail rendering.
- [x] **Step 2: Run the focused todo tests** and verify the new assertions pass.
- [x] **Step 3: Add the picker to the basic-information section**, initialize it from the live todo/draft, include normalized tags in save comparisons and payloads, preserve tags when duplicating, and explicitly omit them from child-task drafts.
- [x] **Step 4: Run the focused todo tests** and verify they pass.

### Task 4: Expose execution tags to AI context and update docs

**Files:**
- Modify: `src/components/ai-chat/useAIBackfillChatContextData.ts`
- Modify: `src/components/README.md`
- Modify: `src/views/README.md` if the view-level change log documents `TodoDetailModal`

**Interfaces:**
- Consumes persisted `TodoItem.executionTags`.
- Produces stable AI context fields containing execution-tag names and groups without changing existing activity-tag fields.

- [x] **Step 1: Add a focused context assertion** that a todo with execution tags exposes them while a legacy todo exposes an empty list.
- [x] **Step 2: Implement the context mapping** with normalized, JSON-safe execution-tag objects.
- [x] **Step 3: Update the affected header/change-log documentation** with the new field and picker behavior.
- [x] **Step 4: Run the focused tests and `npm run build`**; verify the production build succeeds.

### Task 5: Review and commit the completed feature

**Files:**
- Review only files changed by Tasks 1-4.

- [x] **Step 1: Run `git diff --check` and the relevant Vitest files.**
- [x] **Step 2: Inspect `git status` and the full diff**, keeping unrelated pre-existing changes unstaged.
- [ ] **Step 3: Commit only the execution-tag feature files** with a concise subject such as `增加待办执行标签`.
