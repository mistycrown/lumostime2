# 日报回顾问答节点集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将节点双链、建议、合并/重命名和结构化 AI 简介完整接入日报回顾问答，并让所有关联记录可从节点详情打开。

**Architecture:** 保留 Log 索引与时间线模型，新增日报回答关联集合；节点纯函数同时处理 Log 和 `DailyReview.answers` 文本。日报文本题复用节点输入控件，节点详情通过 NavigationContext 回到指定日期的日报引导页。AI 简介改为结构化响应，前端以固定 Markdown 模板合并并保留用户原文。

**Tech Stack:** React 18, TypeScript, Vitest, existing NodeContext/DataContext/ReviewContext, existing AI service.
**Spec:** `docs/plans/2026-10-07-review-node-integration-design.md`

## Global Constraints

- 所有文件使用 UTF-8；遵循现有 TypeScript 2 空格、单引号、分号风格。
- 不新增关系表；节点关系从 Log.note 和 DailyReview.answers 中的双链派生。
- 重命名、合并失败时不得修改任何节点、Log 或日报数据。
- AI 不得根据不足信息猜测身份、关系、性格或情感；空字段必须保留为空。
- Android 不在本仓库编译；至少运行相关 Vitest 和 `npm run build`。

## Review Focus

- 日报回答已有双链、别名双链和普通文本混合时，只转换普通文本；由 Task 1/2 测试覆盖。
- 节点重命名/合并必须同步日报回答且保留显示别名；由 Task 1 测试覆盖。
- 日报回答与 Log 同时关联同一节点时，索引不能重复计数；由 Task 1 测试覆盖。
- AI 生成期间用户修改简介时，异步结果不得覆盖最新编辑；由 Task 4 测试覆盖。
- AI 返回非法 JSON、空字段或同日多条记录时，必须保留原简介并给出可见错误；由 Task 4 测试覆盖。

### Task 1: 节点关系纯函数与日报状态同步

**Files:**
- Modify: `src/types.ts`（新增日报节点关联记录类型/索引字段）
- Modify: `src/utils/nodeUtils.ts`（日报回答解析、索引、重命名、合并）
- Modify: `src/utils/nodeUtils.test.ts`
- Modify: `src/contexts/NodeContext.tsx`（接入 ReviewContext 的日报状态）
- Modify: `src/contexts/DataContext.tsx`（如需扩展跨记录更新接口）

**Interfaces:**
- Produces `renameNodeInAnswers(answers, oldName, newName): ReviewAnswer[]`、`mergeNodeInAnswers(answers, sourceName, primaryName): ReviewAnswer[]`。
- Produces `buildNodeIndex(nodes, logs, dailyReviews?)`，在原有 `logs/latestAt/related` 外提供去重后的日报回答关联。
- NodeContext 的 `rename`、`merge` 同步更新 ReviewContext 的 `dailyReviews`。

- [ ] **Step 1: Write the failing tests** for answer rename/merge, alias display preservation, index counts, and no-op identity when no answer changes.
- [ ] **Step 2: Run targeted tests** with `npx vitest run src/utils/nodeUtils.test.ts`; expected new cases fail.
- [ ] **Step 3: Implement pure transformations** using the existing `parseNodeLinks`/`renameNodeInText` delimiter-preserving behavior and add `ReviewAnswer`-aware index entries without changing Log ordering.
- [ ] **Step 4: Wire NodeContext** to update daily reviews alongside existing node/log updates and keep history redirected to the selected primary node.
- [ ] **Step 5: Run targeted tests** again; expected PASS with existing node tests unchanged.
- [ ] **Step 6: Commit** `feat: 同步日报回答节点关联`.

### Task 2: 共享日报节点输入与建议

**Files:**
- Create: `src/components/NodeTextEditor.tsx`
- Modify: `src/components/NodeNoteSuggestions.tsx`（复用共享实现或抽出纯展示）
- Modify: `src/components/AddLogModal.tsx`、`src/views/FocusDetailView.tsx`（保持现有 Log 行为）
- Modify: `src/components/ReviewView/ReviewQuestionRenderer.tsx`
- Modify: `src/components/ReviewView/ReviewGuideTab.tsx`
- Modify: `src/views/DailyReviewView.tsx`
- Test: `src/components/__tests__/nodeRendererHarness.tsx` 或新增 Review 节点渲染测试

**Interfaces:**
- `NodeTextEditor({ value, onChange, ariaLabel, placeholder }): JSX.Element` 提供括号按钮、选区包裹/补全和 `NodeNoteSuggestions`。
- `ReviewQuestionRenderer` 继续通过 `onUpdateAnswer(questionId, question, answer)` 回写，不改变 `ReviewAnswer` API。

- [ ] **Step 1: Write failing component checks** for bracket insertion at caret, suggestion conversion, and protection of existing `[[...]]` links in a text review answer.
- [ ] **Step 2: Run the renderer harness/test** and verify the new checks fail before wiring.
- [ ] **Step 3: Implement `NodeTextEditor`** with ref/focus restoration and shared `insertNodeBrackets`/`linkNodeInText` utilities; use `useOptionalNodes` so non-node contexts remain safe.
- [ ] **Step 4: Replace text-question textarea in edit mode** with the shared editor and pass the answer update callback from `ReviewGuideTab`.
- [ ] **Step 5: Render linked answers in reading mode** through `NodeText`, preserving privacy and existing choice/rating behavior.
- [ ] **Step 6: Run component checks** and commit `feat: 支持日报回答节点输入`.

### Task 3: 节点详情关联记录与日报导航

**Files:**
- Modify: `src/views/NodeDetailView.tsx`
- Modify: `src/components/NodeDetailOverlay.tsx`
- Modify: `src/contexts/NavigationContext.tsx` only if a focused review-answer target is needed
- Modify: `src/App.tsx` only if overlay navigation needs a new callback
- Test: `src/components/__tests__/nodeRendererHarness.tsx` and/or focused NodeDetail test

**Interfaces:**
- Node detail receives a callback that opens `DailyReview` for `YYYY-MM-DD` with initial tab `guide`.
- Index exposes `reviewAnswers` grouped by review date/question and keeps Log `linkedLogs` unchanged.

- [ ] **Step 1: Add failing UI checks** that a node with a linked daily answer shows the answer and that clicking it opens the matching daily review; verify potential Log rows expose a distinct open-detail control.
- [ ] **Step 2: Implement grouped rendering** for linked Log records and daily answers, using `NodeText` for link-aware text and the existing `onEditLog` for Log details.
- [ ] **Step 3: Implement daily-review navigation** through existing NavigationContext date/tab state and close/back behavior.
- [ ] **Step 4: Run the renderer/manual smoke checks** at narrow width and commit `feat: 在节点详情打开日报关联`.

### Task 4: 结构化 AI 节点简介与非覆盖合并

**Files:**
- Modify: `src/services/nodeDescriptionService.ts`
- Modify: `src/services/nodeDescriptionService.test.ts`
- Modify: `src/views/NodeDetailView.tsx`
- Modify: `src/components/__tests__/nodeRendererHarness.tsx`

**Interfaces:**
- `NodeDescriptionAiResult = { basicInfo: { identity: string; relationship: string }; bioAdditions: string[]; recentInteractions: Array<{ date: string; summary: string }> }`。
- `buildNodeDescriptionPrompt(node, logs, reviewAnswers?)` includes dated Log and daily-answer evidence plus existing description.
- `generateNodeDescription(...)` parses strict JSON and returns the structured result; `formatNodeDescription(existing, result)` returns deterministic Markdown.

- [ ] **Step 1: Write failing service tests** for strict JSON parsing, unknown fields becoming empty, same-day interaction merging, and preservation of existing text.
- [ ] **Step 2: Run `npx vitest run src/services/nodeDescriptionService.test.ts`** and verify the new cases fail.
- [ ] **Step 3: Implement the structured prompt/schema and deterministic formatter** with the exact headings `## 基本信息`, `## 简介`, `## 最近交往记录`; never replace non-empty existing prose.
- [ ] **Step 4: Update NodeDetailsEditor** to pass daily answer evidence, apply formatted output only when the revision token still matches, and show errors without mutating the draft.
- [ ] **Step 5: Extend renderer checks** for generated format and in-flight manual edit retention; run targeted tests and commit `feat: 结构化生成节点简介`.

### Task 5: 全量验证与最终提交

**Files:**
- Modify only files already listed above if verification reveals regressions.

- [ ] **Step 1: Run focused regression tests** for node utilities, node renderer, and node description service.
- [ ] **Step 2: Run `npm run build`** and resolve TypeScript/Vite errors caused by this feature only.
- [ ] **Step 3: Review `git diff` and `git status`**, stage only files changed for this feature, and leave unrelated pre-existing worktree edits untouched.
- [ ] **Step 4: Commit** `feat: 完善日报节点关联与简介`.
