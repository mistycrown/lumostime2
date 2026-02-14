# Chronicle 页面显示逻辑更新

## 概述

更新了 Chronicle 页面（ReviewHubView）中 Daily Review、Weekly Review 和 Monthly Review 卡片的显示逻辑，优先使用手动叙事（summary），如果没有才使用 AI 叙事（narrative）。

## 更新的文件

### ReviewHubView.tsx

## 总体渲染规则

1. **优先渲染手动总结**：如果存在 `summary` 字段，优先使用手动总结
2. **AI 叙事作为备选**：如果不存在手动总结，则渲染 AI 叙事
3. **兜底方案**：如果两者都没有，显示默认文本

## 分类讨论

### 1. Monthly Review 卡片

#### 显示逻辑

```typescript
if (m.summary && m.summary.trim()) {
    // 有手动总结
    displayTitle = '暂无叙事标题';
    displayContent = m.summary;
} else if (m.narrative && m.narrative.trim()) {
    // 没有手动总结但有 AI 叙事
    const { title, content: body } = parseNarrative(m.narrative, '暂无叙事标题');
    displayTitle = title;
    displayContent = body;
} else {
    // 两者都没有
    displayTitle = '暂无叙事标题';
    displayContent = '...';
}
```

#### 卡片结构

```
┌─────────────────────────────────┐
│ FEBRUARY          [CURRENT/PAST]│
│ 暂无叙事标题...                  │
│                                 │
│ │ 这是手动总结的内容...          │
│                                 │
│ 2026/02  Tap to read full → │
└─────────────────────────────────┘
```

#### 特点

- **标题处理**：手动总结没有独立标题，固定显示"暂无叙事标题"
- **内容显示**：引用内容直接读取手动总结
- **行数限制**：使用 `line-clamp-3` 最多显示 3 行

### 2. Weekly Review 卡片

#### 显示逻辑

```typescript
if (w.summary && w.summary.trim()) {
    // 有手动总结：显示"一句话总结"
    displayTitle = w.summary;
} else if (w.narrative && w.narrative.trim()) {
    // 没有手动总结但有 AI 叙事：使用 AI 叙事的标题
    const { title } = parseNarrative(w.narrative, '暂无标题');
    displayTitle = title;
} else {
    // 两者都没有
    displayTitle = '暂无标题';
}
```

#### 卡片结构

```
┌──────────────────┐
│ W6    [CURRENT]  │
│                  │
│ 存在的钟摆       │
│                  │
│ 2025/02/02-02/08 │
└──────────────────┘
```

#### 特点

- **标题显示**：直接显示手动总结或 AI 叙事标题
- **溢出处理**：使用 `line-clamp-2` 最多显示 2 行
- **自适应**：超过 30 个字自动溢出，保持卡片整洁
- **字体大小**：`text-[13px]` 确保内容可读性

### 3. Daily Review 卡片

#### 显示逻辑

```typescript
if (d.summary && d.summary.trim()) {
    // 有手动总结：标题为日期，内容为手动总结
    displayTitle = d.date; // 例如："2026-02-16"
    displayContent = d.summary;
} else if (d.narrative && d.narrative.trim()) {
    // 没有手动总结但有 AI 叙事：使用 AI 叙事的标题和引用
    const { title, content: body } = parseNarrative(d.narrative, '暂无标题');
    displayTitle = title;
    displayContent = body;
} else {
    // 两者都没有
    displayTitle = '暂无标题';
    displayContent = '...';
}
```

#### 卡片结构

```
┌─────────────────────────────────┐
│ 14  │ 2026-02-16        [SAT]   │
│ FEB │                           │
│     │ 今天完成了重要的项目里程碑 │
└─────────────────────────────────┘
```

#### 特点

- **标题生成**：手动总结时，自动生成日期格式标题（如 "2026-02-16"）
- **内容显示**：标题下方显示手动总结的具体内容
- **行数限制**：使用 `line-clamp-2` 最多显示 2 行
- **日期列**：左侧独立显示日期和月份

## 显示效果对比

### Monthly Review

#### 场景 1：只有手动总结
```
标题：暂无叙事标题
内容：这个月专注于产品开发和团队建设
```

#### 场景 2：只有 AI 叙事
```
标题：充实的一月
内容：本月的工作重点是产品迭代...
```

#### 场景 3：两者都有（优先显示手动总结）
```
标题：暂无叙事标题
内容：这个月专注于产品开发和团队建设
```

### Weekly Review

#### 场景 1：只有手动总结
```
标题：存在的钟摆
```

#### 场景 2：只有 AI 叙事
```
标题：高效的一周
```

#### 场景 3：手动总结超过 30 字
```
标题：本周完成了多个重要项目的里程碑，团队协作效率显著提升，产品功能...
（自动溢出，显示两行）
```

### Daily Review

#### 场景 1：只有手动总结
```
标题：2026-02-16
内容：今天完成了重要的项目里程碑
```

#### 场景 2：只有 AI 叙事
```
标题：充实的一天
内容：今天的工作进展顺利...
```

#### 场景 3：两者都有（优先显示手动总结）
```
标题：2026-02-16
内容：今天完成了重要的项目里程碑
```

## 技术实现细节

### 溢出处理

使用 Tailwind CSS 的 `line-clamp` 工具类：

```css
/* Weekly Review - 最多 2 行 */
line-clamp-2

/* Monthly Review - 最多 3 行 */
line-clamp-3

/* Daily Review - 最多 2 行 */
line-clamp-2
```

### 文本截断

```typescript
// Monthly Review 标题截断（最多 30 字符）
displayTitle.slice(0, 30) + '...'

// Daily Review 标题截断（使用 CSS truncate）
className="truncate"
```

### 响应式设计

- Weekly Review 卡片：`w-[calc(50%-6px)]` 确保两列布局
- Monthly Review 卡片：`w-[90%]` 横向滚动
- Daily Review 卡片：`flex-1` 自适应宽度

## 优先级规则总结

### 所有 Review 类型
1. **手动叙事优先**：如果存在 `summary`，优先使用
2. **AI 叙事备用**：如果没有 `summary` 但有 `narrative`，使用 AI 叙事
3. **默认显示**：两者都没有时，显示默认文本

### 特殊处理

- **Monthly Review**：手动总结没有独立标题，固定显示"暂无叙事标题"
- **Weekly Review**：手动总结直接作为标题显示，支持溢出处理
- **Daily Review**：手动总结时，标题自动生成为日期格式

## 设计理念

### 为什么手动叙事优先？

1. **用户意图明确**：手动叙事是用户主动输入的核心总结
2. **简洁性**：手动叙事通常更简短，适合卡片展示
3. **一致性**：在列表视图中提供统一的浏览体验
4. **AI 叙事作为补充**：AI 叙事更详细，适合在详情页查看

### 标题规则

- **Monthly Review**：手动总结无独立标题，使用固定文本
- **Weekly Review**：手动总结直接作为标题
- **Daily Review**：手动总结时，标题为日期格式

## 相关文档

- [叙事分离功能实现指南](./narrative-separation-guide.md)
- [Memoir 显示逻辑更新](./memoir-display-logic-update.md)
- [叙事分离完成总结](./narrative-separation-completed.md)

## 测试建议

### 功能测试
- [ ] 创建只有手动叙事的各类 Review，检查 Chronicle 显示
- [ ] 创建只有 AI 叙事的各类 Review，检查 Chronicle 显示
- [ ] 创建同时有两种叙事的各类 Review，确认优先显示手动叙事
- [ ] 创建空的各类 Review，检查默认显示
- [ ] 测试 Weekly Review 超过 30 字的溢出处理

### UI 测试
- [ ] 检查卡片布局是否正确
- [ ] 检查文本溢出是否正常工作
- [ ] 检查日期格式是否正确
- [ ] 检查点击卡片是否能正确打开对应的 Review
- [ ] 检查不同屏幕尺寸下的显示效果

## 总结

通过这次更新，Chronicle 页面现在能够：
1. 优先展示用户手动输入的简短总结
2. 在没有手动总结时，智能回退到 AI 叙事
3. 为不同类型的 Review 提供合适的标题和内容展示
4. 通过溢出处理确保卡片布局整洁
5. 提供一致的用户体验

这使得 Chronicle 页面更加灵活，既能展示用户的快速总结，也能在需要时展示 AI 生成的详细内容。
