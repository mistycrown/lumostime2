# IconRenderer 迁移指南

## 当前状态

✅ **好消息：** 所有现有代码都可以正常工作！`IconRenderer` 已经完全向后兼容。

## 为什么现有代码可以工作？

当前所有使用 `IconRenderer` 的地方都只传递了 `icon` 参数：

```tsx
<IconRenderer icon={category.icon} />
```

这样可以工作是因为：
1. 旧数据中，`icon` 字段可能是 emoji（如 "📚"）或 `ui:iconType` 格式（如 "ui:book"）
2. `IconRenderer` 会自动解析 `icon` 字段并正确渲染
3. 组件内部使用 `getDisplayIcon()` 函数来决定显示什么

## 推荐的迁移方式（可选）

为了充分利用双图标系统，建议逐步更新为同时传递 `uiIcon`：

### 更新前：
```tsx
<IconRenderer icon={category.icon} />
```

### 更新后：
```tsx
<IconRenderer icon={category.icon} uiIcon={category.uiIcon} />
```

## 需要更新的文件列表

以下文件使用了 `IconRenderer`，可以逐步更新（非必需）：

### 高优先级（用户直接交互）
- [ ] `src/views/RecordView.tsx` - 记录页面
- [ ] `src/views/TodoView.tsx` - 待办页面
- [ ] `src/views/TagsView.tsx` - 标签页面
- [ ] `src/views/ScopeView.tsx` - 领域页面

### 中优先级（详情页面）
- [ ] `src/views/CategoryDetailView.tsx`
- [ ] `src/views/TagDetailView.tsx`
- [ ] `src/views/ScopeDetailView.tsx`
- [ ] `src/views/FocusDetailView.tsx`

### 低优先级（统计和其他）
- [ ] `src/views/StatsView.tsx`
- [ ] `src/views/TimelineView.tsx`
- [ ] `src/views/SearchView.tsx`
- [ ] `src/components/DetailTimelineCard.tsx`
- [ ] `src/components/MonthHeatmap.tsx`

## UIIconSelector 迁移

### 更新前（旧接口）：
```tsx
<UIIconSelector 
  currentIcon={activity.icon}
  onSelect={(icon) => setActivity({ ...activity, icon })}
/>
```

### 更新后（新接口）：
```tsx
<UIIconSelector 
  currentIcon={activity.icon}
  currentUiIcon={activity.uiIcon}
  onSelectDual={(emoji, uiIcon) => setActivity({ 
    ...activity, 
    icon: emoji, 
    uiIcon 
  })}
/>
```

## 需要更新 UIIconSelector 的文件

- [ ] `src/views/CategoryDetailView.tsx`
- [ ] `src/views/TagDetailView.tsx`
- [ ] `src/views/ScopeDetailView.tsx`
- [ ] `src/views/BatchManageView.tsx`
- [ ] `src/views/TodoBatchManageView.tsx`
- [ ] `src/views/ScopeManageView.tsx`

## 迁移策略

### 方案 1：渐进式迁移（推荐）
- 保持现有代码不变（已经可以工作）
- 在开发新功能时使用新接口
- 在修改现有功能时顺便更新

### 方案 2：一次性迁移
- 使用查找替换工具批量更新
- 需要仔细测试所有功能

### 方案 3：不迁移
- 保持现有代码不变
- 依赖 `IconRenderer` 的向后兼容性
- 这是完全可行的选择！

## 重要提示

⚠️ **不需要立即迁移！** 

当前的实现已经完全向后兼容，所有功能都可以正常工作。迁移只是为了：
1. 更明确地表达意图（同时有 emoji 和 UI 图标）
2. 更好的类型安全
3. 未来可能的性能优化

## 测试清单

无论是否迁移，都应该测试以下场景：

- [ ] 默认主题下显示 emoji
- [ ] 自定义主题下显示 UI 图标
- [ ] 切换主题时图标正确更新
- [ ] 选择新图标时正确保存
- [ ] 旧数据（只有 icon 字段）正常显示
- [ ] 新数据（同时有 icon 和 uiIcon）正常显示
