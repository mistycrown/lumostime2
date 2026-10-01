# 分类时长自定义图表修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use native execution in this session and verify each task before handoff.

**Goal:** Make category-duration statistic cards use one separator per card, render durations as hours/minutes, and keep heatmap hour labels readable.

**Architecture:** Keep the shared outer `divide-y` separator used by custom statistic cards. Add an opt-in prop to the legacy attribute renderer so wrapped cards can suppress their redundant internal top border. Treat the synthetic category-duration field like the existing tag-duration field and give the heatmap columns a readable minimum width.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, Vite.
**Spec:** `docs/plans/2026-10-01-category-duration-statistics-design.md`

## Global Constraints

- Use UTF-8 encoding.
- Preserve the existing three unrelated user edits in `src/views/CategoryDetailView.tsx`, `src/views/ScopeDetailView.tsx`, and `src/views/TagDetailView.tsx`.
- Do not compile the Android project.
- Run `npm run build` before delivery.

## Review Focus

- Wrapped legacy charts must not create a second separator between adjacent custom cards.
- Both synthetic duration IDs must display `h`/`m` values without the literal unit `时长`.
- Heatmap hour labels must remain visible when the chart has many hour columns.
- Existing ordinary numeric attributes must retain their configured units and number formatting.

### Task 1: Update the shared statistics renderer

**Files:**
- Modify: `src/components/ActivityAttributeStatistics.tsx`

**Interfaces:**
- Consumes: `ActivityAttributeStatisticsProps`, `AttributeSection`, `formatHoursMinutes`.
- Produces: an optional internal-section-border flag used by custom duration cards.

- [ ] **Step 1: Add the optional border flag and duration-ID handling**

Add `hideSectionBorder?: boolean` to `ActivityAttributeStatisticsProps`; pass it to `AttributeSection` so its `border-t` class is omitted only when requested. Treat `__tag-duration__` and `__category-duration__` as duration numbers when selecting numeric display formatting.

- [ ] **Step 2: Make the heatmap hour header readable**

Keep the active min/max hour range and `00`-style labels, remove text truncation, give each hour column a stable minimum width, and wrap the grid in horizontal overflow when needed.

- [ ] **Step 3: Use the flag for custom duration cards and update the file header**

Pass `hideSectionBorder` from the tag/category duration legacy-card path. Add a dated `@updated` entry describing the separator, duration-format, and heatmap fixes.

### Task 2: Add focused formatter coverage

**Files:**
- Modify: `src/components/ActivityAttributeStatistics.tsx`
- Modify: `src/components/ActivityAttributeStatistics.test.tsx`

**Interfaces:**
- Consumes: exported `formatHoursMinutes` helper.
- Produces: regression coverage for hour/minute formatting.

- [ ] **Step 1: Export and test the formatter**

Export `formatHoursMinutes` and add assertions for minute-only, hour-only, and mixed values, including the expected `31h 47m` shape used by the reference screenshot.

- [ ] **Step 2: Run focused tests**

Run `npx vitest run src/components/ActivityAttributeStatistics.test.tsx` and confirm all tests pass.

### Task 3: Verify the completed change

**Files:**
- Inspect: `src/components/ActivityAttributeStatistics.tsx`
- Inspect: `src/components/ActivityAttributeStatistics.test.tsx`

- [ ] **Step 1: Review the diff and working tree**

Confirm only the component, its focused test, and the implementation/design plan artifacts are new task changes; leave the three pre-existing view edits untouched.

- [ ] **Step 2: Run the production build**

Run `npm run build` and confirm TypeScript/Vite compilation succeeds.
