# 双图标系统修复说明

## 问题描述

用户报告从自定义主题切换回默认主题时，图标显示为 ❓ 或英文单词（如 commute, housework），而不是原始的 emoji。

## 根本原因

之前的实现在主题切换时进行了不必要的数据迁移：
- 从自定义主题切换回默认主题时，尝试执行"反向迁移"（将 UI 图标转回 emoji）
- 这些反向迁移方法并不存在，导致数据处理错误

## 正确的逻辑

根据用户需求，双图标系统应该这样工作：

### 1. 初始状态
- 用户只有 emoji 系统（`icon` 字段）
- 所有标签都使用 emoji 表示

### 2. 首次切换到自定义主题
- 检查是否已经生成过 `uiIcon`（通过 `lumostime_uiicon_generated` 标记）
- 如果没有生成过，执行一次性生成：
  - 通过 emoji 匹配生成对应的 `uiIcon` 字段
  - 能匹配的自动生成（如 📚 → ui:book）
  - 不能匹配的保持为 `undefined`（需要用户手动设置）
- 标记已生成，刷新页面

### 3. 之后的主题切换
- **不再进行任何数据迁移**
- 两套系统（emoji 和 uiIcon）共存
- 切换主题只是切换渲染方式：
  - 默认主题：渲染 `icon` 字段（emoji）
  - 自定义主题：渲染 `uiIcon` 字段（UI 图标）

## 修复内容

### 1. 更新 `executeThemePresetChange` 函数

**文件**: `src/views/SponsorshipView.tsx`

**修改前**:
- 从自定义主题切换回默认时，尝试执行"反向迁移"
- 从默认切换到自定义时，每次都执行迁移

**修改后**:
```typescript
// 只在首次从 default 切换到自定义主题时生成 uiIcon
if (oldTheme === 'default' && preset.uiTheme !== 'default') {
    // 检查是否已经生成过
    if (!iconMigrationService.isUiIconGenerated()) {
        // 执行一次性生成
        const result = await iconMigrationService.generateAllUiIcons();
        // 刷新页面
    }
}

// 从自定义主题切换回 default，不做任何数据迁移
if (oldTheme !== 'default' && preset.uiTheme === 'default') {
    // 只是切换渲染方式，不修改数据
}
```

### 2. 更新 `handleUiIconThemeChange` 函数

**文件**: `src/views/SponsorshipView.tsx`

**修改前**:
- 每次从默认切换到自定义都执行迁移
- 从自定义切换回默认时重置迁移状态

**修改后**:
```typescript
// 只在首次从 default 切换到自定义主题时生成 uiIcon
if (oldTheme === 'default' && newTheme !== 'default') {
    if (!iconMigrationService.isUiIconGenerated()) {
        // 执行一次性生成并刷新
    }
}

// 其他情况都不做数据迁移
```

## 核心组件说明

### IconRenderer 组件
**文件**: `src/components/IconRenderer.tsx`

- 接收 `icon` 和 `uiIcon` 两个参数
- 根据当前主题自动选择渲染哪个图标
- 向后兼容旧数据（只有 `icon` 字段）

### getDisplayIcon 函数
**文件**: `src/utils/iconUtils.ts`

```typescript
export function getDisplayIcon(
  icon: string,
  uiIcon: string | undefined,
  currentTheme: string
): string {
  // 默认主题：返回 icon（emoji）
  if (currentTheme === 'default') {
    return icon;
  }
  
  // 自定义主题：优先返回 uiIcon，回退到 icon
  return uiIcon || icon;
}
```

### iconMigrationService
**文件**: `src/services/iconMigrationService.ts`

核心方法：
- `isUiIconGenerated()`: 检查是否已经生成过 uiIcon
- `generateAllUiIcons()`: 执行一次性生成
- `markUiIconGenerated()`: 标记已生成

## 测试场景

### 场景 1: 首次从默认主题切换到自定义主题
- ✅ 应该生成 uiIcon 并刷新页面
- ✅ 能匹配的图标自动生成
- ✅ 不能匹配的保持为 undefined

### 场景 2: 从自定义主题切换回默认主题
- ✅ 不做数据迁移
- ✅ 直接显示 emoji（icon 字段）
- ✅ 不刷新页面

### 场景 3: 再次从默认切换到自定义
- ✅ 不重新生成 uiIcon
- ✅ 直接显示已有的 UI 图标
- ✅ 不刷新页面

### 场景 4: 在自定义主题之间切换
- ✅ 不做数据迁移
- ✅ 直接切换 UI 图标主题
- ✅ 不刷新页面

## 数据结构

```typescript
interface Activity {
  id: string;
  name: string;
  icon: string;        // emoji（始终保留）
  uiIcon?: string;     // UI 图标 ID（首次生成后保留）
  // ... 其他字段
}

interface Category {
  id: string;
  name: string;
  icon: string;        // emoji（始终保留）
  uiIcon?: string;     // UI 图标 ID（首次生成后保留）
  activities: Activity[];
  // ... 其他字段
}

interface Scope {
  id: string;
  name: string;
  icon: string;        // emoji（始终保留）
  uiIcon?: string;     // UI 图标 ID（首次生成后保留）
  // ... 其他字段
}

interface TodoCategory {
  id: string;
  name: string;
  icon: string;        // emoji（始终保留）
  uiIcon?: string;     // UI 图标 ID（首次生成后保留）
  // ... 其他字段
}
```

## 向后兼容性

- ✅ 旧数据（只有 `icon` 字段）完全兼容
- ✅ `IconRenderer` 组件自动处理新旧数据
- ✅ 首次切换到自定义主题时自动生成 `uiIcon`
- ✅ 用户无需手动迁移数据

## 总结

修复后的双图标系统：
1. **简化了逻辑**：只在首次切换时生成一次，之后不再迁移
2. **数据安全**：两套系统共存，互不干扰
3. **性能优化**：减少不必要的数据处理和页面刷新
4. **用户体验**：主题切换更流畅，图标显示正确
