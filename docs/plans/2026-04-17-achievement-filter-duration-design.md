# 成就瓶筛选器时长规则设计

## 目标

在成就瓶规则中新增一种“筛选器时长”类型，让用户直接输入筛选表达式，例如 `#阅读 %学习`，系统使用现有自定义筛选器逻辑匹配当天记录并累计时长，再按规则结算光点。

## 方案

1. 在 `AchievementRule` 中新增 `targetType: 'filterDuration'`。
2. 规则数据新增可选字段 `filterExpression`，用于保存用户输入的筛选表达式。
3. 成就规则弹窗新增“筛选器时长”选项。
4. 当规则类型为“筛选器时长”时：
   - 不再使用 `targetIds`
   - 改为展示一个筛选表达式输入框
   - 仍保留“触发分钟”和“每次变化”
5. 每日快照计算时复用 `parseFilterExpression` 和 `matchesFilter`：
   - 先取当日日志
   - 再用表达式筛选命中的记录
   - 累计命中记录的总分钟数
   - 按 `matchedMinutes / unitAmount * deltaPerUnit` 计算净变化

## 兼容性

- 旧规则类型保持不变。
- 旧数据没有 `filterExpression` 时不会受影响。
- 快照明细中保留 `filterExpression`，方便回看规则命中来源。

## 额外调整

由于成就计算现在需要访问分类、领域和待办分类上下文，`AchievementProvider` 需要位于 `CategoryScopeProvider` 内部，确保筛选表达式匹配时可以获取完整过滤上下文。
