# Memoir 日历背景透明度语义统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Memoir 日历背景与卡片背景一样，通过白色蒙版控制图片明显程度，而不是直接改变图片透明度。

**Architecture:** 保留现有背景图片元素与设置数据流，增加一个纯函数把图片透明度映射为白色蒙版透明度。日历渲染时图片保持完整不透明，并在其上方叠加覆盖容器的白色蒙版。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest
**Spec:** `docs/plans/2026-09-30-memoir-calendar-opacity-semantics-design.md`

## Global Constraints

- 所有修改文件使用 UTF-8 编码。
- 不修改卡片背景服务、Memoir 背景持久化键或主题包配置格式。
- 未选择 Memoir 背景时保留现有纯色外观。
- 图片裁切、圆角、阴影和快捷按钮联动保持不变。

## Review Focus

- `0`、`0.25`、`1` 三个代表值必须与卡片背景的 `1 - opacity` 蒙版语义一致。
- 小于 `0` 或大于 `1` 的值必须限制到合法范围。
- `NaN` 和无限值必须回退到默认图片透明度 `1`。
- 白色蒙版必须位于图片之上、日历内容之下，并且不接收指针事件。
- 无背景分支不能新增白色蒙版或改变原 `bg-stone-50` 样式。

---

### Task 1: 统一 Memoir 日历背景蒙版语义

**Files:**

- Modify: `src/components/MoodCalendar.tsx`
- Create: `src/components/MoodCalendar.backgroundOpacity.test.ts`

**Interfaces:**

- Consumes: `backgroundSettings.opacity?: number` 与现有 `selectedBackgroundUrl`。
- Produces: `getMemoirCalendarMaskOpacity(opacity: number | undefined): number`，以及图片上方的白色蒙版层。

- [ ] **Step 1: 写失败测试**

  测试 `getMemoirCalendarMaskOpacity`：`0 -> 1`、`0.25 -> 0.75`、`1 -> 0`、越界值被限制、`undefined/NaN/Infinity -> 0`。

- [ ] **Step 2: 运行测试确认失败**

  Run: `npx vitest run src/components/MoodCalendar.backgroundOpacity.test.ts`

  Expected: FAIL，因为映射函数尚不存在。

- [ ] **Step 3: 实现蒙版映射与渲染**

  在 `MoodCalendar.tsx` 导出 `getMemoirCalendarMaskOpacity(opacity: number | undefined): number`。移除图片元素上的直接 `opacity`，图片保持完整显示；紧随图片增加绝对定位、白色背景、`pointer-events-none` 的蒙版层，使用映射后的不透明度。

- [ ] **Step 4: 运行验证**

  Run: `npx vitest run src/components/MoodCalendar.backgroundOpacity.test.ts && npm run build`

  Expected: 测试通过，生产构建成功。

- [ ] **Step 5: 检查并提交**

  仅暂存本任务的组件、测试、设计和实施计划，检查 `git diff --cached --check` 后提交：

  ```bash
  git commit -m "统一Memoir日历背景透明度语义"
  ```

## Self-Review

- 需求只涉及 Memoir 日历的渲染语义，由 Task 1 完整覆盖。
- 纯函数测试覆盖正常值、边界值、越界值及非有限值。
- 不改服务层，因此现有存储和主题包数据无需迁移。
- 计划仅新增一个小型测试文件并修改一个组件，范围与需求成比例。
