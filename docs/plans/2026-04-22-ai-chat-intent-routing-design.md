# AI 对话意图路由与待办工具接入设计

## 背景

当前 AI 相关流程已经分成两套：

- 时间轴里的 [AIBackfillChatModal](d:/2026%20ai_assist/lumostime/src/components/AIBackfillChatModal.tsx) 负责 AI 补记，已经支持聊天式交互、调试模式、工具调用后直接应用、编辑和撤销。
- 待办页里的 AI 添加待办仍是旧的“输入 -> 解析 -> 确认弹窗 -> 保存”链路，尚未接入统一聊天体验，也还没有工具调用直接应用的能力。

随着后续 AI 功能继续增加，继续让每个功能各自维护一条独立链路会带来几个问题：

- 每个功能都要重复做一遍意图判断、上下文组织、调试展示和错误处理。
- 不同意图拿到的上下文需求不同，如果把所有上下文都塞进一次请求，会增加提示词冗余和误判概率。
- 添加待办与补记的交互体验不一致，不利于后续继续扩展更多 AI 能力。

## 目标

- 把 AI 入口统一到现有聊天对话框中。
- 在正式执行前增加一次轻量意图识别，只为第二阶段提供必要上下文。
- 让“添加待办”与“添加补记”都具备工具调用后直接应用的能力。
- 添加待办后支持快速打开详情修改和撤销。
- 明确 AI 对待办排期字段的理解与调用方式。
- 调试模式展示两次调用的完整过程。

## 非目标

- 这一版不支持单条消息同时触发多个主意图。
- 这一版不移除旧待办页的 AI 输入与确认弹窗代码，只让统一入口先跑通。
- 不在本次设计里引入新的待办字段模型，只复用现有 `TodoItem` 结构。

## 输入约束

用户已明确确认：

- 第一版采用“每条消息只归到一个主意图”。
- 统一复用现有聊天对话框作为承载容器。

这意味着对于混合输入，本次实现优先走“追问澄清”而不是试图同时执行多种工具。

## 方案对比

### 方案 A：统一对话框 + 双阶段调用

第一阶段只做轻量意图识别，第二阶段按意图调用不同 prompt 和工具规划。

优点：

- 上下文最小化，后续功能扩展最顺。
- 调试模式天然能展示两次调用。
- 统一沉淀消息结构、工具结果卡片、撤销与编辑入口。

缺点：

- 需要把现有 `AIBackfillChatModal` 从“单一补记消息模型”升级为“多意图、多工具结果模型”。

### 方案 B：单次大 prompt 同时负责识别与执行

优点：

- 表面上改动较少。

缺点：

- 上下文冗余严重。
- prompt 会越来越长，后面增加功能时维护成本迅速上升。
- 调试模式难以清晰拆出“识别”和“执行”两个阶段。

### 方案 C：继续维持补记和待办两套入口

优点：

- 短期局部改动最少。

缺点：

- 同一类能力在不同入口重复实现。
- 后续功能继续增长时会持续返工。

### 结论

采用方案 A。

## 意图模型

### 面向用户的主意图

- `chat`：闲聊，不触发工具调用。
- `add_log`：添加补记。
- `add_todo`：添加待办。

### 内部安全分支

- `clarify`：无法可靠归类，先追问，不触发工具调用。

虽然用户当前只把闲聊、添加补记、添加待办视为正式意图，但内部必须保留 `clarify`，否则分类器被迫“硬判”会导致错误执行工具。

## 总体架构

### 第一阶段：轻量意图识别

新增 `aiService` 级别的轻量分类接口：

- 输入：用户消息、当前时间、当前页面或入口信息、最近极少量上下文。
- 输出：
  - `intent`
  - `reason`
  - `assistantReply?`

这一阶段不传完整分类体系、完整待办列表或完整时间轴，只做低成本快速判定。

### 第二阶段：按意图正式执行

不同意图走不同的正式请求：

- `chat`
  - 不规划工具。
  - 仅生成自然语言回复。
  - 上下文只提供当前时间、今天的时间轴摘要、最近一条记录。
- `add_log`
  - 复用现有 `create_log` 工具规划。
  - 上下文包含分类、标签、领域、最近一条记录、可关联待办。
- `add_todo`
  - 新增 `create_todo` 工具规划。
  - 上下文包含待办分类、活动标签体系、领域体系。
  - 不混入补记专用的最近记录上下文。
- `clarify`
  - 直接显示追问，不做工具调用。

## 统一聊天组件改造

统一复用 [AIBackfillChatModal.tsx](d:/2026%20ai_assist/lumostime/src/components/AIBackfillChatModal.tsx) 作为 AI 对话入口，并将其升级为通用 AI 工作台。

### 组件需要升级的点

1. 请求流程从单阶段改为双阶段：
   - 先请求意图识别。
   - 再按意图决定是否进入正式执行。

2. 消息结构需要记录两类调试数据：
   - `intentDebug`
   - `executionDebug`

3. 应用结果结构从单一 `create_log` 扩展为多工具联合类型。

4. 结果卡片支持两类动作：
   - 补记：打开记录详情、撤销。
   - 待办：打开待办详情、撤销。

5. 聊天标题与说明文案从“AI 补记”提升为更泛化的 AI 对话入口，但保留“默认理解今天”的提示。

## 工具模型设计

### 现有工具：`create_log`

保留现有结构：

```json
{
  "toolName": "create_log",
  "args": {
    "date": "YYYY-MM-DD",
    "startTime": "HH:mm",
    "endTime": "HH:mm",
    "description": "string",
    "categoryId": "string",
    "activityId": "string",
    "scopeIds": ["string"],
    "linkedTodoId": "string",
    "progressIncrement": 1
  }
}
```

### 新增工具：`create_todo`

新增待办工具规划：

```json
{
  "toolName": "create_todo",
  "args": {
    "title": "string",
    "categoryId": "string",
    "linkedCategoryId": "string",
    "linkedActivityId": "string",
    "defaultScopeIds": ["string"],
    "note": "string",
    "scheduledDate": "YYYY-MM-DD",
    "deadlineDate": "YYYY-MM-DD",
    "recurrenceRule": {
      "frequency": "daily | weekly | monthly",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "interval": 1,
      "weekdays": [1, 3, 5],
      "monthDays": [1, 15]
    }
  }
}
```

### `create_todo` 字段约束

- `title` 必填。
- `categoryId` 必须来自当前待办分类体系。
- `linkedActivityId` 与 `linkedCategoryId` 必须来自当前活动分类体系。
- `defaultScopeIds` 必须来自当前领域体系。
- 用户没有提到日期时，不得补任何 `scheduledDate`、`deadlineDate`、`recurrenceRule`。
- 用户只明确提到了其中一种日期语义时，只写对应字段。

## 待办排期语义

AI 必须明确区分三个字段：

### 1. `scheduledDate`

表示“计划在哪一天做”。

适用表达：

- 明天做
- 周五安排一下
- 下周一开始处理

### 2. `deadlineDate`

表示“最晚哪一天前完成”。

适用表达：

- 周五前交
- 本月底前完成
- 明天截止

### 3. `recurrenceRule`

表示“重复规则”，不是某一天的安排。

适用表达：

- 每周三做
- 每天复盘
- 每月 1 号对账

### 组合规则

- 同时提到安排日和截止日时，可同时设置 `scheduledDate` 与 `deadlineDate`。
- 循环规则与具体安排、截止不是同一个概念。
- 如果用户只说周期性任务，不额外补具体安排日期。
- 当用户没有提到日期，不添加任何日期信息。

## 本地应用逻辑

### 补记应用

沿用当前本地 `create_log` 应用逻辑，包括：

- 日期标准化
- 跨午夜拆分
- 进度增量处理
- 编辑与撤销

### 待办应用

新增本地 `create_todo` 应用逻辑：

- 直接生成 `TodoItem`
- 写入 `todos`
- 默认 `isCompleted: false`
- 默认 `pin: false`
- 默认 `completedUnits: 0`
- 未提供字段不强行填充

对于 `linkedCategoryId`：

- 如果只提供 `linkedActivityId`，可在本地补推导；
- 如果工具层已明确给出，则直接使用。

## 结果卡片交互

### 补记结果

保留当前交互：

- 打开记录详情
- 撤销

### 待办结果

新增交互：

- 打开待办详情
- 撤销

“打开待办详情”直接拉起现有待办详情编辑弹窗，便于用户快速微调分类、标签、领域和排期。

“撤销”则删除本次新建的 todo。

## 调试模式

调试模式中，每次用户发送消息后展示两段完整调用：

1. 意图识别调用
   - 请求体
   - 响应体
   - 识别出的意图

2. 正式执行调用
   - 请求体
   - 响应体
   - 对应工具调用或聊天回复

特殊情况：

- `chat`：第二阶段展示聊天正式请求与自然语言回复，不含工具调用。
- `clarify`：第二阶段不触发，可在调试区显示“未执行第二阶段”。

## 影响范围

- [aiService.ts](d:/2026%20ai_assist/lumostime/src/services/aiService.ts)
- [AIBackfillChatModal.tsx](d:/2026%20ai_assist/lumostime/src/components/AIBackfillChatModal.tsx)
- [useTodoManager.ts](d:/2026%20ai_assist/lumostime/src/hooks/useTodoManager.ts)
- [types.ts](d:/2026%20ai_assist/lumostime/src/types.ts)
- [src/components/README.md](d:/2026%20ai_assist/lumostime/src/components/README.md)
- [src/services/README.md](d:/2026%20ai_assist/lumostime/src/services/README.md)

可能附带影响：

- [TodoView.tsx](d:/2026%20ai_assist/lumostime/src/views/TodoView.tsx)，用于后续逐步收口旧 AI 待办流程。

## 验证

需要至少覆盖以下场景：

1. 闲聊消息只回复，不触发工具。
2. 明确补记消息触发 `create_log`。
3. 明确待办消息触发 `create_todo`。
4. 日期未提及时，待办不写日期字段。
5. 只提安排日时，仅写 `scheduledDate`。
6. 只提截止日时，仅写 `deadlineDate`。
7. 只提循环时，仅写 `recurrenceRule`。
8. 待办结果支持打开详情和撤销。
9. 调试模式显示两次调用。
10. 模糊输入时进入 `clarify`，不直接执行工具。

## 风险与控制

### 风险 1：意图识别误判

控制方式：

- 保留 `clarify` 分支。
- 第一版坚持单意图，不尝试混合执行。

### 风险 2：待办日期语义混淆

控制方式：

- 在第二阶段 prompt 中明确区分三种日期字段。
- 本地应用层不擅自补日期。

### 风险 3：现有补记流程回归

控制方式：

- 复用现有 `create_log` 规划与应用逻辑。
- 只在请求入口增加第一阶段判断。

### 风险 4：消息结构重构过大

控制方式：

- 将结果卡片抽象为工具结果联合类型，先支持 `create_log` 和 `create_todo` 两类。
- 旧流程字段能复用的尽量复用，不整体推翻聊天组件结构。
