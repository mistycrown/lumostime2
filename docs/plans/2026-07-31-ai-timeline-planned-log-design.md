# AI 时间轴计划块设计

## 目标

让前台 AI 能根据用户的自然语言，把已有待办安排到脉络时间轴上，创建带计划属性的时间块。

## 方案

- 新增专用工具 `create_planned_log`，不复用 `create_log`，避免把“将来计划”误写成“已经发生的记录”。
- 工具必须绑定一个现有 `todoId`，并提供 `date`、`startTime`、`endTime`。可选 `note` 只作为计划备注保存。
- 本地执行时继续落地为 `Log` 实体，使用现有时间轴计划结构：`isPlanned: true`、`linkedTodoId`、虚拟 `categoryId/activityId: "__timeline_plan__"`。
- 拖拽创建计划块和 AI 创建计划块复用同一个构造函数，保证标题、时长、占位分类和后续渲染一致。

## 数据流

1. 用户要求“把某个待办安排到某天某段时间”。
2. AI 从已提供的 todo candidates 中选择明确的 `todoId`，返回 `create_planned_log`。
3. `aiService` 只保留合法的日期、时间和 todo id。
4. `assistantActionExecutor` 解析时间，确认 todo 存在，构建 planned log，并写入本地 logs。
5. 聊天结果卡片用“计划”语义显示，并支持撤销删除该计划块。

## 边界

- 不允许 AI 编造 todo id；目标待办不明确时先追问。
- 时间必须在同一天内，且 `endTime` 大于 `startTime`。
- `create_log` 仍只代表已发生的时间记录。
- 首版不创建无待办绑定的自由计划块，也不自动新建 todo 后再立即计划，除非后续明确需要联动动作。

## 验证

- 单测覆盖 AI 工具归一化、计划块执行成功、无效 todo/time 失败。
- 构建验证 TypeScript 类型和前台提示词引用没有断裂。
