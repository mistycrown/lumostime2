# TimePal Stage Thresholds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cumulative minute threshold settings for TimePal stages in the sponsorship feed settings and use them everywhere TimePal stage level is resolved.

**Architecture:** Introduce a small utility module that owns default thresholds, storage hydration, validation, range formatting, and stage calculation. Reuse that module from the settings UI, the runtime TimePal card, and the debug panel so the app has a single source of truth.

**Tech Stack:** React 19, TypeScript, Vitest, localStorage-backed settings

---

### Task 1: Add stage-threshold utility tests

**Files:**
- Create: `src/utils/timePalStageThresholds.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert:

- the default thresholds are `[120, 240, 360, 480]`
- invalid persisted values fall back to defaults
- cumulative minutes map to the expected stage levels
- range labels are generated correctly

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/timePalStageThresholds.test.ts`

Expected: FAIL because `src/utils/timePalStageThresholds.ts` does not exist yet.

### Task 2: Implement the shared threshold utility

**Files:**
- Create: `src/utils/timePalStageThresholds.ts`
- Modify: `src/constants/storageKeys.ts`

- [ ] **Step 1: Write minimal implementation**

Add:

- a new `TIMEPAL_KEYS.STAGE_THRESHOLDS`
- default thresholds constant
- storage reader with fallback
- validation/normalization helpers
- minute-to-stage calculation helper
- stage range description helper

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/utils/timePalStageThresholds.test.ts`

Expected: PASS

### Task 3: Wire the settings UI

**Files:**
- Modify: `src/components/TimePalSettings.tsx`

- [ ] **Step 1: Add local form state for the 4 threshold inputs**

- [ ] **Step 2: Add validation + persistence**

Only persist valid ascending non-negative integers, and dispatch a dedicated change event.

- [ ] **Step 3: Add the new settings card**

Include:

- 4 minute inputs
- current stage range preview
- validation feedback
- reset-to-default button

### Task 4: Use shared thresholds at runtime

**Files:**
- Modify: `src/components/TimePalCard.tsx`
- Modify: `src/components/TimePalDebugger.tsx`

- [ ] **Step 1: Replace hard-coded stage logic in `TimePalCard`**

- [ ] **Step 2: Replace hard-coded debugger ranges and sample durations**

- [ ] **Step 3: Listen for threshold changes in both places**

### Task 5: Verify behavior

**Files:**
- No code changes expected

- [ ] **Step 1: Run targeted tests**

Run: `npx vitest run src/utils/timePalStageThresholds.test.ts`

Expected: PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: build succeeds with exit code 0
