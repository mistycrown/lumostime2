# Memoir 快捷按钮纹理透明度 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让有日历背景图时的 Memoir 日期快捷按钮更透出图片纹理。

**Architecture:** 保持 `MoodCalendar` 到 `JournalView` 的既有背景状态传递。仅在 `JournalView` 的内联纹理遮罩和快捷按钮组容器类上调整不透明度；没有背景图时沿用原纯色回退。

**Tech Stack:** React、TypeScript、Tailwind CSS、Vite。

**Spec:** `docs/plans/2026-09-28-memoir-calendar-quick-actions-design.md`

## Global Constraints

- 源文件使用 UTF-8、2 空格缩进、单引号与分号。
- 不改变无日历背景图时的原有纯色外观。
- 只调整本功能涉及的文件，保留工作区其他未提交改动。

## Review Focus

- 有背景图时，容器白底为约 8%，不会遮蔽主体纹理。
- 有背景图时，按钮白色遮罩为约 25%，文本仍有足够对比度。
- 未设置背景图时，`memoirQuickActionStyle` 仍为 `undefined` 并沿用原 class。
- 透明度变化不影响四个快捷按钮的原有点击处理。
- Vite 生产构建可通过。

---

### Task 1: 调整 Memoir 快捷按钮的白色覆盖层

**Files:**

- Modify: `src/views/JournalView.tsx:720-730`
- Modify: `src/views/JournalView.tsx:801-806`

**Interfaces:**

- Consumes: `memoirCalendarBackground: { url: string; opacity: number } | null`
- Produces: 相同的 `memoirQuickActionStyle` 与按钮事件接口，使用更低白色覆盖层。

- [ ] **Step 1: 将纹理遮罩的不透明度设为约 25%**

在 `memoirQuickActionStyle.backgroundImage` 使用固定 `rgba(255, 255, 255, 0.25)` 渐变，同时保留背景图片、居中位置和 `260%` 放大比例。

- [ ] **Step 2: 将有背景时的按钮组容器底色设为约 8%**

把 `memoirCalendarBackground` 分支中的 `bg-white/20` 改为 `bg-white/10` 以下的 Tailwind 透明度值；保留边框、阴影和无背景分支。

- [ ] **Step 3: 验证类型与生产构建**

Run: `npm run build`

Expected: 命令以 0 退出，允许项目既有的 chunk-size 提示。

- [ ] **Step 4: 提交**

```bash
git add src/views/JournalView.tsx
git commit -m "减弱Memoir快捷按钮白色遮罩"
```
