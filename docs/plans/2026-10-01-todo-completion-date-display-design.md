# 待办完成日期显示设计

## 目标

在待办页中为已完成待办显示完成日期。完成日期使用待办已有的 `completedAt` ISO 时间字段，按本地日期转换为与安排日期、截止日期一致的月.日格式。

## 交互与视觉

- 紧缩模式：在现有安排日期/截止日期摘要之后追加 `{MM.DD}` 形式的完成日期，例如 `{09.30}`。
- 松散模式：在右侧日期区域追加小号 `CheckCircle2` 图标和 `MM.DD` 日期。
- 仅当待办同时满足 `isCompleted` 且存在有效 `completedAt` 时显示。
- 紧缩模式沿用现有“排期时间”显示开关；松散模式沿用现有日期区域，不新增独立设置项。
- 不改变已有安排日期、截止日期的格式或数据。

## 实现方案

1. 扩展 `src/utils/todoListDisplayUtils.ts` 的展示类型与格式化函数，让紧缩摘要统一处理完成日期，并为 ISO 完成时间提供安全的本地日期转换。
2. 在 `src/views/TodoView.tsx` 的 `SwipeableTodoItem` 中计算完成日期标签：
   - 紧缩模式将完成日期传入共享摘要函数。
   - 松散模式将完成日期加入右侧日期标记判断，并使用 `CheckCircle2` 渲染。
3. 为共享格式化逻辑补充单元测试，覆盖正常日期、无完成时间和未完成待办场景。

## 数据流与异常处理

`TodoItem.completedAt` → 本地 `Date` → 现有 `formatTodoInlineDate` → 紧缩文本或松散日期行。缺失或无法解析的时间返回空值，不渲染错误日期，也不影响待办标题和其它日期。

## 验证

- 运行 `src/utils/todoListDisplayUtils.test.ts` 相关 Vitest 测试。
- 运行 `npm run build`，确认 TypeScript、Vite 构建通过。
- 手动检查紧缩/松散模式下已完成、有安排/截止日期、无日期以及未完成待办的显示组合。
