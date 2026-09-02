# AI 后台定时提醒执行链路修复设计

日期：2026-09-02

## 目标

修复 Android 真后台下定时 Assistant Reminder 到期后只派发 Web trigger、没有实际 AI 请求和后台调用记录的问题。

## 架构与数据流

Android 的 `AssistantAgentService` 在 Reminder 到期后直接调用 `AssistantNativeBackgroundExecutor`。原生请求使用已同步的 AI 配置和后台上下文快照。请求成功后消费 Reminder；请求失败或前置配置不完整时保留 Reminder，等待下一次重试或 Web 恢复补偿。

Web 的 `assistantSystemTrigger` 保留为原生不可执行时的 fallback。fallback 通过 Reminder ID 和 trigger ID 与 native 诊断结果做幂等判断，避免原生执行后再次发起请求。

## 错误处理与记录

- 记录 native 唤醒、请求开始、请求成功和请求失败。
- 原生配置或后台快照未就绪时记录跳过原因，不删除 Reminder。
- 后台历史展示 native 唤醒但尚未开始请求或被跳过的状态。
- 失败重试沿用现有 `lastDispatchAttemptAt + 60 秒` 规则。

## 实现边界

- 修改 Android Assistant service/executor、必要的 Capacitor bridge，以及 Web 后台记录和 fallback 去重逻辑。
- 增加 Reminder 成功消费、失败保留、重复 trigger 去重测试。
- 运行相关 Vitest 和 `npm run build`；不编译 Android 工程。

## 验收标准

Android 应用退到后台后，定时 Reminder 到期会产生 native AI request 诊断和后台调用记录；失败时 Reminder 保留并可重试；应用恢复后不会生成重复 AI 消息。
