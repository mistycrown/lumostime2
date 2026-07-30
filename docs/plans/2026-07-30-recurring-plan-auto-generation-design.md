# Repeat 自动生成时间轴 Plan 设计

## 目标

为 Repeat 类型待办增加“自动排入时间轴”的能力。用户在循环任务详情页设置固定时间段和往后生成周期数后，系统每天补齐今天起前 N 个循环节点对应的 Plan。

## 数据模型

- `TodoItem` 增加 `recurringPlan` 配置，包含 `enabled`、`startMinutes`、`endMinutes`、`horizonCount`。
- `Log` 继续作为 Plan 实体，保留 `isPlanned: true`，并为自动循环 Plan 增加 `planSource: 'recurrence-auto'`、`plannedOccurrenceDate`。
- 手动从右侧待办拖到左侧时间轴生成的 Plan 不写入 `planSource`，仍作为普通手动计划处理。

## 详情页设置

- 仅在非子任务、非小事、且已开启 Repeat 时展示自动 Plan 设置。
- 设置项包括“自动排入时间轴”开关、开始时间、结束时间、往后生成周期数。
- 时间段第一版限定在同一天内，例如 `09:00 - 10:00`；结束时间必须晚于开始时间。
- 关闭开关后不再新建未来自动 Plan，但已经生成的 Plan 保留在时间轴上，用户可以自行删除。

## 自动补齐

- 页面刷新或应用初始化后，按本地日期每天只执行一次检测。
- 对每个开启自动 Plan 的 Repeat todo，从今天开始查找前 `horizonCount` 个循环命中节点。
- 已存在的节点会被计入周期窗口，不向后顺延。例：周期数为 3，今天和明天已有、后天没有，则只补后天，不会补大后天。
- 判断“已存在”时，只要同一 todo 在该日期已有任意 Plan，就跳过，不覆盖用户调整过的时间。
- 用户刚开启或修改自动 Plan 设置时，对该 todo 额外执行一次即时补齐，避免当天已经检测过导致配置暂时不生效。
- 继续尊重 Repeat 的 `startDate`、`endDate`、`interval`、`weekdays`、`monthDays`、`skipDates` 和月末兜底规则。

## 锁定与删除

- 自动循环 Plan 的删除权限由当前 todo 的自动 Plan 开关决定。
- 如果对应 Repeat todo 仍启用自动 Plan，则该 todo 已生成的自动循环 Plan 不允许删除，操作层隐藏或禁用删除入口，删除 handler 也做保护。
- 如果用户取消勾选自动 Plan，则系统不再继续补齐，该 todo 过去已经生成的自动循环 Plan 解锁，允许手动删除。
- 自动循环 Plan 仍允许在时间轴中拖动或拉伸调整时间；后续检测不会覆盖已存在 Plan。

## 实现落点

- `src/types.ts`：补充 `TodoRecurringPlanConfig`、`LogPlanSource` 等字段。
- `src/components/TodoDetailModal.tsx`：增加自动 Plan 设置 UI 和保存比较逻辑。
- `src/utils/todoRecurringPlanUtils.ts`：集中实现周期窗口计算、时间戳生成、已存在检测和补齐日志生成。
- `src/components/AppRoutes.tsx` 或初始化 hook：接入每日一次检测，并在 todo 配置变化时触发即时补齐。
- `src/components/TimelineScheduleCanvas.tsx`：识别自动循环 Plan 的锁定状态，控制删除入口与操作提示。

## 验证

- 单测覆盖周期窗口、已有计入、不顺延、skipDates、endDate、自动标记和删除锁定。
- UI 手动验证：开启自动 Plan 后刷新能补齐；关闭后不再补齐且可删除旧自动 Plan；调整已有 Plan 时间不会被重置。
- 最后运行相关 Vitest 和 `npm run build`。
