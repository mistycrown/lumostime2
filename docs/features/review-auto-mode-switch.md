# Review 自动模式切换功能

## 功能描述

在日回顾、周回顾和月回顾中，当用户切换到"引导"或"叙事"标签时，系统会根据内容自动切换阅读/编辑模式：

### 引导标签
- **有内容**：自动切换到阅读模式（有内容指的是引导提问的回答，即用户输入的部分）
- **无内容**：自动切换到编辑模式

### 叙事标签
- **有内容**：自动切换到阅读模式（有内容指的是一句话总结或AI叙事文字）
- **无内容**：自动切换到编辑模式

## 实现细节

### 修改的文件

1. **src/components/ReviewView/useReviewState.ts**
   - 导出 `setIsReadingMode` 函数，允许外部直接设置阅读模式状态

2. **src/views/DailyReviewView.tsx**
   - 添加 `useEffect` hook，监听 `activeTab` 的变化
   - 根据标签类型和内容自动切换模式
   - **仅在标签切换时触发**，不会在用户输入时干扰

3. **src/views/WeeklyReviewView.tsx**
   - 添加相同的自动切换逻辑
   - 修复了未使用的状态变量问题

4. **src/views/MonthlyReviewView.tsx**
   - 添加相同的自动切换逻辑

### 逻辑实现

```typescript
useEffect(() => {
    if (activeTab === 'guide') {
        // 引导标签：检查是否有回答内容
        const hasAnswers = answers.some(a => a.answer && a.answer.trim() !== '');
        setIsReadingMode(hasAnswers);
    } else if (activeTab === 'narrative') {
        // 叙事标签：检查是否有一句话总结或AI叙事内容
        const hasContent = (summary && summary.trim() !== '') || (narrative && narrative.trim() !== '');
        setIsReadingMode(hasContent);
    }
}, [activeTab]); // 只依赖 activeTab，仅在标签切换时触发
```

## 用户体验

- 用户首次进入引导或叙事标签时，如果已有内容，会看到格式化的阅读视图
- 如果没有内容，会直接进入编辑模式，方便用户开始输入
- 用户仍然可以通过浮动按钮手动切换阅读/编辑模式
- **重要**：自动切换只在标签切换时触发一次，不会在用户输入过程中干扰

## 注意事项

- 自动切换只在标签切换时触发，不会在用户输入过程中频繁切换
- `useEffect` 只依赖 `activeTab`，确保不会因为内容变化而重新触发
- 用户手动切换的模式会被保存到 localStorage，但会在下次切换标签时根据内容重新评估
