## 目标

确保 AI 设置中的全局自定义提示词块参与统一 JSON 备份、云同步，并在云端恢复后立即反映到已打开的聊天界面。

## 设计

`assistantBackupService` 继续通过 `AIBackupPayload.chat.customPromptBlocks` 读写提示词块。恢复聊天数据后发出专用的 `lumostime:ai-chat-restored` 事件，事件详情携带恢复后的提示词块。`AIBackfillChatModal` 监听该事件并更新 React 状态，避免恢复后的 localStorage 被恢复前的内存状态覆盖。

普通 AI 状态变更事件保持现有语义，仅用于触发同步和刷新其他助手数据；提示词块编辑仍通过统一变更通知更新云同步时间戳。

## 验证

补充备份服务测试，验证提示词块进入备份载荷并可从载荷恢复到存储；运行相关 Vitest 测试及 `npm run build`。
