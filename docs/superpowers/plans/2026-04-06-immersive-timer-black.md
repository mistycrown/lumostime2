# Immersive Timer Black Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the immersive timer into a fixed black-and-white experience with only back, submit, and white-noise controls plus a visible black status bar.

**Architecture:** Keep `ImmersiveTimer` as the single fullscreen entry point, remove theme and clock-style subsystems, and simplify rendering to one black-background numeric display. Update status bar transition helpers so immersive mode shows a black status bar on mobile and restores the managed app status bar on exit.

**Tech Stack:** React, TypeScript, Vitest, Capacitor StatusBar, Capawesome Screen Orientation

---

### Task 1: Update immersive status bar transition rules

**Files:**
- Modify: `src/utils/statusBarTransitions.test.ts`
- Modify: `src/utils/statusBarTransitions.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('keeps the status bar visible with a black background when immersive mode starts on mobile', () => {
  expect(getImmersiveStatusBarTransition('android', 'enter')).toEqual({
    hide: false,
    show: true,
    restoreManagedStatusBar: false,
    backgroundColor: '#000000',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/statusBarTransitions.test.ts`
Expected: FAIL because the old transition returns `hide: true` and does not expose `backgroundColor`.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface ImmersiveStatusBarTransition {
  hide: boolean;
  show: boolean;
  restoreManagedStatusBar: boolean;
  backgroundColor?: string;
}

if (phase === 'enter') {
  return {
    hide: false,
    show: true,
    restoreManagedStatusBar: false,
    backgroundColor: '#000000',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/statusBarTransitions.test.ts`
Expected: PASS with the new black-background transition expectation.

- [ ] **Step 5: Commit**

```bash
git add src/utils/statusBarTransitions.ts src/utils/statusBarTransitions.test.ts
git commit -m "重做沉浸式状态栏"
```

### Task 2: Simplify immersive timer UI to one visual style

**Files:**
- Modify: `src/components/ImmersiveTimer.tsx`
- Delete: `src/components/FlipClock.tsx`
- Delete: `src/components/ImmersiveSelectorModal.tsx`
- Delete: `src/components/immersiveThemes.ts`
- Delete: `src/components/immersiveThemes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('keeps only back submit and white-noise controls in immersive mode', async () => {
  render(<ImmersiveTimer elapsed={65} onExit={() => {}} onSubmit={() => {}} />);
  fireEvent.click(screen.getByText('00:01:05'));
  expect(screen.queryByTitle('时钟样式')).not.toBeInTheDocument();
  expect(screen.queryByTitle('主题颜色')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run <new-or-existing-immersive-timer-test-file>`
Expected: FAIL because the current component still renders clock-style and theme buttons.

- [ ] **Step 3: Write minimal implementation**

```tsx
const CONTROL_SURFACE = {
  backgroundColor: 'rgba(255,255,255,0.08)',
  borderColor: 'rgba(255,255,255,0.18)',
  color: '#ffffff',
};

return (
  <div className="fixed inset-0 z-[200] bg-black text-white">
    <div ref={timerRef} style={{ fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif' }}>
      {formatTime(elapsed)}
    </div>
  </div>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run <new-or-existing-immersive-timer-test-file>`
Expected: PASS and no references to removed theme or clock-style UI remain.

- [ ] **Step 5: Commit**

```bash
git add src/components/ImmersiveTimer.tsx src/components/FlipClock.tsx src/components/ImmersiveSelectorModal.tsx src/components/immersiveThemes.ts src/components/immersiveThemes.test.ts
git commit -m "精简沉浸式计时样式"
```

### Task 3: Verify build and regression coverage

**Files:**
- Verify: `src/components/ImmersiveTimer.tsx`
- Verify: `src/utils/statusBarTransitions.ts`

- [ ] **Step 1: Run targeted tests**

```bash
npx vitest run src/utils/statusBarTransitions.test.ts
```

- [ ] **Step 2: Run production build**

```bash
npm run build
```

- [ ] **Step 3: Confirm deleted references are gone**

```bash
rg -n "FlipClock|ImmersiveSelectorModal|IMMERSIVE_THEMES|immersiveTimerTheme|immersiveTimerClockStyle" src
```

- [ ] **Step 4: Review changed files**

```bash
git diff -- src/components/ImmersiveTimer.tsx src/utils/statusBarTransitions.ts src/utils/statusBarTransitions.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ImmersiveTimer.tsx src/utils/statusBarTransitions.ts src/utils/statusBarTransitions.test.ts
git commit -m "完成沉浸式计时黑白重构"
```
