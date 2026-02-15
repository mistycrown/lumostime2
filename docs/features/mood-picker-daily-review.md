# 每日回顾心情选择器

## 功能说明

在每日回顾的"叙事"标签页中，用户可以在"一句话总结"输入框右侧选择当天的心情 emoji。采用全屏模态框设计，完全模仿 Daylio 风格。

## 使用方法

1. 打开任意一天的每日回顾
2. 切换到"叙事"标签页
3. 在"一句话总结"输入框右侧，点击笑脸图标
4. 弹出全屏模态框，显示"How was [日期]?"
5. 从 12 个心情选项中选择一个
6. 选中的 emoji 会显示在按钮上
7. 可以点击"CLEAR LOG"清除心情

## UI 设计

### 触发按钮
- **未选择**：显示笑脸图标，白色背景，边框
- **已选择**：显示选中的 emoji，灰色背景
- **尺寸**：40x40px，与输入框高度对齐

### 模态框样式
- **全屏遮罩**：半透明黑色背景 + 高斯模糊效果
- **渲染方式**：使用 React Portal 渲染到 `document.body`，确保覆盖整个页面
- **卡片**：白色圆角卡片，居中显示
- **标题**：大号粗体"How was 2026/02/17?"（中国日期格式：YYYY/MM/DD）
- **副标题**：小号灰色"SELECT YOUR MOOD"
- **网格**：4x3 布局，每个选项包含大号 emoji + 英文标签
- **选中状态**：圆形边框高亮（完美圆形）
- **清除按钮**：底部红色文字"CLEAR LOG"
- **关闭方式**：无关闭按钮，点击任意 emoji 自动关闭

### 输入框调整
- 高度从 `py-3` 改为 `py-2`，与心情按钮对齐
- 保持圆角和其他样式不变

## 心情列表

提供 12 种心情选项：

| Emoji | 标签 | 含义 |
|-------|------|------|
| 🤩 | Radical | 超级兴奋 |
| 🥰 | Loved | 被爱的感觉 |
| 😎 | Proud | 自豪 |
| 😊 | Happy | 开心 |
| 😌 | Calm | 平静 |
| 😐 | Meh | 一般般 |
| 😴 | Tired | 疲惫 |
| 😰 | Anxious | 焦虑 |
| ☹️ | Sad | 难过 |
| 😠 | Angry | 生气 |
| 🤢 | Sick | 不舒服 |
| 😖 | Awful | 糟糕透了 |

## 数据存储

心情 emoji 存储在 `DailyReview` 对象的 `moodEmoji` 字段中：

```typescript
interface DailyReview {
  // ... 其他字段
  moodEmoji?: string; // 今日心情 emoji
}
```

## 交互流程

1. 点击笑脸按钮 → 打开全屏模态框（使用 Portal 渲染，覆盖整个页面）
2. 选择心情 → 自动保存并关闭模态框
3. 按钮显示选中的 emoji
4. 点击"CLEAR LOG" → 清除心情并关闭模态框

## 技术实现

### React Portal
模态框使用 `createPortal(modalContent, document.body)` 渲染到 DOM 根节点，确保：
- 不受父容器 `overflow` 或 `position` 属性影响
- 背景遮罩和模糊效果覆盖整个视口
- z-index 层级正确（z-[100]）

### 日期格式化
使用中国日期格式 `YYYY/MM/DD`，例如：`2026/02/15`

## 未来计划

- [ ] 在心情日历中显示每日心情
- [ ] 心情统计分析
- [ ] 心情趋势图表
- [ ] 自定义心情 emoji 列表

## 相关文件

- `src/types.ts` - DailyReview 类型定义
- `src/components/MoodPicker.tsx` - 心情选择器模态框组件
- `src/components/ReviewView/ReviewNarrativeTab.tsx` - 叙事标签页（集成触发按钮）
- `src/views/DailyReviewView.tsx` - 每日回顾视图（处理心情数据）
