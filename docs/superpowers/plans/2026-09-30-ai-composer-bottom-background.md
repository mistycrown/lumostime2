# AI Composer Bottom Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the AI homepage's fixed composer background covers the full bottom edge of the viewport.

**Architecture:** Move the `theme.shellLayerBg` background color from the centered composer content wrapper to its full-width fixed-position parent. The composer and quick-action menu retain their existing placement and theme-derived colors.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, Vite

**Spec:** `docs/plans/2026-09-30-ai-composer-bottom-background-design.md`

## Global Constraints

- Preserve UTF-8 encoding and existing TypeScript formatting.
- Do not modify the composer interactions, spacing, or theme tokens.
- Stage and commit only files belonging to this change.

## Review Focus

- Mobile-width composer parent exposes `theme.shellLayerBg` across the complete horizontal viewport.
- The background extends through the existing bottom padding, so scrolling content cannot show beneath it.
- The centered composer retains `max-w-6xl`, `pt-3`, and pointer-event behavior.
- The quick-action popup remains positioned against the composer and opens normally.
- TypeScript production build completes without errors.

---

### Task 1: Cover the AI composer’s bottom area

**Files:**
- Modify: `src/components/ai-chat/AIChatHome.tsx:348-349`
- Create: `src/components/ai-chat/AIChatHome.test.tsx`

**Interfaces:**
- Consumes: the existing `AIChatHomeTheme.shellLayerBg` theme value.
- Produces: a full-width composer container whose inline background color is `theme.shellLayerBg`.

- [ ] **Step 1: Write the failing component-source assertion**

Create `AIChatHome.test.tsx` with a source-level regression test that reads `AIChatHome.tsx` and asserts the outer fixed composer class includes `style={{ backgroundColor: theme.shellLayerBg }}`, while the inner `composerMenuRef` wrapper has no background-color style.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/components/ai-chat/AIChatHome.test.tsx`

Expected: FAIL because the theme background remains assigned to the inner wrapper.

- [ ] **Step 3: Move the background style to the full-width composer parent**

In `src/components/ai-chat/AIChatHome.tsx`, add `style={{ backgroundColor: theme.shellLayerBg }}` to the outer fixed bottom composer container and remove it from the centered `composerMenuRef` wrapper. Keep every existing class name and all input/menu descendants unchanged.

- [ ] **Step 4: Run the focused regression test**

Run: `npx vitest run src/components/ai-chat/AIChatHome.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: PASS with production assets emitted to `dist/`.

- [ ] **Step 6: Commit the completed fix**

```bash
git add src/components/ai-chat/AIChatHome.tsx src/components/ai-chat/AIChatHome.test.tsx docs/plans/2026-09-30-ai-composer-bottom-background-design.md docs/superpowers/plans/2026-09-30-ai-composer-bottom-background.md
git commit -m "修复AI输入区底部背景"
```
