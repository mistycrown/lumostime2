# Immersive Timer Orientation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted default immersive timer orientation preference (`横屏` / `竖屏`) plus a session-only orientation toggle inside immersive mode.

**Architecture:** Put orientation rules in a small shared utility so storage normalization, effective-orientation resolution, and session toggling stay testable outside React. Wire the persisted default into `SettingsContext` and `PreferencesSettingsView`, then make `ImmersiveTimer` consume that default while passing the resolved orientation down to `FlipClock` so digital and flip layouts stay consistent.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, localStorage-backed settings context, lucide-react icons.

---

## File Structure

- Create: `src/utils/immersiveOrientation.ts`
  Responsibility: shared `ImmersiveTimerOrientation` type plus normalize / resolve / toggle helpers.
- Create: `src/utils/immersiveOrientation.test.ts`
  Responsibility: unit coverage for invalid-storage fallback, effective orientation precedence, and toggle behavior.
- Modify: `src/contexts/SettingsContext.tsx`
  Responsibility: persist `immersiveTimerDefaultOrientation` in settings context and expose it through `useSettings()`.
- Modify: `src/views/SettingsView.tsx`
  Responsibility: pass the new setting and setter into the preferences subview.
- Modify: `src/views/settings/PreferencesSettingsView.tsx`
  Responsibility: render the new two-option segmented control in the preferences UI.
- Modify: `src/components/ImmersiveTimer.tsx`
  Responsibility: resolve default + session override, render the new session-only toggle button, and drive layout selection from effective orientation instead of device rotation.
- Modify: `src/components/FlipClock.tsx`
  Responsibility: stop self-detecting window orientation and instead render from the orientation chosen by `ImmersiveTimer`.

### Task 1: Add Shared Orientation Utility

**Files:**
- Create: `src/utils/immersiveOrientation.ts`
- Create: `src/utils/immersiveOrientation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  normalizeImmersiveTimerOrientation,
  resolveImmersiveTimerOrientation,
  toggleImmersiveTimerOrientation
} from './immersiveOrientation';

describe('immersiveOrientation', () => {
  test('falls back to landscape for invalid storage values', () => {
    expect(normalizeImmersiveTimerOrientation('landscape')).toBe('landscape');
    expect(normalizeImmersiveTimerOrientation('portrait')).toBe('portrait');
    expect(normalizeImmersiveTimerOrientation('')).toBe('landscape');
    expect(normalizeImmersiveTimerOrientation('auto')).toBe('landscape');
    expect(normalizeImmersiveTimerOrientation(null)).toBe('landscape');
  });

  test('prefers the session override when resolving the effective orientation', () => {
    expect(resolveImmersiveTimerOrientation('landscape', null)).toBe('landscape');
    expect(resolveImmersiveTimerOrientation('portrait', null)).toBe('portrait');
    expect(resolveImmersiveTimerOrientation('landscape', 'portrait')).toBe('portrait');
    expect(resolveImmersiveTimerOrientation('portrait', 'landscape')).toBe('landscape');
  });

  test('toggles between landscape and portrait', () => {
    expect(toggleImmersiveTimerOrientation('landscape')).toBe('portrait');
    expect(toggleImmersiveTimerOrientation('portrait')).toBe('landscape');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/immersiveOrientation.test.ts`

Expected: FAIL with a module resolution error because `src/utils/immersiveOrientation.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * @file immersiveOrientation.ts
 * @input Raw storage values plus default/session orientation inputs
 * @output Normalized immersive timer orientation helpers
 * @description Centralizes immersive timer orientation rules so settings and immersive UI resolve the same way.
 */
export type ImmersiveTimerOrientation = 'landscape' | 'portrait';

export function normalizeImmersiveTimerOrientation(
  value: string | null | undefined
): ImmersiveTimerOrientation {
  return value === 'portrait' ? 'portrait' : 'landscape';
}

export function resolveImmersiveTimerOrientation(
  defaultOrientation: ImmersiveTimerOrientation,
  sessionOverride: ImmersiveTimerOrientation | null
): ImmersiveTimerOrientation {
  return sessionOverride ?? defaultOrientation;
}

export function toggleImmersiveTimerOrientation(
  currentOrientation: ImmersiveTimerOrientation
): ImmersiveTimerOrientation {
  return currentOrientation === 'landscape' ? 'portrait' : 'landscape';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/immersiveOrientation.test.ts`

Expected: PASS with 3 passing tests in `src/utils/immersiveOrientation.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/immersiveOrientation.ts src/utils/immersiveOrientation.test.ts
git commit -m "增加沉浸式方向工具"
```

### Task 2: Persist the Default Orientation in Settings

**Files:**
- Modify: `src/contexts/SettingsContext.tsx`
- Modify: `src/views/SettingsView.tsx`
- Modify: `src/views/settings/PreferencesSettingsView.tsx`
- Test: `src/utils/immersiveOrientation.test.ts`

- [ ] **Step 1: Extend the shared test with a storage-normalization case that matches the settings default**

Append this test to `src/utils/immersiveOrientation.test.ts`:

```ts
test('uses landscape as the persisted default orientation', () => {
  expect(normalizeImmersiveTimerOrientation(undefined)).toBe('landscape');
});
```

- [ ] **Step 2: Run test to verify the existing helper still fails the new expectation if the default changes unexpectedly**

Run: `npx vitest run src/utils/immersiveOrientation.test.ts`

Expected: PASS right now. If this step fails, stop and fix Task 1 before touching settings wiring.

- [ ] **Step 3: Add the setting to `SettingsContext`**

In `src/contexts/SettingsContext.tsx`, add the helper import and type re-export near the top:

```ts
import {
  normalizeImmersiveTimerOrientation,
  type ImmersiveTimerOrientation
} from '../utils/immersiveOrientation';

export type { ImmersiveTimerOrientation } from '../utils/immersiveOrientation';
```

Add the new field and setter to `SettingsContextType` right after `defaultRecordView`:

```ts
    immersiveTimerDefaultOrientation: ImmersiveTimerOrientation;
    setImmersiveTimerDefaultOrientation: React.Dispatch<React.SetStateAction<ImmersiveTimerOrientation>>;
```

Add the state initializer next to the other persisted preference state:

```ts
    const [immersiveTimerDefaultOrientation, setImmersiveTimerDefaultOrientation] =
        useState<ImmersiveTimerOrientation>(() => {
            const stored = localStorage.getItem('lumostime_immersive_timer_default_orientation');
            return normalizeImmersiveTimerOrientation(stored);
        });
```

Persist it with a dedicated effect:

```ts
    useEffect(() => {
        localStorage.setItem(
            'lumostime_immersive_timer_default_orientation',
            immersiveTimerDefaultOrientation
        );
    }, [immersiveTimerDefaultOrientation]);
```

Expose it in the provider value:

```ts
            immersiveTimerDefaultOrientation,
            setImmersiveTimerDefaultOrientation,
```

- [ ] **Step 4: Pass the setting through `SettingsView`**

In `src/views/SettingsView.tsx`, extend the `useSettings()` destructure:

```ts
    const {
        autoLinkRules: ctxAutoLinkRules,
        autoApplyAutoLinkRules,
        setAutoApplyAutoLinkRules,
        autoApplyTodoLink,
        setAutoApplyTodoLink,
        autoOpenFocusDetail,
        setAutoOpenFocusDetail,
        userPersonalInfo: ctxUserPersonalInfo,
        filters: ctxFilters,
        customNarrativeTemplates: ctxCustomNarrativeTemplates,
        useTwemoji,
        setUseTwemoji,
        sceneCardTimerMode,
        setSceneCardTimerMode,
        immersiveTimerDefaultOrientation,
        setImmersiveTimerDefaultOrientation
    } = useSettings();
```

Then pass the new props into `PreferencesSettingsView`:

```tsx
                immersiveTimerDefaultOrientation={immersiveTimerDefaultOrientation}
                onSetImmersiveTimerDefaultOrientation={setImmersiveTimerDefaultOrientation}
```

- [ ] **Step 5: Render the segmented control in `PreferencesSettingsView`**

In `src/views/settings/PreferencesSettingsView.tsx`, extend the import:

```ts
import {
  DefaultArchiveView,
  DefaultIndexView,
  DefaultRecordView,
  ImmersiveTimerOrientation,
  SceneCardTimerMode,
  TimelineSortOrder
} from '../../contexts/SettingsContext';
```

Add the prop types:

```ts
    immersiveTimerDefaultOrientation?: ImmersiveTimerOrientation;
    onSetImmersiveTimerDefaultOrientation?: (orientation: ImmersiveTimerOrientation) => void;
```

Add the defaults in the component signature:

```ts
    immersiveTimerDefaultOrientation = 'landscape',
    onSetImmersiveTimerDefaultOrientation,
```

Insert this block at the top of the existing “显示” card, before `timelineGalleryMode`:

```tsx
                        <div className="flex items-center justify-between p-4 border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-stone-700">沉浸式计时默认方向</h4>
                                <p className="text-xs text-stone-400 mt-1">控制进入沉浸式计时时默认使用横屏还是竖屏布局</p>
                            </div>
                            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                                <button
                                    onClick={() => onSetImmersiveTimerDefaultOrientation?.('landscape')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                        immersiveTimerDefaultOrientation === 'landscape'
                                            ? 'bg-white text-stone-800 shadow-sm'
                                            : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                >
                                    横屏
                                </button>
                                <button
                                    onClick={() => onSetImmersiveTimerDefaultOrientation?.('portrait')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                        immersiveTimerDefaultOrientation === 'portrait'
                                            ? 'bg-white text-stone-800 shadow-sm'
                                            : 'text-stone-400 hover:text-stone-600'
                                    }`}
                                >
                                    竖屏
                                </button>
                            </div>
                        </div>
```

- [ ] **Step 6: Run the targeted test and a full type/build check**

Run: `npx vitest run src/utils/immersiveOrientation.test.ts`

Expected: PASS with 4 passing tests.

Run: `npm run build`

Expected: PASS with Vite production build output and no TypeScript errors from the new settings prop chain.

- [ ] **Step 7: Commit**

```bash
git add src/contexts/SettingsContext.tsx src/views/SettingsView.tsx src/views/settings/PreferencesSettingsView.tsx src/utils/immersiveOrientation.test.ts
git commit -m "增加沉浸式方向偏好"
```

### Task 3: Use the Effective Orientation in Immersive Mode

**Files:**
- Modify: `src/components/ImmersiveTimer.tsx`
- Modify: `src/components/FlipClock.tsx`
- Test: `src/utils/immersiveOrientation.test.ts`

- [ ] **Step 1: Add the session-toggle expectation to the utility test**

Append this test to `src/utils/immersiveOrientation.test.ts`:

```ts
test('lets the session toggle switch away from the persisted default without mutating it', () => {
  const defaultOrientation = normalizeImmersiveTimerOrientation('landscape');
  const currentOrientation = resolveImmersiveTimerOrientation(defaultOrientation, null);
  const sessionOverride = toggleImmersiveTimerOrientation(currentOrientation);

  expect(sessionOverride).toBe('portrait');
  expect(defaultOrientation).toBe('landscape');
  expect(resolveImmersiveTimerOrientation(defaultOrientation, sessionOverride)).toBe('portrait');
});
```

- [ ] **Step 2: Run test to verify the orientation contract before wiring the UI**

Run: `npx vitest run src/utils/immersiveOrientation.test.ts`

Expected: PASS with 5 passing tests. If this fails, fix the utility before editing the immersive UI.

- [ ] **Step 3: Refactor `ImmersiveTimer` to resolve layout from settings + session override**

In `src/components/ImmersiveTimer.tsx`, extend the imports:

```ts
import { X, Volume2, VolumeX, Palette, Clock, Check, RotateCw } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import {
  resolveImmersiveTimerOrientation,
  toggleImmersiveTimerOrientation
} from '../utils/immersiveOrientation';
```

Inside the component, add the settings read and replace the old `isLandscape` state:

```ts
    const { immersiveTimerDefaultOrientation } = useSettings();
    const [deviceIsLandscape, setDeviceIsLandscape] = useState(
        typeof window !== 'undefined' && window.innerWidth > window.innerHeight
    );
    const [sessionOrientationOverride, setSessionOrientationOverride] = useState<null | 'landscape' | 'portrait'>(null);

    const effectiveOrientation = resolveImmersiveTimerOrientation(
        immersiveTimerDefaultOrientation,
        sessionOrientationOverride
    );
    const isLandscapeLayout = effectiveOrientation === 'landscape';
```

Update the resize listener to maintain only `deviceIsLandscape`:

```ts
    useEffect(() => {
        const handleResize = () => {
            setDeviceIsLandscape(window.innerWidth > window.innerHeight);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);
```

Update the landscape font-size effect guard so it follows the chosen layout:

```ts
    useEffect(() => {
        if (!isLandscapeLayout || !timerRef.current || selectedClockStyle !== 'digital') {
            return;
        }
        // keep the existing adjustFontSize body
    }, [isLandscapeLayout, elapsed, selectedClockStyle, deviceIsLandscape]);
```

Pass the chosen orientation into `FlipClock` and branch the digital layout on `isLandscapeLayout`:

```tsx
                <FlipClock
                    elapsed={elapsed}
                    theme={currentTheme}
                    orientation={effectiveOrientation}
                />
```

```tsx
                    {isLandscapeLayout ? (
```

Add the session-only orientation button to the top-right control group, before the clock-style button:

```tsx
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSessionOrientationOverride((currentOverride) => {
                                const currentOrientation = resolveImmersiveTimerOrientation(
                                    immersiveTimerDefaultOrientation,
                                    currentOverride
                                );
                                return toggleImmersiveTimerOrientation(currentOrientation);
                            });
                        }}
                        title={isLandscapeLayout ? '切换为竖屏' : '切换为横屏'}
                        className="pointer-events-auto absolute right-[192px] w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
                        style={{
                            top: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
                            backgroundColor: currentTheme.buttonBg,
                            borderWidth: '1.5px',
                            borderStyle: 'solid',
                            borderColor: currentTheme.buttonBorder,
                            color: currentTheme.buttonText
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.buttonHoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = currentTheme.buttonBg}
                    >
                        <RotateCw size={24} strokeWidth={2} />
                    </button>
```

- [ ] **Step 4: Make `FlipClock` render from the passed orientation instead of reading `window`**

In `src/components/FlipClock.tsx`, import the shared type:

```ts
import type { ImmersiveTimerOrientation } from '../utils/immersiveOrientation';
```

Change the prop types:

```ts
interface FlipDigitProps {
    digit: string;
    theme: any;
    isLandscapeLayout: boolean;
}

interface FlipClockProps {
    elapsed: number;
    theme: any;
    orientation: ImmersiveTimerOrientation;
}
```

Update the component signatures:

```ts
const FlipDigit: React.FC<FlipDigitProps> = ({ digit, theme, isLandscapeLayout }) => {
```

```ts
export const FlipClock: React.FC<FlipClockProps> = ({ elapsed, theme, orientation }) => {
    const isLandscapeLayout = orientation === 'landscape';
```

Delete the internal `useState` / `useEffect` orientation listeners from both `FlipDigit` and `FlipClock`, then replace sizing and layout checks:

```ts
    const digitSize = isLandscapeLayout ? 'min(18vh, 15vw)' : 'min(18vw, 14vh)';
    const cardWidth = isLandscapeLayout ? 'min(20vh, 17vw)' : 'min(20vw, 16vh)';
    const cardHeight = isLandscapeLayout ? 'min(30vh, 25vw)' : 'min(30vw, 24vh)';
```

```ts
    const colonSize = isLandscapeLayout ? 'min(15vh, 12vw)' : 'min(14vw, 11vh)';

    if (isLandscapeLayout) {
```

Update every `FlipDigit` call to pass the boolean explicitly:

```tsx
<FlipDigit digit={hStr[0]} theme={theme} isLandscapeLayout={isLandscapeLayout} />
```

- [ ] **Step 5: Run tests and build**

Run: `npx vitest run src/utils/immersiveOrientation.test.ts src/utils/statusBarTransitions.test.ts`

Expected: PASS. The first file verifies the new orientation rules, and the second guards against accidental immersive status-bar regressions.

Run: `npm run build`

Expected: PASS with no type errors from the new `orientation` prop on `FlipClock` or the new settings hook usage in `ImmersiveTimer`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ImmersiveTimer.tsx src/components/FlipClock.tsx src/utils/immersiveOrientation.test.ts
git commit -m "支持沉浸式会话方向切换"
```

### Task 4: Manual Smoke Verification

**Files:**
- Modify: none
- Test: built app / dev app manual verification

- [ ] **Step 1: Run the production build one more time**

Run: `npm run build`

Expected: PASS with fresh `dist/` output.

- [ ] **Step 2: Smoke-test the settings default**

Run the app with `npm run dev`, then verify:

```text
1. 打开 设置 > 偏好设置。
2. 把“沉浸式计时默认方向”切到“横屏”。
3. 进入一次沉浸式计时，确认默认显示为横向布局。
4. 退出沉浸式，再把默认方向切到“竖屏”。
5. 再次进入沉浸式，确认默认显示为纵向布局。
```

Expected: entering immersive mode follows the persisted preference immediately.

- [ ] **Step 3: Smoke-test the session-only override**

Keep the app running with the preference still set to `竖屏`, then verify:

```text
1. 在沉浸式计时页面点击新的方向按钮。
2. 确认当前页面立即切成横向布局。
3. 退出沉浸式。
4. 再次进入沉浸式。
5. 确认页面恢复为偏好里的竖屏默认，而不是记住刚才的临时切换。
```

Expected: the in-session toggle only affects the current immersive session.

- [ ] **Step 4: Regression-check clock styles and controls**

While still in immersive mode, verify:

```text
1. 在数字时钟样式下切换横 / 竖方向，确认数字排布正常。
2. 切到翻页时钟样式，再切换横 / 竖方向，确认布局与数字时钟一致。
3. 切换主题与白噪音，确认方向切换后依然正常。
4. 退出沉浸式，确认状态栏恢复逻辑与当前版本一致。
```

Expected: digital clock, flip clock, theme selection, white noise, and status bar recovery all continue to work.

