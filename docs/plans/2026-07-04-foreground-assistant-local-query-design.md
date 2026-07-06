# 前台 AI 按需本地自主查询设计

日期：2026-07-04

## 目标

为前台普通 AI 对话增加“按需本地自主查询”能力，但不让每一轮对话都默认触发查询。

目标行为：

1. AI 先判断当前上下文是否足够。
2. 如果足够，直接回答，不增加额外查询成本。
3. 如果不足，AI 返回结构化本地查询请求。
4. 系统最多执行三轮本地查询。
5. 每轮都把查询记录、查询结果、最近对话上下文回灌给 AI。
6. AI 基于这些信息生成最终答复。
7. 查询过程中，聊天流里持续显示进度文本，避免用户误以为卡住。

本轮仅覆盖前台普通 AI 对话，不改后台 assistant system turn。

## 范围

纳入：

- `AIBackfillChatModal.tsx` 普通前台对话入口
- `ai-chat/AIBackfillChatForegroundTurn.ts` 前台普通 turn 编排
- `assistantTurnService.ts` 前台 unified turn schema 扩展
- `aiService.ts` unified turn 输出归一化扩展
- 复用并抽取“搜索全部”逻辑
- 新增前台本地查询 service

暂不纳入：

- 后台 `assistantOrchestratorService.runSystemTurn`
- 周报/月报/日报模板对话流
- Dream 专用对话流
- 新 UI 面板或新的查询历史可视化卡片

## 方案选择

采用“在普通前台 unified turn 外包一层可选查询循环”的方案。

原因：

- 侵入最小
- 不破坏现有 tool call、memory、reminder、pending message 链路
- 可以保留原有“一次直接回答”的快路径
- 后续扩展到后台时可复用查询 service，但不必现在同步改后台

## 核心流程

### 1. 初次 unified turn

普通前台对话先走一次 unified turn。

模型返回两种可能：

- 直接回答：返回 `assistantReply`，不返回 `localQueryRequest`
- 发起查询：返回 `localQueryRequest`

也就是说，“是否查询”的决策和第一次回答意图合并在同一个 schema 内，不额外增加一次纯判断调用。

### 2. 查询循环

当模型返回 `localQueryRequest` 时，进入最多三轮的本地查询循环。

每一轮：

1. 系统更新 pending 文案，例如“正在查询第 1 轮：日志 / 待办”
2. 执行本地查询
3. 记录本轮查询请求、命中数、结构化结果流
4. 把累计查询历史作为 `Local Query Context` 回灌给模型
5. 再跑一次 unified turn

后续 unified turn 可能返回：

- 最终答复
- 下一轮 `localQueryRequest`

达到三轮上限后，无论命中如何，都要求模型基于当前累计结果生成最终答复或明确澄清。

### 3. 最终答复

最终答复仍然复用现有：

- `assistantReply`
- `toolCalls`
- `reminders`
- `memoryPatch`
- `reasoning`

因此现有前台消息替换、tool application、memory update、reminder update 无需重写。

## 查询 contract

前台 unified turn 在 `AssistantUnifiedTurnOutput` 中新增可选字段：

```ts
localQueryRequest?: {
  mode: 'filter_expression' | 'keyword_search';
  targets: Array<'logs' | 'todos' | 'reviews' | 'categories' | 'activities' | 'scopes' | 'all'>;
  query: string;
  limit?: number;
  reason?: string;
}
```

约束：

- 当返回 `localQueryRequest` 时，不应同时声称已经完成基于查询结果的事实性结论
- `limit` 由系统强制裁剪到安全范围
- 模型应尽量输出更完整的匹配表达式，例如使用 `OR`、`#`、`%`、`@` 等已有筛选语法

## 本地查询能力

新增统一入口 service：`assistantLocalSearchService`

职责：

1. 复用 `filterUtils.ts`
2. 复用并抽取 `SearchView.tsx` 中的“搜索全部”逻辑
3. 对外暴露统一查询方法
4. 把结果封装成稳定信息流
5. 生成可供模型消费的文本摘要

### 查询模式

#### `filter_expression`

主要用于：

- 日志
- 待办

行为：

- 日志走自定义筛选表达式
- 待办走 todo-side filter matcher
- 对 reviews 等不支持 filter 语法的目标，不做硬凑，返回空命中

#### `keyword_search`

主要用于：

- 搜索全部
- 日报 / 周报 / 月报
- 类别 / 标签 / 领域
- 模糊找待办、找记录

行为：

- 调用抽出的 search-all 纯函数
- 根据 targets 做子集筛选

## 结果封装

每轮查询统一封装为：

```ts
{
  round: number;
  request: { ... };
  hitCount: number;
  items: AssistantLocalQueryResultItem[];
}
```

结果项保留高信号字段：

- 日志：日期、时间段、分类、活动、备注、关联待办
- 待办：标题、分类、完成状态、安排/截止日期、备注
- 回顾：类型、日期、标题、摘要片段
- 类别/标签/领域：名称及必要从属关系

模型侧看到的是：

- 查询轮次
- 查询请求
- 命中数
- 截断后的结果项

## 上下文策略

保留现有前台轻量词典：

- 未完成 todo 候选
- 当天 log 候选

不把原有词典清空，以降低回归风险。

新增一个可选的 `Local Query Context` prompt section：

- 仅在实际发生本地查询时注入
- 包含最多三轮查询历史与结果
- 不污染普通快路径

## 用户反馈

不新增 UI 容器，直接复用现有 pending assistant message。

典型文案：

- `我先查一下本地记录……`
- `正在查询第 1 轮：日志 / 待办`
- `第 1 轮没有找到足够信息，我继续换个条件查一下……`
- `正在查询第 2 轮：日报 / 待办`

最终结果仍由现有 `replacePendingWithResult(...)` 覆盖。

## 限制与保护

- 单轮最大查询次数：3
- 单轮最大返回条数：20
- 默认 limit：6
- 当模型未返回合法查询请求时，不进入查询循环
- 当三轮结束仍无足够信息时，让模型基于“未命中历史”进行澄清或保守回答

## 需要修改的文件

- `docs/plans/2026-07-04-foreground-assistant-local-query-design.md`
- `src/types/assistant.ts`
- `src/services/aiService.ts`
- `src/services/assistantTurnService.ts`
- `src/services/assistantLocalSearchService.ts`
- `src/utils/searchAllUtils.ts`
- `src/views/SearchView.tsx`
- `src/components/ai-chat/AIBackfillChatForegroundTurn.ts`
- `src/components/AIBackfillChatModal.tsx`
- `src/prompts/assistant/foreground-tools.md`
- 相关 README / test 文件

## 验证

至少验证：

1. 普通闲聊仍然一轮直答
2. 依赖本地事实的问题能触发查询
3. 查询最多三轮
4. pending 文案会实时变化
5. tool calls / reminders / memory updates 在最终答复路径仍正常工作
6. 手动搜索和 AI 搜索命中规则一致
