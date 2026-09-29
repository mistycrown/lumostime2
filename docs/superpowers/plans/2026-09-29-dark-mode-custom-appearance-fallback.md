# 深色模式自定义外观回退 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在有效深色模式下暂时停用五类自定义外观，并在浅色模式下无损恢复其既有配置。

**Architecture:** `applyThemeMode` 将有效明暗模式同步到根节点的运行时属性。一个轻量 Hook 订阅该属性，让整体背景、卡片、两代导航、Memoir 日历和透明标题栏在不改写 LocalStorage 的前提下决定是否读取并渲染自定义资源。

**Tech Stack:** React 19、TypeScript、Vitest、DOM MutationObserver。
**Spec:** `docs/plans/2026-09-29-dark-mode-custom-appearance-fallback-design.md`

## Global Constraints

- 所有文件使用 UTF-8、2 空格缩进、单引号与分号，并更新修改文件的头部 `@updated` 注释。
- 仅屏蔽整体背景、卡片背景、新旧导航背景、Memoir 日历背景与透明标题栏；图标主题、颜色方案和字体保持不变。
- 深色时不得清空或改写用户保存的主题资源和配置；浅色时必须恢复。
- `system` 模式必须随系统偏好变化即时生效。

## Review Focus

- `system` 从浅色切到深色时，根节点属性及所有已挂载模块应即时回退；测试归属 Task 1 与 Task 2。
- 从深色回浅色时，背景 URL 与配置不应丢失；测试归属 Task 2。
- 没有自定义背景配置时，明暗切换不应新增持久化键或异常；测试归属 Task 1。
- 旧导航装饰与新版导航背景必须同时停用；测试归属 Task 3。
- 透明导航已启用但整体背景不存在时，标题栏仍必须使用默认深色表面；测试归属 Task 4。

---

### Task 1: 有效外观状态

**Files:**
- Create: `src/hooks/useCustomAppearanceEnabled.ts`
- Create: `src/utils/displayMode.test.ts`
- Modify: `src/utils/displayMode.ts`

**Interfaces:**
- Consumes: `applyThemeMode(root, mode, systemPrefersDark): ResolvedThemeMode`。
- Produces: `CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE` 与 `useCustomAppearanceEnabled(): boolean`，供视觉模块读取。

- [ ] **Step 1: Write the failing display-mode tests**

```ts
expect(applyThemeMode(root, 'dark', false)).toBe('dark');
expect(root.getAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('false');
expect(applyThemeMode(root, 'system', false)).toBe('light');
expect(root.getAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('true');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/utils/displayMode.test.ts`
Expected: FAIL because the custom-appearance attribute contract does not exist.

- [ ] **Step 3: Add the root-attribute contract and subscription Hook**

Implement `useCustomAppearanceEnabled(): boolean` in `src/hooks/useCustomAppearanceEnabled.ts`. It reads the root attribute initially and uses `MutationObserver` to react only to `CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE` changes. Update `applyThemeMode` to set `data-theme-mode` and the custom-appearance attribute in one operation; resolved dark sets it to `'false'`, resolved light to `'true'`.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npx vitest run src/utils/displayMode.test.ts`
Expected: PASS.

### Task 2: 整体和卡片背景回退

**Files:**
- Modify: `src/hooks/useBackgroundDisplay.ts`
- Modify: `src/hooks/useCardBackground.ts`
- Test: `src/utils/displayMode.test.ts`

**Interfaces:**
- Consumes: `useCustomAppearanceEnabled(): boolean` from Task 1.
- Produces: `useBackgroundDisplay()` and `useCardBackground()` return inactive/empty custom background state while custom appearance is disabled.

- [ ] **Step 1: Extend the failing display-mode regression test with stored configuration preservation**

```ts
const stored = new Map([['lumostime_theme_mode', 'system']]);
applyThemeMode(root, 'system', true);
expect(stored.get('background_selection')).toBeDefined();
applyThemeMode(root, 'system', false);
expect(stored.get('background_selection')).toBeDefined();
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/utils/displayMode.test.ts`
Expected: FAIL because active display hooks do not yet respect the runtime appearance state.

- [ ] **Step 3: Gate custom main and card backgrounds through the shared Hook**

Update `useBackgroundDisplay` to report no custom background and default overlay values while disabled, without altering its background-service snapshot. Update `useCardBackground` to treat the shared enabled state as a load dependency and return empty style/inactive state while disabled, reloading the saved selection when re-enabled.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npx vitest run src/utils/displayMode.test.ts`
Expected: PASS; persisted selections remain unchanged through both mode transitions.

### Task 3: 新旧导航背景回退

**Files:**
- Modify: `src/components/BottomNavigation.tsx`
- Test: `src/utils/displayMode.test.ts`

**Interfaces:**
- Consumes: `useCustomAppearanceEnabled(): boolean` from Task 1.
- Produces: `BottomNavigation` uses existing default nav classes and skips both decoration/image layers when disabled.

- [ ] **Step 1: Add regression assertions for the dark-mode appearance flag**

```ts
applyThemeMode(root, 'dark', false);
expect(root.getAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('false');
applyThemeMode(root, 'light', true);
expect(root.getAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('true');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/utils/displayMode.test.ts`
Expected: FAIL until Task 1 exposes the required contract (or PASS when executed after Task 1).

- [ ] **Step 3: Apply the enabled state to both navigation rendering branches**

Keep service state intact, but derive old-decoration visibility, new-navigation style, new-background image rendering, and related debug controls from `customAppearanceEnabled`. Disabled mode must select the existing default navigation surface.

- [ ] **Step 4: Run the focused test and production build**

Run: `npx vitest run src/utils/displayMode.test.ts && npm run build`
Expected: PASS and a successful Vite production build.

### Task 4: Memoir 日历和透明标题栏回退

**Files:**
- Modify: `src/components/MoodCalendar.tsx`
- Modify: `src/components/MainLayout.tsx`
- Modify: `src/views/JournalView.tsx`
- Test: `src/utils/displayMode.test.ts`

**Interfaces:**
- Consumes: `useCustomAppearanceEnabled(): boolean` from Task 1; main-background state from Task 2.
- Produces: Memoir calendar omits its saved image and reports no calendar background; title bars ignore the persisted transparency preference while disabled.

- [ ] **Step 1: Add a regression case covering system-mode reversal**

```ts
applyThemeMode(root, 'system', true);
expect(root.getAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('false');
applyThemeMode(root, 'system', false);
expect(root.getAttribute(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('true');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/utils/displayMode.test.ts`
Expected: FAIL until the root appearance contract is implemented (or PASS when executed after Task 1).

- [ ] **Step 3: Gate Memoir and transparent-title rendering**

Use `customAppearanceEnabled` in `MoodCalendar` before resolving its selected background and invoking `onCalendarBackgroundChange`. In `MainLayout` and `JournalView`, require it for transparent navigation/title-bar decisions and Memoir quick-action image styling, leaving the persisted toggle untouched.

- [ ] **Step 4: Run final verification and commit the completed code change**

Run: `npx vitest run src/utils/displayMode.test.ts && npm run build && git status --short`
Expected: focused tests and build pass; stage only the Task 1–4 code/tests plus the two plan/design documents if they are included with this completed change, then commit with a focused Chinese subject.
