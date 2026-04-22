# NFC URI 兼容解析设计

## 背景

当前 NFC 扫描链路依赖 `new URL(...)` 后的 `protocol === 'lumostime:'` 与 `host === 'record'` 判断标签是否属于 LumosTime。

线上已经出现如下情况：

- NFC 标签实际内容为 `lumostime://record?action=start&cat_id=life&act_id=commute`
- 读取测试页却将其展示为“普通 URI 标签”
- 正式扫描时只弹出原始 schema 的 toast，不执行动作

这说明问题不在 NFC 读取，而在 URI 解析与识别阶段。部分机型或 WebView 对自定义 scheme 的解析结果不稳定，导致本来合法的 LumosTime 标签被误判。

## 目标

- 让当前写入格式 `lumostime://record?...` 在不同机型上稳定识别
- 兼容历史或变体格式，避免老标签失效
- 让“读取测试页”和“正式扫描执行”共用同一套解析逻辑
- 保持现有写入格式不变，避免额外迁移成本

## 非目标

- 不修改 Android 原生 NFC 读取方式
- 不重构 NFC 写入 UI
- 不引入新的标签持久化映射表

## 方案选择

### 方案 A：新增公共兼容解析器

新增一个纯工具解析器，统一处理 LumosTime 自定义 URI，并在运行时与读取测试页共用。

优点：

- 改动集中，风险可控
- 读取展示与执行逻辑一致
- 方便补充历史格式兼容

缺点：

- 需要补一层规范化逻辑和测试

### 方案 B：只放宽现有 `if` 判断

优点：

- 修改最少

缺点：

- 逻辑会继续分散在 `useDeepLink` 和 `NFCSettingsView`
- 后续再加兼容时更难维护

### 结论

采用方案 A。

## 兼容范围

解析器需要兼容以下情况：

- 当前标准格式：`lumostime://record?action=...`
- 前后存在空白字符的标签内容
- `lumostime:record?action=...`
- `lumostime:///record?action=...`
- `lumostime://record/?action=...`
- action 别名：`quick_log` 视为 `quick_punch`
- 参数别名：
  - `cat_id` / `catId` / `categoryId` / `category_id`
  - `act_id` / `actId` / `activityId` / `activity_id`
  - `check_item_id` / `checkItemId`

## 设计

### 1. 公共解析器

新增 `src/utils/lumosTimeUrlParser.ts`。

职责：

- 识别是否为 `lumostime:` scheme
- 兼容 `URL` 解析结果不一致时的手动兜底解析
- 统一返回规范化结构

返回结果分为三类：

- `record`
- `widget`
- `null`，表示不是 LumosTime 可识别链接

对于 `record`，进一步规范化为以下动作：

- `quick_punch`
- `start`
- `daily_check`
- `unknown`

### 2. 运行时执行接入

`useDeepLink.ts` 改为先调用公共解析器，再决定执行分支：

- `quick_punch` 走快速打点
- `start` 走活动开始/切换
- `daily_check` 走日课打点
- `widget` 继续走现有快捷方式逻辑
- 无法识别时保持当前兜底 toast

这样“读到了标签但没执行”的原因会真正收敛到：

- 不是 LumosTime 标签
- action 不支持
- 标签缺少必要参数
- 标签引用的 ID 已失效

### 3. 读取测试页接入

`NFCSettingsView.tsx` 的测试解析也改用公共解析器。

这样展示逻辑与运行时完全一致：

- 能执行的标签会显示为 LumosTime 标签
- 旧格式兼容标签也会被识别为 LumosTime 标签
- 真正不支持的标签才显示为普通 URI 标签

### 4. 错误处理

保持现有业务提示不变：

- 缺少活动配置
- 缺少日课项目
- 配置失效
- 活动不存在

解析器只负责“识别和归一化”，不吞掉业务错误。

## 测试

新增针对解析器的单元测试，覆盖：

- 标准 `record` URI
- 带空白的 URI
- `lumostime:record?...`
- `lumostime:///record?...`
- 参数别名兼容
- `quick_log` 别名
- widget URI
- 非 LumosTime URI

## 影响范围

- `src/hooks/useDeepLink.ts`
- `src/views/settings/NFCSettingsView.tsx`
- `src/utils/lumosTimeUrlParser.ts`
- `src/utils/lumosTimeUrlParser.test.ts`
- `src/hooks/README.md`
- `src/utils/README.md`

## 风险与回退

主要风险是兼容规则过宽，误把非 LumosTime URI 当成应用标签。

控制方式：

- 只接受 `lumostime:` scheme
- 只接受 `record` 与 `widget` 两类目标
- 只对少量明确别名做参数归一化

如果出现回归，可以只回退解析器接入点，不需要回退原生 NFC 读取层。
