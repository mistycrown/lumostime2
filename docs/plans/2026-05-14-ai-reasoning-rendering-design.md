# AI 推理内容识别与渲染设计

日期：2026-05-14

## 背景

当前 AI 对话链路已经能稳定处理：

- 前台统一单轮对话
- 后台 assistant 系统触发
- 多 provider 的结构化 JSON 输出
- 本地会话持久化
- 多气泡正文渲染

但现在的消息模型里只有：

- `content`
- `displayParts`
- `debugSections`

也就是说，如果某些推理模型返回了可展示的 reasoning / thinking / reasoning_content，这些内容要么根本没有被解析，要么只留在原始 response body 里，没有进入正式消息结构，因此无法在聊天界面中稳定渲染，也无法随会话一起持久化。

这次要补的是一条完整链路：

1. 针对不同模型厂商识别推理内容
2. 归一成统一字段
3. 前台与后台统一持久化
4. 在聊天界面中默认折叠展示

## 目标

- 支持在 AI 对话消息中展示模型返回的推理内容。
- 前台聊天与后台 assistant 消息使用同一套 reasoning 数据结构。
- 推理内容默认折叠，不打断主回答阅读。
- 推理内容随本地会话一起持久化，重开后仍可查看。
- 尽量兼容 OpenAI-compatible、Gemini 以及已接入的常见第三方兼容厂商。
- 当 provider 不返回 reasoning 时，现有聊天体验保持不变。

## 非目标

- 本轮不尝试“强制所有模型都吐出推理内容”。
- 本轮不把推理内容混入 `assistantReply` 正文。
- 本轮不做单独的推理页、全屏查看器或复杂 diff 视图。
- 本轮不把 reasoning 接入 long-term memory、Dream 或 reminder 逻辑。
- 本轮不在 UI 中新增“是否请求更多 reasoning”之类的 provider 参数控制面板。

## 已确认的产品边界

- 推理内容同时支持前台和后台消息。
- 推理内容默认折叠展示。
- 推理内容要持久化到本地会话。
- 主回答仍然是对话流的第一内容，推理内容作为该消息的附属块出现。

## 方案对比

### 方案 A：只从 debug 原始响应中临时读取 reasoning

做法：

- 不改正式消息结构
- 渲染层直接从 `debugSections[].exchange.response.body` 中猜测 reasoning 字段

优点：

- 改动最小

缺点：

- reasoning 变成“依赖 debug 的副产物”，不是正式数据
- 关闭 debug、清理调试数据或历史消息缺少 debug 时会丢失
- 前台和后台渲染层都需要重复做 provider 适配
- 难以持久化和统一测试

### 方案 B：让模型把推理过程直接写进 `assistantReply`

做法：

- 通过 prompt 要求模型把“回答”和“推理过程”一起写回正文

优点：

- 实现简单

缺点：

- 这不是对 provider 原生 reasoning 的识别
- 容易污染主回答体验
- 不同模型执行一致性很差
- 后续很难做折叠展示和结构化持久化

### 方案 C：在 `aiService` 统一抽取 reasoning，再走正式消息链路

做法：

- provider 解析层识别不同响应中的 reasoning
- 归一成统一的 `reasoningParts`
- 写入统一 turn output、前台消息结构、后台持久化消息结构
- UI 只渲染统一字段，不直接理解 provider 差异

优点：

- 架构最清晰
- 前后台一套模型
- 最适合持久化、回放、测试和后续扩展

缺点：

- 需要改类型、消息持久化和渲染层

### 结论

采用方案 C。

## 总体设计

把 reasoning 当成“assistant 消息的附属内容层”处理，而不是正文的一部分。

链路分为四层：

1. `aiService`
   - 识别 provider 返回中的 reasoning 原始字段
   - 归一成统一 reasoning 结构

2. turn / orchestrator 层
   - 前台 unified turn 与后台 assistant turn 都携带 reasoning
   - 保持 reasoning 与 `assistantReply` 同生命周期

3. 消息持久化层
   - 聊天消息新增 reasoning 字段
   - 后台落库消息也新增相同字段

4. UI 渲染层
   - assistant 消息正文照常显示
   - 正文下方新增“推理过程”折叠块
   - 默认收起，用户手动展开

## 数据结构设计

### 统一 reasoning 结构

为避免一开始过度设计，本轮不做复杂 token 级标注，统一使用文本分段。

```ts
interface AssistantReasoningPart {
  text: string;
}
```

```ts
interface AssistantReasoningSummary {
  parts: AssistantReasoningPart[];
  providerLabel?: string;
}
```

说明：

- `parts` 用于兼容不同 provider 可能返回的多段 thinking / reasoning。
- `providerLabel` 是可选调试辅助字段，用于标记 reasoning 来源，例如 `openai-compatible`, `gemini`, `deepseek`, `qwen`，但 UI 不强依赖它。

### Unified turn 输出扩展

在 `src/types/assistant.ts` 的 `AssistantUnifiedTurnOutput` 中新增：

```ts
reasoning?: AssistantReasoningSummary;
```

规则：

- reasoning 是可选字段。
- 即使存在 reasoning，也不影响 `assistantReply`、`toolCalls`、`memoryAction` 等现有字段语义。
- `outcome === 'silent'` 的后台回合通常不会展示消息，因此 reasoning 只在实际 surfaced message 存在时进入聊天会话。

### 聊天消息结构扩展

在 `AIBackfillChatModal.tsx` 的 `AIChatMessage` 中新增：

```ts
reasoning?: AssistantReasoningSummary;
```

在 `assistantOrchestratorService.ts` 的持久化消息结构 `PersistedAIChatMessage` 中新增同名字段。

这样前台消息、后台消息、重载后的本地消息会共用一套结构。

## Provider 识别策略

### 设计原则

- 先做“宽识别，严归一”。
- provider 差异只留在 `aiService`。
- UI 和业务层不关心原始 response shape。
- 优先读取官方或主流兼容格式里的 reasoning 字段；读不到就优雅回退。

### OpenAI-compatible 路径

当前项目的 OpenAI 家族都走 `/chat/completions`。

兼容识别顺序建议如下：

1. `choices[0].message.reasoning_content`
2. `choices[0].message.reasoning`
3. `choices[0].message.thinking`
4. `choices[0].message.content` 中的结构化数组项里，若存在 `type === 'reasoning'` / `type === 'thinking'`
5. `choices[0].delta.reasoning_content` 之类的兼容字段

适配对象包括但不限于：

- DeepSeek
- DashScope / Qwen OpenAI-compatible
- Moonshot / Kimi OpenAI-compatible
- OpenRouter 上的部分 reasoning model
- 其他兼容 `/chat/completions` 的第三方

### Gemini 路径

当前 Gemini 走 `generateContent`。

优先检查：

1. `candidates[0].content.parts[]` 中可能的 reasoning / thought 类型片段
2. `candidates[0].groundingMetadata` 或其他思考片段承载位
3. 若返回里没有 reasoning 专用段，则视为不支持本轮 reasoning 抽取

说明：

- Gemini 不同模型、不同 API 版本对 thinking 暴露方式可能不同。
- 本轮以“能识别就展示，识别不到就不展示”为原则，不强行猜正文。

### 归一规则

无论原始 provider 返回是：

- 单字符串
- 多字符串数组
- 结构化 content parts

最终都归一为：

```ts
{
  parts: [{ text: '...' }, { text: '...' }]
}
```

同时做如下清洗：

- 去掉空串
- 过滤 `null` / `undefined`
- trim 首尾空白
- 去重完全相同的重复段
- 若清洗后为空，则不返回 reasoning 字段

## 前台数据流

前台链路当前是：

`assistantTurnService.runUnifiedTurn -> aiService.requestAssistantUnifiedTurnWithDebug -> AIBackfillChatModal.replacePendingWithResult`

扩展后变为：

1. `aiService` 返回：
   - `output.assistantReply`
   - `output.reasoning`
   - `debug`

2. `AIBackfillChatModal` 在替换 pending 消息时：
   - 正文仍走 `content`
   - 正文多气泡仍走 `displayParts`
   - reasoning 走 `reasoning`

3. 会话本地存储时，reasoning 与正文一起进入 `lumostime_ai_chat_sessions_v1`

这样前台重试、刷新、重开窗口都能保留 reasoning。

## 后台数据流

后台链路当前是：

`assistantOrchestratorService.runSystemTurn -> persistAssistantMessage`

扩展后：

1. 后台 unified turn 同样从 `aiService` 拿到 `output.reasoning`
2. 只有当后台最终真的 surfaced message 时，才将 reasoning 一起落入持久化聊天消息
3. `AssistantBackgroundCallHistoryEntry` 可选带上 reasoning 摘要或完整 reasoning

推荐本轮做法：

- 聊天消息持久化完整 reasoning
- 背景 call history 不额外重复存整份 reasoning，只继续保留 debugExchange

原因：

- reasoning 的主要消费场景是聊天消息查看
- call history 继续承担“诊断链路”职责，不重复堆大文本

## UI 设计

### 展示位置

在每条 assistant 消息的主正文下方渲染 reasoning 折叠块，顺序为：

1. assistant 正文气泡
2. 时间 / 上下文 / 调试入口
3. reasoning 折叠块
4. memory updates / reminder updates / applied actions 等附属区域

这样主回答优先级最高，reasoning 不会抢占正文阅读焦点。

### 默认状态

- 默认收起
- 仅当 `message.reasoning?.parts.length > 0` 时显示入口
- 折叠标题建议用：`推理过程`

展开后显示：

- 按段渲染 reasoning parts
- 继续使用 Markdown 渲染
- 样式比正文更弱一些，明确它是附属信息

### 交互细节

- 折叠状态按 message id 保存在组件本地 state 中
- 不需要持久化“展开/收起”状态
- 收起态建议显示一行入口，例如：`推理过程 · 展开`
- 展开态建议显示：`推理过程 · 收起`

### 样式方向

- 视觉上弱于正文 bubble
- 可使用浅底、细边框、较小字号
- 保持可复制文本，不做逐字动画
- 长推理内容允许纵向自然展开，不额外截断

## 兼容与回退

### 无 reasoning 的模型

- 不显示 reasoning 区块
- 其余逻辑完全不变

### 返回异常或字段不稳定

- 若 provider reasoning 字段解析失败，只忽略 reasoning，不让整轮消息失败
- `assistantReply` 仍按现有逻辑正常走

### 历史消息兼容

- 历史消息没有 `reasoning` 字段时，`normalizeMessages` 直接忽略即可
- 不需要迁移旧存储版本

### Debug 与 reasoning 的关系

- debug 继续保留原始 request/response
- reasoning 不再依赖 debug 才能显示
- debug 只是 reasoning 识别失败时的排查依据

## 需要修改的文件

核心文件预计包括：

- `src/types/assistant.ts`
- `src/services/aiService.ts`
- `src/services/aiService.test.ts`
- `src/services/assistantTurnService.ts`
- `src/services/assistantTurnService.test.ts`
- `src/services/assistantOrchestratorService.ts`
- `src/components/AIBackfillChatModal.tsx`

如有必要，可补一个 reasoning 归一工具文件，例如：

- `src/utils/assistantReasoning.ts`

这样可以把 provider 抽取、文本清洗和消息归一从 `aiService.ts` 中拆出来，避免主服务继续膨胀。

## 测试设计

### 单元测试

`aiService.test.ts`

- OpenAI-compatible 返回 `reasoning_content`
- OpenAI-compatible 返回 `thinking`
- OpenAI-compatible 返回 content parts 形式 reasoning
- Gemini 返回可识别 reasoning parts
- provider 无 reasoning 字段
- reasoning 字段为空、null、重复、混乱类型时的清洗

`assistantTurnService.test.ts`

- unified turn 结果能透传 reasoning
- reasoning 缺失时不影响现有 schema

`assistantOrchestratorService` 测试

- 后台 surfaced message 会持久化 reasoning
- 后台 silent turn 不会凭空插入 reasoning 消息

### 组件测试

`AIBackfillChatModal`

- 有 reasoning 的 assistant 消息显示折叠入口
- 默认收起
- 点击后展开 reasoning 内容
- 无 reasoning 的消息不显示入口
- 历史消息 hydration 时 reasoning 能正常显示

### 手动验证

至少验证：

1. 前台普通模型无 reasoning 时界面无回归
2. 前台推理模型 reasoning 可展开查看
3. 刷新后 reasoning 仍在
4. 后台 assistant surfaced message 若有 reasoning，也能在聊天里展开
5. debug 开关关闭时 reasoning 仍可见

## 风险与控制

### 风险 1：不同 provider 字段差异太大

控制：

- 把所有 provider 适配都压在 `aiService`
- 先覆盖当前仓库最可能使用的 OpenAI-compatible / Gemini / DashScope / DeepSeek 路径
- 无法识别时静默回退

### 风险 2：reasoning 文本过长，影响聊天可读性

控制：

- 默认折叠
- 样式降权
- 不和正文混排

### 风险 3：本地会话体积增长

控制：

- 本轮先不做截断
- 后续如发现增长明显，可再加 provider/model 级开关或字数裁剪策略

### 风险 4：把调试数据和产品数据混在一起

控制：

- reasoning 作为正式字段存储
- debug 继续只承担调试职责

## 实施顺序

1. 扩展类型定义与消息结构
2. 在 `aiService` 增加 reasoning 抽取与归一
3. 打通前台 unified turn 的 reasoning 透传与持久化
4. 打通后台 orchestrator 的 reasoning 持久化
5. 在 `AIBackfillChatModal` 增加折叠渲染
6. 补测试并做手动回归

## 结论

这次改动的关键不是“把某个厂商的 thinking 文本临时画出来”，而是把 reasoning 正式纳入 assistant 消息模型。

完成后，这套聊天系统会具备：

- provider 侧 reasoning 识别能力
- 前后台统一 reasoning 数据结构
- 本地会话级 reasoning 持久化
- 默认折叠、不打扰正文的 reasoning 展示

这样后续无论接入新的推理模型，还是补更多 provider 适配，都只需要扩展 `aiService` 的识别层，而不需要反复改聊天 UI 的核心结构。
