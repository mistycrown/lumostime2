## 目标

确保 AI 设置中的自定义人设、全局自定义提示词块和长期记忆参与统一 JSON 备份、云同步，并在云端恢复后立即反映到已打开的聊天界面。

## 设计

`assistantBackupService` 继续通过 `AIBackupPayload.chat.personas`、`AIBackupPayload.chat.customPromptBlocks` 和 `AIBackupPayload.assistant.memory` 读写三类数据。恢复后发出专用的 `lumostime:ai-chat-restored` 事件，事件详情只携带备份中实际存在的字段。`AIBackfillChatModal` 监听该事件并更新人设、提示词块和长期记忆快照，避免恢复后的 localStorage 被恢复前的内存状态覆盖。人设恢复后，会话也按新的人设映射重新载入。

普通助手刷新事件先于专用恢复事件发出，使专用事件中的云端状态成为本轮同步更新的最终值。旧版备份缺少人设或提示词块字段时保留当前本地值，不将缺失字段误判为空数组。

普通 AI 状态变更事件保持现有语义，仅用于触发同步和刷新其他助手数据；人设、提示词块和长期记忆编辑仍通过统一变更通知更新云同步时间戳。

## 验证

补充备份服务测试，验证人设、提示词块和长期记忆进入备份载荷并可从载荷恢复到存储，同时覆盖旧备份缺字段的兼容行为；运行相关 Vitest 测试及 `npm run build`。
