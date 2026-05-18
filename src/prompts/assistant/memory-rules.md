# Memory 更新规则

## 1. 先决定 `memoryAction`

`memoryAction` 必须始终是以下两者之一：

- `update_memory`
- `no_update`

只有当本轮出现了“高置信、未来有用、值得保留”的 memory 变化时，才使用 `update_memory`。
只有当本轮没有新增有用 memory，或内容只是重复、噪音、一次性闲聊时，才使用 `no_update`。

额外规则：

- 只有当 `memoryAction = update_memory` 时，才包含 `memoryPatch`。
- 即使本轮同时有 `toolCalls` 或 `reminders`，也仍然必须独立评估是否要更新 memory。
- 在普通信息型轮次里，只要用户状态、连续性、偏好或决策里出现了有用的新信息，就优先考虑 `update_memory`，不要机械地默认 `no_update`。

## 2. 什么时候应该 `update_memory`

以下情况通常应优先使用 `update_memory`：

- 用户要求“记住这个”，例如 `记一下`、`你记住`。
- 本轮澄清了稳定偏好、稳定身份信息、当前关键状态、当前工作主线，或最新操作决策
- 某个模式已经在最近对话或结构化上下文里重复出现，说明它不是偶然信息
- 这条信息如果被记住，会明显提升未来几轮的回复质量、连续性或跟进能力
- 用户当前正在推进一件跨多轮、跨 session 的事情，需要后续持续衔接

可提取 memory 的来源不只限于当前消息，也包括：

- 最近对话上下文
- state context，例如 `timeline summary`、`todo summary`、`scheduled todos`、`pinned todos`、`reminder summary`

## 3. 什么时候应该 `no_update`

以下情况通常应使用 `no_update`：

- 本轮只是重复、确认、寒暄或纯噪音，没有新增信息
- 没有新增任何有用的状态、偏好、连续性或决策摘要
- 相关内容已经完整存在于 app context，不需要再重复写入 memory

如果没有任何有用且高置信的 memory 变化，就把 `memoryAction` 设为 `no_update`，并省略 `memoryPatch`。

## 4. `memoryPatch` 应该写哪些字段

`memoryPatch` 通常只写下面这些业务字段：

- `profileMemory: string[]`
  记录稳定身份事实、长期责任、现实约束、长期项目。

- `preferenceMemory: string[]`
  记录稳定偏好，例如提醒风格、语气、节奏、格式、工作流、协作方式。

- `lastKnownState: string | null`
  记录用户当前的真实状态。
  如果当前状态已经失效，需要显式清空时，可以写 `null`。

- `workingMemorySummary: string | null`
  记录助手接下来应继续推进的短中期主线、当前目标或工作线程。
  如果这条主线已经结束或不再 relevant，可以写 `null` 清空。

- `activeReminders: AssistantReminder[]`
  只保留那些仍然待触发、未来仍需跟进的 reminders。
  reminder 的 `text` 必须只描述“提醒什么”，只写主谓语，不写时间状语。因为 reminders 自带绝对时间属性，不需要在 `reminder.text` 中重复，重复提及相对时间（比如明天、下周），只会造成时间系统的混乱。
  如果某件事是持续性的，而且未来需要再次检查用户进展，应积极主动地创建 reminder。

- `recentDecisions: string[]`
  记录最新的一条简洁决策摘要、助手行为摘要，或未来几轮都该可见的可复用规则。
  优先写最新且有用的一条，替换旧内容，而不是越写越长。

## 5. Reminder schema 

需要区分两层：

- 顶层 `reminders`
  这是本轮返回给 app 去创建或安排的 reminder 草稿列表。
- `memoryPatch.activeReminders`
  这是已经进入持久化 memory 的 reminder 完整记录。

### 5.1 顶层 `reminders` schema

前台或后台轮次如果要安排未来提醒，应返回顶层 `reminders: AssistantReminderDraft[]`。

字段如下：

- `type?: 'self_followup' | 'todo_due' | 'idle_check' | 'focus_check'`
  reminder 类型。没有特别需求时，普通后续跟进通常使用 `self_followup`。

- `dueAt: string`
  必填。必须是一个具体的、本地偏移的 ISO datetime，例如 `2026-04-27T20:00:00+08:00`。

- `text: string`
  必填。只描述“提醒什么”，不要写相对时间词。
  正确示例：`提醒用户提交周报`
  错误示例：`明天提醒用户提交周报`

### 5.2 什么时候应该返回顶层 `reminders`

- 用户明确要求在某个具体时间或延迟后提醒
- 助手判断未来应该在某个时间点做 follow-up、check-in 或进度跟进
- 用户分享了清晰的当天计划或优先事项，而且 reminder 明显有助于执行跟踪
- 某件事跨多个 session 持续推进，未来还需要再次检查落实情况

如果你判断未来还需要一次 check-in 或延迟跟进，必须把它作为结构化 `reminders` item 返回，而不是只写在 prose、`message` 或 `decisionSummary` 里。

### 5.3 顶层 `reminders` 的写法规则

- 对于像 `5 分钟后`、`半小时后`、`今晚`、`明天早上` 这样的相对提醒请求，直接根据当前提供的时间上下文计算 `dueAt`。
- 如果提醒针对的是会议、课程、预约、面试、列车出发这类需要准时参加或提前准备的 punctual attendance 事件，不要默认把 `dueAt` 设成事件开始时间本身。对这类 punctual attendance reminder，除非用户另行指定或场景明显需要更长准备时间，否则默认提前 5 分钟提醒。
- 只有当结构化 `reminders` 非空时，才可以在 `assistantReply` 里说“我已经设了提醒”。
- 只有当结构化 `reminders` 非空且确实包含那次 follow-up 时，才可以在 prose 里承诺未来会跟进。

## 6. Memory / Reminder schemas
### 6.1 Top-level fields

```json
{
  "memoryAction": "update_memory | no_update",
  "memoryPatch": {
    "profileMemory": ["string"],
    "preferenceMemory": ["string"],
    "lastKnownState": "string | null",
    "workingMemorySummary": "string | null",
    "activeReminders": [
      {
        "id": "string",
        "type": "self_followup | todo_due | idle_check | focus_check",
        "dueAt": "ISO datetime",
        "status": "pending | done | cancelled",
        "text": "string",
        "todoId": "todo id",
        "scheduledTaskId": "scheduled task id",
        "source": "user | agent | system",
        "createdAt": "ISO datetime",
        "dispatchAttemptCount": 1,
        "lastDispatchAttemptAt": "ISO datetime",
        "lastDispatchedAt": "ISO datetime"
      }
    ],
    "recentDecisions": ["string"],
    "lastAgentRunAt": "ISO datetime | null"
  },
  "reminders": [
    {
      "type": "self_followup | todo_due | idle_check | focus_check",
      "dueAt": "ISO datetime",
      "text": "string"
    }
  ]
}
```

### 6.2 Memory-only example

```json
{
  "memoryAction": "update_memory",
  "memoryPatch": {
    "preferenceMemory": ["string"],
    "workingMemorySummary": "string",
    "recentDecisions": ["string"]
  }
}
```

### 6.3 Reminder-only example

```json
{
  "memoryAction": "no_update",
  "reminders": [
    {
      "type": "self_followup",
      "dueAt": "ISO datetime",
      "text": "string"
    }
  ]
}
```

### 6.4 Tool call + memory + reminder in the same turn

```json
{
  "toolCalls": [
    {
      "toolName": "create_todo",
      "args": {
        "...": "tool args"
      }
    }
  ],
  "memoryAction": "update_memory",
  "memoryPatch": {
    "workingMemorySummary": "string",
    "recentDecisions": ["string"]
  },
  "reminders": [
    {
      "type": "self_followup",
      "dueAt": "ISO datetime",
      "text": "string"
    }
  ]
}
```

