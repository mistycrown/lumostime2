# 成就瓶系统设计

## 目标

为脉络页新增一个顶部入口，进入独立全屏“成就页”。成就页以“星星瓶”为核心视觉容器，用规则驱动每日星星增减，并支持奖励兑换。系统需要兼顾三件事：

- 页面体验上要有“收集感”和“摇晃感”
- 数据逻辑上要可解释、可重算、但不过度改写历史
- 结构上要贴合现有 React + Context + repository 的数据流

## 本次已确认的关键决策

### 入口与页面形态

- 入口放在脉络页顶部
- 点击后进入独立全屏“成就页”
- 成就页分为上下两部分
- 上方为星星容器区，默认占约 `3/4` 屏幕
- 下方为详情区，默认占约 `1/4` 屏幕
- 详情区支持展开，展开后占据大部分屏幕，仅保留少量容器区可见

### 规则与结算口径

- 系统 `完全依赖自定义规则`
- 不内置“正向时间”或“负向时间”的默认定义
- 每日只生成一个“每日快照”，记录当天净增减星星数
- 每日快照和兑换记录是两种不同的记录类型
- 当前星星总数不保存为死值，而是根据记录动态计算

### 历史数据行为

- 第一次打开成就页时记录 `achievementStartDate`
- 只从 `achievementStartDate` 开始计算，不追溯更早历史
- 历史每日快照一旦生成就冻结
- 规则变更 `不影响历史快照`
- 每次进入成就页时，只对 `今天` 和 `昨天` 的快照进行重算并覆盖
- 每日快照不可删除
- 兑换记录可删除，删除后视为撤销该次兑换

## 页面设计

## 脉络页入口

脉络页顶部新增一个小入口卡片，建议放在现有顶部卡片区，与时光小友卡片保持同一视觉层级，但尺寸更轻。

建议展示信息：

- 成就页名称，如“星星瓶”或“成就瓶”
- 当前可用星星数
- 最近一次结算摘要或兑换摘要
- 轻微呼吸动画或微光效果，提示该入口可点击

点击后进入独立的 `AchievementView`。

## 成就页布局

成就页整体采用上下分区布局。

### 上半区：容器区

容器区是主视觉区域，负责展示当前瓶中元素。

设计要求：

- 默认空容器也要有完整视觉
- 当前总星星数大于 0 时，将对应数量的星星投放进容器
- 星星之间要有物理碰撞
- 星星与边界要有碰撞
- 支持重力和设备重力感应
- 支持测试按钮操作临时增删星星

视觉建议：

- 不必做成写实玻璃瓶，更适合做“透明容器舱”风格
- 容器边缘有柔和描边和高光
- 容器底部略厚，增强堆积感
- 顶部可以固定显示当前星星总数

### 下半区：详情区

详情区采用 `bottom sheet` 结构，有两个稳定态：

- `collapsed`：默认占底部约 `1/4` 高度
- `expanded`：展开后占据主要屏幕高度，仅保留少量容器区可见

详情区顶部保留拖拽柄和摘要信息，内部以 Tab 形式切换不同内容。

## 详情区 Tab 设计

### 记录 Tab

按天倒序展示每日快照，每天一条。

折叠态信息：

- 日期
- 当日净变化，如 `+3`、`-1`
- 命中规则数
- 最近计算时间

展开后显示：

- 每条命中的规则名称
- 规则类型：获得或扣除
- 关联活动标签
- 命中分钟数
- 换算公式说明
- 该规则最终贡献值

示例：

- 阅读 92 分钟，按“每 30 分钟 +1 星”获得 `+3`
- 摸鱼 130 分钟，按“每 120 分钟 -1 星”扣除 `-1`

### 规则 Tab

V1 只做统一规则卡片，不区分复杂规则类型，但数据结构要预留扩展性。

每条规则建议字段：

- 规则名称
- 是否启用
- 作用方向：`获得` / `扣除`
- 目标类型：V1 先支持 `activity`
- 关联活动标签，多选
- 换算门槛：每多少分钟触发一次
- 每次变化值：每次触发增减多少颗星
- 取整方式：V1 固定为向下取整
- 备注，可选

规则示例：

- 每阅读 `30` 分钟 `+1` 星
- 每运动 `45` 分钟 `+1` 星
- 每摸鱼 `120` 分钟 `-1` 星

规则变更行为：

- 修改规则不会批量改写历史快照
- 只影响之后进入成就页时，对今天和昨天的重算结果

### 兑换 Tab

兑换区分为两块：

- 奖励列表
- 兑换记录

奖励卡片建议字段：

- 奖励名称
- 消耗星星数
- 描述
- 是否启用
- 可选图标

兑换流程：

- 点击奖励
- 检查当前可用星星数是否足够
- 足够则新增一条兑换记录
- 当前可用星星数立即变化
- 不生成新的每日快照

兑换记录展示：

- 兑换时间
- 奖励名称
- 消耗星星数
- 删除按钮

删除兑换记录相当于撤销这次兑换，当前可用星星数会自动回升。

## 数据模型

建议新增独立的成就系统数据域，不与现有日志、回顾、待办直接混写。

### AchievementRule

```ts
interface AchievementRule {
  id: string;
  name: string;
  enabled: boolean;
  effectType: 'earn' | 'spend';
  targetType: 'activity';
  targetIds: string[];
  unitMinutes: number;
  deltaPerUnit: number;
  roundingMode: 'floor';
  note?: string;
  createdAt: number;
  updatedAt: number;
}
```

### AchievementDailySnapshot

```ts
interface AchievementDailySnapshot {
  id: string;
  date: string; // YYYY-MM-DD
  netDelta: number;
  ruleBreakdown: {
    ruleId: string;
    ruleName: string;
    effectType: 'earn' | 'spend';
    matchedMinutes: number;
    unitMinutes: number;
    deltaPerUnit: number;
    appliedUnits: number;
    delta: number;
    targetIds: string[];
  }[];
  computedAt: number;
}
```

### AchievementReward

```ts
interface AchievementReward {
  id: string;
  name: string;
  cost: number;
  description?: string;
  icon?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### AchievementRedemptionRecord

```ts
interface AchievementRedemptionRecord {
  id: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  redeemedAt: number;
  note?: string;
}
```

### AchievementMeta

```ts
interface AchievementMeta {
  achievementStartDate: string | null;
}
```

## 核心计算逻辑

## 第一次进入页面

如果 `achievementStartDate` 为空：

- 写入当天日期
- 从该日期开始启用成就系统
- 不追溯更早历史日志

## 每次进入成就页

执行顺序如下：

1. 读取 `achievementStartDate`
2. 从起始日扫描到今天
3. 对早于昨天的日期：
   - 如果已有快照，则跳过
   - 如果没有快照，则按当时规则计算后写入快照
4. 对昨天和今天：
   - 总是使用当前规则重新计算并覆盖原快照
5. 根据所有每日快照与兑换记录，动态算出当前可用星星数
6. 用该数量重建容器中的星星

## 当前星星数计算

不单独持久化“余额”，统一动态计算：

```ts
availableStars =
  sum(dailySnapshots.map(item => item.netDelta)) -
  sum(redemptionRecords.map(item => item.cost));
```

建议在展示时做下限保护：

```ts
displayStars = Math.max(0, availableStars);
```

但账本内部是否允许出现负值，需要在实现时统一决定。V1 更推荐允许账本为负，再在 UI 上控制兑换按钮不可用。

## 规则执行逻辑

每条规则都以活动日志为输入，按分钟数换算成星星变动值。

计算步骤：

1. 找出当天命中 `targetIds` 的日志
2. 汇总这些日志的总分钟数
3. 计算 `appliedUnits = floor(totalMinutes / unitMinutes)`
4. 计算 `delta = appliedUnits * deltaPerUnit`
5. 若规则是扣除型，则最终结果记为负值
6. 将所有规则结果求和，得到 `netDelta`

说明：

- V1 不做复杂冲突裁剪，同一条日志可以被多条规则命中
- V1 不支持优先级、互斥规则、封顶规则
- V1 不支持任务规则和日课规则，但 `targetType` 预留扩展

## 物理容器设计

## 容器数据原则

容器中的每一颗星不视为正式账本记录，而是“当前总数的视觉投影”。

这意味着：

- 成就账本负责给出“此刻应显示多少颗星”
- 物理引擎只负责把这些星星摆进容器里
- 不追求长期保存每颗星的永久位置
- 每次进入页面或账本变化时，都可以根据当前总数重建物理世界

这种做法与“历史快照冻结、当前总数动态计算”的规则最一致。

## 物理行为要求

V1 物理行为包括：

- 星星与星星碰撞
- 星星与边界碰撞
- 重力
- 轻微弹性
- 轻微摩擦
- 稳定后自然静止

推荐使用 `matter-js` 实现。

## 重力感应

按平台分层支持：

- Web / Electron：
  - 支持测试按钮模拟重力方向
  - 不依赖真实传感器
- Mobile：
  - 支持设备重力感应
  - 提供开关
  - 提供重力复位

## 测试功能

测试阶段在容器区固定提供一组开发按钮：

- `+1 星`
- `-1 星`
- `重建瓶子`
- `重力开关`
- `重力复位`

这些按钮仅影响临时视觉状态，用于测试容器功能，不写入正式账本。

## 技术架构建议

## 视图与组件

建议新增：

- `src/views/AchievementView.tsx`
- `src/components/achievement/AchievementEntryCard.tsx`
- `src/components/achievement/AchievementBottle.tsx`
- `src/components/achievement/AchievementRecordsTab.tsx`
- `src/components/achievement/AchievementRulesTab.tsx`
- `src/components/achievement/AchievementRedeemTab.tsx`

## 状态管理

建议新增 `AchievementContext`，负责：

- 成就元数据
- 规则列表
- 奖励列表
- 每日快照列表
- 兑换记录列表
- 页面打开时的自动重算
- 当前可用星星数选择器

这套结构与仓库现有 `DataContext`、`ReviewContext` 的组织方式一致。

## 持久化

建议通过 repository 层为成就系统增加独立持久化入口，避免重新退回大量 `localStorage` 直写。

建议保存内容：

- achievement meta
- rules
- rewards
- daily snapshots
- redemption records

## 路由与入口接入

接入路径建议：

1. 在 `TimelineView` 顶部新增成就入口卡片
2. 在导航上下文或主路由中增加成就页打开状态
3. 进入后渲染独立的 `AchievementView`
4. 返回后恢复脉络页上下文

由于成就页是“从脉络页进入的全屏子页”，更适合沿用当前项目中详情页、回顾页的全屏覆盖式模式，而不是新增底部一级 Tab。

## V1 范围

本次设计的 V1 范围如下：

- 脉络页顶部成就入口
- 独立全屏成就页
- 星星容器与物理碰撞
- 详情区可展开
- 记录 Tab
- 规则 Tab
- 兑换 Tab
- 首次开启日期
- 今天和昨天自动重算
- 历史快照冻结
- 当前星星数动态计算
- 测试按钮

## 暂不纳入 V1 的内容

- 其他元素类型，如羽毛、月亮、贝壳
- 任务规则
- 日课规则
- 互斥规则、优先级规则、封顶规则
- 每颗星的永久位置持久化
- 每日快照删除
- 历史全量重算

## 实施建议

建议按以下顺序实施：

1. 搭建数据模型、Context、repository 持久化
2. 新建成就页基础路由和空页面
3. 接入脉络页顶部入口
4. 完成每日快照与兑换记录的动态总数计算
5. 完成规则编辑和手动新增奖励
6. 完成记录列表展示与今天/昨天重算
7. 接入物理引擎和瓶子容器
8. 补充测试按钮与移动端重力感应

## 风险与注意事项

- “规则变更只影响今天和昨天”会让历史和当前规则不完全一致，UI 中要明确提示历史快照已冻结
- 若多个规则命中同一日志，V1 会允许叠加，需要在规则页中说明
- 若账本总数变成负值，要统一决定 UI 展示和兑换限制策略
- 设备重力感应在不同平台权限和表现差异较大，必须保留桌面测试入口
- 物理世界中的星星数量较多时，要注意性能和重建成本，必要时需要设置显示上限或简化碰撞体

