# 4x3 场景小组件设计

日期：2026-05-02

## 目标

- 新增一个独立的 Android `4x3` 场景小组件。
- 小组件始终跟随“当前生效的场景组”。
- 小组件顶部提供时间段 `tab` 切换，每个 `tab` 只显示一个图标。
- 小组件主体使用接近计时器小组件的圆形槽位风格。
- 每个 `tab` 内自动读取该时间段的场景卡片，只保留 `timer / todo / checklist` 三类。
- 场景卡片区域一行显示 `5` 个槽位，首屏约 `3` 行，并支持继续下滑。
- 不补空态占位，卡片不足时保留留白。

## 范围

### 包含

- React 侧构建并同步场景小组件 payload。
- Native 侧新增专用 `4x3` widget provider、布局、tab 集合视图与卡片网格集合视图。
- 复用现有 widget 的计时、待办启动、日课打点逻辑。
- 支持每个桌面实例单独切换当前 `tab`。

### 不包含

- 不并入现有模板化小组件编辑器。
- 不新增场景 widget 的应用内配置页。
- 不渲染 `navigation / principle / reference / stats` 场景卡片。
- 不为卡片数量不足时补空槽位。

## 交互设计

### 头部

- 第一行显示当前生效场景组名称。
- 第二行显示时间段 `tab` 图标列表。
- `tab` 默认选中当前时间命中的时间段。
- 点击 `tab` 只影响当前 widget 实例，不影响应用内场景页状态。

### 自动跟随规则

- 若场景组切换模式为 `manual`，使用 `activeGroupId` 对应分组。
- 若切换模式为 `auto`，优先选择命中自动规则的场景组；若没有命中，回退到 `activeGroupId`。
- Native 端在收到系统时间/日期变更广播后自行重新计算当前生效场景组与当前时间段。
- 若用户手动切过 `tab`，在同一时间段内保留该选择。
- 当当前时间段发生变化时，自动将该 widget 实例的选中 `tab` 重置为当前命中的时间段。

### 卡片网格

- 使用可滚动 `GridView`，一行 `5` 个。
- 首屏高度按 `4x3` 空间展示约 `3` 行。
- 数据顺序保持与场景时间段内卡片顺序一致。
- 只渲染可执行卡片：
  - `timer`：要求存在 `activityId + categoryId`
  - `todo`：要求目标待办存在，且能解析出可启动的 `linked activity/category`
  - `checklist`：要求存在 `checkItemId`
- 不可执行的 `todo` 卡片直接跳过，不降级为“打开 app”。

## 数据设计

React 侧同步完整场景组状态到 native，而不是只同步“当前分组”，原因是 widget 需要在 app 未打开时，也能根据系统时间变化自动切换场景组与时间段。

同步 payload 包含：

- `switchMode`
- `activeGroupId`
- `groups[]`
- `group.autoSwitch`
- `group.timeSlots[]`
- `timeSlot.items[]`

每个 `item` 只保留 widget 执行和渲染所需字段：

- `id`
- `itemType`
- `title`
- `icon`
- `color`
- `activityId / categoryId`
- `linkedTodoId`
- `scopeIds`
- `checkTemplateId / checkItemId / checkManualMode / checkTargetCount`

## 点击行为

### timer

- 点击空闲卡片：开始计时。
- 点击当前激活卡片：结束计时并回传 pending action。

### todo

- 点击空闲卡片：按待办关联的 `activity/category` 开始计时，并带上 `linkedTodoId` 与默认 `scopeIds`。
- 点击当前激活卡片：结束计时并回传 pending action。

### checklist

- 二值日课：未完成时直接完成；已完成时不处理。
- 计数日课：未达标时加一；已达标时不处理。
- 点击后复用现有 pending daily action 回放链路写回 React 数据层。

## Native 实现

新增组件：

- `QuickLogWidgetScene4x3`
- `WidgetSceneProviderSupport`
- `WidgetSceneTabsRemoteViewsService`
- `WidgetSceneCardsRemoteViewsService`
- `widget_layout_scene_4x3.xml`
- `widget_scene_tab_item.xml`
- `widget_scene_card_item.xml`
- `widget_info_scene_4x3.xml`

新增存储：

- 场景 widget payload
- 每个 widget 实例的已选 `tab`
- 每个 widget 实例最近一次自动命中的时间段

## 验证

- `manual` 模式下，切换 `activeGroupId` 后 widget 跟随更新。
- `auto` 模式下，不同 weekday/weekend/dateRange 规则能正确切组。
- 到达新的时间段边界后，已手动切换的 `tab` 会重置为当前命中时间段。
- `timer / todo / checklist` 三类点击都能正确触发。
- 卡片超过首屏时可以继续下滑。
- 卡片不足时保留留白，不补空槽位。
