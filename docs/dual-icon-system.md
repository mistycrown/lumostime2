# 双图标系统设计文档

## 概述

新的双图标系统允许同时存储 emoji 和 UI 图标，在默认主题和自定义主题之间切换时不会丢失数据。

## 数据结构

### 类型定义（src/types.ts）

```typescript
interface Activity {
  icon: string;      // Emoji 图标（用于默认主题）
  uiIcon?: string;   // UI 图标 ID（用于自定义主题，格式：ui:iconType）
  // ... 其他字段
}

interface Category {
  icon: string;      // Emoji 图标（用于默认主题）
  uiIcon?: string;   // UI 图标 ID（用于自定义主题）
  // ... 其他字段
}

interface Scope {
  icon: string;      // Emoji 图标（用于默认主题）
  uiIcon?: string;   // UI 图标 ID（用于自定义主题）
  // ... 其他字段
}

interface TodoCategory {
  icon: string;      // Emoji 图标（用于默认主题）
  uiIcon?: string;   // UI 图标 ID（用于自定义主题）
}
```

## 核心组件

### 1. IconRenderer（src/components/IconRenderer.tsx）

**功能：** 统一的图标渲染组件

**使用方式：**
```tsx
// 旧数据（只有 icon）- 自动兼容
<IconRenderer icon="📚" />
<IconRenderer icon="ui:book" />

// 新数据（同时有 icon 和 uiIcon）
<IconRenderer icon="📚" uiIcon="ui:book" />

// 从对象中传递
<IconRenderer icon={category.icon} uiIcon={category.uiIcon} />
```

**渲染逻辑：**
- 默认主题：显示 `icon`（emoji）
- 自定义主题：优先显示 `uiIcon`，如果没有则显示 `icon`

### 2. UIIconSelector（src/components/UIIconSelector.tsx）

**功能：** 统一的图标选择组件

**使用方式：**
```tsx
// 旧接口（兼容）
<UIIconSelector 
  currentIcon={activity.icon}
  onSelect={(icon) => setActivity({ ...activity, icon })}
/>

// 新接口（推荐）
<UIIconSelector 
  currentIcon={activity.icon}
  currentUiIcon={activity.uiIcon}
  onSelectDual={(emoji, uiIcon) => setActivity({ ...activity, icon: emoji, uiIcon })}
/>
```

## 工具函数

### iconUtils.ts

```typescript
// 获取应该显示的图标
getDisplayIcon(emoji: string, uiIcon: string | undefined, currentTheme: string): string

// 设置图标（根据当前主题）
setIcon(newIcon: string, currentTheme: string, currentEmoji: string, currentUiIcon: string | undefined)

// 检查是否有 UI 图标
hasUiIcon(uiIcon: string | undefined): boolean

// 确保对象有 uiIcon 字段
ensureUiIconField<T>(item: T): T
```

## 数据迁移

### 初始化迁移（dualIconMigrationService.ts）

为现有数据添加 `uiIcon` 字段（初始值为 `undefined`）

```typescript
// 在应用初始化时运行一次
await dualIconMigrationService.migrateAll();
```

### 主题切换迁移（iconMigrationService.ts）

**从默认主题切换到自定义主题：**
- 将 emoji 转换为 UI 图标 ID，存储到 `uiIcon` 字段
- `icon` 字段保持不变

**从自定义主题切换到默认主题：**
- 可选：清除 `uiIcon` 字段（也可以保留）
- `icon` 字段保持不变

## 兼容性

### 向后兼容

1. **旧数据（只有 icon 字段）：**
   - IconRenderer 自动识别并正确渲染
   - 首次切换到自定义主题时，自动生成 `uiIcon` 字段

2. **旧代码（只传 icon 参数）：**
   - IconRenderer 接受单个 `icon` 参数
   - UIIconSelector 接受旧的 `onSelect` 回调

### 向前兼容

新代码可以同时传递 `icon` 和 `uiIcon`，充分利用双图标系统的优势。

## 优势

1. **数据不丢失：** 切换主题时，emoji 和 UI 图标都保留
2. **向后兼容：** 旧数据和旧代码无需修改即可工作
3. **统一管理：** 只需修改两个核心组件（IconRenderer 和 UIIconSelector）
4. **灵活切换：** 可以随时在默认主题和自定义主题之间切换

## 实施状态

✅ 已完成：
- 类型定义更新
- IconRenderer 组件更新
- UIIconSelector 组件更新
- 工具函数创建
- 数据迁移服务创建

⏳ 待完成：
- 在应用初始化时运行 dualIconMigrationService.migrateAll()
- 更新主题切换逻辑使用新的 iconMigrationService
- 测试兼容性

## 使用建议

1. **新功能开发：** 使用新接口（传递 icon 和 uiIcon）
2. **旧代码维护：** 保持现有代码不变，自动兼容
3. **数据迁移：** 在应用启动时自动运行，用户无感知
