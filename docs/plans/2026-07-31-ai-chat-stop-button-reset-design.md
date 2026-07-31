# AI 对话停止按钮复位设计

## 目标

修复前台 AI 对话已经生成完成后，右下角按钮仍停留在“停止”状态的问题。完成后的 composer 应恢复为发送按钮，允许用户继续下一轮对话。

## 原因

按钮显示条件同时依赖 `isLoading` 和 `activeRequestId`。部分子流程完成时会先清空 `activeRequestRef` 并关闭 `isLoading`，导致外层 `finally` 的清理条件不再成立，`activeRequestId` 可能残留。

## 方案

- 在 `handleSend` 的外层 `finally` 中，用当前 `pendingMessageId` 兜底清理 `activeRequestId`。
- 只清理匹配当前请求的 id，避免误伤未来可能的新请求。
- 保留现有停止按钮逻辑和 abort 行为不变。

## 验证

- 运行构建验证 TypeScript。
- 手动确认普通 AI 对话、AI 工具调用完成后按钮恢复为发送状态。
