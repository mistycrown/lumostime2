# 分类统计来源扩展设计

## 目标

调整分类详情统计 Tab 的来源：将原“标签时长”改为“分类时长”，并新增“二级标签”来源。二级标签使用当前分类下的活动作为单选选项，复用单选属性的图表和统计交互。

## 数据流

- 分类时长：按当前分类直接归属的可统计日志汇总 `duration`。
- 备注：沿用共享统计组件的文本来源。
- 二级标签：从 `category.activities` 生成选项，使用活动 ID 与日志 `activityId` 匹配；先按卡片时间范围过滤日志，再计算选项分布。
- 已归档活动不被静态排除，只要所选时间范围内存在历史日志，就会出现在对应分布中。

## 组件设计

在共享统计组件中新增 `categoryDuration` 与 `categoryActivity` 来源类型：前者复用时长统计图表但显示“分类时长”，后者复用 `choiceBar`、`choiceDonut`、`choiceHeatmap`、`choiceTreemap`。分类详情传入活动选项和受限来源；标签详情现有 `tagDuration` 与自定义属性行为不变。

## 兼容与验证

来源配置继续存储在 `Category.statisticCards` 中；旧的分类 `tagDuration` 卡片迁移为 `categoryDuration`。补充来源能力测试，并运行 `npm run build`。
