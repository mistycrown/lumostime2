# 待办日期快捷安排 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在安排日期或截止日期选中后，为当前待办快捷添加计划块、提醒或两者。

**Architecture:** 保持日期字段的即时保存行为。在 `TodoDetailModal` 内增加选日期后的轻量操作面板，计划块使用独立的 HHMM 时间编辑弹窗，提醒继续复用 `TodoReminderModal`；创建计划记录复用现有计划块构造函数和日志保存回调。

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, date-fns.
**Spec:** `docs/superpowers/specs/2026-10-26-todo-date-quick-actions-design.md`

## Global Constraints

- 所有代码和文档使用 UTF-8。
- 日期和时间采用纯数字输入；时间使用 HHMM，不添加日期/时间选择器。
- 保持安排日期和截止日期字段相互独立。
- 复用现有提醒权限、提醒校验和系统日历同步处理。
- 不运行 Android 编译；验证使用 `npm run build`。

## Review Focus

- 选择安排日期或截止日期后，只有对应字段更新；计划块和提醒按当前待办关联。
- 清除日期、取消日期选择或编辑其他日期类型时不意外打开快捷面板。
- 时间无效或结束时间不晚于开始时间时不创建计划块。
- 提醒权限或提醒时间校验失败时保留现有提醒弹窗行为。
- 新建尚未保存的待办没有稳定 ID 时隐藏快捷添加操作。

---

### Task 1: 日期选择后的快捷操作与计划块创建

**Files:**
- Create: `src/components/TodoDateQuickActionsModal.tsx`
- Create: `src/components/TodoPlanBlockQuickAddModal.tsx`
- Modify: `src/components/TodoDetailModal.tsx`
- Modify: `src/components/README.md`

**Interfaces:**
- Consumes: existing `onLogUpdate(log: Log)` callback, `buildTimelinePlannedLog(todo, startTime, endTime)`, `TodoReminderModal`.
- Produces: selected-date quick-action state for `scheduledDate` and `deadlineDate`; a plan-time editor that creates and saves a planned log for the existing todo.

- [x] **Step 1: Create the follow-up action panel**
  Add plan/reminder actions and a finish action to `TodoDateQuickActionsModal`.
- [x] **Step 2: Create the plan-time editor**
  Add four-digit numeric inputs, HHMM range validation, local-date timestamp creation, and planned-log save/close behavior to `TodoPlanBlockQuickAddModal`.
- [x] **Step 3: Wire date selection and current todo state**
  Extend `TodoDetailModal` to remember selected arrange/deadline field and date, show actions only for persisted incomplete todos, create the block with `buildTimelinePlannedLog`, and pass the correct date and reminder field into the existing reminder editor.
- [x] **Step 4: Update component docs**
  Update `TodoDetailModal` header and `src/components/README.md` with the new flow.
- [x] **Step 5: Build and inspect the feature diff**
  Run: `npm run build` and `git diff --check`.
  Expected: production build succeeds and the diff has no whitespace errors.
- [ ] **Step 6: Perform the UI smoke check**
  Open a saved todo, select an arrange date and a deadline date in turn, verify both quick actions, create a same-day plan block, and save a reminder through the existing reminder editor.

  Status: blocked in this session because the Windows Computer Use native pipe failed on repeated initialization and recovery. No UI interaction was performed.

