# 数据修复指南

## 问题描述

从自定义主题切换回默认主题时，图标显示为 ❓ 或英文单词（如 commute, housework），而不是原始的 emoji。

## 问题原因

旧的图标迁移逻辑将 `icon` 字段从 emoji 转换为 `ui:iconType` 格式，但没有保留原始 emoji。当切换回默认主题时：

1. `IconRenderer` 尝试将 `ui:iconType` 转换回 emoji
2. `convertUIIconToEmoji` 只能转换映射表中的图标
3. 对于自定义选择的图标（不在映射表中），返回 ❓
4. 对于某些图标，返回英文标签而不是 emoji

## 解决方案

### 1. 数据修复服务（dataRepairService.ts）

自动修复已损坏的数据：

```typescript
// 修复逻辑
if (icon.startsWith('ui:')) {
    return {
        icon: convertUIIconToEmoji(icon),  // 尝试恢复 emoji
        uiIcon: icon                        // 保存 UI 图标 ID
    };
}
```

**修复结果：**
- `icon` 字段：恢复为 emoji（如果无法转换则为 ❓）
- `uiIcon` 字段：保存原来的 UI 图标 ID

### 2. 更新 getDisplayIcon 函数

增强图标显示逻辑，处理各种情况：

```typescript
// 默认主题
if (currentTheme === 'default') {
    if (icon.startsWith('ui:')) {
        // 转换回 emoji
        return convertUIIconToEmoji(icon);
    }
    return icon;  // 直接返回 emoji
}

// 自定义主题
return uiIcon || icon;  // 优先使用 uiIcon
```

### 3. 应用初始化时自动修复

在 `useAppInitialization` hook 中添加：

1. **数据修复**：修复旧迁移逻辑造成的问题
2. **双图标迁移**：为现有数据添加 `uiIcon` 字段

## 修复流程

### 首次运行

1. 应用启动
2. 检查是否需要修复（`lumostime_data_repair_v1_done`）
3. 如果需要：
   - 扫描所有 `icon` 字段
   - 将 `ui:iconType` 格式的移动到 `uiIcon`
   - 尝试恢复原始 emoji 到 `icon`
   - 标记修复完成
   - 刷新页面

### 后续运行

- 跳过修复（已标记完成）
- 正常使用双图标系统

## 修复后的数据结构

### 修复前：
```json
{
  "icon": "ui:commute",  // ❌ 无法在默认主题显示
  "uiIcon": undefined
}
```

### 修复后：
```json
{
  "icon": "🚗",          // ✅ 默认主题显示 emoji
  "uiIcon": "ui:commute" // ✅ 自定义主题显示 UI 图标
}
```

## 无法恢复的情况

如果原始 emoji 不在映射表中，修复后 `icon` 会是 ❓：

```json
{
  "icon": "❓",          // ⚠️ 需要用户重新选择
  "uiIcon": "ui:custom_icon"
}
```

**用户需要：**
1. 切换到默认主题
2. 重新选择正确的 emoji

## 测试清单

- [ ] 首次运行时自动修复数据
- [ ] 修复后刷新页面
- [ ] 默认主题显示 emoji
- [ ] 自定义主题显示 UI 图标
- [ ] 切换主题时图标正确显示
- [ ] 修复标记正确保存
- [ ] 后续运行不重复修复

## 调试

### 查看修复状态
```javascript
localStorage.getItem('lumostime_data_repair_v1_done')
```

### 强制重新修复
```javascript
localStorage.removeItem('lumostime_data_repair_v1_done')
window.location.reload()
```

### 查看数据
```javascript
JSON.parse(localStorage.getItem('lumostime_categories'))
```

## 注意事项

1. **自动刷新**：修复完成后会自动刷新页面
2. **一次性操作**：修复只运行一次，不会重复
3. **数据安全**：修复前数据已在 localStorage 中，可以手动恢复
4. **向后兼容**：未修复的数据也能正常工作（但默认主题可能显示 ❓）
