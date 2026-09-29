# Memoir 回顾节点继承自定义时间线样式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Memoir 的日、周、月回顾节点在非默认时间线样式下与普通日志使用相同的图标和颜色，同时保持默认样式现状。

**Architecture:** `TimelineItem` 已是 Memoir 条目的统一节点入口。保留默认分支中按回顾类型区分的圆点；非默认分支停止向共享的 `TimelineStyleRail` 传递回顾专用的圆点和颜色覆盖，令其使用当前样式配置的常规节点渲染。用服务端静态渲染与 mock 轨道组件验证传参，不引入新的状态或设置字段。

**Tech Stack:** React 19、TypeScript、Vitest、react-dom/server、lucide-react。

**Spec:** `docs/plans/2026-09-29-memoir-review-custom-timeline-nodes-design.md`

## Global Constraints

- 所有新改动均使用 UTF-8 编码。
- 遵循项目 TypeScript 风格：2 空格缩进、单引号、分号。
- 仅在 `timelineStyleTheme !== 'default'` 时统一回顾节点与普通 log 的样式；`default` 分支保留日/周/月固定紫/黄/粉圆点。
- 更新受影响源码的文件头注释与 `src/components/README.md` 中相应组件描述。
- 不修改回顾内容、卡片背景、点击行为、时间线连线或持久化设置。

## Review Focus

- `daily_summary` 在自定义主题下不再传递紫色或强制圆点参数；由 Task 1 的静态渲染 mock 断言覆盖。
- `weekly_summary` 在自定义主题下不再传递琥珀色或强制圆点参数；由 Task 1 的静态渲染 mock 断言覆盖。
- `monthly_summary` 在自定义主题下不再传递粉色或强制圆点参数；由 Task 1 的静态渲染 mock 断言覆盖。
- 普通日志在自定义主题下的现有轨道参数保持不变；由 Task 1 与回顾条目逐项比较共享参数覆盖。
- 默认主题仍渲染原有日/周/月固定颜色圆点且不渲染 `TimelineStyleRail`；由 Task 1 的静态 HTML 断言覆盖。

---

### Task 1: 统一 Memoir 自定义时间线节点，并添加回归覆盖

**Files:**
- Modify: `src/components/TimelineItem.tsx:2-17, 181-190, 299-319`
- Modify: `src/components/TimelineItem.test.ts:2-29`
- Modify: `src/components/README.md:273-274, 327-328`

**Interfaces:**
- Consumes: `TimelineStyleRail` 的现有 props：`theme`, `config`, `index`, `showLine`, `showNode`, `extendLinePastContainer`, `anchorOffsetX`, `maxTimelineWidth`。
- Produces: `TimelineItem` 在非默认主题下对所有 `DiaryEntry.type` 使用同一组节点配置；在默认主题下保留现有 `renderNodeIcon()` 行为。

- [ ] **Step 1: 扩展 `TimelineItem.test.ts` 的 mock，并写出失败回归测试**

  使用 `react-dom/server` 渲染 `TimelineItem`；mock `useSettings` 返回完整的 `vine` 配置，并 mock `TimelineStyleRail` 记录接收的 props。参数化渲染 `normal`、`daily_summary`、`weekly_summary`、`monthly_summary` 四类最小 `DiaryEntry`，断言四者的轨道 props 都不含 `forceDotNode` 与 `nodeColorOverride`，且公共配置一致。另以 `default` 设置分别渲染三种回顾，断言静态 HTML 仍包含 `bg-purple-500`、`bg-amber-500`、`bg-pink-400`，且轨道 mock 未被调用。

- [ ] **Step 2: 运行测试确认它失败**

  Run: `npx vitest run src/components/TimelineItem.test.ts`

  Expected: 自定义主题的回顾条目仍传入 `forceDotNode: true` 或固定 `nodeColorOverride`，因此至少一个新断言失败。

- [ ] **Step 3: 修改 `TimelineItem.tsx` 的非默认主题轨道调用**

  删除仅为 `isSummary` 传入的 `forceDotNode` 和 `nodeColorOverride` props，并删除失去调用点的 `getSummaryNodeColor()`。保持 `renderNodeIcon()` 和 `timelineStyleTheme === 'default'` 分支原样，使默认主题继续区分三种回顾圆点。将文件头 `@updated` 改为说明自定义主题下回顾节点与普通日志共用轨道样式。

- [ ] **Step 4: 更新 `src/components/README.md` 的组件说明**

  将 `TimelineStyleRail.tsx` 的“centered summary dots / 摘要节点圆点对齐”描述改为通用轨道节点能力；将 `TimelineItem.tsx` 描述补充为：在自定义时间线中，普通日志与回顾共用节点样式，而默认时间线保留回顾类型色。

- [ ] **Step 5: 运行针对性测试确认通过**

  Run: `npx vitest run src/components/TimelineItem.test.ts`

  Expected: PASS，包含既有卡片背景断言与新增的默认/自定义节点分支断言。

- [ ] **Step 6: 运行生产构建**

  Run: `npm run build`

  Expected: Vite 生产构建成功，无 TypeScript 或打包错误。

- [ ] **Step 7: 检查本任务 diff 并提交**

  Run: `git diff --check; git status --short; git diff -- src/components/TimelineItem.tsx src/components/TimelineItem.test.ts src/components/README.md`

  Expected: 无空白错误，只暂存上述三个本任务文件，不暂存任何用户既有改动。

  ```bash
  git add src/components/TimelineItem.tsx src/components/TimelineItem.test.ts src/components/README.md
  git commit -m "统一回顾时间线节点样式"
  ```

## Self-Review

- Spec coverage: Task 1 覆盖非默认主题的图标与颜色继承、默认主题不变，以及不触及卡片与交互的范围约束。
- Step scan: 测试、预期失败、最小实现、说明同步、定向测试、构建、diff/提交均为单一且可验证的动作。
- Type consistency: 计划仅使用现有 `DiaryEntry` 与 `TimelineStyleRail` props，不新增接口或持久化结构。
- Review Focus: 五项风险均绑定到 Task 1 的明确静态渲染测试。
- Proportion: 一个视觉分支的变更保持为一个可独立审查、测试与提交的任务。
