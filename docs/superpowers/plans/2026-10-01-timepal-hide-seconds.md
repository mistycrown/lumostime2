# 时间小友卡片隐藏秒数 Implementation Plan

> **For agentic workers:** Native implementation in the current session.

**Goal:** 在时间小友设置中增加“卡片显示秒”开关，允许时间线顶部卡片在 `HH:MM` 与 `HH:MM:SS` 之间切换。

**Architecture:** 沿用现有 `TIMEPAL_KEYS + storage + 自定义事件` 的局部设置同步模式。增加纯格式化 helper 供卡片调用并测试；设置页面负责持久化和广播，卡片负责读取、监听并渲染。

**Tech Stack:** React 19、TypeScript、Vitest、现有 localStorage storage wrapper。
**Spec:** `docs/plans/2026-10-01-timepal-hide-seconds-design.md`

## Global Constraints

- 使用 UTF-8 编码。
- 默认值必须保持显示秒数，以兼容已有用户。
- 不能改变计时累计和阶段判定逻辑。
- 保留工作区中与本任务无关的现有修改，不纳入本次提交。

## Review Focus

- 未设置旧键时：应继续显示 `HH:MM:SS`；由 helper 默认值测试覆盖。
- 关闭显示秒数时：应截断显示为 `HH:MM`，而不是四舍五入或改变累计秒数；由格式化测试覆盖。
- 设置切换后：卡片应立即刷新；由事件监听代码检查并通过构建/手动烟测验证。
- 外观恢复后：设置开关应从 storage 重新读取；由恢复处理代码检查。
- 计时进行中：仍保持现有秒级刷新；由卡片状态逻辑检查并通过构建验证。

### Task 1: 增加显示格式 helper 与测试

**Files:**
- Create: `src/utils/timePalDisplay.ts`
- Test: `src/utils/timePalDisplay.test.ts`

**Interfaces:**
- Produces `formatTimePalDuration(seconds: number, showSeconds: boolean): string`。

- [ ] **Step 1: Write the failing test**

  为 `formatTimePalDuration` 添加三组断言：`3661, true` 为 `01:01:01`；`3661, false` 为 `01:01`；`59, false` 为 `00:00`。

- [ ] **Step 2: Run the focused test and verify it fails**

  Run: `npx vitest run src/utils/timePalDisplay.test.ts`
  Expected: FAIL because the helper does not exist。

- [ ] **Step 3: Implement the helper**

  在 `src/utils/timePalDisplay.ts` 中按现有 `TimePalCard` 的补零规则格式化小时和分钟；只有 `showSeconds` 为 `true` 时追加秒数。

- [ ] **Step 4: Run the focused test and verify it passes**

  Run: `npx vitest run src/utils/timePalDisplay.test.ts`
  Expected: PASS。

### Task 2: 接入时间小友设置和卡片

**Files:**
- Modify: `src/constants/storageKeys.ts`
- Modify: `src/components/TimePalSettings.tsx`
- Modify: `src/components/TimePalCard.tsx`

**Interfaces:**
- `TIMEPAL_KEYS.SHOW_SECONDS` stores `lumostime_timepal_show_seconds`。
- `timepal-show-seconds-changed` notifies the card immediately after the setting changes。

- [ ] **Step 1: Add the storage key and settings state**

  Add `SHOW_SECONDS` with default `true`; load it on initial render and in `APPEARANCE_RESTORED_EVENT` restoration. Add a concise “卡片显示秒” toggle in the existing TimePal controls and persist changes through `storage.setBoolean`.

- [ ] **Step 2: Subscribe the card to the setting**

  Read `SHOW_SECONDS` in `TimePalCard`, handle both `storage` and `timepal-show-seconds-changed`, and pass the value to `formatTimePalDuration` without changing `totalFocusSeconds` or the one-second active-session interval.

- [ ] **Step 3: Run focused tests and production build**

  Run: `npx vitest run src/utils/timePalDisplay.test.ts` and `npm run build`
  Expected: the helper test passes and Vite completes successfully。

- [ ] **Step 4: Inspect the diff and commit only task files**

  Run `git status --short` and `git diff --check`; stage only the design/plan files and the five feature/test files, leaving the three pre-existing detail-view changes unstaged. Commit with `feat: 支持时间小友卡片隐藏秒数`。
