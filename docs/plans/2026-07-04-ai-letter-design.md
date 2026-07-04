# AI 来信 Design

## 背景

当前 AI 助手已经具备一套较完整的后台能力：

- `AI 助手 -> 设置 -> 调用设置 -> 后台助理` 中已有后台轮询与长期记忆配置
- 后台轮询可以通过 `assistantOrchestratorService.runSystemTurn(...)` 发起结构化 AI 请求
- 聊天区已经支持“应用结果卡片”展示
- `AI 小报` 已经验证了“结构化写回 + 独立详情页 + 结果卡片”的产品路径
- `assistantBackupService` 已经可以把 AI 相关数据打进统一 JSON 备份并参与云同步

但当前系统还没有“AI 助手主动给用户写一封信”的独立能力。现有后台消息更接近短 check-in 或提醒，不适合承载：

- 固定频率发送
- 固定时间窗触发
- 独立记录列表
- 独立详情页阅读
- 删除与云同步管理

因此本次需要新增一个“AI 来信”能力：复用现有后台 AI 基础设施，但把“来信”作为独立的数据域、调度域和 UI 域接入。

## 目标

- 在 `AI 助手 -> 设置 -> 调用设置 -> 后台助理` 下新增 `来信` 配置
- 支持用户设置：
  - 是否开启来信
  - 来信频率（每 N 天）
  - 来信时间窗（如 `20:00 - 22:00`）
- 来信通过后台轮询能力触发
- AI 来信使用现有后台上下文，但走独立 prompt 和独立结构化返回
- 来信以“应用结果卡片”形式显示在聊天区
- 点击结果卡片可进入独立详情页
- 设置区提供“查看来信记录”入口
- 来信内容存储到用户 JSON 对应数据域，参与现有云同步
- 用户可以在记录页查看和删除往期来信

## 非目标

- 本次不把来信混入普通 `assistantReply` 对话内容作为常规聊天记录主语义
- 本次不把来信挂到 `DailyReview` / `WeeklyReview` / `MonthlyReview` 上
- 本次不做来信评论区、回复线程或用户回信系统
- 本次不做多种来信模板选择器
- 本次不改原生 Android 后台服务的总体模式，只在现有 Web 侧后台联动基础上扩展

## 已确认决策

### 1. 采用“复用主链路 + 独立数据域”的混合方案

保留现有后台助理的这些基础能力：

- 后台轮询 / check-in 唤醒链路
- 上下文构建与 persona prompt
- 统一 AI 调试与请求能力
- 聊天区应用结果卡片样式
- AI 统一备份 / 恢复能力

但新增这些独立能力：

- 来信配置字段
- 来信调度字段
- 来信专用 storage service
- 来信专用结果卡片类型
- 来信详情页
- 来信记录页

### 2. 错过时间窗后采用“补发”策略

用户已确认：

- 如果到达预定来信时间时后台没有成功运行
- 等后台稍后恢复时
- 应当补发这一封来信
- 成功补发后再重新计算下一次来信时间

这意味着：

- 不跳过错过的这一轮
- 也不在恢复后连续补多封历史欠账
- 系统始终只围绕当前 `nextLetterAt` 这一轮来信工作

## 方案对比

### 方案 A：直接复用普通后台消息

做法：

- 到时间后仍走普通 `runSystemTurn(...)`
- 让 AI 直接返回一段 `assistantReply`
- 再从聊天区消息里二次包装为“来信”

优点：

- 改动最少
- 不需要单独存储域

缺点：

- 来信和普通后台 check-in 语义混在一起
- 不利于做独立“来信记录”
- 删除与同步边界会很别扭
- 后续扩展不同类型来信会受限

### 方案 B：复用后台基础设施，但新增独立来信 runner

做法：

- 仍由后台轮询来判断时机
- 仍复用现有上下文构建、persona、memory、dream、debug 能力
- 但 AI 来信改走独立 runner / service / schema / storage / view

优点：

- 与现有架构最兼容
- 数据边界清楚
- UI 和记录管理更自然
- 后续可扩展“晨信 / 晚信 / 周信”等不同类型

缺点：

- 需要新增若干类型和服务
- 开发量比方案 A 稍高

### 方案 C：完全独立子系统

做法：

- 单独做 scheduler、AI request runner、storage、UI，不复用后台助理主链路

优点：

- 边界最彻底

缺点：

- 与现有 AI 助手生态割裂
- 重复造轮子
- 调试、云同步、聊天区卡片都要额外接线

### 结论

采用方案 B。

理由：

- 用户明确要求“模仿后台轮询的请求逻辑增加一次后台请求”
- 同时又要求“查看来信记录”“存入 JSON 参与云同步”“独立详情页”
- 这最适合复用后台助理主能力，但把来信做成独立子域

## 整体架构

功能拆成 5 层：

1. `配置层`
2. `调度层`
3. `生成层`
4. `存储层`
5. `展示层`

### 1. 配置层

扩展 `AssistantAgentConfig`，新增来信相关字段。

建议字段：

```ts
interface AssistantAgentConfig {
  ...
  letterEnabled: boolean;
  letterFrequencyDays: number;
  letterWindowStart?: string; // HHMM
  letterWindowEnd?: string;   // HHMM
  nextLetterAt?: string;      // ISO datetime
  lastLetterSentAt?: string;  // ISO datetime
  lastLetterScheduledAt?: string; // ISO datetime
}
```

说明：

- `letterEnabled`：总开关
- `letterFrequencyDays`：每 N 天一封
- `letterWindowStart` / `letterWindowEnd`：来信时间窗
- `nextLetterAt`：当前这一轮预定触发时间
- `lastLetterSentAt`：最近一次实际成功发送时间
- `lastLetterScheduledAt`：最近一次调度生成出的时间点，便于调试和 UI 展示

### 2. 调度层

在现有后台 agent drain / poll 过程中增加“来信到期判断”。

核心原则：

- 来信不替代普通 check-in
- 来信是并行的另一种后台触发
- 到点后不走普通短消息决策，而是走来信专用 runner

建议引入新的 trigger type：

```ts
type AssistantSystemTriggerType =
  | ...
  | 'assistant_letter_due';
```

但来信实际执行不强绑定到普通 `runSystemTurn(...)` 返回结构，而是由单独 runner 消费这一 trigger。

### 3. 生成层

新增 `assistantLetterService` 与 `assistantLetterOrchestratorService`（或等效命名）的组合。

职责：

- 基于现有后台上下文组装来信 prompt
- 触发 AI 结构化请求
- 校验 AI 返回
- 生成本地 `AssistantLetter`
- 写入存储
- 推进下一次调度
- 生成聊天区应用结果卡片

### 4. 存储层

来信不挂在 review 对象上，使用独立集合保存。

原因：

- 产品语义是“助手来信记录”，不是某个周期回顾的附属物
- 要支持独立历史页和删除
- 要跟 AI 聊天 / memory / reminders 一样参与统一备份

### 5. 展示层

展示分 4 个入口：

- 设置区中的来信配置
- 设置区中的“查看来信记录”
- 聊天区的应用结果卡片
- 独立详情页

## 调度设计

## 触发规则

### 开启来信时

当用户首次开启来信，或者关闭后重新开启来信时：

- 立即计算一次 `nextLetterAt`
- 如果已有旧值，直接覆盖

### 成功发送后

当一封来信成功生成、落库并完成前端写回后：

- 立刻重新计算下一次 `nextLetterAt`
- 更新 `lastLetterSentAt`
- 更新 `lastLetterScheduledAt`

### 关闭来信时

建议行为：

- `letterEnabled = false`
- 清空 `nextLetterAt`

理由：

- 避免 UI 继续显示一个不会触发的计划时间
- 避免重开后误用陈旧调度值

## 时间生成逻辑

假设：

- `letterFrequencyDays = N`
- `letterWindowStart = HHMM`
- `letterWindowEnd = HHMM`

生成规则：

1. 先确定基准日
2. 基准日加上 `N` 天得到目标日
3. 在目标日的时间窗内随机一个具体时刻
4. 保存为 `nextLetterAt`

基准日优先级建议：

1. 上一次成功发送时间 `lastLetterSentAt`
2. 若没有，则当前时间 `now`

这样能保证“每 N 天一封”的节奏以真实发送为准。

## 补发逻辑

用户已确认采用补发策略。

判断规则：

- 如果 `letterEnabled = true`
- 且 `nextLetterAt` 存在
- 且 `now >= nextLetterAt`
- 且这一轮还未成功发送

则：

- 立即触发一次来信生成
- 不要求当前仍处于原时间窗内
- 成功后再推进下一轮

补发只针对当前这一轮：

- 不回补多轮历史欠账
- 不在一次恢复中连发多封

这可以通过“成功后立刻覆盖成新的 `nextLetterAt`”自然实现。

## 失败处理

如果本轮来信生成失败：

- 保留当前 `nextLetterAt`
- 不推进到下一轮
- 等待后续后台轮询继续尝试补发

这样可以保证不会因为一次请求失败而永久跳过一封来信。

## AI 生成协议

## 上下文复用范围

来信请求复用现有后台 assistant 的上下文拼装能力：

- conversation summary
- state context
- dictionary context
- reminder summary
- long-term memory
- Dream context
- persona prompt

这样来信仍然能体现：

- 当前 persona 的角色感
- 对用户近期状态的连续理解
- 与已有后台助理的风格一致性

## Prompt 策略

来信 prompt 采用“现有后台上下文 + 来信专用要求”。

新增一层 letter mode prompt，核心要求：

- 你现在不是发一个短 check-in，而是要写一封信
- 你要扮演当前 persona 给用户写信
- 语气必须符合 persona
- 可以引用近期状态，但不要写成流水账
- 要有完整阅读体验，像信件而不是消息提醒
- 不输出普通聊天 answer_content
- 只返回结构化来信结果

约束建议：

- 中文输出
- 严格 JSON
- 标题、摘要、正文都不能为空
- 正文允许适度分段
- 允许使用轻微书信口吻，但不要过度戏剧化

## 返回协议

推荐新增专用 tool / payload：

```ts
interface AssistantLetterToolCall {
  toolName: 'write_assistant_letter';
  args: {
    title: string;
    preview: string;
    content: string;
  };
}
```

如果需要更完整的结构，也可扩展为：

```ts
interface AssistantLetterToolCall {
  toolName: 'write_assistant_letter';
  args: {
    title: string;
    preview: string;
    content: string;
    toneTags?: string[];
    suggestedFocus?: string[];
  };
}
```

原则：

- 不依赖普通 `assistantReply` 作为主结果
- 系统主要消费 `write_assistant_letter`
- 如需用户可读成功提示，可由本地前端生成 system 风格说明文本

## 存储设计

## 数据模型

建议新增：

```ts
interface AssistantLetter {
  id: string;
  title: string;
  preview: string;
  content: string;
  personaId: string;
  personaName: string;
  scheduledFor: string;
  sentAt: string;
  createdAt: string;
  sourceTriggerId?: string;
  status: 'sent';
}
```

说明：

- `scheduledFor`：原计划发送时间
- `sentAt`：实际成功发送时间
- `createdAt`：本地记录创建时间
- `personaId` / `personaName`：确保后续切换人设后，旧信仍能保留历史身份语义

## 存储方式

新增独立 service，例如：

- `src/services/assistantLetterService.ts`

职责：

- `listLetters()`
- `getLetter(id)`
- `saveLetter(letter)`
- `deleteLetter(id)`
- `clearLetters()` 可选

使用单独 localStorage key，例如：

- `lumostime_assistant_letters_v1`

## 云同步接入

将来信接入 `assistantBackupService`：

- `buildBackupPayload()` 时打包 `letters`
- `applyBackupPayload()` 时恢复 `letters`

建议挂在现有：

```ts
aiData.assistant.letters
```

这样来信就能跟：

- assistant config
- memory
- reminders
- scheduled tasks
- background history

一起参与 JSON 备份与云同步。

## UI 设计

## 设置页

入口位置：

- `AI 助手 -> 设置 -> 调用设置 -> 后台助理`

新增一个 `来信` 配置块，位于后台助理总开关之下，风格跟现有 call settings 保持一致。

包含：

1. `开启来信` 开关
2. `来信频率（天）` 输入
3. `来信时间窗` 起止输入
4. `下一次来信时间` 只读预览
5. `查看来信记录` 按钮

交互规则：

- 关闭时，下方配置可置灰或隐藏
- 开启后保存配置时立即计算下一次来信时间
- 时间输入沿用现有 quiet hours 的 `HHMM` / 归一化策略，避免新造一套时间输入风格

## 聊天区结果卡片

沿用 `应用结果` 区域，不混到普通 assistant 多气泡内容里。

新增结果卡片类型：

- `AIChatAssistantLetterResult`

建议字段：

```ts
interface AIChatAssistantLetterResult {
  letterId: string;
  title: string;
  preview: string;
  scheduledFor: string;
  sentAt: string;
}
```

卡片展示内容：

- 标题
- 一段 preview
- 发送时间
- 打开按钮

点击行为：

- 打开独立详情页

## 详情页

新增：

- `src/views/AssistantLetterDetailView.tsx`

风格要求：

- 参考 `DailyNewspaperView.tsx`
- 极简、印刷感、轻留白
- 不做复杂交互

页面结构建议：

1. 标题
2. 写信人（personaName）
3. 原计划时间 / 实际发送时间
4. 正文

正文允许：

- markdown 段落渲染
- 轻量标题与分段

首版不做：

- 评论区
- 回复线程
- 导出

## 记录页

新增：

- `src/views/AssistantLetterHistoryView.tsx`

入口：

- 设置区 `查看来信记录`

列表项展示：

- 标题
- preview
- sentAt

支持：

- 点击打开详情
- 删除单封

首版不做批量删除，避免扩大范围。

## 触发链路设计

推荐新增独立 runner，而不是强行复用普通后台消息结果 schema。

建议结构：

- `assistantLetterScheduler.ts`
- `assistantLetterService.ts`
- `assistantLetterOrchestratorService.ts`

### Scheduler

负责：

- 校验配置
- 计算 `nextLetterAt`
- 判断是否 due

### Letter Orchestrator

负责：

- 读取当前 assistant config
- 装配上下文
- 调用 AI structured request
- 解析来信 tool call
- 存储来信
- 写入聊天结果卡片
- 更新 config 中的 `lastLetterSentAt` 与新的 `nextLetterAt`

### 与现有 AIBackfillChatModal 的关系

`AIBackfillChatModal` 仍然是当前全局 AI 背景逻辑的主挂载点，因此首版建议：

- 在现有后台 trigger drain / native wake 同级处
- 增加一个“检查是否有到期来信”的 effect / dispatch 逻辑
- 到期时调用来信专用 orchestrator

这样改动面较小，也符合当前架构。

## 错误处理

- 配置非法：
  - 不允许保存
  - UI 给出即时错误提示
- AI 返回 JSON 非法：
  - 视为失败
  - 不保存来信
  - 不推进下一轮
- AI 返回关键字段为空：
  - 视为失败
  - 不保存来信
  - 不推进下一轮
- 保存本地记录失败：
  - 视为失败
  - 不推进下一轮
- 删除失败：
  - 保持列表不变
  - toast 提示

## 测试计划

至少覆盖：

1. `assistantAgentConfigService.test.ts`
   - 来信配置默认值
   - 非法 persisted value 归一化

2. `assistantLetterScheduler.test.ts`
   - 开启时计算 `nextLetterAt`
   - 成功发送后重新调度
   - 关闭时清空
   - 错过时间窗后应判定为 due
   - 单轮补发后不重复触发

3. `assistantLetterService.test.ts`
   - 保存
   - 删除
   - 列表排序
   - 备份恢复

4. `assistantLetterOrchestratorService.test.ts`
   - AI 返回合法来信时写入记录
   - 成功后推进下一轮
   - 失败时不推进下一轮
   - 结果卡片 payload 正确

5. UI 级测试
   - 设置区显示来信配置
   - 记录页渲染
   - 详情页打开
   - 结果卡片点击跳转

## 实施顺序

1. 扩展 `AssistantAgentConfig`、相关 normalization、UI drafts / validation
2. 新增 `AssistantLetter` 类型与 `assistantLetterService`
3. 扩展 `assistantBackupService`，把来信纳入备份与恢复
4. 新增 `assistantLetterScheduler`
5. 在后台轮询链路中接入来信 due 检查
6. 新增来信 orchestrator / structured AI runner
7. 扩展聊天结果卡片与初始化还原逻辑
8. 新增来信详情页与来信记录页
9. 在设置页接入“查看来信记录”
10. 补测试并跑构建

## 风险与控制

### 风险 1：来信与普通后台消息边界混乱

控制：

- 来信使用独立存储
- 来信使用独立结果卡片类型
- 来信使用独立详情页与记录页

### 风险 2：失败后错误推进下一轮

控制：

- 只有“AI 返回合法 + 本地成功存储”后才推进 `nextLetterAt`
- 失败时保留当前 `nextLetterAt`

### 风险 3：时间窗逻辑复杂导致重复触发

控制：

- 只围绕单一 `nextLetterAt` 工作
- 成功后立即重算覆盖
- 不扫描历史欠账

### 风险 4：UI 入口过散

控制：

- 设置区只有一个记录入口
- 聊天区只有一个结果卡片入口
- 详情页只做阅读，不再额外叠加复杂交互

## 最终结论

本次“AI 来信”应建立在现有后台助理主链路之上，但不作为普通后台聊天消息的附属功能实现。

最终方案是：

- 用现有后台轮询来决定“何时发”
- 用现有上下文与 persona 来决定“写什么”
- 用独立来信 runner、独立来信存储、独立来信卡片和独立来信详情页来决定“如何保存与展示”

这样既能最大化复用现有 AI 基础设施，也能保证来信作为一个产品能力拥有清晰边界，后续继续扩展时不会被普通 check-in 逻辑拖住。
