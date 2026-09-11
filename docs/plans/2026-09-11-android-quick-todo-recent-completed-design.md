# Android 小事组件展示最近完成项设计

## 背景

安卓端“小事”4x2 与 4x3 组件当前会展示所有 quick todo。任务较多时，组件列表过长，已完成任务也会持续占据展示空间。

## 决策

- 两个尺寸统一使用同一套筛选规则：展示全部未完成小事，以及最近完成的最多 5 条小事。
- 未完成小事保持现有标题排序。
- 已完成小事按 `completedAt` 倒序排列；缺失或无法解析完成时间的旧数据排在已完成区末尾。
- 完成时间从 Web 端 `TodoItem.completedAt` 贯穿小组件 payload、Android 原生解析和 SharedPreferences 缓存，保证组件手动刷新时仍能按同一规则重建列表。
- 其他 TODAY + PIN 组件数据不改变；仅 dedicated quick-todo widget 的列表适配器应用该规则。

## 数据流

`TodoItem.completedAt` -> `WidgetBridgeTodoPinSourceTodo.completedAt` -> `WidgetTodoPinSourceTodo.completedAt` -> `WidgetQuickTodoRemoteViewsService` 筛选与排序。

旧版本缓存没有 `completedAt` 时按空值处理，不影响未完成任务展示，也不会让未知时间的已完成任务挤掉有明确完成时间的最近任务。

## 验证

- 增加 Web payload 测试，确认完成时间被镜像到 `sourceTodos`。
- 增加原生源码断言，确认模型、解析和缓存序列化保留完成时间。
- 运行相关 Vitest 测试和 `npm run build`。
- 按仓库约定不在此工作区编译 Android，仅进行原生源码级检查。
