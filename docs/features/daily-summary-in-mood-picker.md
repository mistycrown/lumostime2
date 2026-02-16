# 今日一句话总结功能 - Mood Picker 快捷入口

## 概述
在 Emoji/Sticker Selector（Mood Picker）中添加了"今日一句话总结"的快捷输入功能，让用户可以在选择心情的同时快速填写当天的总结。

## 功能特性

### 1. 数据存储
- 数据存储在每天 Review 的 `summary` 字段中（`DailyReview.summary`）
- 同时更新 `summaryUpdatedAt` 时间戳

### 2. 渲染逻辑
- **已有总结**：直接显示在输入框中
- **无总结**：显示占位符"今日一句话总结..."
- **修改总结**：实时更新并保存到 DailyReview

### 3. 保存机制
- **实时保存**：使用 300ms 防抖，输入停止后自动保存
- **自动创建**：如果当天没有 Review，会自动创建并保存总结
- **无需手动保存**：所有更改自动持久化

## UI 布局调整

### 输入框位置
- 位于"SELECT YOUR MOOD"副标题下方
- 在 Emoji/Sticker 选择器上方
- 使用圆角矩形设计，与整体风格一致

### 间距优化
为了容纳新的输入框，调整了以下间距：
- 页面导航：`mb-6` → `mb-4`
- Emoji 网格：`mb-6` → `mb-4`
- Sticker 网格：`mb-6` → `mb-4`
- 页码指示器：`mb-4` → `mb-3`

## 技术实现

### 组件更新

#### 1. MoodPicker.tsx
```typescript
interface MoodPickerModalProps {
    // ... 其他属性
    summary?: string; // 今日一句话总结
    onSummaryChange?: (summary: string) => void; // 总结变化回调
}
```

**新增状态**：
- `localSummary`: 本地输入状态
- `summaryTimeoutRef`: 防抖定时器引用

**新增方法**：
- `handleSummaryChange`: 处理输入变化，实现防抖保存

#### 2. MoodCalendar.tsx
```typescript
interface MoodCalendarProps {
    // ... 其他属性
    onUpdateSummary?: (date: string, summary: string) => void;
}
```

#### 3. ReviewNarrativeTab.tsx
- 将 `summary` 和 `onSummaryChange` 传递给 MoodPickerModal

#### 4. JournalView.tsx
- 实现 `onUpdateSummary` 回调
- 自动创建或更新 DailyReview

## 使用场景

### 场景 1：日记视图（Journal View）
用户在查看月历时，点击某一天：
1. 打开 Mood Picker
2. 可以选择心情 emoji/sticker
3. 同时填写"今日一句话总结"
4. 关闭后自动保存

### 场景 2：每日回顾（Daily Review）
用户在回顾页面的叙事标签中：
1. 点击心情选择按钮
2. 打开 Mood Picker
3. 可以修改心情和总结
4. 实时同步到回顾数据

## 数据流

```
用户输入
  ↓
localSummary (本地状态)
  ↓
300ms 防抖
  ↓
onSummaryChange 回调
  ↓
更新 DailyReview.summary
  ↓
持久化到存储
```

## 样式设计

### 输入框样式
```css
- 背景：bg-stone-50（浅灰）
- 边框：border-stone-200
- 圆角：rounded-xl
- 内边距：px-4 py-2.5
- 字体：text-sm
- 焦点状态：
  - border-stone-400
  - bg-white
```

### 响应式设计
- 输入框宽度：`w-full`（自适应容器宽度）
- 在移动端和桌面端都有良好的显示效果

## 注意事项

1. **可选功能**：只有在提供 `onSummaryChange` 回调时才显示输入框
2. **防抖优化**：避免频繁保存，提升性能
3. **自动创建**：如果当天没有 Review，会自动创建
4. **清理定时器**：组件卸载时清理防抖定时器，避免内存泄漏

## 未来优化方向

1. **字数限制**：可以考虑添加字数提示（如 0/100）
2. **多行支持**：如果需要更长的总结，可以改为 textarea
3. **快捷键**：添加键盘快捷键（如 Enter 保存并关闭）
4. **历史记录**：显示最近几天的总结，方便参考

## 相关文件

- `src/components/MoodPicker.tsx` - 主要实现
- `src/components/MoodCalendar.tsx` - 日历集成
- `src/components/ReviewView/ReviewNarrativeTab.tsx` - 回顾页面集成
- `src/views/JournalView.tsx` - 日记视图集成
- `src/types.ts` - 数据类型定义（DailyReview）

## 更新日期
2026-02-16
