# 前台长期记忆 Sidecar 设计

日期：2026-04-26

## 目标

- 让前台 AI 助理在每次成功回合后，额外判断一次是否需要更新长期记忆。
- 不修改现有 `chat / add_log / edit_log / add_todo / update_todo / create_subtask` 主返回结构。
- 继续复用现有 `AssistantMemory`、`assistantMemoryPatch` 和本地持久化逻辑。
- 暂不实现手动编辑长期记忆 UI，只保留现有只读查看器与清空入口。

## 范围

本次仅覆盖前台 AI 聊天面板中的成功回合：

- `chat`
- `add_log`
- `edit_log`
- `add_todo`
- `update_todo`
- `create_subtask`

以下情况不触发长期记忆更新 sidecar：

- `clarify`
- 主回合报错
- 用户主动中止
- 工具调用全部失败
- 长期记忆开关关闭

## 方案选择

### 方案 A：把 `memoryPatch` 塞进每个前台 prompt 的返回结构

优点：

- 少一次模型调用。

缺点：

- 需要修改所有前台主 schema。
- 主任务与记忆任务耦合，容易互相干扰。
- 后续维护成本高。

### 方案 B：主回合成功后单独跑一个 memory sidecar turn

优点：

- 主链路保持稳定。
- 记忆更新逻辑独立，便于后续扩展、限流和调试。
- 记忆可以基于最终成功结果落库，减少误记。

缺点：

- 会多一次轻量 AI 调用。

### 方案 C：直接复用后台 `assistantOrchestratorService.runSystemTurn`

优点：

- 复用最多。

缺点：

- 后台 system turn 允许 `silent / send_message / create_reminder / update_memory`。
- 前台 sidecar 只应负责记忆更新，直接复用会造成职责混杂。

### 结论

采用方案 B，并少量复用现有记忆存储层和 prompt 组装能力。

## 触发时机

前台主回合成功结束后，再异步触发一次前台长期记忆 sidecar。

规则：

1. 主回合先完成并把结果展示给用户。
2. sidecar 不阻塞主回复。
3. 只有成功回合才触发。
4. sidecar 失败时只记日志，不影响用户体验。

## 数据流

### 输入上下文

sidecar 请求需要组装一份紧凑上下文，包含：

- 当前时间
- 默认日期
- 用户原始输入
- 已判定的前台回合类型
- AI 给用户的最终回复文本
- 已成功应用的动作摘要
- 当前长期记忆快照
- 可选的近期对话摘要

这里不需要把整段历史全量灌进 prompt，只保留真正会影响是否写入长期记忆的最小上下文。

### 输出结构

新增一个前台 sidecar 专用决策结构，只允许两种动作：

```json
{"action":"no_update"}
{"action":"update_memory","memoryPatch":{...}}
```

`memoryPatch` 继续复用现有结构，可更新：

- `profileMemory`
- `preferenceMemory`
- `lastKnownState`
- `workingMemorySummary`
- `openLoops`
- `recentDecisions`

### 落库

如果 sidecar 返回 `update_memory`，则调用现有 `assistantMemoryService.applyPatch()` 落库。

## Prompt 约束

需要新增一个前台 sidecar 专用 prompt 模板，与后台 system trigger prompt 分开。

核心约束：

- 只判断是否需要更新长期记忆。
- 不允许发送聊天消息。
- 不允许创建 reminder。
- 只有对后续回合真的有帮助的信息才写入长期记忆。
- 避免重复写泛泛总结，宁可返回 `no_update`。

## 文件改动

### `src/types/assistant.ts`

新增前台长期记忆 sidecar 的请求与结果类型。

### `src/services/aiService.ts`

新增一个专用 AI 入口，例如：

- `requestAssistantMemoryUpdateWithDebug()`

该入口只接受 sidecar prompt，并只返回 `no_update | update_memory`。

### `src/services/assistantPromptService.ts`

新增前台 sidecar prompt 组装函数，和后台 `buildSystemTurnPrompt()` 分开。

### `src/components/AIBackfillChatModal.tsx`

新增统一的前台 memory sidecar 执行函数，例如：

- `runForegroundMemorySidecar()`

由各类成功回合复用。

### `static/assistant/assistant-memory-sidecar.md`

新增前台长期记忆 sidecar 的 prompt 模板。

## 调试与可观测性

- debug mode 开启时，把 sidecar 请求与返回作为单独 debug section 挂到当前消息。
- debug mode 关闭时，sidecar 静默执行。
- sidecar 失败仅输出控制台日志，不弹错误提示、不污染聊天内容。

## 风险控制

### 风险 1：重复写入低价值记忆

控制方式：

- prompt 明确要求只记录新增且高价值信息。
- 继续复用 `assistantMemoryService.applyPatch()` 的字符串去重逻辑。

### 风险 2：sidecar 干扰主回合体验

控制方式：

- 主回合先展示结果。
- sidecar 后台异步执行。
- sidecar 错误不回流给用户。

### 风险 3：错误记忆失败结果

控制方式：

- 仅在成功回合后触发。
- `clarify`、报错、中止、全失败都跳过。

### 风险 4：职责扩散

控制方式：

- sidecar schema 只允许 `no_update` 与 `update_memory`。
- 不复用后台可发消息的 action schema。

## 验证

至少需要验证以下场景：

1. 普通聊天成功后，能写入新的偏好或状态记忆。
2. 成功创建或修改待办后，能写入 open loop 或工作记忆摘要。
3. `clarify`、失败和中止场景不会写长期记忆。
4. 非法 JSON 或异常响应会安全回退为 `no_update`。
5. 最终 `npm run build` 通过。

## 实施顺序

1. 新增 sidecar 类型定义。
2. 新增 prompt 模板与 prompt 组装函数。
3. 新增 AI sidecar 请求入口。
4. 在前台成功回合后接入统一 sidecar 执行函数。
5. 补最小测试与构建验证。
