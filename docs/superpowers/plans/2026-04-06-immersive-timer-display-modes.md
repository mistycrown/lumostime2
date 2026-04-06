# Immersive Timer Display Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add immersive timer display-source and display-format switching while keeping digits large in landscape and supporting three-digit minute layouts.

**Architecture:** Extract time-display logic into a small pure utility so source/format combinations can be tested without rendering. Keep `ImmersiveTimer` responsible for interaction and layout, and update shared config constants to tighten landscape separators and support adaptive digit-slot widths.

**Tech Stack:** React, TypeScript, Vitest, Lucide React

---

### Task 1: Extract display-mode logic

**Files:**
- Create: `src/utils/immersiveTimeDisplay.ts`
- Create: `src/utils/immersiveTimeDisplay.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('formats elapsed minutes-seconds using cumulative minutes', () => {
  expect(
    buildImmersiveDisplayParts({
      source: 'elapsed',
      format: 'minutesSeconds',
      elapsedSeconds: 4285,
      now: new Date('2026-04-06T13:30:18'),
    })
  ).toEqual([
    { kind: 'value', value: '71', label: '分钟' },
    { kind: 'separator', value: ':' },
    { kind: 'value', value: '25', label: '秒' },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/immersiveTimeDisplay.test.ts`
Expected: FAIL because `buildImmersiveDisplayParts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildImmersiveDisplayParts(input: BuildImmersiveDisplayPartsInput): ImmersiveDisplayPart[] {
  const elapsedMinutes = Math.floor(input.elapsedSeconds / 60);
  const elapsedSeconds = input.elapsedSeconds % 60;

  if (input.source === 'elapsed' && input.format === 'minutesSeconds') {
    return [
      { kind: 'value', value: String(elapsedMinutes), label: '分钟' },
      { kind: 'separator', value: ':' },
      { kind: 'value', value: String(elapsedSeconds).padStart(2, '0'), label: '秒' },
    ];
  }

  return [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/immersiveTimeDisplay.test.ts`
Expected: PASS for the first scenario.

- [ ] **Step 5: Commit**

```bash
git add src/utils/immersiveTimeDisplay.ts src/utils/immersiveTimeDisplay.test.ts
git commit -m "提取沉浸式时间显示逻辑"
```

### Task 2: Lock config for new controls and tighter separator spacing

**Files:**
- Modify: `src/components/immersiveTimerConfig.ts`
- Modify: `src/components/immersiveTimerConfig.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('includes display controls and tighter landscape separator width', () => {
  expect(IMMERSIVE_TIMER_CONTROL_IDS).toEqual(['back', 'submit', 'format', 'source', 'noise']);
  expect(IMMERSIVE_TIMER_SEPARATOR_SLOT_WIDTH).toBe('0.32ch');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/immersiveTimerConfig.test.ts`
Expected: FAIL because the control list and separator width still match the old values.

- [ ] **Step 3: Write minimal implementation**

```ts
export const IMMERSIVE_TIMER_CONTROL_IDS = ['back', 'submit', 'format', 'source', 'noise'] as const;
export const IMMERSIVE_TIMER_SEPARATOR_SLOT_WIDTH = '0.32ch';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/immersiveTimerConfig.test.ts`
Expected: PASS with the new control contract.

- [ ] **Step 5: Commit**

```bash
git add src/components/immersiveTimerConfig.ts src/components/immersiveTimerConfig.test.ts
git commit -m "更新沉浸式计时显示配置"
```

### Task 3: Wire the controls and adaptive slots into the component

**Files:**
- Modify: `src/components/ImmersiveTimer.tsx`

- [ ] **Step 1: Write the failing test**

```ts
test('renders current-time and format toggle controls', () => {
  render(<ImmersiveTimer elapsed={65} onExit={() => {}} onSubmit={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '显示内容' }));
  expect(screen.getByTitle('切换为当前时间')).toBeInTheDocument();
  expect(screen.getByTitle('切换显示格式')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run <immersive-timer-test-file>`
Expected: FAIL because the current component does not render the new controls.

- [ ] **Step 3: Write minimal implementation**

```tsx
const [displaySource, setDisplaySource] = useState<ImmersiveDisplaySource>('elapsed');
const [displayFormat, setDisplayFormat] = useState<ImmersiveDisplayFormat>('hoursMinutesSeconds');
const parts = buildImmersiveDisplayParts({ source: displaySource, format: displayFormat, elapsedSeconds: elapsed, now: new Date() });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run <immersive-timer-test-file>`
Expected: PASS and the new controls appear with the updated rendering path.

- [ ] **Step 5: Commit**

```bash
git add src/components/ImmersiveTimer.tsx
git commit -m "新增沉浸式显示来源与格式切换"
```

### Task 4: Verify behavior

**Files:**
- Verify: `src/utils/immersiveTimeDisplay.ts`
- Verify: `src/components/immersiveTimerConfig.ts`
- Verify: `src/components/ImmersiveTimer.tsx`

- [ ] **Step 1: Run targeted tests**

```bash
npx vitest run src/utils/immersiveTimeDisplay.test.ts src/components/immersiveTimerConfig.test.ts
```

- [ ] **Step 2: Run production build**

```bash
npm run build
```

- [ ] **Step 3: Inspect the final diff**

```bash
git diff -- src/utils/immersiveTimeDisplay.ts src/utils/immersiveTimeDisplay.test.ts src/components/immersiveTimerConfig.ts src/components/immersiveTimerConfig.test.ts src/components/ImmersiveTimer.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/immersiveTimeDisplay.ts src/utils/immersiveTimeDisplay.test.ts src/components/immersiveTimerConfig.ts src/components/immersiveTimerConfig.test.ts src/components/ImmersiveTimer.tsx
git commit -m "完成沉浸式计时显示模式切换"
```
