# DAILY_RUNTIME 4x4 小组件设计

## 背景

现有 Android 小组件体系基于统一模板和槽位渲染，支持 `2x1`、`2x2`、`3x2`、`4x1`、`4x2` 五种尺寸，适合计时器、日课、快捷方式等离散槽位场景。本次新增的小组件 `DAILY_RUNTIME` 需要展示“今天 24 小时的时间记录热力图”，布局和交互模型都不同于现有槽位模板，不适合继续复用槽位渲染链路。

## 目标

- 新增一个专用的 `4x4` Android 桌面小组件，名称为 `DAILY_RUNTIME`
- 展示今天的 24 小时时间热力图
- 颜色按一级标签（`Category`）映射，不使用二级活动
- 风格参考白底科技热力图，整体尽量简洁
- 仅做展示，不支持点击具体格子交互
- 点击整个组件时仅打开 App

## 非目标

- 不支持点击单个时间格跳转到对应记录
- 不支持跨天切换或历史日期浏览
- 不接入现有模板编辑器，不加入模板轮播
- 不在本次实现中扩展 iOS 或桌面端 widget

## 方案选择

### 推荐方案

新增一条独立于模板槽位系统的原生 widget 渲染链路：

- 独立的 `AppWidgetProvider`
- 独立的 `layout/xml/provider manifest` 注册
- 独立的“今日热力图 payload”同步模型
- 独立的 bitmap 渲染器，将热力图和图例绘制为一张位图显示

### 原因

- 目标布局是 24 列 x 6 行的热力图，不是 16 个离散槽位
- 现有统一模板系统围绕 `slotIndex`、点按行为和模板绑定设计，复用会引入不必要约束
- 使用单张 bitmap 可以规避 `RemoteViews` 对复杂网格、圆角、字距、图例排版的限制

## 数据设计

React 侧新增一个今日运行态 payload，同步给原生：

- `date`: 当前本地日期，格式 `YYYY-MM-DD`
- `totalMinutes`: 今日总记录分钟数，用于顶部 `SYS_UP`
- `segments`: 144 个 10 分钟片段
  - 每项记录所属一级标签 id、名称、颜色
  - 空白片段使用 `null`
- `legend`: 今日出现过的一级标签汇总
  - 标签 id
  - 标签名称
  - 标签颜色
  - 今日累计分钟数
- `syncedAt`: 同步时间戳

### 片段生成规则

- 以今天 `00:00` 到 `24:00` 为时间窗
- 每 10 分钟一个片段，共 `24 * 6 = 144`
- 将日志裁切到今天范围内后投影到片段
- 若一个片段被多个一级标签覆盖，采用“覆盖时长最多”的标签
- 当前仍在进行中的 session 也要投影到热力图中

## UI 设计

### 顶部

- 左侧固定标题：`DAILY_RUNTIME`
- 右侧状态：`SYS_UP: xxH:xxM`
- 采用浅灰小字与较深标题字，保留轻科技感

### 主体

- 白底卡片
- 中间为 24 列 x 6 行热力网格
- 每格代表 10 分钟
- 空白格使用浅灰色
- 有数据格使用一级标签颜色，并保留轻微圆角

### 时间刻度

- 固定三段：`00:00`、`12:00`、`23:59`

### 图例

- 只显示一级标签
- 采用“色点 + 标签名 + 时长”的简洁形式
- 不使用额外胶囊边框

## 原生实现

### 注册

- 新增 `widget_info_daily_runtime_4x4.xml`
- 新增 `widget_layout_daily_runtime_4x4.xml`
- 新增 `QuickLogWidgetDailyRuntime4x4`
- 在 `AndroidManifest.xml` 注册 provider
- 在 `strings.xml` 增加 label

### 渲染

- 新增 `WidgetDailyRuntimeBitmapRenderer.kt`
- 布局中主体使用一个 `ImageView` 展示完整 bitmap
- provider 刷新时从 `WidgetStores` 读取最新 payload
- 日期变化、时间变化、时区变化时自动刷新

### 存储

- `WidgetStores` 新增 `KEY_DAILY_RUNTIME_SYNC`
- 提供 `saveDailyRuntimePayload` / `loadDailyRuntimePayload`

### Bridge

- `WidgetBridgePlugin.kt` / `WidgetBridgePlugin.ts` 新增 `syncDailyRuntimeWidgetData`
- React 侧 `useWidgetBridgeSync` 在日志、分类、会话变化后同步 payload

## 测试与验证

- `npm run build`
- 确认 TypeScript bridge 类型通过编译
- 确认 Android 源码引用、provider 注册、资源 ID 无编译级错误
- 手动验证：
  - 今天有日志时能看到热力格着色
  - 无日志时显示浅灰空网格
  - 当前进行中的 session 会立即反映
  - 跨天后自动刷新为空白/新一天数据

## 风险

- `RemoteViews` 文本和复杂布局能力弱，因此采用 bitmap 渲染规避样式限制
- 如果热力图同步只依赖日志，正在进行中的 session 会滞后，因此必须把当前 session 也纳入 payload
- 如一级标签过多，底部图例可能拥挤；本次先按自然换行绘制，必要时后续再做截断
