# AI Agent 统一单轮架构设计

日期：2026-04-26

## 背景

当前 AI 助理已经具备三类核心能力：

- 前台聊天中直接创建和修改日志、待办、子任务
- 后台随机轮询与 reminder 到点触发
- 结构化长期记忆与 reminder 队列

但这三块能力目前分散在多条链路中：

- 前台主链路仍采用“先意图识别，再进入不同 planner”的两段式请求
- 后台 system turn 采用另一套独立 prompt 和返回 schema
- 前台记忆更新又额外走一条 memory sidecar
- 本地工具执行逻辑大量堆积在 `AIBackfillChatModal.tsx` 中

结果是：

- 回复速度慢
- prompt、schema、上下文装配逻辑重复
- 前后台行为模型不统一
- 记忆、reminder、工具执行之间的职责边界不够清晰

本次设计目标是把 AI agent 收敛成“统一输入、统一输出、单轮主调用、分层 prompt、独立执行器”的清晰架构。

## 目标

- 前台主链路从“两段式”收敛为“单轮统一调用”
- 前台与后台共用一套 turn 输入模型和输出模型
- 保留前后台模式差异，但不再维护两套完全不同的思路
- 长期记忆继续保留结构化存储，并先维持异步 sidecar 更新
- 工具执行逻辑从 UI 组件中抽离，形成可复用的本地执行层
- 在保证 AI 可准确选择标签、活动、领域、待办对象的前提下，压缩真正拖慢请求的文本型上下文

## 非目标

- 第一版不让后台直接创建或修改日志、待办等应用数据
- 第一版不实现“AI 自主决定查询哪些数据再继续多轮工具调用”的 agent loop
- 第一版不改动用户的人设配置 UI
- 第一版不做长期记忆的手动编辑界面

## 核心结论

### 1. 前台改为单轮统一调用

前台不再默认走“意图识别 -> 二次 planner”。

改为：

- 一次请求直接返回统一结构化结果
- 结果中同时包含正文、工具动作、reminder、memoryPatch
- 如果信息不足，则同一轮直接返回 `clarify`

这样可以减少一次模型调用、减少重复 token 消耗，并降低“第一轮分错导致第二轮继续跑偏”的复杂度。

### 2. 前后台共用统一 turn 模型

前台和后台都视为一次 `assistant turn`，只是在 `mode` 上不同：

- `foreground`
- `background`

两者共用：

- 同一套输入结构
- 同一套输出结构
- 同一套 prompt 分层方式
- 同一套本地动作执行与 reminder / memory 管理边界

### 3. 选择型上下文全量传，叙事型上下文摘要传

为了让 AI 能稳定选择正确对象，以下候选字典应按动作场景全量传入：

- 分类 / 活动体系
- 领域体系
- 待办分类
- 候选待办列表
- 候选日志列表

但以下上下文不应全量灌入：

- 对话历史原文
- 时间轴原文
- 日报 / 日记原文
- 长备注全文

总结原则：

- Dictionary Context：可全量，但只保留必要字段
- State Context：压缩为摘要

## Prompt 分层

### 1. assistant-base

新增共享基础 prompt，例如 `public/assistant/assistant-base.md`，前台后台共用。

职责：

- 解释 LumosTime 核心概念
- 规定产品级人格
- 说明通用工具规则
- 说明通用记忆更新规则

现有 `assistant-persona.md` 中“持续陪伴、低打扰、少说教、重连续性”的产品级人格内容并入这里。

合并后删除旧的 `static/assistant/assistant-persona.md`。

### 2. foreground-mode

新增 `public/assistant/foreground-mode.md`。

职责：

- 说明这是用户主动发起的前台消息
- 允许聊天、澄清、调用本地工具、创建 reminder、建议更新记忆
- 不允许假装已经执行，除非结果里真的返回了动作

### 3. background-mode

新增 `public/assistant/background-mode.md`。

职责：

- 说明这是系统触发，不是用户主动发言
- 允许沉默、发送一条短消息、创建 reminder、更新记忆
- 强调低打扰、优先保守
- 当触发类型为 `reminder_due` 时，要求结合 reminder 的延迟情况判断是否仍值得提醒

### 4. user persona

继续保留用户设置页中的可选预设和自定义人设。

职责：

- 决定语气、称呼、风格
- 不覆盖基础规则与 mode 约束

这一层属于“怎么说”，不是“它是谁”。

## 统一输入结构

```ts
interface AssistantTurnInput {
  mode: 'foreground' | 'background';
  trigger: {
    type: 'user_message' | 'checkin' | 'reminder_due' | 'manual_background_nudge';
    text: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  };
  promptLayers: {
    basePrompt: string;
    modePrompt: string;
    userPersonaPrompt?: string;
  };
  memory: AssistantMemory;
  conversation: {
    recentTurns: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
    summary?: string;
  };
  stateContext: {
    currentDateTime: string;
    defaultDate: string;
    todayTimelineSummary?: string;
    activeSessionSummary?: string;
    reminderSummary?: string;
  };
  dictionaryContext: {
    activityCategories?: Array<{
      id: string;
      name: string;
      activities: Array<{ id: string; name: string }>;
    }>;
    scopes?: Array<{ id: string; name: string }>;
    todoCategories?: Array<{ id: string; name: string }>;
    todos?: Array<{
      id: string;
      title: string;
      path?: string;
      categoryId?: string;
      categoryName?: string;
      linkedActivityId?: string;
      linkedActivityName?: string;
      defaultScopeIds?: string[];
      scheduledDate?: string;
      deadlineDate?: string;
      parentTodoId?: string;
      parentTodoTitle?: string;
      isCompleted?: boolean;
      pin?: boolean;
    }>;
    logs?: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      categoryId: string;
      categoryName: string;
      activityId: string;
      activityName: string;
      linkedTodoId?: string;
      linkedTodoTitle?: string;
      note?: string;
    }>;
  };
}
```

### 输入装配原则

- `promptLayers` 只负责 prompt 文本层
- `memory` 只放结构化长期记忆，不重复存应用数据库内容
- `conversation` 只保留正文，不带 toolCalls
- `stateContext` 负责“现在是什么状态”
- `dictionaryContext` 负责“AI 可以选哪些对象”

### 前后台装配差异

前台：

- `mode = foreground`
- `trigger.type = user_message`
- 根据当前任务注入对应的候选字典

后台：

- `mode = background`
- `trigger.type = checkin / reminder_due / manual_background_nudge`
- 默认只带轻量状态摘要和必要候选字典

## 统一输出结构

```ts
type AssistantTurnMode = 'foreground' | 'background';

type AssistantTurnOutcome =
  | 'reply'
  | 'clarify'
  | 'silent';

interface AssistantReminderDraft {
  type?: 'self_followup' | 'todo_due' | 'idle_check' | 'focus_check';
  dueAt: string;
  text: string;
  todoId?: string;
}

interface AssistantTurnOutput {
  mode: AssistantTurnMode;
  outcome: AssistantTurnOutcome;
  assistantReply?: string;
  toolCalls?: AssistantToolCall[];
  reminders?: AssistantReminderDraft[];
  memoryPatch?: AssistantMemoryPatch;
}
```

其中 `AssistantToolCall` 第一版复用现有 5 类：

- `create_log`
- `edit_log`
- `create_todo`
- `update_todo`
- `create_subtask`

### 语义约束

前台：

- 允许 `reply`
- 允许 `clarify`
- 不允许 `silent`
- 允许 `toolCalls`
- 允许 `reminders`
- 允许 `memoryPatch`

后台：

- 允许 `reply`
- 允许 `silent`
- 第一版原则上不使用 `clarify`
- 第一版不允许 `toolCalls`
- 允许 `reminders`
- 允许 `memoryPatch`

通用规则：

- `silent` 时不应返回 `assistantReply`
- `clarify` 时不应返回 `toolCalls`
- 同一轮允许同时返回 `assistantReply + toolCalls + memoryPatch`

## 记忆策略

第一版继续保留当前“主回合成功后异步运行 memory sidecar”的方式。

原因：

- 不阻塞主回复速度
- 不需要立刻把主 schema 与 sidecar 完全耦合
- 已经有现成实现，可稳定复用

长期记忆中应主要保留：

- 稳定偏好
- 重复出现的状态 / 阻力模式
- 当前重要 open loops
- 对未来回合有价值的决策摘要

不应重复保存：

- 原始日志
- 原始待办数据
- 原始日记和日报内容

## Reminder 策略

支持两种 reminder 来源：

1. 前台用户主动说“某个时间提醒我”
2. 后台 system turn 判断应创建 follow-up reminder

Reminder 到点后，系统生成 `reminder_due` 触发，再以后台 turn 方式交给 AI 判断：

- 继续提醒
- 换成简短 catch-up
- 保持沉默

这样 reminder 是“结构化定时触发”，不是聊天内容里的临时文本约定。

## 模块拆分

### 1. assistantPromptService

职责：

- 统一拼装 `base + mode + user persona + memory + conversation + state + dictionary`

### 2. assistantTurnService

职责：

- 统一的前后台调用入口
- 输入 `AssistantTurnInput`
- 输出 `AssistantTurnOutput`

### 3. aiService

职责：

- 只做模型请求网关、debug、结构化响应解析
- 不再承载前台多 planner 的业务分支语义

### 4. assistantActionExecutor

职责：

- 执行前台返回的 `toolCalls`
- 统一管理本地数据修改与 applied actions 结果

### 5. assistantReminderService

职责：

- 基于现有 queue service 管理 reminder 创建、到点触发、补发判断

### 6. assistantMemoryService

职责：

- 保持结构化长期记忆的读写与 patch 合并

### 7. assistantContextBuilder

职责：

- 从应用运行态中构造 `stateContext` 和 `dictionaryContext`

## 失败与性能问题分析

当前失败的主要风险并不来自显式 token 上限，而更可能来自以下组合问题：

- 前台两段式调用天然增加一次模型请求
- 工具规划时大量结构化候选和文本上下文重复传输
- 原生请求固定 60 秒 timeout
- 各链路依赖结构化 JSON 返回，第三方兼容模型不一定稳定
- 输出缺少严格的长度预算，可能出现半截 JSON

### 优化原则

- 减少一次模型调用
- 保留必要的全量候选字典
- 压缩文本型上下文
- 对不同模式设置明确输出预算

建议预算：

- chat / foreground 普通回复：300-500 tokens
- foreground 动作回合：600-900 tokens
- background system turn：200-400 tokens
- memory sidecar：150-250 tokens

## 最小重构顺序

1. 新增统一类型：
   - `AssistantTurnInput`
   - `AssistantTurnOutput`
   - `AssistantToolCall`

2. 重组 prompt 文件：
   - 新增 `public/assistant/assistant-base.md`
   - 新增 `public/assistant/foreground-mode.md`
   - 新增 `public/assistant/background-mode.md`
   - 合并并删除旧 `assistant-persona.md`

3. 新增 `assistantContextBuilder`

4. 抽出 `assistantActionExecutor`
   - 把当前 `AIBackfillChatModal.tsx` 中的日志 / 待办 / 子任务 / 编辑应用逻辑迁出

5. 在 `aiService` 上新增统一单轮请求入口，例如：
   - `requestUnifiedAssistantTurnWithDebug()`

6. 前台切到新主链路
   - 去掉默认 intent router
   - 用统一输出结果直接驱动回复、动作、reminder、记忆 sidecar

7. 后台切到新主链路
   - `assistantOrchestratorService` 改为组装统一输入并消费统一输出

8. 删除旧前台多 planner 主链路

## 风险控制

### 风险 1：统一 schema 后 prompt 过重

控制方式：

- 保留候选字典全量，但严格裁掉无关字段
- 文本状态摘要保持轻量

### 风险 2：后台过度主动打扰

控制方式：

- 后台 mode prompt 明确低打扰原则
- 第一版禁止后台直接改应用数据
- 后续再接入 quiet hours 和 minimum nudge gap 的硬逻辑控制

### 风险 3：单轮 schema 过大导致模型不稳定

控制方式：

- 结果字段保持极简
- 统一 JSON 解析兜底
- 限制不同模式的输出预算

### 风险 4：重构跨度大

控制方式：

- 先抽执行层
- 再切前台
- 后切后台
- memory sidecar 暂不并回主链路

## 验证

至少验证以下场景：

1. 前台闲聊回合只返回正文，不产生误动作
2. 前台创建日志、待办、子任务、修改待办、修改日志都能单轮完成
3. 前台信息不足时返回单句澄清，不执行动作
4. 前台可以创建 reminder
5. 后台 check-in 可以 `silent` 或发送短消息
6. 后台 `reminder_due` 会结合延迟情况判断是否仍提醒
7. 前台成功回合后 memory sidecar 仍可异步更新记忆
8. `npm run build` 通过

## 结论

本次设计的核心不是增加更多 AI 能力，而是把已存在的前台工具调用、后台系统触发、长期记忆、reminder 队列收敛成一套统一 turn 架构：

- 单轮主调用
- 分层 prompt
- 统一输入
- 统一输出
- 独立动作执行层
- 结构化 reminder 与记忆

这样可以优先解决当前最痛的两个问题：

- 回复慢
- 链路乱

同时为后续扩展更强的 agent 能力保留清晰边界。
