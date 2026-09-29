# 待办卡背景主题色强化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 自定义卡片背景实际生效时，让松散待办卡右侧日期和开始按钮使用当前主题色，提升可读性。

**Architecture:** 在 `TodoView.tsx` 导出一个仅根据背景启用状态返回内联颜色样式的纯辅助函数。`SwipeableTodoItem` 将该结果复用于右侧日期容器和开始按钮，因此图标会继承主题色，而未启用背景的卡片保持原有 Tailwind 灰色样式。

**Tech Stack:** React 18、TypeScript、Tailwind CSS、Vitest。
**Spec:** `docs/plans/2026-09-29-todo-card-background-accent-design.md`

## Global Constraints

- 仅当 `cardBackground.active` 为真时使用 `var(--accent-color)`。
- 默认状态保持现有灰色；开始按钮保留悬停时的橙色反馈。
- 所有源文件均使用 UTF-8、2 空格缩进、单引号与分号。

## Review Focus

- 背景未启用或图片加载失败时，辅助函数必须不产生内联颜色，避免覆盖既有灰色。
- 背景启用时，日期文字、日期图标与开始按钮都须继承同一主题色。
- 紧凑待办卡不使用卡片背景，不能意外改变其颜色。
- 开始按钮的 `hover:text-orange-500` 交互必须保留。

---

### Task 1: 待办背景状态的右侧辅助信息颜色

**Files:**
- Modify: `src/views/TodoView.tsx:80-150,584-614`
- Create: `src/views/TodoView.cardBackground.test.ts`

**Interfaces:**
- Consumes: `cardBackground.active: boolean` from `useCardBackground`.
- Produces: `getTodoCardBackgroundAccentStyle(hasCardBackground: boolean): React.CSSProperties | undefined`.

- [ ] **Step 1: Write the failing test**

```tsx
import { getTodoCardBackgroundAccentStyle } from './TodoView';

test('returns the accent color only for an active card background', () => {
  expect(getTodoCardBackgroundAccentStyle(false)).toBeUndefined();
  expect(getTodoCardBackgroundAccentStyle(true)).toEqual({ color: 'var(--accent-color)' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm exec vitest run src/views/TodoView.cardBackground.test.ts`
Expected: FAIL because `getTodoCardBackgroundAccentStyle` is not exported.

- [ ] **Step 3: Implement `getTodoCardBackgroundAccentStyle(hasCardBackground: boolean): React.CSSProperties | undefined` in `src/views/TodoView.tsx`**

Return `{ color: 'var(--accent-color)' }` only for `true`. Apply the returned style to the loose-card date marker wrapper and the start-focus button; leave their existing class names, including the hover class, unchanged.

- [ ] **Step 4: Run tests to verify the implementation**

Run: `npm exec vitest run src/views/TodoView.cardBackground.test.ts src/services/cardBackgroundService.test.ts`
Expected: PASS.

- [ ] **Step 5: Run production build**

Run: `npm run build`
Expected: production build completes successfully.

- [ ] **Step 6: Commit**

```bash
git add src/views/TodoView.tsx src/views/TodoView.cardBackground.test.ts
git commit -m "优化待办背景卡片辅助信息颜色"
```
