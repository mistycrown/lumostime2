# 日课分类连胜倍率设计
日期：2026-04-25

## 目标

为日课分类增加一个“连胜奖励”开关。开启后，该分类下每个具体日课项都按各自的连续完成天数套用一套全局统一的倍率档位，再把倍率后的完成贡献汇总回现有 `checkCategory` 成就规则，得到最终光点。

本次设计的重点不是重做成就规则归属，而是在保留“按日课分类制定光点规则”前提下，为分类内的具体日课项引入连胜倍率。

## 已确认的产品决定

1. 光点规则仍按日课分类生效，不改成“每个日课项单独配置基础光点”。
2. 连胜功能的开关挂在日课分类上，不挂在单个日课项上。
3. 连胜天数按每个具体日课项分别计算，同一分类内不同日课项的连胜互不影响。
4. 连胜倍率档位全局统一配置，不为每个分类单独维护一套。
5. 当用户补打或修改历史某天的日课后，后续日期的连胜和光点需要自动重算。

## 范围

- 修改日课模板数据结构，支持分类级连胜开关。
- 修改成就系统 `checkCategory` 规则的匹配值计算方式，使其支持按日课项连胜倍率得到小数贡献值。
- 增加全局连胜倍率配置的数据结构与编辑入口。
- 增加受历史日课变动影响时的后续重算逻辑。

不在本次范围内：

- 不改变现有 `AchievementRule` 的归属方式。
- 不为单个日课项新增基础光点配置。
- 不改动已封存旧瓶的历史数据。
- 不增加按分类自定义倍率表。

## 术语

- 日课分类：`CheckTemplate`，例如“晨间日课”“睡前日课”。
- 日课项：分类中的具体 `CheckTemplateItem`，例如“喝水”“冥想”“拉伸”。
- 连胜倍率：由全局档位表决定的倍数，例如 `5 天 1.2x / 15 天 1.5x / 30 天 2.0x`。
- 加权完成值：某个日课分类在某一天内，所有已完成日课项按倍率折算后的贡献和，例如 `1.2 + 1.5 + 1.0 = 3.7`。

## 业务规则

### 1. 分类开关

- 每个日课分类增加 `achievementStreakEnabled` 开关。
- 开关关闭时，该分类继续按现有逻辑统计完成项数量。
- 开关开启时，该分类下所有日课项都参与连胜倍率计算。

### 2. 连胜天数的判定

- 连胜按“日”为单位累计，不按点击次数累计。
- 二值日课：当天 `isCompleted=true` 即算当天完成。
- 次数日课：只有当天达到 `targetCount` 后才算当天完成。
- 某个日课项若某天未完成，则它下一次完成时从第 1 天重新累计。
- 同一天内同一日课项无论点击多少次，最终只按“当天是否完成”参与一次倍率计算。

### 3. 倍率档位

- 全局维护一套升序档位表，例如：
  - `5 -> 1.2`
  - `15 -> 1.5`
  - `30 -> 2.0`
- 未命中任何档位时，默认倍率为 `1.0`。
- 命中多个档位时，取阈值最高的那个倍率。

### 4. 分类加权完成值

- 若分类未开启连胜：
  - 每个已完成日课项贡献 `1.0`
  - 分类当天 `matchedValue = 已完成日课项数量`
- 若分类开启连胜：
  - 每个已完成日课项贡献其当日连胜倍率
  - 分类当天 `matchedValue = 同分类所有已完成日课项倍率之和`
- `matchedValue` 允许小数，例如 `3.7`

示例：

- 分类“晨间日课”开启连胜
- 全局档位：`5 天 1.2x / 15 天 1.5x / 30 天 2.0x`
- 当天完成了 3 个日课项：
  - 喝水：第 6 天，贡献 `1.2`
  - 冥想：第 18 天，贡献 `1.5`
  - 拉伸：第 1 天，贡献 `1.0`
- 则该分类当天 `matchedValue = 3.7`

### 5. 与现有成就规则的衔接

现有 `checkCategory` 规则继续负责“一个完成单位值多少光点”，连胜倍率只负责“每个已完成日课项算几个单位”。

例如：

- 规则：每完成 `1` 项得 `1` 光点
  - 当天 `matchedValue=3.7`
  - 则 `delta=3.7`
- 规则：每完成 `2` 项得 `1` 光点
  - 当天 `matchedValue=3.7`
  - 则 `delta=1.85`

因此 `checkCategory` 规则链路需要完整支持小数 `matchedValue`、`appliedUnits` 和 `delta`。

## 数据结构调整

### `CheckTemplate`

新增分类级开关：

```ts
interface CheckTemplate {
  id: string;
  title: string;
  icon?: string;
  uiIcon?: string;
  items: CheckTemplateItem[];
  enabled: boolean;
  order: number;
  isDaily: boolean;
  syncToTimeline?: boolean;
  achievementStreakEnabled?: boolean;
}
```

兼容策略：

- 旧数据默认视为 `achievementStreakEnabled = false`

### 全局连胜倍率配置

建议新增一组全局配置类型：

```ts
interface CheckStreakTier {
  thresholdDays: number;
  multiplier: number;
}

interface CheckStreakConfig {
  enabled: boolean;
  tiers: CheckStreakTier[];
}
```

建议默认值：

```ts
{
  enabled: false,
  tiers: [
    { thresholdDays: 5, multiplier: 1.2 },
    { thresholdDays: 15, multiplier: 1.5 },
    { thresholdDays: 30, multiplier: 2.0 }
  ]
}
```

说明：

- `enabled` 控制全局能力是否开启
- 分类开关只在全局能力开启时才真正生效
- `tiers` 需按 `thresholdDays` 升序规范化

## 计算设计

### 1. 新增工具函数

建议在日课相关工具中补一组纯函数：

- `isCheckItemCompletedOnDate(review, checkItemId)`
- `getCheckItemStreakDays(dailyReviews, checkTemplates, date, checkItemId)`
- `getCheckItemStreakMultiplier(streakDays, streakConfig)`
- `getCheckCategoryWeightedCompletionValue(...)`

这些函数负责：

- 找到某个日课项在指定日期是否完成
- 向前扫描连续完成天数
- 根据全局倍率表求出当日倍率
- 汇总某个分类当天的加权完成值

### 2. 改造 `computeAchievementDailySnapshot`

当前 `checkCategory` 分支本质是统计“当天完成项条数”。本次需要改为：

1. 找到当天日报 `dayReview`
2. 找出属于目标分类且当天完成的日课项
3. 对每个已完成项：
   - 若全局连胜能力关闭，或分类未开启连胜，则贡献 `1.0`
   - 否则计算其连胜天数和倍率，贡献对应倍率
4. 将所有贡献相加得到该分类当天 `matchedValue`
5. 继续沿用现有 `unitAmount / deltaPerUnit` 逻辑结算光点

### 3. 小数支持

当前成就系统虽然支持一位小数光点，但 `checkCategory` 语义仍偏整数项数。本次需检查并调整：

- `AchievementDailyRuleBreakdown.matchedValue`
- `AchievementDailyRuleBreakdown.appliedUnits`
- `AchievementDailySnapshot.netDelta`
- 记录页文案

要求：

- `matchedValue` 不再强制取整
- `appliedUnits = matchedValue / unitAmount`
- `delta = appliedUnits * deltaPerUnit`
- 最终仍使用现有光点一位小数规范化函数

## 历史重算策略

### 1. 为什么需要改

连胜是路径依赖数据。若 4 月 20 日的完成状态被补打或取消，则 4 月 21 日到之后所有日期的连胜天数都可能改变，因此仅重算“今天和昨天”已不够。

### 2. 重算范围

当某个日期的日课数据变化时：

- 从该日期开始
- 重算到当前活跃成就周期的结束日期
- 不跨到已经封存的旧瓶周期

活跃周期起点仍使用现有：

- `getAchievementActiveStartDate(meta.achievementStartDate, archivedBottles)`

实际重算起点：

- `max(changedDate, activeStartDate)`

### 3. 已封存周期

V1 不联动修改已封存旧瓶的数据：

- 如果历史修改发生在已封存周期内，不反写旧瓶
- 当前活跃周期内若受其影响，则只重算活跃周期

这能保持封存结果稳定，避免旧瓶反复漂移。

## UI 设计

### 1. 日课模板管理页

在每个日课分类编辑区域增加“连胜奖励”开关：

- 文案：`开启连胜奖励`
- 辅助说明：`开启后，本分类内每个日课项会按各自连胜天数套用全局倍率`

打开后仅展示说明，不在分类内单独编辑倍率档位。

### 2. 全局设置入口

建议在成就页规则区或设置页中增加“日课连胜倍率”配置区，统一编辑：

- 总开关
- 档位列表
- 每档的天数与倍率

最少支持：

- 添加档位
- 删除档位
- 修改阈值天数
- 修改倍率
- 自动排序与去重校验

### 3. 成就记录说明

`checkCategory` 规则的记录明细建议补充分解说明，帮助用户理解小数来源：

- 例如：`晨间日课折算 3.7 项：喝水 1.2，冥想 1.5，拉伸 1.0`

V1 若不想在快照里持久化到单项级明细，也至少需要在 UI 文案中说明“已按连胜倍率折算”。

### 4. 历史重算提示

当补打或修改历史日课触发后续重算时，建议给轻提示：

- `已根据历史变动重算后续连胜与光点`

不使用打断式确认弹窗。

## 兼容性

- 旧 `CheckTemplate` 数据无新字段时默认不开启分类连胜。
- 旧仓库数据无全局连胜配置时，注入默认配置。
- 未开启全局连胜时，系统行为与当前版本完全一致。
- 未开启分类连胜时，该分类行为与当前版本完全一致。

## 测试要点

1. 单个日课项连续完成 5/15/30 天时倍率切换正确。
2. 中断一天后，下一次完成按 `1.0x` 重新开始。
3. 同分类内多个日课项有不同连胜天数时，分类 `matchedValue` 汇总正确。
4. 次数型日课只有达到 `targetCount` 后才算当天完成和连胜。
5. 分类关闭连胜时，`matchedValue` 仍为普通整数完成项数。
6. 补打历史日期后，后续活跃周期内快照被正确重算。
7. 已封存旧瓶不因本次重算而被修改。
8. 小数 `matchedValue` 能正确传导到 `appliedUnits`、`delta`、余额与记录展示。

## 实施建议

1. 扩展 `CheckTemplate` 与全局连胜配置类型、默认值和归一化逻辑。
2. 在日课模板管理页接入分类级连胜开关。
3. 在成就/设置入口接入全局倍率编辑 UI。
4. 提取连胜天数、倍率和分类加权完成值工具函数，并补充单元测试。
5. 改造 `computeAchievementDailySnapshot` 的 `checkCategory` 分支。
6. 改造“历史日课变更后”的受影响日期重算逻辑。
7. 更新成就记录展示文案，确保小数与连胜语义可解释。
