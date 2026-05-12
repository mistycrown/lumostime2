# Dream 持续关注系统设计

日期：2026-05-12

## 背景

当前 AI 助手已经有一套通用长期记忆，用于保存用户画像、偏好、当前状态和工作记忆摘要，也已经能读取应用内的日志、待办、timeline 与最近对话上下文。

但这套长期记忆更适合承载“通用连续性信息”，还不适合承载一种更明确的“持续关注”能力。用户现在希望新增一个独立的 Dream 功能，让用户可以手动定义需要被持续关注的领域，并在显式调用 `dream` 时，基于应用内数据对这些领域做一次集中整理。整理结果应能被后续普通对话与后台 agent 读取，但只有 `dream` 本身才允许更新这些内容。

## 目标

- 新增独立的 `Dream` 系统，不并入现有通用长期记忆模块。
- 用户可以手动维护多个 Dream 关注领域。
- 每个关注领域在 UI 上表现为一个 tab。
- 每个 tab 下维护多条由 AI 整理出的观察条目。
- 用户显式发送 `dream` 时，进入专门的 Dream 工作流。
- Dream 工作流允许 AI 对 Dream 条目执行新增、改写、删除。
- 普通对话和后台 agent 可以读取 Dream 内容，但不允许更新 Dream。
- Dream 条目必须使用绝对时间锚点，不允许把相对时间表达写入持久化内容。
- `dream` 执行后，要在对话流中展示本次更新的 Dream 卡片。

## 非目标

- 本轮不把 Dream 更新逻辑混入普通 `assistantTurnService` 的常规回合。
- 本轮不让普通前台聊天顺手修改 Dream。
- 本轮不让后台 check-in、随机唤醒、reminder 自动修改 Dream。
- 本轮不做 Dream 自动定时运行；只支持手动显式触发。
- 本轮不做复杂阈值编辑器、规则树、自动触发条件配置器。
- 本轮不把 Dream 观察结果同步回通用长期记忆字段。

## 已确认产品边界

- `Dream` 是独立系统，不放在现有“长期记忆”内部。
- `Dream` 中的“关注领域”独立存在，用户可手动新增、删除、编辑。
- 每个关注领域使用 tab 展示。
- 每个关注领域下有多条观察条目，而不是只有一条滚动摘要。
- 普通对话只读取 Dream，不更新 Dream。
- 后台 agent 只读取 Dream，不更新 Dream。
- 只有显式调用 `dream` 时，AI 才能对 Dream 执行增删改。
- Dream 条目中的观察窗口必须落为绝对日期区间，例如 `2026-05-06 至 2026-05-12`。
- 不允许把“最近 7 天”“最近一周”“这段时间”之类相对时间表达写入 Dream 持久化内容。

## 方案对比

### 方案 A：把 Dream 继续塞进现有长期记忆

做法：
- 继续沿用 `AssistantMemory`，在里面新增 Dream 相关字段。

优点：
- 初期改动路径短。

缺点：
- “通用连续性记忆”和“持续关注系统”语义混杂。
- 普通 memory patch 与 Dream patch 会越来越难分边界。
- 后续 UI 很容易演变成“长期记忆里再套一层 Dream 子系统”。

### 方案 B：Dream 作为独立系统，拥有独立数据结构与工作流

做法：
- 单独定义 Dream topic / entry / patch / service / UI。
- 普通对话只读 Dream；`dream` 显式调用时才写 Dream。

优点：
- 产品语义清晰。
- 更新边界非常稳定，便于调试与后续扩展。
- 更适合以后增加“手动按钮触发”“自动整理”或“按领域重跑”等功能。

缺点：
- 初期需要新增一套独立数据结构与流程。

### 结论

采用方案 B。

## 信息架构

现有 AI 相关信息拆成两层：

### 1. 通用长期记忆

继续保留现有：

- 用户画像
- 偏好
- 当前状态
- 工作记忆摘要
- 活跃 reminders
- 最近 agent 决策

它们继续由现有长期记忆服务管理。

### 2. Dream 持续关注系统

Dream 独立承载：

- 用户定义的关注领域
- 每个领域下的 AI 观察条目
- Dream 最近一次运行时间
- Dream 最近一次更新结果卡片所需的结构化变更记录

## 数据模型

### DreamTopic

```ts
interface DreamTopic {
  id: string;
  title: string;
  note?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

说明：
- `title` 是 tab 名称。
- `note` 是用户补充说明，例如“重点看晚睡和起床过晚”。
- `enabled` 用于临时停用某个关注领域，但保留其数据。

### DreamEntry

```ts
type DreamEntryStatus = 'stable' | 'watch' | 'risk' | 'archived';

interface DreamEntry {
  id: string;
  topicId: string;
  content: string;
  observedRangeStart: string; // YYYY-MM-DD
  observedRangeEnd: string;   // YYYY-MM-DD
  observedAt: string;         // ISO datetime
  sourceSummary?: string;
  status: DreamEntryStatus;
  updatedAt: string;          // ISO datetime
}
```

说明：
- `content` 是最终展示与持久化的观察内容。
- `observedRangeStart / observedRangeEnd` 是必填时间锚点。
- `sourceSummary` 用于记录这条内容主要来自哪些数据源，例如“日志 + timeline + 最近对话”。
- `status` 用于给 UI 和后续 agent 提供轻量判断信号。

### DreamState

```ts
interface DreamState {
  version: 1;
  updatedAt: string;
  lastDreamRunAt?: string;
  topics: DreamTopic[];
  entries: DreamEntry[];
}
```

### DreamPatch

Dream 不复用通用 `memoryPatch`，而是单独走 Dream patch。

```ts
interface DreamPatch {
  updatedAt: string;
  createdEntries?: DreamEntry[];
  updatedEntries?: DreamEntry[];
  deletedEntryIds?: string[];
}
```

第一版不允许 AI 在 `dream` 工作流里自动新增或删除 topic。topic 由用户手动维护，AI 只改 entry。

## 持久化设计

建议新增独立的 `dreamService`，负责：

- 读取 Dream 状态
- 保存 Dream 状态
- 新增 / 编辑 / 删除 topic
- 应用 Dream patch
- 按 topic 查询 entries
- 生成供普通对话与后台 agent 读取的 Dream context

Dream 不应挂靠到现有 `assistantMemoryService` 内部，以避免更新链路再次混合。

## 触发方式

### 1. 对话指令触发

当用户在 AI 聊天中发送精确指令 `dream` 时：

- 不走普通前台 unified turn
- 进入 Dream 专门工作流
- 执行一次 Dream 整理
- 返回 Dream 更新结果

### 2. 后续扩展入口

后续可以新增按钮触发，但第一版主入口是对话指令 `dream`。

## Dream 工作流

### 输入

Dream 工作流读取以下上下文：

- Dream topics
- Dream 当前已有 entries
- 通用长期记忆快照（只读）
- 最近一段时间的日志
- 最近一段时间的 todos
- timeline 摘要
- 必要的最近对话
- 当前本地时间锚点

### 输出

Dream 工作流输出严格结构化结果，至少包含：

- `assistantReply`
- `dreamPatch`
- `dreamCards`

其中：
- `dreamPatch` 用于落库
- `dreamCards` 用于前台展示本次新增 / 改写 / 删除了哪些 Dream 条目

### 允许动作

Dream 工作流只允许：

- 新增 Dream entry
- 改写 Dream entry
- 删除 Dream entry

不允许：

- 修改普通长期记忆
- 直接改 todo / log
- 自动发 reminder

第一版把 Dream 工作流限制在“整理持续关注档案”这一个职责上。

## Dream 条目写作规则

Dream 条目必须满足以下规则：

- 必须带绝对时间窗口。
- 不得持久化相对时间表达。
- 只写高置信度观察，不写模糊猜测。
- 一条 entry 只表达一个清晰观察。
- 条目内容应尽量简洁，可被普通对话与后台 agent 直接读取。
- 如果已有旧 entry 能被更准确的新观察覆盖，优先改写而不是盲目追加。
- 如果旧 entry 明显失效或已不再适合作为持续关注依据，可以在 `dream` 中删除。

### 示例

允许：

- `在 2026-05-06 至 2026-05-12 的记录窗口内，有 4 天出现 01:00 后仍有活动记录。`

不允许：

- `最近一周经常晚睡。`
- `这段时间作息后移。`

## UI 设计

### 1. Dream 独立入口

AI 区域新增一个独立的 `Dream` 入口，不放进现有长期记忆页。

### 2. Dream 主界面

Dream 主界面结构：

- 顶部栏
  - `运行 dream`
  - `新增领域`
- tab 区
  - 每个 tab 对应一个 Dream topic
- 内容区
  - 展示该 topic 下的所有 Dream entries

### 3. Topic 管理

每个 topic 支持：

- 新增
- 编辑标题
- 编辑备注
- 启用 / 停用
- 删除

Topic 创建形态为：

- 标题
- 备注

### 4. Entry 展示

每条 entry 在 tab 内以卡片展示，卡片至少显示：

- 内容
- 观察窗口
- 状态
- 更新时间
- 来源摘要（可选）

第一版 entry 不提供用户手动编辑；entry 由 Dream 工作流自动维护。

## 对话内 Dream 结果展示

`dream` 执行完成后，聊天流里应展示一条普通 assistant 回复，并在该消息下挂一组 Dream 更新卡片。

每张卡片对应一条本次发生变化的 Dream entry，卡片至少展示：

- 所属领域
- 变更类型：新增 / 改写 / 删除
- 条目内容
- 观察窗口
- 更新时间

这样用户可以清楚看到：

- Dream 这次是否真的运行了
- 运行后改动了哪些持续关注内容
- 这些内容之后会被普通对话和后台 agent 读取

## 普通对话的读取策略

普通对话只读取 Dream，不修改 Dream。

建议为普通对话构建一个只读 `dreamContext`：

- 只注入与当前轮话题最相关的 Dream entries
- 每轮最多 2 到 4 条
- 优先级按 topic 命中、状态重要性、更新时间排序

这可以避免：

- prompt 被 Dream 全量塞满
- assistant 每轮机械复读全部 Dream 内容

## 后台 agent 的读取策略

后台 agent 也只读取 Dream，不修改 Dream。

Dream 对后台 agent 的作用是：

- 影响判断权重
- 影响 check-in 关注方向
- 影响表达方式

例如：

- 作息类 Dream entry 活跃时，夜间与次晨更重视睡眠与恢复信号。
- 健康类 Dream entry 活跃时，过载与疲劳相关 check-in 更偏向低打扰关心。
- 执行 / 拖延类 Dream entry 活跃时，更偏向小步推进式 nudges。

第一版只做“辅助判断”，不让 Dream 直接变成自动提醒编排器。

## 与现有长期记忆的关系

通用长期记忆与 Dream 的关系如下：

- 通用长期记忆：通用连续性信息
- Dream：按领域管理的持续关注档案

普通对话在构建 prompt 时可以同时读取：

- 通用长期记忆
- Dream 相关上下文

但它们的更新链路保持分离：

- 普通聊天回合只走 `memoryPatch`
- Dream 回合只走 `dreamPatch`

## 异常与边界处理

- 当没有任何启用中的 Dream topic 时，用户发送 `dream`，返回提示而不运行整理。
- 当 Dream topic 存在但当前数据不足以形成高置信度观察时，允许返回“本次无更新”。
- 当 AI 产出的 Dream 条目缺少绝对时间窗口时，视为无效条目，不落库。
- 当 AI 试图输出相对时间表达作为最终 entry 内容时，解析层应拒绝落库。
- 当 Dream patch 中某条更新指向不存在的 entry id 时，该条更新丢弃并记录调试信息。

## 测试与验证

至少验证以下场景：

1. 用户可以新增一个 Dream topic。
2. 用户可以编辑 Dream topic 的标题和备注。
3. 用户可以删除 Dream topic。
4. 发送精确指令 `dream` 时，会进入 Dream 工作流而不是普通聊天。
5. 普通聊天不会修改 Dream 数据。
6. 后台 agent 不会修改 Dream 数据。
7. Dream 可以新增 entry。
8. Dream 可以改写已有 entry。
9. Dream 可以删除已有 entry。
10. Dream entry 如果缺少 `observedRangeStart / observedRangeEnd`，不会落库。
11. Dream entry 使用相对时间表达时，不会落库。
12. `dream` 执行后，聊天里能看到 Dream 更新卡片。
13. 普通聊天 prompt 能读取 Dream，但不包含全部 entries。

## 风险与控制

### 风险 1：Dream 和通用长期记忆再次混在一起

控制方式：

- Dream 单独建模、单独持久化、单独 patch。
- 普通对话与 Dream 运行使用不同的结果结构。

### 风险 2：AI 生成的观察表达会随时间漂移失真

控制方式：

- 强制绝对时间窗口字段。
- 拒绝相对时间文案落库。

### 风险 3：Dream 条目越积越多，后续读取变得噪声过高

控制方式：

- 普通对话与后台 agent 都只读取相关子集。
- Dream 工作流允许主动删除或改写旧条目。

### 风险 4：topic 与 entry 的职责边界模糊

控制方式：

- topic 只由用户维护。
- entry 只由 Dream 工作流维护。

## 推荐实施顺序

1. 新增 Dream 类型定义。
2. 新增 `dreamService` 及本地持久化。
3. 新增 Dream UI 入口与 topic tab 界面。
4. 支持 topic 的手动新增、编辑、删除、启停。
5. 在聊天发送链路中拦截精确指令 `dream`。
6. 新增 Dream 专用 prompt / turn / patch 工作流。
7. 新增对话内 Dream 更新卡片。
8. 为普通对话与后台 agent 增加只读 Dream context。

## 第一版最小闭环

第一版只需要跑通以下闭环：

- 用户创建 1 个或多个 Dream 关注领域
- 用户在聊天里发送 `dream`
- Dream 工作流基于应用数据输出结构化 Dream patch
- Dream entries 成功落库
- 对话里展示本次 Dream 更新卡片
- 后续普通对话与后台 agent 能读取相关 Dream 内容

达到这一步，就已经能验证 Dream 的核心价值：它是否真的让 assistant 更像一个会持续关注用户长期问题的陪伴系统，而不是一次性聊天工具。
