# Android AI Agent 集成设计

日期：2026-04-26

## 目标

- 在现有 LumosTime AI 助理基础上增加 Android 常驻的后台 Agent 能力。
- 让 AI 具备可持久化、可实时更新的结构化记忆，而不是只依赖当前聊天上下文。
- 让 AI 能在移动端后台轮询、被系统事件唤醒，并自主决定是否提醒、是否沉默、是否更新待办或记忆。
- 复用现有 `AIBackfillChatModal + aiService` 的对话与动作执行能力，不重做整套 AI 调用链。
- 借鉴 `cyberboss` 的提醒队列、系统触发、随机 check-in 和 Prompt 结构，但不接入微信通道。

## 非目标

- 第一版不支持 iOS。
- 第一版不把完整模型推理全部下沉到原生 Java 服务中。
- 第一版不照搬 Cyberboss 的微信人格文案、timeline、diary 全家桶。
- 第一版不引入多 Agent 协作。

## 现状判断

当前仓库已经具备以下基础能力：

- 前台 AI 入口：`src/components/AIBackfillChatModal.tsx`
- 模型调用与工具规划：`src/services/aiService.ts`
- 本地待办、日志、子任务的 AI 落地执行
- Android 前台服务与插件桥：
  - `android/app/src/main/java/com/mistycrown/lumostime/FocusNotificationPlugin.java`
  - `android/app/src/main/java/com/mistycrown/lumostime/FloatingWindowService.java`
  - `android/app/src/main/java/com/mistycrown/lumostime/AppMonitorService.java`

因此，本次集成的重点不是“把 AI 跑起来”，而是补齐以下三层：

- 记忆层
- 后台轮询 / 唤醒层
- 系统触发到 AI 的统一 orchestrator 层

## 从 Cyberboss 借鉴什么

本次整合应借鉴 Cyberboss 的机制，而不是照搬其微信桥接。

最值得借鉴的点：

- `session-store` / `thread-state-store`
  - 把线程绑定、运行状态、上下文更新从模型内部记忆拆到外部持久层。
- `reminder-queue-store`
  - Reminder 不是普通闹钟，而是“模型给未来自己的伏笔”。
- `system-message-queue-store`
  - 后台系统触发不是直接发通知，而是先进入内部 system queue，再走一次模型判断。
- `system-checkin-poller`
  - 随机区间唤醒，而不是固定整点提醒。
- `system-message-dispatcher`
  - 后台 turn 需要专门的 system prompt，要求模型先决定是否行动，最后只输出极简结果。
- `shared-instructions + template`
  - 长期人格 / 行为准则与系统触发 prompt 分层，不混在一个 prompt 里。

不应照搬的点：

- WeChat 通道与 context token
- WeChat thread opening text
- 与微信强绑定的关系文案
- 与 timeline-for-agent 紧耦合的数据结构

## 推荐架构

采用方案 B：新增独立 Android Agent 服务。

### 为什么不复用 FloatingWindowService

- `FloatingWindowService` 的职责是悬浮球 UI、通知展示与交互，不应承载 AI 轮询与记忆更新。
- 若把 agent loop 塞进悬浮球服务，后续会把 UI、后台任务、模型触发、提醒队列耦成一团。
- 悬浮窗权限与 AI 常驻权限并不是同一件事，解耦后更容易做“有 agent、无悬浮球”的场景。

### 推荐总链路

```text
Android AssistantAgentService
  -> 产生 system trigger
  -> AssistantAgentPlugin 通知前端 TS
  -> assistantOrchestratorService
  -> aiService
  -> 本地动作执行 / 记忆更新 / reminder 队列更新
  -> 通知栏 / 悬浮球 / AI 聊天会话回流
```

## 模块设计

### 1. 记忆层

新增：

- `src/types/assistant.ts`
- `src/services/assistantMemoryService.ts`

记忆不保存成“无限聊天历史”，而是分成三层：

1. 会话历史
   - 继续使用现有 `AIBackfillChatModal` 的 session 消息。
2. 结构化长期记忆
   - 保存用户稳定特征、偏好、未关闭事项。
3. 工作记忆摘要
   - 为下一次 system turn 提供短摘要，控制 token 成本。

建议数据结构：

```ts
export interface AssistantReminder {
  id: string;
  type: 'self_followup' | 'todo_due' | 'idle_check' | 'focus_check';
  dueAt: string;
  status: 'pending' | 'done' | 'cancelled';
  text: string;
  todoId?: string;
  source: 'user' | 'agent' | 'system';
  createdAt: string;
}

export interface AssistantMemory {
  version: 1;
  updatedAt: string;
  profileMemory: string[];
  preferenceMemory: string[];
  lastKnownState?: string;
  workingMemorySummary?: string;
  activeReminders: AssistantReminder[];
  recentDecisions: string[];
  lastAgentRunAt?: string;
}
```

建议存储键：

- `lumostime_assistant_memory_v1`
- `lumostime_assistant_reminders_v1`
- `lumostime_assistant_agent_config_v1`

### 2. 后台轮询层

新增：

- `android/app/src/main/java/com/mistycrown/lumostime/AssistantAgentService.java`
- `android/app/src/main/java/com/mistycrown/lumostime/AssistantAgentPlugin.java`

职责划分：

- `AssistantAgentService`
  - Android 前台常驻 service
  - 维护下一次轮询时间
  - 维护随机 check-in
  - 检查 reminder 到期
  - 监听可用的本地事件入口
  - 触发 JS 侧进行 system turn
- `AssistantAgentPlugin`
  - 作为 Capacitor 桥
  - 暴露 start / stop / config update / emit trigger
  - 向 WebView 派发 plugin event

建议第一版轮询源：

- 固定轮询：每 3 到 5 分钟
- 随机 check-in：例如 45 到 120 分钟区间内随机
- 到期 reminder：精确触发
- 本地事件触发：
  - 用户新发消息
  - 待办有变化
  - 开始 / 结束专注
  - 长时间 idle

### 3. Orchestrator 层

新增：

- `src/services/assistantOrchestratorService.ts`

它是后台与前台的统一 AI 入口，所有 turn 都经由它进入 `aiService`。

输入分为两类：

- `user_turn`
- `system_turn`

建议触发类型：

```ts
export type AssistantSystemTriggerType =
  | 'checkin'
  | 'reminder_due'
  | 'long_idle'
  | 'focus_started'
  | 'focus_ended'
  | 'todo_changed'
  | 'manual_background_nudge';
```

system turn 的执行流程：

1. 读取当前记忆
2. 读取当前 todo / log / active session 快照
3. 读取 trigger 信息
4. 拼装 system trigger prompt
5. 调用 `aiService`
6. 解析返回动作
7. 执行动作
8. 更新记忆
9. 必要时写回聊天会话或发通知

### 4. 动作层

建议不要让 system turn 直接自由输出文本，而要让它返回动作结构。

建议第一版动作：

- `silent`
- `send_message`
- `create_reminder`
- `update_memory`
- `create_todo`
- `update_todo`
- `create_subtask`

其中：

- `create_todo / update_todo / create_subtask` 尽量复用现有 `aiService` 和 `AIBackfillChatModal` 的本地应用逻辑
- `send_message` 第一版可以写入本地 AI 会话 + 触发系统通知
- `silent` 表示这次系统唤醒不打扰用户

## Prompt 设计

### 原则

不要把所有行为写进一个超长 prompt。

应该拆成两类 prompt：

1. 长期人格 prompt
2. 系统触发 prompt

### 文件建议

新增：

- `static/assistant/assistant-persona.md`
- `static/assistant/assistant-system-trigger.md`

### 长期人格 prompt

目标：

- 保留陪伴感、节奏管理感、轻推动感
- 不写成微信人格扮演文案
- 面向 LumosTime 的任务、专注、时间记录场景

核心内容：

- 用户容易启动困难、容易漂移
- 优先减少用户认知负担
- 少说教，少模板腔
- 可以主动提醒，但不要机械频繁刷存在感
- 重点是维持节奏感、状态感、连续性

### 系统触发 prompt

目标：

- 明确这是内部触发，不是用户主动发言
- 先判断是否值得行动
- 可调用内部动作
- 最终只返回一个极简结构结果

建议格式：

```text
SYSTEM ACTION MODE

This is an internal trigger, not a user chat.
Your job is to decide whether to do nothing, update memory, create a reminder, or send one short message.

Priorities:
1. Avoid unnecessary interruption.
2. Maintain continuity with the user's actual state.
3. Prefer short, concrete nudges over lectures.
4. If context is uncertain, be conservative.

Return one JSON object only:
{"action":"silent"}
{"action":"send_message","message":"..."}
{"action":"create_reminder","dueAt":"...","text":"..."}
{"action":"update_memory","memoryPatch":{...}}
```

### Prompt 注入策略

建议在 `assistantPromptService.ts` 中统一拼装：

- persona prompt
- memory summary
- current todo snapshot
- current active session snapshot
- trigger payload
- tool/action schema

不要把 prompt 拼接逻辑散在组件里。

## 与现有代码的复用边界

### 直接复用

- `src/services/aiService.ts`
- `src/components/AIBackfillChatModal.tsx` 中已有的 tool/action 应用逻辑
- todo / log / subtask 本地执行逻辑

### 需要抽离或扩展

- 把 `AIBackfillChatModal.tsx` 中一部分“AI 执行动作应用逻辑”逐步抽到独立 service
- 给 `aiService.ts` 增加 system turn 调用入口
- 给 AI 会话增加“后台消息注入”的能力

### 不建议复用

- Cyberboss 的 WeChat inbound / outbound 模型
- context token
- thread opening text

## Android 设计细节

### AssistantAgentService

建议职责：

- `START_STICKY`
- 前台通知保活
- 维护 handler / runnable
- 读取 agent config
- 定时发 plugin event 到 TS 侧
- 接收 TS 侧更新配置结果

建议能力：

- `startAgentLoop`
- `stopAgentLoop`
- `setPollingConfig`
- `triggerImmediateCheckin`

### AssistantAgentPlugin

建议接口：

```ts
startAgent(options?: {
  enableRandomCheckin?: boolean;
  minCheckinMinutes?: number;
  maxCheckinMinutes?: number;
  basePollMinutes?: number;
}): Promise<void>;

stopAgent(): Promise<void>;

updateAgentConfig(config: AssistantAgentConfig): Promise<void>;

notifyUserTurn(payload: { text: string; at: string }): Promise<void>;

notifyTaskStateChanged(): Promise<void>;

addListener('assistantSystemTrigger', ...);
```

### Manifest

在 `AndroidManifest.xml` 中新增 `AssistantAgentService`。

建议先沿用：

- `android:foregroundServiceType="dataSync"`

如果未来职责更偏用户可感知陪伴通知，也可根据 Android 新版本规则再调整。

## 第一版建议实施顺序

1. 新增 TS 类型与记忆 service
2. 新增 reminder queue service
3. 新增 assistant orchestrator service
4. 给 `aiService.ts` 增加 system turn 入口
5. 新增 Android `AssistantAgentService`
6. 新增 `AssistantAgentPlugin`
7. 接入应用启动 / 设置开关
8. 后台触发结果回流到 AI 会话与通知栏
9. 补最小测试与手工验证

## 文件级实施清单

### 新增文件

- `src/types/assistant.ts`
- `src/services/assistantMemoryService.ts`
- `src/services/assistantReminderQueueService.ts`
- `src/services/assistantOrchestratorService.ts`
- `src/services/assistantPromptService.ts`
- `src/plugins/AssistantAgentPlugin.ts`
- `src/plugins/assistantAgentWeb.ts`
- `static/assistant/assistant-persona.md`
- `static/assistant/assistant-system-trigger.md`
- `android/app/src/main/java/com/mistycrown/lumostime/AssistantAgentService.java`
- `android/app/src/main/java/com/mistycrown/lumostime/AssistantAgentPlugin.java`

### 修改文件

- `src/services/aiService.ts`
- `src/components/AIBackfillChatModal.tsx`
- `src/App.tsx`
- `src/views/SettingsView.tsx`
- `src/plugins/README.md`
- `android/app/src/main/AndroidManifest.xml`

## 风险与取舍

### 风险 1：WebView 后台不稳

说明：

- 仅靠 TS 里的 `setInterval` 在 Android 后台不够可靠。

策略：

- 把轮询与触发下沉到 `AssistantAgentService`
- 第一版仍允许 TS 侧负责 AI 请求与动作执行

### 风险 2：后台触发过于频繁，打扰用户

说明：

- 如果直接把 check-in 频率写死，会很快变成噪音。

策略：

- system trigger prompt 允许 `silent`
- 增加最短打扰间隔
- 记忆里存最近一次主动提醒时间

### 风险 3：记忆越积越多

说明：

- 直接堆聊天历史会让 prompt 失控。

策略：

- 长期记忆结构化
- 工作记忆压缩为摘要
- 定期清理 stale open loops

## 第一版完成标准

- Android 上可以显式开启 / 关闭后台 agent
- 后台 agent 能轮询运行
- reminder 到期后能触发一次 system turn
- system turn 能选择 `silent` 或发一条短消息
- AI 记忆可持久化并在后台运行后更新
- 用户前台打开 AI 助理时能看到后台产生的相关结果

## 后续可扩展方向

- 与悬浮球联动，让 agent 状态体现在悬浮窗中
- 根据专注状态、app 切换、睡眠节奏优化触发类型
- 增加 diary / day summary
- 将部分推理进一步下沉到原生层，减少 WebView 依赖
