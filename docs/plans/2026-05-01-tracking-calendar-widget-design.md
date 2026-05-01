# 2×2 追踪日历小组件设计

## 背景

现有 Android 小组件系统主要服务于多槽位模板，适合计时器、日课和快捷方式这类离散按钮场景。此次需求是一个单对象追踪卡片：顶部显示名称与状态，主体显示月历，并且点击标题在同类型模板间切换。这个形态与现有四槽位 `2x2` 模板不同，更适合独立的原生 provider。

## 目标

- 新增一个独立的 `2×2 追踪日历` Android 小组件。
- 在设置页“新建小组件模板”中新增 `2×2 追踪日历` 选项。
- 每个追踪日历模板只绑定一个追踪对象，可选：
  - 标签
  - 领域
  - 日课
- 默认名称、颜色、图标尽量继承被追踪对象。
- UI icon 继续复用现有兑换码 + 自定义主题门槛。
- 标题点击只在同类型追踪日历模板之间轮换。

## 非目标

- 第一版不做强度分级热力图，只做“当天是否命中”的二值点亮。
- 第一版不支持在小组件内切换月份。
- 第一版不在小组件主体上绑定新的点击动作。

## 方案选择

### 推荐方案

新增独立的追踪日历 provider / layout / bitmap renderer / payload，同现有 `DAILY_RUNTIME` 小组件一样走“标题 + 大位图”的原生渲染链路。

### 原因

- 需求是单槽卡片，不是四宫格 slot。
- 月历布局、圆点、高亮、顶部状态更适合一次性绘制成位图。
- 能直接复用现有“标题点击切模板”的绑定思路，但避免和普通 `2x2` 计时器模板串台。

## 模板模型

在统一 `WidgetTemplate` 上新增模板分组字段与追踪配置：

- `templateType`
  - `grid`
  - `trackingCalendar`
- `trackingConfig`
  - `sourceType`: `tag | scope | daily`
  - `categoryId` / `activityId`
  - `scopeId`
  - `checkTemplateId` / `checkItemId`
  - `label`
  - `icon`
  - `customIcon`
  - `uiIconAssetPath`
  - `uiIconFallbackAssetPath`
  - `color`

兼容策略：

- 旧模板默认补成 `templateType = grid`。
- 追踪日历模板固定使用 `size = 2x2`。
- 原生 binding 与标题轮换按 `size + templateType` 过滤。

## 判定规则

### 标签

- 目标是具体标签活动，即 `categoryId + activityId`。
- 某天存在至少一条命中该标签活动的记录，则该天点亮。
- 状态文案显示当月累计时长。

### 领域

- 某天存在至少一条记录的 `scopeIds` 包含该领域，则该天点亮。
- 状态文案显示当月累计时长。

### 日课

- 某天该手动日课完成，则该天点亮。
- 状态文案显示当月完成天数。

## 同步数据

React 侧构建追踪日历 payload，并同步给原生：

- `templateId`
- `entries`
  - `date`
  - `value`
  - 标签 / 领域：当天分钟数
  - 日课：`0 | 1`
- `syncedAt`

说明：

- payload 以模板为单位预计算，原生只负责按当前月份过滤绘制。
- `entries` 覆盖最近一段滚动时间窗，确保跨天刷新后仍能渲染当前月份。
- 模板编辑完成后也要触发 payload 重建。

## 设置页

- “新建小组件模板”改为先选模板类型：
  - 计时器 `2x1`
  - 计时器 `2x2`
  - 计时器 `3x2`
  - 计时器 `4x1`
  - 计时器 `4x2`
  - `2×2 追踪日历`
- 如果是追踪日历模板：
  - 编辑页显示单卡片预览
  - 提供追踪对象、名称、颜色、图标模式配置
  - UI icon 入口继续受兑换码门槛控制

## 原生实现

- 新增 provider：
  - `QuickLogWidgetTrackingCalendar2x2`
- 新增资源：
  - `widget_layout_tracking_calendar_2x2.xml`
  - `widget_info_tracking_calendar_2x2.xml`
  - `strings.xml` 对应 label
- 新增原生支持类：
  - `WidgetTrackingCalendarBitmapRenderer.kt`
  - `WidgetTrackingCalendarProviderSupport.java`
- `WidgetRefreshCoordinator` 纳入统一刷新。
- `WidgetStores` / `WidgetBridgePlugin` 新增追踪日历 payload 的读写与桥接。

## 测试

- TypeScript：
  - 模板兼容归一化
  - 追踪 payload 构建
  - 标题切换分组不串类型
- 原生回归：
  - 标题点击只轮换追踪日历模板
  - 空配置不崩溃
  - 日课无颜色时使用中性色
- 构建验证：
  - `npm run build`
