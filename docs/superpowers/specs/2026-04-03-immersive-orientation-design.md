# 沉浸式计时方向控制设计

日期：2026-04-03

## 背景

当前沉浸式计时页面通过 `window.innerWidth > window.innerHeight` 自动判断横竖布局。用户如果想切换显示方向，必须先旋转手机，操作成本偏高。

本次需求要补两层能力：

1. 在偏好设置中配置沉浸式计时的默认显示方向，只提供 `横屏` 和 `竖屏` 两个选项。
2. 在沉浸式计时页面中提供一个方向切换开关，只影响当前这次沉浸式会话，不改默认设置。

本次设计控制的是沉浸式计时的布局方向，不做系统级的屏幕方向锁定，也不依赖手机物理旋转触发。

## 目标

- 用户可以在偏好设置里预设沉浸式计时默认方向。
- 用户进入沉浸式后，可以随时切换当前会话的方向。
- 当前会话的方向切换在退出后失效，下次仍按偏好设置的默认方向进入。
- 现有主题、白噪音、时钟样式、状态栏恢复逻辑不受影响。

## 非目标

- 不新增“跟随手机旋转”选项。
- 不调用原生屏幕方向锁定 API。
- 不改变普通计时页或其他页面的横竖布局策略。

## 方案选择

### 方案 A：默认方向 + 当前会话临时覆盖

偏好设置维护一个持久化默认方向；沉浸式计时页内部再维护一个仅本次会话有效的临时方向覆盖。

优点：

- 符合需求原文。
- 用户心智清晰，默认设置和当前临时切换职责分离。
- 不需要把“当前会话切换”写回全局设置，副作用最小。

缺点：

- 需要补一层方向解析逻辑。

### 方案 B：默认方向 + 页面内切换同时改全局

页面内切换按钮直接写回偏好设置，当前和未来会话都一起变化。

优点：

- 实现更直接。

缺点：

- 与“只影响当前”冲突。
- 用户在沉浸式里做临时切换时，容易意外改掉默认设置。

### 方案 C：仅默认方向，不做页面内切换

优点：

- 实现最小。

缺点：

- 不满足需求。

最终采用方案 A。

## 架构设计

### 1. 设置模型

在 `SettingsContext` 中新增类型：

```ts
type ImmersiveTimerOrientation = 'landscape' | 'portrait';
```

新增状态：

- `immersiveTimerDefaultOrientation`
- `setImmersiveTimerDefaultOrientation`

持久化 key：

- `lumostime_immersive_timer_default_orientation`

默认值：

- `'landscape'`

这样可以兼容当前沉浸式计时以横向展示为主的体验。

### 2. 偏好设置页面

在 `PreferencesSettingsView` 中新增一个设置项：

- 标题：`沉浸式计时默认方向`
- 选项：`横屏` / `竖屏`

呈现方式沿用当前偏好页已有的分段按钮或双选按钮风格，不新造复杂控件。

设置页只负责改全局默认值，不感知当前是否正在沉浸式会话中。

### 3. 沉浸式计时页面

`ImmersiveTimer` 当前的 `isLandscape` 表示“设备当前尺寸是否更宽”。本次设计将它拆成两类概念：

- `deviceIsLandscape`
  - 仍然通过 `window.innerWidth > window.innerHeight` 获取。
  - 只作为尺寸参考和某些自适应字体计算依据。

- `effectiveOrientation`
  - 真正决定沉浸式布局显示方向。
  - 来源优先级：
    1. 当前会话临时覆盖 `sessionOrientationOverride`
    2. 偏好设置默认值 `immersiveTimerDefaultOrientation`

`effectiveOrientation === 'landscape'` 时使用当前横向布局。
`effectiveOrientation === 'portrait'` 时使用当前纵向布局。

### 4. 当前会话方向切换

在沉浸式计时页顶部控制区新增一个方向按钮，位置与现有按钮组并列。

建议使用图标表达横/竖切换，交互规则如下：

- 点击后在 `landscape` 和 `portrait` 之间切换。
- 只写入 `sessionOrientationOverride`。
- 退出沉浸式时该覆盖值销毁。

如果当前默认方向是横屏，用户在本次会话切到竖屏：

- 本次沉浸式立即用竖屏布局。
- 退出后不保存。
- 下次进入仍按默认横屏。

## 数据流

### 进入沉浸式

1. `ImmersiveTimer` 读取 `immersiveTimerDefaultOrientation`。
2. 初始化 `sessionOrientationOverride = null`。
3. 计算 `effectiveOrientation`。
4. 页面按 `effectiveOrientation` 选择横向或纵向布局。

### 当前会话切换方向

1. 用户点击沉浸式页面方向按钮。
2. 更新 `sessionOrientationOverride`。
3. 重新计算 `effectiveOrientation`。
4. 页面即时切换布局。

### 退出沉浸式

1. `sessionOrientationOverride` 随组件卸载消失。
2. 全局默认方向保持不变。

## 兼容性与边界

- 设备物理旋转后，页面不再自动切换沉浸式布局方向。
- `deviceIsLandscape` 仍可保留，用于横向字号计算或后续细节适配。
- 竖屏和横屏布局都已经在 `ImmersiveTimer` 中存在，本次主要是把“谁决定用哪套布局”从设备朝向改为用户设置。
- `FlipClock` 如果内部也直接读设备横竖状态，需要同步接入 `effectiveOrientation`，避免数字时钟与翻页时钟行为不一致。

## 实现拆分

### SettingsContext

- 新增 `ImmersiveTimerOrientation` 类型。
- 新增默认方向状态与 setter。
- 新增 localStorage 读写。
- 暴露到 `useSettings()`。

### SettingsView / PreferencesSettingsView

- 从 `useSettings()` 读取并下发默认方向。
- 在偏好设置页新增对应 UI。

### ImmersiveTimer

- 从 `useSettings()` 读取默认方向。
- 新增 `sessionOrientationOverride`。
- 用 `effectiveOrientation` 替代当前直接使用的 `isLandscape` 作为布局分支条件。
- 新增当前会话方向切换按钮。
- 保留 `deviceIsLandscape` 供字号/尺寸辅助逻辑使用。

### 纯逻辑抽取

建议新增一个轻量工具函数，例如：

```ts
resolveImmersiveOrientation(defaultOrientation, sessionOverride)
```

这样可以单测“默认值 + 临时覆盖”的优先级，不需要依赖 React 组件测试。

## 错误处理

- 如果 localStorage 中的值非法，回退到 `'landscape'`。
- 如果设置页没有拿到 setter，则保持只读显示，避免点击报错。
- 如果沉浸式页面方向按钮未拿到当前状态，回退到默认方向计算。

## 测试策略

### 单元测试

1. `resolveImmersiveOrientation`
   - 默认横屏 + 无覆盖 => 横屏
   - 默认竖屏 + 无覆盖 => 竖屏
   - 默认横屏 + 当前覆盖竖屏 => 竖屏
   - 默认竖屏 + 当前覆盖横屏 => 横屏

2. 设置默认值
   - `SettingsContext` 能读取默认值。
   - 非法值回退到横屏。

3. 页面内临时切换
   - 临时切换不会改全局默认值。

### 手工验证

1. 在偏好设置改为横屏，进入沉浸式，默认显示横向布局。
2. 在偏好设置改为竖屏，进入沉浸式，默认显示纵向布局。
3. 在沉浸式中切换方向，当前页面立即变化。
4. 退出后再次进入，应恢复偏好设置里的默认方向。
5. 切换主题、白噪音、翻页时钟后，方向切换仍正常。
6. 退出沉浸式后，状态栏恢复逻辑不受影响。

## 风险

- `FlipClock` 组件可能也有自己的方向判断逻辑，需要一起检查，否则数字时钟和翻页时钟的方向策略会不一致。
- 当前一些横屏字号计算依赖设备宽高比，改成用户指定方向后，可能需要区分“设备尺寸”和“布局方向”两个变量，避免在竖屏设备上强制横向布局时字号过大。

## 结论

本次改动的核心不是新增一套新布局，而是把沉浸式计时“由设备朝向驱动”改成“由用户设置驱动”，同时保留一次性会话覆盖。这样既能减少用户操作，又不会破坏已有的沉浸式主题、白噪音和计时流程。
