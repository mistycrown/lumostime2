# UIIconSelector 组件使用文档

## 概述

`UIIconSelector` 是一个图标选择器组件，允许用户从当前 UI 图标主题中选择图标。该组件会自动显示当前主题下的所有可用图标，并支持按分组浏览。

## 组件变体

### 1. UIIconSelector（完整版）

带分组标签的完整图标选择器，适合在详情页面使用。

```tsx
import { UIIconSelector } from '@/components/UIIconSelector';

<UIIconSelector
  currentIcon={activity.icon}
  onSelect={(icon) => setActivity({ ...activity, icon })}
/>
```

**特性：**
- 按分组显示图标（核心功能、日常生活、学习工作、娱乐社交、个人成长）
- 可切换分组查看
- 网格布局，自适应列数
- 显示选中状态
- 最大高度 320px，超出滚动

### 2. UIIconSelectorCompact（紧凑版）

单行显示所有图标的紧凑版本，适合在弹窗或侧边栏使用。

```tsx
import { UIIconSelectorCompact } from '@/components/UIIconSelector';

<UIIconSelectorCompact
  currentIcon={activity.icon}
  onSelect={(icon) => setActivity({ ...activity, icon })}
/>
```

**特性：**
- 显示所有 80 个图标
- 更小的图标尺寸（40px）
- 最大高度 240px，超出滚动
- 无分组标签

## Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `currentIcon` | `string` | 是 | 当前选中的图标，可以是 Emoji 或 `"ui:iconType"` 格式 |
| `onSelect` | `(iconString: string) => void` | 是 | 选择图标时的回调函数，返回 `"ui:iconType"` 格式的字符串 |
| `className` | `string` | 否 | 额外的 CSS 类名 |

## 使用场景

### 1. 在标签详情页面中使用

已集成到 `TagDetailView.tsx` 中：

```tsx
import { UIIconSelector } from '../components/UIIconSelector';
import { useSettings } from '../contexts/SettingsContext';

// 在组件中
const { uiIconTheme } = useSettings();
const isCustomThemeEnabled = uiIconTheme !== 'default';

// 在渲染中
{isCustomThemeEnabled && (
  <div>
    <label className="text-xs text-stone-400 font-medium mb-2 block">
      UI 图标
      <span className="text-stone-300 ml-1">(可选)</span>
    </label>
    <UIIconSelector
      currentIcon={activity.icon}
      onSelect={(icon) => setActivity({ ...activity, icon })}
    />
  </div>
)}
```

### 2. 在分类管理中使用

```tsx
// CategoryManageView.tsx
<UIIconSelector
  currentIcon={category.icon}
  onSelect={(icon) => {
    setCategory({ ...category, icon });
    onUpdateCategory({ ...category, icon });
  }}
/>
```

### 3. 在领域管理中使用

```tsx
// ScopeManageView.tsx
<UIIconSelector
  currentIcon={scope.icon}
  onSelect={(icon) => {
    setScope({ ...scope, icon });
    onUpdateScope({ ...scope, icon });
  }}
/>
```

### 4. 在待办分类中使用

```tsx
// TodoCategoryEditor.tsx
<UIIconSelector
  currentIcon={todoCategory.icon}
  onSelect={(icon) => {
    setTodoCategory({ ...todoCategory, icon });
  }}
/>
```

## 工作原理

### 1. 图标格式

选择器返回的图标格式为 `"ui:iconType"`，例如：
- `"ui:book"` - 书籍图标
- `"ui:workout"` - 运动图标
- `"ui:code"` - 编程图标

### 2. 图标加载

组件会自动从当前主题加载图标：
- 优先加载 PNG 格式
- PNG 失败时降级到 WebP 格式
- 使用 `uiIconService.getIconPathWithFallback()` 获取路径

### 3. 分组显示

图标按以下分组组织：
- **核心功能** (core): 16 个图标 - 同步、设置、管理等
- **日常生活** (daily): 16 个图标 - 首页、睡眠、通勤等
- **学习工作** (work): 16 个图标 - 学习、会议、编程等
- **娱乐社交** (entertainment): 16 个图标 - 探索、社交、游戏等
- **个人成长** (personal): 16 个图标 - 自我、思考、锻炼等

### 4. 选中状态

- 解析 `currentIcon` 判断是否为 UI 图标格式
- 提取图标类型并与列表中的图标对比
- 选中的图标显示白色背景、边框和对勾标记

## 样式定制

### 修改网格列数

```tsx
<UIIconSelector
  currentIcon={activity.icon}
  onSelect={handleSelect}
  className="custom-class"
/>

// 在 CSS 中
.custom-class > div:last-child {
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
}
```

### 修改最大高度

```tsx
<UIIconSelector
  currentIcon={activity.icon}
  onSelect={handleSelect}
  className="max-h-96" // 使用 Tailwind 类
/>
```

## 注意事项

1. **主题检测**: 组件会自动检测当前主题，只在非 `default` 主题时显示图标图片
2. **条件渲染**: 建议只在启用自定义主题时显示选择器
3. **性能优化**: 使用 `useMemo` 缓存分组数据，避免重复计算
4. **图片降级**: 自动处理图片加载失败的情况
5. **响应式**: 网格布局自动适应容器宽度

## 完整示例

```tsx
import React, { useState } from 'react';
import { UIIconSelector } from '@/components/UIIconSelector';
import { useSettings } from '@/contexts/SettingsContext';
import { Activity } from '@/types';

function ActivityEditor({ activity, onSave }: { 
  activity: Activity; 
  onSave: (activity: Activity) => void;
}) {
  const [editedActivity, setEditedActivity] = useState(activity);
  const { uiIconTheme } = useSettings();
  const isCustomThemeEnabled = uiIconTheme !== 'default';

  return (
    <div className="space-y-4">
      {/* 名称输入 */}
      <div>
        <label>名称</label>
        <input
          value={editedActivity.name}
          onChange={(e) => setEditedActivity({
            ...editedActivity,
            name: e.target.value
          })}
        />
      </div>

      {/* UI 图标选择器 - 仅在启用自定义主题时显示 */}
      {isCustomThemeEnabled && (
        <div>
          <label>选择 UI 图标</label>
          <UIIconSelector
            currentIcon={editedActivity.icon}
            onSelect={(icon) => setEditedActivity({
              ...editedActivity,
              icon
            })}
          />
        </div>
      )}

      {/* 保存按钮 */}
      <button onClick={() => onSave(editedActivity)}>
        保存
      </button>
    </div>
  );
}
```

## 相关组件

- `IconRenderer` - 用于渲染图标（Emoji 或图片）
- `useIconRenderer` - 获取图标渲染信息的 Hook
- `uiIconService` - UI 图标服务

## 未来扩展

可能的功能扩展：
1. 搜索功能 - 按名称搜索图标
2. 最近使用 - 显示最近选择的图标
3. 收藏功能 - 收藏常用图标
4. 自定义分组 - 允许用户创建自定义分组
5. 预览模式 - 在不同背景色下预览图标效果
