# Goal Filter Expression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace goal duration's tag-only restriction with an editable filter expression and reusable tag, scope, todo, and saved-filter pickers while preserving legacy goal data.

**Architecture:** Store a raw `filterExpression` on goals and major goals. A small goal-filter utility normalizes legacy fields, appends selector tokens, and evaluates log/todo records through the existing `filterUtils` parser/matchers. `GoalEditor` owns the draft and renders a new focused filter editor component; App/ModalManager pass the available scopes, todos, and saved filters.

**Tech Stack:** React, TypeScript, Tailwind classes, Vitest, existing `filterUtils` association components.
**Spec:** `docs/plans/2026-10-29-goal-filter-expression-design.md`

## Global Constraints

- All files use UTF-8; preserve existing source headers and update them when behavior changes.
- Keep target `scopeId` as a mandatory base constraint; expression scope tokens add constraints rather than replacing it.
- Save editable expressions as text; saved Filter IDs are never persisted as goal references.
- Preserve old `filterActivityIds` / `filterTodoCategories` behavior when no expression exists.
- Date and time entry conventions and existing minimalist editor styling remain unchanged.

## Review Focus

- A legacy goal with only `filterActivityIds` or `filterTodoCategories` produces identical progress.
- An expression with mixed `#`, `%`, `@`, note, `OR`, and exclusion terms matches only records satisfying all groups.
- A `%scope` expression cannot broaden records outside the goal's base `scopeId`.
- Selecting a saved Filter copies its expression, and later manual edits do not mutate the saved Filter.
- A phase goal inherits a major goal's expression and remains read-only in the editor.

### Task 1: Extend goal data and inheritance

**Files:**
- Modify: `src/types.ts:Goal, MajorGoal`
- Modify: `src/utils/goalInheritanceUtils.ts`
- Modify: `src/hooks/useGoalManager.ts`
- Test: `src/utils/goalInheritanceUtils.test.ts` (create if absent)

**Interfaces:**
- `Goal.filterExpression?: string` and `MajorGoal.filterExpression?: string` store the raw expression.
- `applyMajorGoalInheritance(goal, majorGoal)` copies `filterExpression` alongside existing filter fields.
- Goal templates created by `useGoalManager` carry the major goal expression.

- [ ] **Step 1: Write failing inheritance and template tests** asserting the expression is copied for phase goals and new phase templates.
- [ ] **Step 2: Run `npx vitest run src/utils/goalInheritanceUtils.test.ts` and verify failure.**
- [ ] **Step 3: Add the optional fields and copy them through inheritance/template creation.**
- [ ] **Step 4: Run the focused test and verify it passes.**

### Task 2: Add goal filter normalization and progress matching

**Files:**
- Modify: `src/utils/goalUtils.ts`
- Test: `src/utils/goalUtils.test.ts`

**Interfaces:**
- Add `getGoalFilterExpression(goal: Pick<Goal, 'filterExpression' | 'filterActivityIds' | 'filterTodoCategories'>, context): string` to expose the saved expression or a legacy expression fallback.
- `calculateGoalProgress` uses `matchesFilter` for record metrics and `matchesTodoFilter` for `task_count`, with the goal scope and date range applied before expression matching.

- [ ] **Step 1: Add tests for legacy tag/category fallback, mixed expression matching, exclusions, todo matching, and base-scope narrowing.**
- [ ] **Step 2: Run `npx vitest run src/utils/goalUtils.test.ts` and verify the new tests fail.**
- [ ] **Step 3: Implement expression normalization and shared filter contexts; keep planned logs excluded and retain current metric calculations.**
- [ ] **Step 4: Run the focused tests and verify all pass.**

### Task 3: Build the editable goal filter editor

**Files:**
- Create: `src/components/GoalFilterEditor.tsx`
- Modify: `src/components/GoalEditor.tsx`

**Interfaces:**
- `GoalFilterEditorProps` consumes `expression`, `onExpressionChange`, `categories`, `scopes`, `todos`, `todoCategories`, `filters`, `disabled`, and `mode` (`record` or `todo`).
- The component renders the editable expression input and expandable `标签`, `领域`, `待办`, and `筛选器` sections.
- Selector choices append `#name`, `%name`, `@title`; saved filters replace the draft with that filter's expression only when explicitly chosen. Existing text is never silently discarded by tag/scope/todo additions.
- Disabled mode displays the expression and hides mutation controls.

- [ ] **Step 1: Add component tests covering token insertion, filter copy, clear behavior, and disabled rendering.**
- [ ] **Step 2: Run the component tests and verify they fail because the component is absent.**
- [ ] **Step 3: Implement the component using existing `TagMultipleAssociation`, `ScopeAssociation`, `TodoAssociation`, and the project's compact expandable selector pattern.**
- [ ] **Step 4: Replace GoalEditor’s tag-only conditional section with GoalFilterEditor and initialize expression from the goal/major goal or legacy fallback.**
- [ ] **Step 5: Persist `filterExpression` when non-empty; retain legacy fields only for old goals and clear incompatible task-category fields when an expression is used.**
- [ ] **Step 6: Run component tests and verify they pass.**

### Task 4: Wire picker data through modal entry points

**Files:**
- Modify: `src/components/ModalManager.tsx`
- Modify: `src/App.tsx`
- Test: affected GoalEditor/App harness tests if available

**Interfaces:**
- GoalEditor receives `scopes`, `todos`, and `filters` from both the main goal modal and major-goal modal.
- ModalManager’s GoalEditor path remains type-safe and receives the same data when used.

- [ ] **Step 1: Add/extend a render harness assertion that all four selector sections receive the current data arrays.**
- [ ] **Step 2: Pass `scopes`, `todos`, and `filters` through props without changing unrelated modal behavior.**
- [ ] **Step 3: Run the focused component/harness tests.**

### Task 5: Verify compatibility and ship

**Files:**
- Modify: `src/components/README.md` or relevant README entry for GoalEditor behavior.
- Test: any adjusted regression tests.

- [ ] **Step 1: Run `npx vitest run src/utils/goalUtils.test.ts src/utils/goalInheritanceUtils.test.ts` plus GoalEditor tests.**
- [ ] **Step 2: Run `npm run build`.**
- [ ] **Step 3: Inspect `git diff` and `git status`; stage only feature files and commit with `feat: 支持目标筛选表达式`.**
