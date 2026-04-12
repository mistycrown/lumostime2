# 安卓 4 键操作型桌面小组件设计

## 背景

当前仓库已经存在一版安卓桌面小组件注册与入口代码，但旧实现本质上只是一个快捷启动按钮：

- `QuickLogWidget` 仅负责打开 `lumostime://record?action=quick_log`
- `widget_layout.xml` 仅包含一个图标按钮

这套实现不具备以下能力：

- 在桌面直接开始某个标签计时
- 在桌面直接结束当前标签计时
- 展示当前标签的激活态
- 按项目自身视觉风格渲染组件

同时，项目当前正式数据主要由 React Context 和仓储链路托管：

- `DataContext`
- `dataRepository`
- `storageRepository`

核心持久层已迁移为 IndexedDB 优先、localStorage 兜底。这套链路适合 WebView 内应用，但不适合 Android App Widget 直接读取。桌面小组件如果继续依赖前端内存态或 WebView 初始化，会出现响应慢、状态不一致、难以可靠更新的问题。

## 目标

第一阶段仅实现一个极简、可操作、稳定的安卓桌面小组件：

1. 小组件为白色圆角卡片。
2. 卡片内固定展示 4 个用户配置的标签图标。
3. 点击未激活图标时，立即开始该标签计时。
4. 点击已激活图标时，立即结束该标签计时。
5. 同一时间仅允许 1 个标签激活。
6. 若当前已有激活标签，点击其他标签时自动结束旧标签并开始新标签。
7. 激活态图标切换为停止图标，并具有明确聚焦视觉。
8. 用户无需先打开 App，即可在桌面完成开始/停止操作。

## 非目标

第一阶段不包含以下内容：

1. 不展示标签名称、计时时长、统计摘要或其他文本信息。
2. 不支持超过 4 个按钮的尺寸自适应布局。
3. 不支持 widget 内编辑标签配置。
4. 不支持并行多标签同时计时。
5. 不支持 widget 内填写备注、标题、专注度、心情等扩展字段。
6. 不支持完整复刻应用内全部图标主题体系。
7. 不将 widget 直接接入 React 的 `SessionContext` 内存态。

## 用户体验定义

### 组件形态

- 一个白色卡片容器
- 一个 2x2 的圆形按钮阵列
- 每个按钮仅显示图标

### 按钮状态

- 默认态：浅色圆底，显示标签原始图标
- 激活态：按钮高亮，出现聚焦外圈或更强底色，图标切换为停止图标

### 交互规则

1. 点击普通按钮：
   - 若当前无激活项，则开始对应标签计时
   - 若当前已有其他激活项，则结束旧项并开始新项
2. 点击激活按钮：
   - 结束当前计时
3. 动作完成后立即刷新小组件 UI

## 方案对比

### 方案 A：Widget 点击仅打开 App，由前端完成计时

优点：

1. 复用现有 deep link 逻辑，接入快。
2. 原生改动相对少。

缺点：

1. 用户每次点击都会被拉起 App，不符合桌面直达预期。
2. 交互响应依赖 WebView 冷启动，体验不稳定。
3. 很难做到真正的“点一下就开始、再点一下就停止”。

### 方案 B：RemoteViews 继续扩展旧 widget

优点：

1. 可复用现有 AppWidgetProvider 注册。
2. 对旧代码改动路径短。

缺点：

1. UI 表达受限，后续很难保持精致。
2. 状态与交互越来越复杂时，可维护性较差。

### 方案 C：Glance + 原生操作层 + 轻量状态镜像

优点：

1. 点击动作可以在原生层直接完成，不依赖 WebView 启动。
2. UI 更适合做极简白卡片和圆形按钮阵列。
3. 后续扩展尺寸、样式、配置页会更自然。
4. 可将 widget 所需状态收敛为原生可读的小数据集，避免与前端正式仓储强耦合。

缺点：

1. 需要新增一层原生状态管理与 Capacitor 桥接。
2. 首次建设成本高于纯 deep link。

## 结论

采用方案 C。

第一阶段以“Glance 渲染 + 原生开始/停止控制 + 小型状态镜像”为核心路径，不让 widget 直接依赖 React `SessionContext` 或 WebView 内 IndexedDB。

## 架构设计

### 总体原则

桌面小组件不负责管理完整业务数据，只负责两件事：

1. 渲染 4 个可点击按钮
2. 通过原生控制器执行开始/停止动作

完整日志与正式数据仍回到应用主数据层统一收敛。

### 分层结构

建议新增以下分层：

1. `WidgetConfigStore`
   - 按 widget 实例保存 4 个按钮配置
2. `WidgetRuntimeStore`
   - 保存当前激活项与启动时间
3. `WidgetSnapshotBuilder`
   - 从配置和运行态生成 UI 快照
4. `WidgetTimerController`
   - 响应点击并执行业务动作
5. `WidgetBridgePlugin`
   - 提供 App 与原生 widget 配置/同步桥接

### 推荐原生数据结构

#### WidgetConfig

按 widgetId 保存：

- `widgetId`
- `slots`

每个 slot 包含：

- `activityId`
- `categoryId`
- `icon`
- `uiIcon`
- `color`
- `order`

#### WidgetRuntimeState

全局仅保留单一激活态：

- `activeActivityId`
- `activeCategoryId`
- `startedAt`
- `source`
- `lastUpdatedAt`

`source` 用于区分是否由 widget 触发，便于后续对账与调试。

#### WidgetSnapshot

用于渲染：

- `widgetId`
- `slots`
- `hasActiveSlot`
- `activeActivityId`
- `updatedAt`

每个 slot 包含：

- `activityId`
- `categoryId`
- `defaultIcon`
- `activeIcon`
- `color`
- `isActive`

## 数据流设计

### 配置写入链路

1. 用户在 App 内进入“小组件配置页”
2. 选择 4 个常用标签
3. 前端调用 `WidgetBridgePlugin.saveWidgetConfig`
4. 原生写入 `WidgetConfigStore`
5. 原生重建 `WidgetSnapshot`
6. 原生刷新对应 widget

### 点击开始链路

1. 用户点击某个未激活按钮
2. Glance Action 回调进入 `WidgetTimerController`
3. 控制器读取 `WidgetRuntimeStore`
4. 若当前无激活项，则直接开始该标签
5. 写入新的 `WidgetRuntimeState`
6. 触发日志草稿或原生 session 记录
7. 重建 `WidgetSnapshot`
8. 刷新全部相关 widget

### 点击停止链路

1. 用户点击当前激活按钮
2. `WidgetTimerController` 识别为停止动作
3. 读取开始时间并生成结束时间
4. 写入正式 log 或待同步日志队列
5. 清空 `WidgetRuntimeState`
6. 重建 `WidgetSnapshot`
7. 刷新全部相关 widget

### 点击切换链路

1. 用户点击另一个未激活按钮
2. 控制器先结束旧标签
3. 立即开始新标签
4. 更新 `WidgetRuntimeState`
5. 重建 `WidgetSnapshot`
6. 刷新 widget

## 与现有项目的集成策略

### 为什么不能直接复用 SessionContext

当前 `SessionContext` 的 `activeSessions` 是前端内存态：

- 应用未启动时，widget 无法读取
- 应用被系统回收后，widget 也无法可靠获取
- widget 点击不应依赖 React 生命周期

因此第一阶段不能将 widget 的开始/停止动作建立在 `SessionContext` 之上。

### 与正式日志数据的关系

第一阶段建议采用“原生先执行，App 再对账”的模式：

1. widget 在原生层立即写入开始/结束结果
2. 原生将结果保存为轻量日志记录或待同步动作
3. App 恢复前台或启动时，通过 `WidgetBridgePlugin` 拉取这些动作
4. 前端将其转成正式 `Log` 并写入 `dataRepository`

这样可以保证：

- widget 响应快
- 主数据仍由前端仓储统一落库
- 出现异常时更容易补偿

### 第一阶段建议的同步形式

新增一份原生待同步队列，例如：

- `pendingWidgetActions`

每项包含：

- `id`
- `actionType`
- `activityId`
- `categoryId`
- `startedAt`
- `endedAt`
- `createdAt`

App 启动后消费该队列，成功写入正式数据后再由原生删除对应 action。

## UI 设计

### 视觉目标

小组件必须看起来像产品组件，不像默认系统按钮面板。

### 卡片样式

- 纯白背景
- 大圆角
- 轻微阴影
- 内边距略宽
- 不显示标题栏与多余文案

### 按钮样式

- 统一圆形
- 默认态使用低饱和浅底色
- 激活态出现明显聚焦感
- 激活态图标使用停止方块或同等明确的停止图标

### 图标策略

第一阶段优先级建议如下：

1. 优先支持 emoji
2. 其次支持少量可映射的系统 drawable 或内置图标
3. 暂不完整迁移 `uiIconTheme`

原因：

- widget 渲染环境与前端图标系统不同
- 全量迁移 `uiIconTheme` 成本高
- 第一阶段目标是交互闭环，不是完整主题同步

## 配置设计

### 配置入口

第一阶段只在 App 内提供配置页，不在 widget 内做复杂配置。

### 配置能力

用户可完成：

1. 选择 4 个标签
2. 调整排序
3. 预览 2x2 按钮布局
4. 保存到当前 widget 实例

### 每个 widget 独立配置

必须按 `widgetId` 分开保存，保证用户后续可以拥有多个不同组合的小组件。

## 错误处理

### 缺失配置

若某个 slot 未配置：

- 展示空占位按钮
- 点击无效

### 配置已失效

若配置的 activity/category 已被删除：

- widget 渲染为禁用态
- 点击不执行
- App 内配置页提示该按钮需要重新选择

### 原生动作写入失败

若开始/停止动作执行失败：

- 保持旧快照不变
- 记录原生日志
- 下次 App 启动时可展示轻提示或诊断信息

### 前端对账失败

若 App 消费 `pendingWidgetActions` 失败：

- 队列项暂不删除
- 下次启动继续重试
- 需要去重机制避免重复导入日志

## 测试策略

### 原生单元测试

至少覆盖：

1. 无激活项时点击开始
2. 点击激活项时停止
3. 激活 A 后点击 B 时切换
4. 快照构建正确标记 `isActive`
5. 配置缺失时返回禁用态 slot

### 前端集成验证

至少覆盖：

1. App 能保存 widget 配置
2. App 能消费原生待同步动作并生成正式 log
3. 重复消费不会产生重复日志

### 手动验证

1. 桌面添加 widget
2. 在配置页选择 4 个标签
3. 点击某标签后 widget 立即切激活态
4. 点击同一按钮后停止并恢复默认态
5. 点击另一按钮时自动切换
6. 重启 App 后日志正确落入正式数据层

## 实施拆分

### 第一阶段：原生闭环

1. 新建 Glance widget
2. 新建 `WidgetConfigStore`
3. 新建 `WidgetRuntimeStore`
4. 新建 `WidgetSnapshotBuilder`
5. 新建 `WidgetTimerController`
6. 完成开始、停止、切换三条动作链

### 第二阶段：App 配置接入

1. 新建 `WidgetBridgePlugin`
2. 新建 App 内配置页
3. 支持按 widgetId 写入 4 项配置
4. 支持预览和重新保存

### 第三阶段：正式数据对账

1. 原生维护 `pendingWidgetActions`
2. App 启动时拉取待同步动作
3. 前端转换为正式 `Log`
4. 成功后清空已消费动作

## 需要修改或新增的主要文件

### 原生 Android

- 新增 Glance widget 类
- 新增 widget receiver / action callback
- 新增 `WidgetTimerController`
- 新增 `WidgetConfigStore`
- 新增 `WidgetRuntimeStore`
- 新增 `WidgetSnapshotBuilder`
- 新增或更新 widget 相关资源与 manifest 注册

### Capacitor 桥接

- 新增 `WidgetBridgePlugin.ts`
- 新增对应 Android Plugin 实现

### React 前端

- 新增 widget 配置页或设置子页
- 启动时新增 widget action 消费逻辑
- 与 `dataRepository` 对接正式日志落库

## 风险与缓解

### 风险 1：原生开始/停止与前端正式日志重复

缓解：

- 所有 widget 动作统一走原生待同步队列
- 前端只消费队列，不重复推断
- 每个 action 具备稳定唯一 id

### 风险 2：图标系统过重

缓解：

- 第一阶段只支持 emoji 和有限内置图标
- 先做交互闭环，再评估主题同步

### 风险 3：多 widget 实例配置相互污染

缓解：

- 所有配置严格按 `widgetId` 隔离
- 运行态是全局单激活，配置态是实例级

### 风险 4：系统回收或进程重启导致状态丢失

缓解：

- 激活态只保存在原生持久层，不保存在前端内存
- widget 刷新始终从 `WidgetRuntimeStore` 重建

## 结论

第一阶段安卓桌面小组件应被定义为“4 键操作型计时开关”，而不是展示卡片。

最稳妥的落地方式是：

1. 用 Glance 负责极简 2x2 白色圆角 UI
2. 用原生 `WidgetTimerController` 负责开始、停止、切换
3. 用轻量状态镜像承接 widget 运行态
4. 用前端仓储继续维护正式业务数据

这样既能满足“点一下开始、再点一下停止”的目标，也能最大限度规避当前 React/IndexedDB 架构与 Android widget 运行机制之间的天然冲突。
