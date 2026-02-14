# Memoir 页面显示逻辑更新

## 概述

更新了 Memoir 页面（JournalView）中日总结和周总结节点的显示逻辑，优先使用手动叙事（summary），如果没有才使用 AI 叙事（narrative）。

## 更新的文件

### 1. JournalView.tsx

#### Daily Review 显示逻辑

**更新前：**
- 只使用 AI 叙事（narrative）
- 通过 `parseNarrative` 提取标题和引用内容

**更新后：**
```typescript
// 优先级判断
if (review.summary && review.summary.trim()) {
    // 1. 有手动叙事：标题为日期，内容为手动叙事
    finalTitle = review.date;  // 例如："2026-02-14"
    finalContent = review.summary;
} else if (review.narrative && review.narrative.trim()) {
    // 2. 没有手动叙事但有 AI 叙事：使用 AI 叙事的标题和引用
    const { title, content } = parseNarrative(review.narrative, review.date);
    const hasContent = content && content !== '...';
    finalTitle = hasContent ? (title === 'Daily Reflection' ? review.date : title) : review.date;
    finalContent = hasContent ? content : '...';
} else {
    // 3. 两者都没有：显示日期和省略号
    finalTitle = review.date;
    finalContent = '...';
}
```

#### Weekly Review 显示逻辑

**更新前：**
- 只使用 AI 叙事（narrative）
- 通过 `parseNarrative` 提取标题和引用内容

**更新后：**
```typescript
const dateRange = `${review.weekStartDate} ~ ${review.weekEndDate}`;

if (review.summary && review.summary.trim()) {
    // 1. 有手动叙事：标题为日期范围，内容为手动叙事
    finalTitle = dateRange;  // 例如："2026-02-10 ~ 2026-02-16"
    finalContent = review.summary;
} else if (review.narrative && review.narrative.trim()) {
    // 2. 没有手动叙事但有 AI 叙事：使用 AI 叙事的标题和引用
    const d = new Date(review.weekStartDate);
    const defaultTitle = `Week of ${d.toLocaleDateString()}`;
    const { title, content } = parseNarrative(review.narrative, defaultTitle);
    const hasContent = content && content !== '...';
    finalTitle = hasContent ? title : dateRange;
    finalContent = hasContent ? content : '...';
} else {
    // 3. 两者都没有：显示日期范围和省略号
    finalTitle = dateRange;
    finalContent = '...';
}
```

### 2. SearchView.tsx

更新了搜索功能，现在同时搜索手动叙事和 AI 叙事：

**更新前：**
```typescript
const getReviewMatch = (review: { answers: { answer: string }[], narrative?: string }, query: string) => {
    // 只搜索 answers 和 narrative
}
```

**更新后：**
```typescript
const getReviewMatch = (review: { answers: { answer: string }[], summary?: string, narrative?: string }, query: string) => {
    // Check answers
    const answerMatch = review.answers?.find(ans => ans.answer && ans.answer.toLowerCase().includes(query));
    if (answerMatch) {
        return getSnippet(answerMatch.answer, query);
    }
    // Check summary (手动叙事) - 新增
    if (review.summary && review.summary.toLowerCase().includes(query)) {
        return getSnippet(review.summary, query);
    }
    // Check narrative (AI 叙事)
    if (review.narrative && review.narrative.toLowerCase().includes(query)) {
        return getSnippet(review.narrative, query);
    }
    return undefined;
}
```

## 显示效果

### Daily Review 节点

#### 场景 1：只有手动叙事
```
┌─────────────────────────────┐
│ 2026-02-14                  │
│                             │
│ 今天完成了重要的项目里程碑   │
└─────────────────────────────┘
```

#### 场景 2：只有 AI 叙事
```
┌─────────────────────────────┐
│ 充实的一天                   │
│                             │
│ 今天的工作进展顺利...        │
└─────────────────────────────┘
```

#### 场景 3：两者都有（优先显示手动叙事）
```
┌─────────────────────────────┐
│ 2026-02-14                  │
│                             │
│ 今天完成了重要的项目里程碑   │
└─────────────────────────────┘
```

#### 场景 4：两者都没有
```
┌─────────────────────────────┐
│ 2026-02-14                  │
│                             │
│ ...                         │
└─────────────────────────────┘
```

### Weekly Review 节点

#### 场景 1：只有手动叙事
```
┌─────────────────────────────┐
│ 2026-02-10 ~ 2026-02-16     │
│                             │
│ 本周专注于产品开发           │
└─────────────────────────────┘
```

#### 场景 2：只有 AI 叙事
```
┌─────────────────────────────┐
│ 高效的一周                   │
│                             │
│ 本周的工作重点是...          │
└─────────────────────────────┘
```

#### 场景 3：两者都有（优先显示手动叙事）
```
┌─────────────────────────────┐
│ 2026-02-10 ~ 2026-02-16     │
│                             │
│ 本周专注于产品开发           │
└─────────────────────────────┘
```

## 优先级规则

### Daily Review
1. **手动叙事优先**：如果存在 `summary`，显示日期作为标题，`summary` 作为内容
2. **AI 叙事备用**：如果没有 `summary` 但有 `narrative`，使用 AI 叙事的标题和引用
3. **默认显示**：两者都没有时，显示日期和 "..."

### Weekly Review
1. **手动叙事优先**：如果存在 `summary`，显示日期范围作为标题，`summary` 作为内容
2. **AI 叙事备用**：如果没有 `summary` 但有 `narrative`，使用 AI 叙事的标题和引用
3. **默认显示**：两者都没有时，显示日期范围和 "..."

## 设计理念

### 为什么手动叙事优先？

1. **用户意图明确**：手动叙事是用户主动输入的一句话总结，代表了用户最想表达的核心内容
2. **简洁性**：手动叙事通常更简短、更直接，适合在列表视图中快速浏览
3. **一致性**：标题使用日期/日期范围，让用户快速定位时间
4. **AI 叙事作为补充**：AI 叙事更详细，适合在详情页查看，在列表中显示其摘要作为备选

### 标题规则

- **有手动叙事时**：标题使用日期或日期范围，让用户快速识别时间
- **只有 AI 叙事时**：标题使用 AI 叙事的标题，提供更多上下文
- **都没有时**：标题使用日期或日期范围，内容显示 "..."

## 搜索功能增强

搜索功能现在会同时搜索：
1. Review 的 answers（引导问答）
2. Review 的 summary（手动叙事）
3. Review 的 narrative（AI 叙事）

搜索优先级：
1. 先检查 answers
2. 再检查 summary
3. 最后检查 narrative

这确保了用户可以通过任何一种叙事内容找到对应的 Review。

## 测试建议

### 功能测试
- [ ] 创建只有手动叙事的 Daily Review，检查 Memoir 显示
- [ ] 创建只有 AI 叙事的 Daily Review，检查 Memoir 显示
- [ ] 创建同时有两种叙事的 Daily Review，确认优先显示手动叙事
- [ ] 创建空的 Daily Review，检查默认显示
- [ ] 对 Weekly Review 进行相同的测试
- [ ] 测试搜索功能，确认可以搜索到 summary 和 narrative

### UI 测试
- [ ] 检查标题和内容的显示是否正确
- [ ] 检查日期格式是否一致
- [ ] 检查省略号的显示
- [ ] 检查点击节点是否能正确打开对应的 Review

## 相关文档

- [叙事分离功能实现指南](./narrative-separation-guide.md)
- [叙事分离完成总结](./narrative-separation-completed.md)

## 总结

通过这次更新，Memoir 页面现在能够：
1. 优先展示用户手动输入的一句话总结
2. 在没有手动总结时，智能回退到 AI 叙事
3. 提供一致的时间标识（日期/日期范围作为标题）
4. 支持在搜索中同时查找两种叙事内容

这使得 Memoir 页面更加灵活，既能展示用户的快速总结，也能在需要时展示 AI 生成的详细内容。
