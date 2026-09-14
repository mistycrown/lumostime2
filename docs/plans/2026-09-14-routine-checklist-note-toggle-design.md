# Routine Checklist 备注开关设计

## 目标

为 Routine 每个步骤的 checklist 增加“加入备注”开关。开关默认开启；关闭后，该步骤结束时不把 checklist Markdown 写入活动备注。

## 设计

- `RoutineStep` 增加可选字段 `includeChecklistInNote?: boolean`。新建步骤显式设为 `true`，旧数据缺省值按 `true` 解释，保持兼容。
- Routine 设置中的 checklist 编辑器增加复选框控制该字段。编辑器条目左侧的完成标记改为不可交互装饰，条目完成状态仍由运行中的 Routine 控制。
- `ActiveRoutineRun` 保存当前步骤的 `includeChecklistInNote`，步骤切换时同步下一步骤配置。
- 停止步骤时仅当该开关开启且 checklist 有内容才传入备注；关闭时沿用没有备注的普通日志保存路径。
- checklist Markdown 格式和运行页勾选行为保持不变。

## 验证

- TypeScript 生产构建。
- 手动检查新建步骤默认勾选、取消后重新打开仍保持状态，以及运行时关闭开关不生成 checklist 备注。
