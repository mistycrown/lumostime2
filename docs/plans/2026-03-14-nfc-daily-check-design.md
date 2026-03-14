# NFC 日课快速打卡设计

## 背景

当前 NFC 功能已经支持两类标签：

- `quick_punch`：快速补录一条记录
- `start`：启动指定活动

现有实现链路如下：

- Android 原生插件读取 NFC 标签中的 URI，并通过 `nfcTagScanned` 事件发送到前端
- 前端在 `useDeepLink` 中统一处理 App Deep Link 和 NFC 扫描事件
- `daily review` 的创建与更新由 `useReviewManager`、`ReviewContext` 和 `DailyReviewView` 管理
- `SceneView` 已有一套“今日日课打卡”逻辑，可处理手动二值日课和手动数字日课

本次新增目标是：支持用户通过 NFC 标签，快速完成今日日课中的单个手动日课项。

## 目标

- 在设置页为单个日课项写入 NFC 标签
- 标签扫描后直接更新今日日课，不强制打开 `daily review`
- 支持两类日课：
  - 手动二值：从未完成变为完成
  - 手动数字：完成次数加一
- 如果今天没有 `daily review`，自动静默创建后再打卡
- 如果手动二值已完成，再扫不变更，并提醒“已完成”
- 如果手动数字已到上限，再扫不变更，并提醒“已达到最大限制”
- 暂不支持 NFC 回退、撤销或减一

## 非目标

- 不支持一个 NFC 标签绑定多个日课项
- 不支持自动日课
- 不支持扫码后自动打开 `daily review`
- 不支持通过 NFC 重置或回退日课状态

## 方案选择

### 方案 A：标签中直接写入 `check_item_id`，扫描时解析并执行

示例 URI：

```text
lumostime://record?action=daily_check&check_item_id=<checkItemId>
```

优点：

- 与现有 NFC URI 方案一致，改动最小
- 标签本身就是配置，跨设备可用
- 扫描后不依赖本地额外映射

缺点：

- 如果模板项被删除或重建 ID，旧标签会失效，需要重新写入

### 方案 B：标签只写本地配置 ID，再由本地映射到日课项

优点：

- 后续可扩展更复杂的 NFC 配置

缺点：

- 换手机、清数据、同步异常时标签不可迁移
- 需要维护本地映射存储和失效恢复逻辑

### 方案 C：标签写入日课内容文本，扫描时按内容匹配

优点：

- 不依赖模板项 ID

缺点：

- 重名、改名、分组冲突风险高
- 历史兼容逻辑可作为兜底，但不适合作为主路径

### 结论

采用方案 A。继续保留按“分组 + 内容 / 内容”匹配的逻辑，但仅作为历史数据兼容的兜底，不作为主配置路径。

## 整体架构

新增一套公共“今日 NFC 日课打卡”逻辑，供以下入口复用：

- NFC 标签扫描
- `SceneView` 中的日课卡片打卡

公共逻辑负责：

1. 根据 `check_item_id` 校验目标模板项是否存在且可打卡
2. 获取今天的 `daily review`
3. 如果不存在，基于当前启用的 daily check templates 和 review templates 创建新的 `daily review`
4. 在 `daily review.checkItems` 中定位目标项
5. 根据日课类型执行更新
6. 返回统一结果枚举，供 toast 和调用方处理

## 数据流

### 写入流程

1. 用户进入 NFC 设置页
2. 选择一个启用中的 daily 手动日课项
3. 点击“写入日课打卡标签”
4. 前端调用 `NfcService.writeTag`
5. 原生插件将 URI 写入 NFC 标签

### 扫描流程

1. Android 原生插件读出 URI
2. 前端 `useDeepLink` 监听 `nfcTagScanned`
3. 解析 `action=daily_check`
4. 调用公共日课打卡逻辑
5. 更新 `dailyReviews`
6. 根据结果弹出 toast

## URI 设计

新增一种 NFC 动作：

```text
lumostime://record?action=daily_check&check_item_id=<checkItemId>
```

字段说明：

- `action=daily_check`：表示执行日课快速打卡
- `check_item_id`：模板日课项 ID

## 公共逻辑设计

建议新增一个公共模块，例如：

- `src/utils/dailyCheckNfcUtils.ts`
  或
- `src/services/dailyCheckService.ts`

建议职责拆分如下：

### 1. 模板元数据查询

根据 `checkItemId` 查询启用中的 daily check template，返回：

- `content`
- `category`
- `manualMode`
- `targetCount`
- `type`

仅允许：

- `type === 'manual' && manualMode === 'binary'`
- `type === 'manual' && manualMode === 'count'`

### 2. 今日 `daily review` 准备

如果今天没有 `daily review`，则按当前模板动态创建，字段包括：

- `checkItems`
- `checkCategorySyncToTimeline`
- `templateSnapshot`

该逻辑应与 `useReviewManager.handleCreateDailyReviewSilently` 的行为保持一致。

### 3. 目标日课项定位

定位优先级：

1. 按 `item.id === checkItemId`
2. 按 `category + content`
3. 按 `content`

这样可以兼容历史数据中旧的日课项结构或模板迁移场景。

### 4. 打卡规则

#### 手动二值

- 未完成：改为完成
- 已完成：不改动，返回 `already_completed`

#### 手动数字

- `currentCount < targetCount`：`currentCount + 1`
- `currentCount >= targetCount`：不改动，返回 `limit_reached`

### 5. 返回结果

建议公共逻辑返回：

- `status`
- `message`
- `updatedReview`
- `updatedReviews`
- `item`

`status` 建议枚举：

- `completed`
- `already_completed`
- `incremented`
- `limit_reached`
- `not_found`
- `unsupported_type`

## UI 设计

### 设置页

扩展 `NFCSettingsView`，新增“日课快速打卡”卡片。

交互形式沿用现有 NFC 写标签模式：

1. 选择目标日课项
2. 点击“写入日课打卡标签”
3. 进入 NFC 写入态
4. 写入成功后 toast 提示

### 选项来源

仅展示以下候选项：

- 已启用的 `isDaily === true` 模板项
- `type === 'manual'`
- `manualMode === 'binary'` 或 `manualMode === 'count'`

展示格式建议：

- `模板标题 / 日课内容`
- 如果是次数型，同时显示目标值，例如：`运动 / 拉伸（目标 3 次）`

### 扫描反馈文案

- 手动二值首次完成：`已完成：{日课名}`
- 手动二值重复扫描：`今日已完成，无需重复打卡`
- 数字类型成功加一：`已打卡：{日课名}（{current}/{target}）`
- 数字类型达到上限：`今日已达到最大次数`
- 配置失效：`NFC 标签配置已失效，请重新写入`
- 类型不支持：`该日课类型暂不支持 NFC 打卡`

## 与现有模块的关系

### `useDeepLink`

新增对 `action=daily_check` 的处理。

### `SceneView`

当前 `SceneView` 已经实现了今日手动日课打卡，但逻辑嵌在视图内部。建议将其抽离为公共逻辑，并让 `SceneView` 复用，避免 NFC 和场景页出现规则不一致。

### `useReviewManager`

保留 `handleCreateDailyReviewSilently` 作为“创建今日 review”的现有入口。公共日课打卡逻辑应尽量与它的模板构造规则一致。

## 边界条件

- 今天没有 `daily review`：先静默创建，再打卡
- 模板项不存在：提示标签失效
- 模板项被删除或重建 ID：提示标签失效
- 历史 `daily review` 中存在旧结构：按内容兜底匹配
- 自动日课：拒绝打卡
- 二值日课已完成：不变更
- 次数日课已到上限：不变更

## 测试计划

### 单元测试

建议至少覆盖：

- 无今日 `daily review` 时自动创建并完成二值日课
- 二值日课重复扫描不再修改
- 次数日课加一成功
- 次数日课达到上限后不再增加
- 模板项缺失时返回失效结果
- 历史数据中按 `category + content` 或 `content` 回退匹配

### 手动验证

Android 设备上验证：

1. 写入一个手动二值日课标签
2. 首次扫描成功完成
3. 第二次扫描提示已完成
4. 写入一个手动数字日课标签
5. 连续扫描直到上限
6. 超过上限后提示已达最大次数
7. 删除对应模板项后再次扫描，提示标签失效

## 实施步骤

1. 新增公共日课打卡工具，抽离 `SceneView` 中已有 helper
2. 修改 `SceneView`，改为调用公共逻辑
3. 修改 `useDeepLink`，新增 `daily_check` 扫描处理
4. 修改 `NFCSettingsView`，增加日课项选择与写标签 UI
5. 增加测试并执行构建验证

## 风险

- 旧标签在模板项被删除或重建 ID 后会失效
- `SceneView` 逻辑抽离时如果行为不一致，可能影响现有日课卡片
- 历史 `daily review` 数据结构复杂时，需要保证兼容逻辑稳定

## 结论

本次功能以“单标签绑定单日课项”为范围，采用 URI 直写 `check_item_id` 的方案，在不引入额外本地映射的前提下实现跨设备可用的 NFC 快速打卡。通过抽离公共打卡逻辑，可同时服务 NFC 和场景页，降低重复实现与行为分叉风险。
