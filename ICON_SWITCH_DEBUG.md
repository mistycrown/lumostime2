# 图标切换调试指南

## 问题描述
点击应用图标按钮后没有反应，图标无法切换。

## 已添加的调试功能

### 1. 控制台调试命令
打开浏览器控制台（F12），输入以下命令查看当前状态：

```javascript
window.debugIconSwitch()
```

这会显示：
- `isRedeemed`: 是否已验证赞赏码（必须为 true 才能切换图标）
- `isChangingIcon`: 是否正在切换中
- `selectedIcon`: 当前选中的图标ID
- `supporterId`: 赞助者ID
- `redemptionCode`: 兑换码

### 2. 详细日志输出
现在每次点击图标按钮时，控制台会输出详细的调试信息：

#### 按钮点击日志
```
[Button] 按钮被点击: <iconId>
[Button] 事件对象: <event>
[Button] disabled状态: <true/false>
```

#### 处理函数日志
```
[SponsorshipView] ========== 图标切换开始 ==========
[SponsorshipView] 点击的图标ID: <iconId>
[SponsorshipView] isRedeemed状态: <true/false>
[SponsorshipView] isChangingIcon状态: <true/false>
[SponsorshipView] 当前选中图标: <currentIcon>
```

#### iconService 日志
```
[iconService] ========== setIcon 开始 ==========
[iconService] 请求的iconId: <iconId>
[iconService] 找到的iconOption: <option>
[iconService] 平台信息: { platform, isNative }
[iconService] setDesktopIcon 开始
[iconService] favicon已更新
```

## 调试步骤

### 步骤 1: 检查验证状态
1. 打开控制台（F12）
2. 运行 `window.debugIconSwitch()`
3. 检查 `isRedeemed` 是否为 `true`

**如果 `isRedeemed` 为 `false`：**
- 原因：未验证赞赏码
- 解决：先输入兑换码并点击"解锁功能"按钮
- 按钮会显示为半透明且禁用状态

### 步骤 2: 检查按钮点击
1. 打开控制台（F12）
2. 点击任意图标按钮
3. 查看是否有 `[Button] 按钮被点击` 日志

**如果没有日志：**
- 原因：点击事件未触发
- 可能原因：
  - 按钮被其他元素遮挡
  - CSS pointer-events 被禁用
  - 按钮处于 disabled 状态

**如果有日志但显示 `disabled状态: true`：**
- 检查 `isRedeemed` 状态（见步骤1）
- 检查 `isChangingIcon` 是否卡在 true 状态

### 步骤 3: 检查图标切换流程
如果按钮点击有日志，查看后续的处理流程：

1. **SponsorshipView 日志**：确认 handleIconChange 被调用
2. **iconService 日志**：确认 setIcon 被调用
3. **setDesktopIcon 日志**：确认 favicon 被更新

### 步骤 4: 检查 favicon 更新
在控制台运行：
```javascript
document.querySelector('link[rel="icon"]').href
```

这会显示当前的 favicon 路径。切换图标后再次运行，看路径是否改变。

### 步骤 5: 清除缓存
如果 favicon 路径已更新但浏览器显示的图标没变：
1. 硬刷新页面：`Ctrl + Shift + R` (Windows) 或 `Cmd + Shift + R` (Mac)
2. 清除浏览器缓存
3. 关闭并重新打开浏览器

## 常见问题

### 问题 1: 按钮是半透明的，点击无效
**原因**：未验证赞赏码
**解决**：
1. 滚动到页面顶部
2. 输入兑换码
3. 点击"解锁功能"按钮

### 问题 2: 控制台显示"请先验证赞赏码"
**原因**：`isRedeemed` 状态为 false
**解决**：同问题1

### 问题 3: 图标路径已更新但浏览器不显示
**原因**：浏览器缓存
**解决**：
1. 硬刷新：`Ctrl + Shift + R`
2. 或清除浏览器缓存

### 问题 4: Electron 环境下图标不更新
**原因**：Electron 需要特殊处理
**检查**：
```javascript
console.log('是否有 ipcRenderer:', !!(window as any).ipcRenderer)
```
如果为 false，说明 Electron IPC 未正确配置。

## 测试用兑换码
如果需要测试，可以使用"清除兑换码状态"按钮重置状态。

## 下一步
根据控制台输出的日志，确定问题出在哪个环节：
1. 按钮点击未触发 → 检查 DOM 结构和 CSS
2. isRedeemed 为 false → 验证赞赏码
3. iconService 报错 → 检查图标文件路径
4. favicon 已更新但不显示 → 清除缓存
