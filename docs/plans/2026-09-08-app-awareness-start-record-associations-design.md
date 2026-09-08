# 应用感知开始记录关联选项设计

## 目标

将应用感知工作流模板中的“开始记录”从仅选择活动，扩展为 Routine 风格的记录关联编辑器。每个选项可以配置活动、领域和待办；选择待办后，运行时优先采用待办关联的活动、分类和默认领域。

## 数据结构

保留 `AppAwarenessActivityOption` 及其现有字段，新增可选字段：

- `linkedTodoId?: string`
- `scopeIds?: string[]`

这样旧模板无需迁移即可继续运行，新字段由归一化服务安全保留。

## 设置页交互

- 继续使用现有 `activityOptions` 列表、新增、删除和回车创建行为。
- 每个选项显示 Routine 风格摘要：`#活动 @待办 %领域`。
- 点击选项后展开已有 `TagAssociation`、`ScopeAssociation` 和 `TodoAssociation`。
- 待办被选中后，活动与领域选择器显示待办继承结果并禁用独立修改；清除待办后恢复独立活动和领域配置。
- 选项至少需要一个可解析的活动来源：待办关联活动，或选项自身活动。

## 运行时

统一解析选项：

1. 若选项关联待办，读取待办的 `linkedCategoryId`、`linkedActivityId` 和 `defaultScopeIds`。
2. 否则读取选项的 `categoryId`、`activityId` 和 `scopeIds`。
3. 将最终活动、待办 ID、领域 ID 列表传入现有记录启动链路。

Web 回退和 Android 原生都继续使用模板中的选项数据。原生事件增加可选待办/领域字段，旧事件缺失时保持活动-only 行为。

## 兼容与验证

- 归一化保留旧模板字段，并校验新增字段类型。
- 活动引用迁移同时更新选项自身活动和待办优先路径中的活动引用。
- 添加类型/归一化、迁移、运行时解析测试。
- 执行相关 Vitest 与 `npm run build`。
