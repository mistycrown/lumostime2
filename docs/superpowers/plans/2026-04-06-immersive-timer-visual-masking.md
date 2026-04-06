# Immersive Timer Visual Masking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static-digit masked art layer plus a two-section visual selector modal to immersive timer, with preset paintings and motion styles that persist across sessions.

**Architecture:** Extract art options, motion presets, and localStorage normalization into a pure utility so visual selection logic is tested without rendering. Keep `ImmersiveTimer` responsible for state and orchestration, introduce a focused masked-display component for the static digits plus animated art layer, and add a dedicated visual selector modal instead of overloading the existing white-noise picker.

**Tech Stack:** React, TypeScript, Vitest, React DOM Server, Lucide React, localStorage

---

## File Map

- `src/utils/immersiveVisuals.ts`
  Responsibility: visual option definitions, storage keys read/write helpers, default fallback normalization, motion metadata.
- `src/utils/immersiveVisuals.test.ts`
  Responsibility: TDD coverage for option enumeration and invalid persisted value fallback.
- `src/constants/storageKeys.ts`
  Responsibility: centralize new localStorage keys for immersive art and motion selection.
- `src/components/immersiveTimerConfig.ts`
  Responsibility: add the new `visual` control contract and any shared visual-control constants.
- `src/components/immersiveTimerConfig.test.ts`
  Responsibility: lock the control list and shared visual constants.
- `src/components/ImmersiveMaskedDigits.tsx`
  Responsibility: render static time digits as the mask while the art layer moves behind them in landscape and portrait layouts.
- `src/components/ImmersiveMaskedDigits.test.tsx`
  Responsibility: render-level checks for static digit markup, mask data attributes, and motion preset class wiring.
- `src/components/ImmersiveVisualSelectorModal.tsx`
  Responsibility: render a dark immersive modal with top-half art choices and bottom-half motion-style choices.
- `src/components/ImmersiveVisualSelectorModal.test.tsx`
  Responsibility: render-level checks that both sections, current selections, and labels are present.
- `src/components/ImmersiveTimer.tsx`
  Responsibility: own current art/style state, wire the new visual button, and swap plain digits for the masked renderer.

### Task 1: Extract visual preset and persistence logic

**Files:**
- Create: `src/utils/immersiveVisuals.ts`
- Create: `src/utils/immersiveVisuals.test.ts`
- Modify: `src/constants/storageKeys.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_IMMERSIVE_ART_ID,
  DEFAULT_IMMERSIVE_MOTION_STYLE,
  IMMERSIVE_ART_OPTIONS,
  IMMERSIVE_MOTION_OPTIONS,
  normalizeImmersiveArtId,
  normalizeImmersiveMotionStyle,
} from './immersiveVisuals';

describe('immersiveVisuals', () => {
  test('falls back to defaults when persisted visual values are invalid', () => {
    expect(normalizeImmersiveArtId('missing-art')).toBe(DEFAULT_IMMERSIVE_ART_ID);
    expect(normalizeImmersiveMotionStyle('missing-style')).toBe(DEFAULT_IMMERSIVE_MOTION_STYLE);
  });

  test('exposes all bundled timer_bak art options and motion presets', () => {
    expect(IMMERSIVE_ART_OPTIONS.map((option) => option.id)).toEqual([
      '640x0',
      'impression-sunrise',
      'moreno-garden',
      'three-cows',
      'starry-night',
      'van-gogh-127',
    ]);
    expect(IMMERSIVE_MOTION_OPTIONS.map((option) => option.id)).toEqual([
      'sweep',
      'orbit',
      'drift',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/immersiveVisuals.test.ts`
Expected: FAIL because `immersiveVisuals.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import { SETTINGS_KEYS } from '../constants/storageKeys';

export type ImmersiveArtId =
  | '640x0'
  | 'impression-sunrise'
  | 'moreno-garden'
  | 'three-cows'
  | 'starry-night'
  | 'van-gogh-127';

export type ImmersiveMotionStyle = 'sweep' | 'orbit' | 'drift';

export interface ImmersiveArtOption {
  id: ImmersiveArtId;
  name: string;
  src: string;
}

export interface ImmersiveMotionOption {
  id: ImmersiveMotionStyle;
  name: string;
  description: string;
}

export const DEFAULT_IMMERSIVE_ART_ID: ImmersiveArtId = 'starry-night';
export const DEFAULT_IMMERSIVE_MOTION_STYLE: ImmersiveMotionStyle = 'sweep';

export const IMMERSIVE_ART_OPTIONS: ImmersiveArtOption[] = [
  { id: '640x0', name: '海岸', src: '/timer_bak/640x0.jpg' },
  { id: 'impression-sunrise', name: '日出印象', src: '/timer_bak/Monet_-_Impression,_Sunrise.jpg' },
  { id: 'moreno-garden', name: '花园', src: '/timer_bak/Moreno_Garden_Bordighera_1884_-_The_Norton_Museum_Miami_Florida.jpg' },
  { id: 'three-cows', name: '三头牛', src: '/timer_bak/Three_Cows_Grazing_by_Claude_Monet.jpg' },
  { id: 'starry-night', name: '星夜', src: '/timer_bak/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg.webp' },
  { id: 'van-gogh-127', name: '梵高 127', src: '/timer_bak/Vincent_Willem_van_Gogh_127.jpg' },
];

export const IMMERSIVE_MOTION_OPTIONS: ImmersiveMotionOption[] = [
  { id: 'sweep', name: '扫掠', description: '明显平移，带中等旋转' },
  { id: 'orbit', name: '轨道旋转', description: '轨道感更强，旋转更明显' },
  { id: 'drift', name: '分层漂移', description: '更稳，更耐看' },
];

export const normalizeImmersiveArtId = (value: string | null | undefined): ImmersiveArtId =>
  IMMERSIVE_ART_OPTIONS.some((option) => option.id === value)
    ? (value as ImmersiveArtId)
    : DEFAULT_IMMERSIVE_ART_ID;

export const normalizeImmersiveMotionStyle = (
  value: string | null | undefined
): ImmersiveMotionStyle =>
  IMMERSIVE_MOTION_OPTIONS.some((option) => option.id === value)
    ? (value as ImmersiveMotionStyle)
    : DEFAULT_IMMERSIVE_MOTION_STYLE;

export const IMMERSIVE_VISUAL_STORAGE_KEYS = {
  art: SETTINGS_KEYS.IMMERSIVE_TIMER_ART,
  motionStyle: SETTINGS_KEYS.IMMERSIVE_TIMER_MOTION_STYLE,
} as const;
```

- [ ] **Step 4: Add the storage key constants**

```ts
export const SETTINGS_KEYS = {
  // ...
  IMMERSIVE_TIMER_ART: 'immersiveTimerArt',
  IMMERSIVE_TIMER_MOTION_STYLE: 'immersiveTimerMotionStyle',
} as const;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/utils/immersiveVisuals.test.ts`
Expected: PASS with the bundled art ids, motion ids, and default fallback behavior.

- [ ] **Step 6: Commit**

```bash
git add src/utils/immersiveVisuals.ts src/utils/immersiveVisuals.test.ts src/constants/storageKeys.ts
git commit -m "提取沉浸式画面预设配置"
```

### Task 2: Lock shared immersive config for the visual control

**Files:**
- Modify: `src/components/immersiveTimerConfig.ts`
- Modify: `src/components/immersiveTimerConfig.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('includes the visual control and shared immersive modal colors', () => {
  expect(IMMERSIVE_TIMER_CONTROL_IDS).toEqual([
    'back',
    'submit',
    'orientation',
    'format',
    'source',
    'noise',
    'visual',
  ]);
  expect(IMMERSIVE_TIMER_MODAL_THEME.modalBg).toBe('rgba(12,12,12,0.96)');
  expect(IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor).toBe('rgba(255,255,255,0.08)');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/immersiveTimerConfig.test.ts`
Expected: FAIL because `visual` is not part of the shared control contract yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export const IMMERSIVE_TIMER_CONTROL_IDS = [
  'back',
  'submit',
  'orientation',
  'format',
  'source',
  'noise',
  'visual',
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/immersiveTimerConfig.test.ts`
Expected: PASS and the visual button becomes part of the fixed immersive control surface contract.

- [ ] **Step 5: Commit**

```bash
git add src/components/immersiveTimerConfig.ts src/components/immersiveTimerConfig.test.ts
git commit -m "更新沉浸式计时控制常量"
```

### Task 3: Build the masked digit renderer

**Files:**
- Create: `src/components/ImmersiveMaskedDigits.tsx`
- Create: `src/components/ImmersiveMaskedDigits.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImmersiveMaskedDigits } from './ImmersiveMaskedDigits';

describe('ImmersiveMaskedDigits', () => {
  test('renders static digits with a separate animated art layer in portrait mode', () => {
    const markup = renderToStaticMarkup(
      <ImmersiveMaskedDigits
        orientation="portrait"
        displayParts={[
          { kind: 'value', value: '08', label: '小时' },
          { kind: 'separator', value: ':' },
          { kind: 'value', value: '46', label: '分钟' },
          { kind: 'separator', value: ':' },
          { kind: 'value', value: '35', label: '秒' },
        ]}
        digitSlotWidth="2.45ch"
        artSrc="/timer_bak/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg.webp"
        motionStyle="orbit"
      />
    );

    expect(markup).toContain('data-motion-style="orbit"');
    expect(markup).toContain('data-art-layer="true"');
    expect(markup).toContain('>08<');
    expect(markup).toContain('>46<');
    expect(markup).toContain('>35<');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ImmersiveMaskedDigits.test.tsx`
Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
import React from 'react';
import { ImmersiveDisplayPart } from '../utils/immersiveTimeDisplay';
import { ImmersiveMotionStyle } from '../utils/immersiveVisuals';

interface ImmersiveMaskedDigitsProps {
  orientation: 'landscape' | 'portrait';
  displayParts: ImmersiveDisplayPart[];
  digitSlotWidth: string;
  artSrc: string;
  motionStyle: ImmersiveMotionStyle;
}

export const ImmersiveMaskedDigits: React.FC<ImmersiveMaskedDigitsProps> = ({
  orientation,
  displayParts,
  digitSlotWidth,
  artSrc,
  motionStyle,
}) => {
  const valueParts = displayParts.filter((part) => part.kind === 'value');

  return (
    <div className={`immersive-mask immersive-mask--${orientation}`} data-motion-style={motionStyle}>
      <div data-art-layer="true" className={`immersive-mask__art immersive-mask__art--${motionStyle}`} style={{ backgroundImage: `url(${artSrc})` }} />
      <div className="immersive-mask__digits" aria-hidden="true">
        {orientation === 'portrait'
          ? valueParts.map((part, index) => (
              <span key={`${part.value}-${index}`} className="immersive-mask__value" style={{ width: digitSlotWidth }}>
                {part.value}
              </span>
            ))
          : displayParts.map((part, index) => (
              <span key={`${part.value}-${index}`} className={`immersive-mask__${part.kind}`} style={part.kind === 'value' ? { width: digitSlotWidth } : undefined}>
                {part.value}
              </span>
            ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ImmersiveMaskedDigits.test.tsx`
Expected: PASS and the markup shows a distinct art layer plus static digit content.

- [ ] **Step 5: Commit**

```bash
git add src/components/ImmersiveMaskedDigits.tsx src/components/ImmersiveMaskedDigits.test.tsx
git commit -m "新增沉浸式数字遮罩渲染组件"
```

### Task 4: Build the two-section visual selector modal

**Files:**
- Create: `src/components/ImmersiveVisualSelectorModal.tsx`
- Create: `src/components/ImmersiveVisualSelectorModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImmersiveVisualSelectorModal } from './ImmersiveVisualSelectorModal';
import { IMMERSIVE_ART_OPTIONS, IMMERSIVE_MOTION_OPTIONS } from '../utils/immersiveVisuals';
import { IMMERSIVE_TIMER_MODAL_THEME } from './immersiveTimerConfig';

describe('ImmersiveVisualSelectorModal', () => {
  test('renders art and motion sections in the same immersive modal', () => {
    const markup = renderToStaticMarkup(
      <ImmersiveVisualSelectorModal
        isOpen
        onClose={vi.fn()}
        selectedArtId="starry-night"
        selectedMotionStyle="sweep"
        onSelectArt={vi.fn()}
        onSelectMotionStyle={vi.fn()}
        artOptions={IMMERSIVE_ART_OPTIONS}
        motionOptions={IMMERSIVE_MOTION_OPTIONS}
        theme={IMMERSIVE_TIMER_MODAL_THEME}
      />
    );

    expect(markup).toContain('选择画作');
    expect(markup).toContain('选择运动样式');
    expect(markup).toContain('星夜');
    expect(markup).toContain('扫掠');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ImmersiveVisualSelectorModal.test.tsx`
Expected: FAIL because the modal component does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
import React from 'react';
import { X, Check } from 'lucide-react';
import { ImmersiveArtId, ImmersiveArtOption, ImmersiveMotionOption, ImmersiveMotionStyle } from '../utils/immersiveVisuals';

interface ImmersiveVisualSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedArtId: ImmersiveArtId;
  selectedMotionStyle: ImmersiveMotionStyle;
  onSelectArt: (id: ImmersiveArtId) => void;
  onSelectMotionStyle: (id: ImmersiveMotionStyle) => void;
  artOptions: ImmersiveArtOption[];
  motionOptions: ImmersiveMotionOption[];
  theme: {
    modalBg: string;
    modalBorder: string;
    buttonBg: string;
    buttonHoverBg: string;
    buttonText: string;
  };
}

export const ImmersiveVisualSelectorModal: React.FC<ImmersiveVisualSelectorModalProps> = (props) => {
  if (!props.isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={props.onClose}>
      <div className="flex w-[92vw] max-w-[960px] flex-col overflow-hidden rounded-[24px] border" style={{ backgroundColor: props.theme.modalBg, borderColor: props.theme.modalBorder }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: props.theme.modalBorder }}>
          <h3 className="text-xl font-semibold" style={{ color: props.theme.buttonText }}>画面样式</h3>
          <button onClick={props.onClose} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: props.theme.buttonBg, color: props.theme.buttonText }}>
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.2fr_0.8fr]">
          <section>
            <h4 className="mb-3 text-sm font-semibold tracking-[0.18em]" style={{ color: props.theme.buttonText }}>选择画作</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {props.artOptions.map((option) => (
                <button key={option.id} onClick={() => props.onSelectArt(option.id)} className="overflow-hidden rounded-2xl border p-2 text-left" style={{ borderColor: option.id === props.selectedArtId ? props.theme.buttonText : props.theme.modalBorder }}>
                  <div className="mb-2 aspect-[4/3] rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${option.src})` }} />
                  <div className="flex items-center justify-between">
                    <span style={{ color: props.theme.buttonText }}>{option.name}</span>
                    {option.id === props.selectedArtId ? <Check size={16} /> : null}
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h4 className="mb-3 text-sm font-semibold tracking-[0.18em]" style={{ color: props.theme.buttonText }}>选择运动样式</h4>
            <div className="space-y-3">
              {props.motionOptions.map((option) => (
                <button key={option.id} onClick={() => props.onSelectMotionStyle(option.id)} className="w-full rounded-2xl border px-4 py-3 text-left" style={{ borderColor: option.id === props.selectedMotionStyle ? props.theme.buttonText : props.theme.modalBorder }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: props.theme.buttonText }}>{option.name}</span>
                    {option.id === props.selectedMotionStyle ? <Check size={16} /> : null}
                  </div>
                  <p className="mt-1 text-sm opacity-70" style={{ color: props.theme.buttonText }}>{option.description}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ImmersiveVisualSelectorModal.test.tsx`
Expected: PASS and the modal markup contains both sections in one screen.

- [ ] **Step 5: Commit**

```bash
git add src/components/ImmersiveVisualSelectorModal.tsx src/components/ImmersiveVisualSelectorModal.test.tsx
git commit -m "新增沉浸式画面选择弹窗"
```

### Task 5: Wire visual state and masked rendering into the immersive timer

**Files:**
- Modify: `src/components/ImmersiveTimer.tsx`
- Modify: `src/utils/immersiveVisuals.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';
import {
  readStoredImmersiveArtId,
  readStoredImmersiveMotionStyle,
} from './immersiveVisuals';

describe('immersiveVisuals persistence contract', () => {
  test('hydrates persisted immersive visual selections for ImmersiveTimer', () => {
    const storage = {
      getItem: (key: string) => {
        if (key === 'immersiveTimerArt') return 'three-cows';
        if (key === 'immersiveTimerMotionStyle') return 'orbit';
        return null;
      },
    } as Pick<Storage, 'getItem'>;

    expect(readStoredImmersiveArtId(storage)).toBe('three-cows');
    expect(readStoredImmersiveMotionStyle(storage)).toBe('orbit');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/immersiveVisuals.test.ts`
Expected: FAIL because the storage hydration helpers do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
export const readStoredImmersiveArtId = (storage: Pick<Storage, 'getItem'>): ImmersiveArtId =>
  normalizeImmersiveArtId(storage.getItem(IMMERSIVE_VISUAL_STORAGE_KEYS.art));

export const readStoredImmersiveMotionStyle = (
  storage: Pick<Storage, 'getItem'>
): ImmersiveMotionStyle =>
  normalizeImmersiveMotionStyle(storage.getItem(IMMERSIVE_VISUAL_STORAGE_KEYS.motionStyle));

const [showVisualModal, setShowVisualModal] = useState(false);
const [selectedArtId, setSelectedArtId] = useState<ImmersiveArtId>(() => {
  if (typeof window === 'undefined') {
    return DEFAULT_IMMERSIVE_ART_ID;
  }
  return readStoredImmersiveArtId(window.localStorage);
});
const [selectedMotionStyle, setSelectedMotionStyle] = useState<ImmersiveMotionStyle>(() => {
  if (typeof window === 'undefined') {
    return DEFAULT_IMMERSIVE_MOTION_STYLE;
  }
  return readStoredImmersiveMotionStyle(window.localStorage);
});

const selectedArt = IMMERSIVE_ART_OPTIONS.find((option) => option.id === selectedArtId) ?? IMMERSIVE_ART_OPTIONS[0];

useEffect(() => {
  localStorage.setItem(IMMERSIVE_VISUAL_STORAGE_KEYS.art, selectedArtId);
}, [selectedArtId]);

useEffect(() => {
  localStorage.setItem(IMMERSIVE_VISUAL_STORAGE_KEYS.motionStyle, selectedMotionStyle);
}, [selectedMotionStyle]);
```

- [ ] **Step 4: Replace direct digit rendering with the masked renderer and add the visual button**

```tsx
<ImmersiveMaskedDigits
  orientation={effectiveOrientation}
  displayParts={displayParts}
  digitSlotWidth={digitSlotWidth}
  artSrc={selectedArt.src}
  motionStyle={selectedMotionStyle}
/>

<button
  onClick={(event) => {
    event.stopPropagation();
    setShowVisualModal(true);
  }}
  title="选择画面样式"
  className="pointer-events-auto w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all shadow-lg"
  style={{
    backgroundColor: IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor,
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: IMMERSIVE_TIMER_CONTROL_SURFACE.borderColor,
    color: IMMERSIVE_TIMER_CONTROL_SURFACE.color,
  }}
>
  <ImageIcon size={20} strokeWidth={2} />
</button>

<ImmersiveVisualSelectorModal
  isOpen={showVisualModal}
  onClose={() => setShowVisualModal(false)}
  selectedArtId={selectedArtId}
  selectedMotionStyle={selectedMotionStyle}
  onSelectArt={setSelectedArtId}
  onSelectMotionStyle={setSelectedMotionStyle}
  artOptions={IMMERSIVE_ART_OPTIONS}
  motionOptions={IMMERSIVE_MOTION_OPTIONS}
  theme={IMMERSIVE_TIMER_MODAL_THEME}
/>
```

- [ ] **Step 5: Run the targeted tests**

Run: `npx vitest run src/utils/immersiveVisuals.test.ts src/components/immersiveTimerConfig.test.ts src/components/ImmersiveMaskedDigits.test.tsx src/components/ImmersiveVisualSelectorModal.test.tsx`
Expected: PASS with the persisted values, control contract, masked display markup, and modal sections all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ImmersiveTimer.tsx src/utils/immersiveVisuals.ts src/components/ImmersiveMaskedDigits.tsx src/components/ImmersiveVisualSelectorModal.tsx
git commit -m "接入沉浸式计时透图画面"
```

### Task 6: Final verification and cleanup

**Files:**
- Verify: `src/components/ImmersiveTimer.tsx`
- Verify: `src/components/ImmersiveMaskedDigits.tsx`
- Verify: `src/components/ImmersiveVisualSelectorModal.tsx`
- Verify: `src/utils/immersiveVisuals.ts`

- [ ] **Step 1: Run the full targeted automated checks**

```bash
npx vitest run src/utils/immersiveVisuals.test.ts src/components/immersiveTimerConfig.test.ts src/components/ImmersiveMaskedDigits.test.tsx src/components/ImmersiveVisualSelectorModal.test.tsx
```

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

- [ ] **Step 3: Do the manual immersive smoke test**

```text
1. 进入沉浸式计时，确认黑底仍是纯黑，图片只在数字内部显示。
2. 竖屏检查数字静止，切换三种运动样式，确认动的是画层不是数字。
3. 横屏检查数字静止，切换画作后即时生效。
4. 打开白噪音弹窗，确认旧逻辑不受影响。
5. 退出沉浸式再进入，确认上次画作和样式被恢复。
```

- [ ] **Step 4: Inspect the final diff**

```bash
git diff -- src/constants/storageKeys.ts src/utils/immersiveVisuals.ts src/utils/immersiveVisuals.test.ts src/components/immersiveTimerConfig.ts src/components/immersiveTimerConfig.test.ts src/components/ImmersiveMaskedDigits.tsx src/components/ImmersiveMaskedDigits.test.tsx src/components/ImmersiveVisualSelectorModal.tsx src/components/ImmersiveVisualSelectorModal.test.tsx src/components/ImmersiveTimer.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/constants/storageKeys.ts src/utils/immersiveVisuals.ts src/utils/immersiveVisuals.test.ts src/components/immersiveTimerConfig.ts src/components/immersiveTimerConfig.test.ts src/components/ImmersiveMaskedDigits.tsx src/components/ImmersiveMaskedDigits.test.tsx src/components/ImmersiveVisualSelectorModal.tsx src/components/ImmersiveVisualSelectorModal.test.tsx src/components/ImmersiveTimer.tsx
git commit -m "完成沉浸式计时画面遮罩升级"
```
