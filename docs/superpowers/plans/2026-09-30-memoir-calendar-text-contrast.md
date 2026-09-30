# Memoir 日历文字对比度 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加深 Memoir 主日历的星期字母和普通日期数字，并保留星期、日期、今天三层视觉层级。

**Architecture:** 沿用 `MoodCalendar.tsx` 当前的 Tailwind `stone` 色阶，只替换星期和普通日期的颜色类名。通过现有静态渲染测试锁定三个语义类名，避免影响其他日历或交互逻辑。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest
**Spec:** `docs/plans/2026-09-30-memoir-calendar-text-contrast-design.md`

## Global Constraints

- 所有修改文件使用 UTF-8 编码。
- 仅修改 Memoir 主日历 `src/components/MoodCalendar.tsx` 的星期字母和日期数字颜色。
- 星期使用 `text-stone-600`，普通日期使用 `text-stone-500`，今天继续使用 `text-stone-900`。
- 不修改桌面小组件、统计页面或其他日历视图。
- 不改变日期计算、点击交互、背景图和主题数据流。

## Review Focus

- 星期类名必须为 `text-stone-600`，以保证其比普通日期更深；由 Task 1 的渲染断言覆盖。
- 普通日期类名必须为 `text-stone-500`，以保证其比原来的 `text-stone-400` 更深但仍浅于星期；由 Task 1 的渲染断言覆盖。
- 今天的日期必须继续包含 `text-stone-900`；由 Task 1 的渲染断言覆盖。
- 带自定义背景时文字层级和背景遮罩行为不变；由现有背景渲染测试和构建覆盖。

### Task 1: 调整 Memoir 日历文字颜色

**Files:**
- Modify: `src/components/MoodCalendar.tsx:203,245` — 调整星期和普通日期的 Tailwind 颜色类，并更新文件头修改记录。
- Modify: `src/components/MoodCalendar.backgroundOpacity.test.ts` — 增加星期、普通日期和今天类名的静态渲染断言，并更新测试文件头修改记录。

**Interfaces:**
- Consumes: 现有 `MoodCalendar` 组件渲染结构。
- Produces: 星期 `text-stone-600`、普通日期 `text-stone-500`、今天 `text-stone-900` 的稳定类名契约。

- [ ] **Step 1: Write the failing test**

  在现有静态渲染测试中渲染 2026 年 9 月的无心情日历，断言输出包含：

  - `memoir-calendar-weekday text-center text-sm text-stone-600 font-light`
  - `memoir-calendar-day text-stone-500`
  - `memoir-calendar-today text-stone-900 font-bold`

- [ ] **Step 2: Run test to verify it fails**

  Run: `npx vitest run src/components/MoodCalendar.backgroundOpacity.test.ts`

  Expected: FAIL because the component currently renders `text-stone-400` for weekdays and ordinary dates.

- [ ] **Step 3: Implement the minimal class changes**

  In `src/components/MoodCalendar.tsx`, update only the weekday class to `text-stone-600` and the non-today date class to `text-stone-500`; leave the today branch as `text-stone-900 font-bold`. Add a dated `@updated` entry to the existing file header.

- [ ] **Step 4: Run focused test and production build**

  Run: `npx vitest run src/components/MoodCalendar.backgroundOpacity.test.ts`

  Expected: PASS.

  Run: `npm run build`

  Expected: production build succeeds.

- [ ] **Step 5: Review diff and commit the implementation**

  Run: `git diff --check` and `git status --short`, then stage only `src/components/MoodCalendar.tsx` and `src/components/MoodCalendar.backgroundOpacity.test.ts`.

  Commit with:

  ```bash
  git commit -m "加深Memoir日历文字颜色"
  ```
