# 周复盘模板对话设计

## 背景

当前 AI 助手已经具备统一聊天会话、会话级 persona、统一 turn schema，以及 Weekly Review / AI 叙事的既有数据结构。但当前入口仍然只有“通用对话”，缺少面向明确任务的模板化对话能力。

本次要新增的第一种模板对话是“周复盘”。它不是把现有通用助手简单换一个名字，而是要围绕某一周的数据做定向总结、深入讨论，并在用户明确发出指令时，把讨论结果写回该周的 `WeeklyReview.narrative`。

## 目标

- 在新建对话时支持“通用默认对话”和“模板对话”两种入口。
- 在模板对话中新增第一项 `周复盘`。
- 创建周复盘对话时，先通过程序弹框确定目标周，不调用 AI。
- 目标周确定后，创建一个绑定周范围的模板会话。
- 后续每一轮 AI 对话都围绕该周数据展开，不复用通用助手的任务提示词。
- 当用户发送精确字符 `写入 AI 叙事` 时，触发本地写回流程。
- 如目标周的 `WeeklyReview` 不存在，则写回前自动创建。
- 如目标周已有 `narrative`，则先通过程序弹框确认覆盖或整合，不调用 AI。

## 非目标

- 本次不新增第二个模板对话。
- 本次不让周复盘模板直接创建待办、编辑日志或写入其他业务字段。
- 本次不支持模糊触发词，例如“帮我写到周报里”。
- 本次不支持除 `本周`、`上周`、`YYYYMMDD` 之外的周选择输入。
- 本次不改写 Weekly Review 的 `summary`、`answers` 或其他字段，写回目标仅为 `narrative`。

## 已确认需求

### 入口与周选择

- 用户点击“新建对话”后，先选择：
  - `通用默认对话`
  - `模板对话`
- 如果选择 `模板对话`，先展示模板列表，第一项为 `周复盘`。
- 选择 `周复盘` 后，先弹出程序对话框，不调用 AI。
- 对话框只接受以下输入：
  - `本周`
  - `上周`
  - `8 位数字日期`，格式为 `YYYYMMDD`
- 当输入为 `YYYYMMDD` 时，程序通过该日期定位其所在周。

### 写回触发

- 只有当用户消息严格匹配 `写入 AI 叙事` 时，才触发写回流程。
- 不做包含匹配，不做近义词匹配，不做 AI 意图识别。

### 冲突处理

- 如果目标周的 `WeeklyReview.narrative` 为空，直接写入。
- 如果目标周的 `WeeklyReview.narrative` 已存在，则弹出程序对话框，不调用 AI。
- 确认框只接受以下输入：
  - `是`
  - `否`
- 如果用户输入 `是`，执行覆盖写入。
- 如果用户输入 `否`，保留旧内容并调用 AI 生成整合版 narrative。

### AI 调用边界

以下分支不用调用 AI：

- 选择目标周
- 检测 `写入 AI 叙事`
- 检测 `是 / 否`
- 判断 Weekly Review 是否存在
- 创建缺失的 Weekly Review

以下分支调用 AI：

- 周复盘正式对话
- 生成新的 narrative
- 将旧 narrative 与本次讨论整合为新的 narrative

## 方案对比

### 方案 A：会话级模板状态机

做法：

- 给现有聊天会话新增模板元信息和状态字段。
- 周复盘在创建会话前先走非 AI 弹框。
- 会话创建后绑定周范围，并在会话内走专用 prompt / context。

优点：

- 与现有会话架构最兼容。
- 改动集中在现有 AI 聊天主链路。
- 后续新增“月复盘”“项目复盘”可复用同一框架。

缺点：

- `AIBackfillChatModal.tsx` 会承担更多模板分支逻辑。

### 方案 B：把周复盘当作普通聊天首轮引导

做法：

- 用户先进入一个空模板会话。
- 第一轮再让程序或 AI 引导选择目标周。

优点：

- 新建会话路径改动较少。

缺点：

- 入口不清晰。
- 与“先弹程序框选择周”的已确认需求不一致。

### 方案 C：独立周复盘页面

做法：

- 不走现有聊天会话，单独做周复盘工作流页面。

优点：

- 流程最稳定，边界最清楚。

缺点：

- 与“模板对话”方向不一致。
- 复用现有 AI 会话沉淀能力较差。

### 结论

采用方案 A。

## 会话模型

在现有 `AIChatSession` 上增加模板相关字段：

```ts
type AIChatTemplateType = 'weekly_review';

type AIChatTemplateStage =
  | 'awaiting_week_selection'
  | 'ready'
  | 'awaiting_narrative_overwrite_confirm';

interface AIChatSessionTemplateMeta {
  templateType: AIChatTemplateType;
  stage: AIChatTemplateStage;
  weekStartDate?: string; // YYYY-MM-DD
  weekEndDate?: string;   // YYYY-MM-DD
  selectedRangeLabel?: '本周' | '上周' | 'custom_date';
  pendingWriteIntent?: boolean;
}

interface AIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  personaId: string;
  contextCacheEnabled: boolean;
  messages: AIChatMessage[];
  templateMeta?: AIChatSessionTemplateMeta;
}
```

设计约束：

- 通用对话不带 `templateMeta`。
- 周复盘模板会话必须带 `templateMeta.templateType = 'weekly_review'`。
- 只有 `stage = 'ready'` 的周复盘会话才允许进入 AI 正式对话。

## 状态机

### 1. `awaiting_week_selection`

说明：

- 用户已选择“周复盘”模板，但尚未确定周范围。
- 此时不创建 AI 正式请求。

允许输入：

- `本周`
- `上周`
- `YYYYMMDD`

转移：

- 输入合法：解析出 `weekStartDate / weekEndDate`，进入 `ready`
- 输入非法：停留在当前状态并提示格式要求

### 2. `ready`

说明：

- 周范围已确定。
- 该会话每一轮消息都走周复盘专用 prompt 和上下文。

允许输入：

- 普通复盘消息
- 精确字符 `写入 AI 叙事`

转移：

- 普通消息：继续留在 `ready`
- 精确匹配 `写入 AI 叙事` 且 narrative 不存在：直接进入写回执行，再回到 `ready`
- 精确匹配 `写入 AI 叙事` 且 narrative 已存在：进入 `awaiting_narrative_overwrite_confirm`

### 3. `awaiting_narrative_overwrite_confirm`

说明：

- 程序已检测到旧 narrative 存在，等待用户确认覆盖或整合。
- 此时不调用 AI。

允许输入：

- `是`
- `否`

转移：

- `是`：覆盖写回，完成后回到 `ready`
- `否`：AI 生成整合版 narrative，完成后回到 `ready`
- 其他输入：停留在当前状态并提示只接受 `是 / 否`

## 入口流程

### 新建对话

流程如下：

1. 用户点击 `新建对话`
2. 程序先弹出创建方式选择框：
   - `通用默认对话`
   - `模板对话`
3. 如果用户选择 `通用默认对话`，沿用现有创建逻辑
4. 如果用户选择 `模板对话`，再弹出模板列表
5. 当前模板列表先只提供一项：`周复盘`
6. 选择 `周复盘` 后，弹出“选择周范围”输入框
7. 输入校验通过后，再真正创建模板会话并切入该会话

### 周范围解析

输入处理规则：

- `本周`：按当前本地日期所在周计算
- `上周`：按当前本地日期上一周计算
- `YYYYMMDD`：先解析为本地日期，再映射到其所在周

建议统一复用现有 Weekly Review 周范围口径，避免 Timeline / ReviewHub / WeeklyReviewView 出现不一致。

## 周复盘数据包

周复盘模板每次正式调用 AI 时，都构建一份固定结构的数据包，至少包含以下部分：

### 1. 周范围锚点

- `weekStartDate`
- `weekEndDate`
- `selectedRangeLabel`

### 2. 时间轴原始材料

- 该周所有日志，按天、按时间顺序展开
- 每条日志至少保留：
  - 时间范围
  - 分类 / activity
  - linked todo
  - note

### 3. 统计摘要

复用现有周回顾与统计页已有口径：

- 总时长
- 分类分布
- scope 分布
- todo 投入分布
- 每日时长
- 每日重点活动

### 4. 待办结果

- `completedAt` 落在该周内的已完成待办
- 该周有日志投入但未完成的关键待办

### 5. 日课 / 日报材料

来自该周 `DailyReview[]`：

- checkItems 完成情况汇总
- 每日 `summary`
- 每日 `narrative` 的精简摘录，可选只带摘要而非全文

### 6. 当前周报材料

如果该周 `WeeklyReview` 已存在，则带上：

- `answers`
- `summary`
- `narrative`

## Prompt 策略

### Persona 复用规则

- 复用当前 AI 助手现有 persona 的风格层。
- 不复用通用助手的其余任务提示词。

也就是说，周复盘模板仍使用现有会话 persona，但正式周复盘请求不再走当前通用助手的：

- `assistant-base`
- `foreground-mode`
- `foreground-tools`

### 周复盘正式对话 Prompt

周复盘正式对话需要单独 prompt，职责包括：

- 基于提供的周数据做总结
- 识别一周中的模式、波动、推进与卡点
- 用讨论式而非单次报告式口吻与用户深入交流
- 保持问题聚焦在这一周
- 不把本次对话当作通用日志/待办助手
- 除非进入写回分支，否则不执行任何写入

### 写回 Prompt

写回时使用单独的 narrative prompt，而不是复用普通周复盘对话 prompt。

输出要求：

- 直接生成可写入 `WeeklyReview.narrative` 的完整文本
- 风格与现有 Weekly Review narrative 保持一致
- 不输出聊天说明，不输出工具说明，不输出额外解释

## 写回流程

### 精确触发

当会话处于 `ready` 状态时：

- 若 `message.trim() === '写入 AI 叙事'`，程序拦截该消息
- 不先将该消息发送给 AI

### Review 定位

根据模板会话中绑定的：

- `weekStartDate`
- `weekEndDate`

定位对应 `WeeklyReview`。

### 不存在时

若对应 `WeeklyReview` 不存在：

- 先按既有 Weekly Review 创建逻辑新建 review
- 然后生成新的 narrative 并写入

### 已存在且无 narrative

若 review 已存在但 `narrative` 为空：

- 直接调用 AI 生成 narrative
- 写回 `review.narrative`

### 已存在且有 narrative

若 review 已存在且 `narrative` 非空：

- 会话进入 `awaiting_narrative_overwrite_confirm`
- 弹程序确认框

分支如下：

- 用户输入 `是`
  - 调用 AI 生成覆盖版 narrative
  - 不引用旧 narrative 内容
- 用户输入 `否`
  - 调用 AI 生成整合版 narrative
  - 输入中带上旧 `review.narrative` 与本次周复盘对话摘要

### 写回字段

统一更新：

- `review.narrative`
- `review.narrativeUpdatedAt`
- `review.updatedAt`

不修改：

- `summary`
- `answers`
- `templateSnapshot`

## 冲突确认规则

程序确认框必须严格匹配：

- `是`
- `否`

不接受：

- `y`
- `yes`
- `覆盖`
- `不用`
- 其他任意自由文本

这样做的目的，是把该分支明确归类为“程序控制流程”，不与 AI 对话语义混合。

## 组件与服务改动面

### 1. `src/components/AIBackfillChatModal.tsx`

新增职责：

- 新建对话方式选择
- 模板列表选择
- 周范围选择弹框
- 周复盘模板状态机
- `写入 AI 叙事` 本地拦截
- `是 / 否` 本地拦截
- 周复盘会话发送分支

### 2. 聊天会话类型

给 `AIChatSession` 增加 `templateMeta` 相关字段，并补充本地持久化兼容。

### 3. 周复盘上下文构建服务

建议新增独立 service 或 util，职责：

- 汇总某周 logs
- 汇总某周 todos 完成与未完成信息
- 汇总某周 dailyReviews
- 读取某周 weeklyReview
- 输出固定周复盘数据包

### 4. 周复盘 Prompt 服务

建议新增独立 prompt service，至少提供：

- 周复盘正式对话 prompt
- 周复盘 narrative 写回 prompt
- 周复盘 narrative 整合 prompt

### 5. Weekly Review 读写辅助

建议新增轻量 helper：

- 根据周范围查找 WeeklyReview
- 不存在时创建 WeeklyReview
- 更新 narrative 字段

## 异常与边界处理

- 周选择输入非法：提示格式错误并停留在 `awaiting_week_selection`
- `YYYYMMDD` 不是合法日期：同上
- `awaiting_narrative_overwrite_confirm` 中输入非法：提示只接受 `是 / 否`
- AI narrative 生成失败：不修改 WeeklyReview，状态回到 `ready`
- 用户发送接近但不完全等于 `写入 AI 叙事` 的文本：按普通周复盘消息处理
- 用户切换会话再回来：依赖会话持久化恢复 `templateMeta`

## 测试与验证

至少验证以下场景：

1. 新建对话时可以区分 `通用默认对话` 与 `模板对话`
2. 选择 `周复盘` 后必须先经过非 AI 周选择弹框
3. 输入 `本周` 可以正确绑定当前周
4. 输入 `上周` 可以正确绑定上一周
5. 输入 `YYYYMMDD` 可以正确定位到所属周
6. 非法日期输入不会创建 AI 正式会话
7. `ready` 状态下普通消息会进入周复盘 AI 对话
8. 周复盘 AI 对话拿到的是目标周数据，而不是当天默认上下文
9. 精确字符 `写入 AI 叙事` 会触发本地拦截
10. 没有 WeeklyReview 时会先创建再写入
11. 已有 narrative 时，输入 `是` 会覆盖写入
12. 已有 narrative 时，输入 `否` 会走整合写入
13. 非 `是 / 否` 输入不会误触发写回
14. 写回成功后，`narrativeUpdatedAt` 和 `updatedAt` 会同步更新
15. 会话刷新或重开后，模板周范围仍可恢复

## 风险与控制

### 风险 1：模板分支侵入现有通用聊天逻辑

控制：

- 将模板相关逻辑收敛到 `templateMeta` 分支
- 通用对话路径保持默认不感知模板状态

### 风险 2：周口径不一致

控制：

- 复用现有 Weekly Review 所用的周范围计算方式
- 不在模板中自造另一套周起止规则

### 风险 3：写回触发词过严导致用户误解

控制：

- 在周复盘模板空态或顶部提示中明确告诉用户，写回口令必须是 `写入 AI 叙事`

### 风险 4：整合写回时上下文过长

控制：

- 对 DailyReview narrative 只做摘要注入
- 写回 AI 调用时使用“本次对话摘要”而不是整段原始会话全文

## 推荐实施顺序

1. 扩展 `AIChatSession` 模型，加入 `templateMeta`
2. 完成“新建对话 -> 模板 -> 周选择”入口
3. 实现周范围解析与模板会话创建
4. 新增周复盘数据包构建服务
5. 新增周复盘正式对话 prompt
6. 接入 `ready` 状态的周复盘 AI 调用
7. 接入 `写入 AI 叙事` 精确拦截
8. 接入已有 narrative 的 `是 / 否` 冲突确认
9. 接入 WeeklyReview narrative 创建 / 覆盖 / 整合写回
10. 补回归测试与手工验证
