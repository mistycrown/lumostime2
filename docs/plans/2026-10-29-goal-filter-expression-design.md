# Goal Filter Expression Design

## Goal

让“投入时长”目标以及其他基于记录的目标使用可编辑的筛选表达式，而不再只支持限定标签。表达式支持标签、领域、待办、备注文本、OR/AND 和排除条件；选择器用于快速生成表达式，手动输入始终拥有最终控制权。

## Design

- `Goal` 和 `MajorGoal` 增加可选 `filterExpression?: string`。
- 旧版 `filterActivityIds` 和 `filterTodoCategories` 继续兼容；保存新数据时优先保存表达式，读取旧数据时按旧字段计算。
- 目标编辑器将筛选区域改为顶部单行表达式输入框，并提供可展开的标签、领域、待办、已保存筛选器选择器。选择器追加规范化 token，不覆盖用户已有文本。
- 已保存筛选器只作为表达式快捷填充，不保存 Filter ID 引用，避免编辑目标时意外修改全局筛选器或产生失效引用。
- 目标所属 `scopeId` 仍是基础范围；表达式中的 `%领域` 是额外限制。投入时长、有效时长、活跃天数、记录条数共享 `filterUtils` 的匹配逻辑。完成待办数量保留待办完成时间和目标领域约束，并支持表达式中的 `@待办` / `%领域` / 普通条件。
- 阶段目标继承目标系列的 metric 和筛选表达式，并以只读方式展示；独立目标无系列时可编辑。

## Compatibility

历史目标不会被强制迁移。`filterExpression` 为空时，计算逻辑回退到 `filterActivityIds` 和 `filterTodoCategories`，保持现有结果不变。

## Verification

覆盖表达式解析与匹配、旧字段回退、标签/领域/待办/筛选器快捷填充、继承行为和目标进度计算，并执行 `npm run build` 与相关 Vitest 测试。
