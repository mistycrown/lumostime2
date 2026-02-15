# 每日回顾心情选择器

## 功能说明

在每日回顾的"叙事"标签页中，用户可以在"一句话总结"输入框右侧选择当天的心情 emoji。

## 使用方法

1. 打开任意一天的每日回顾
2. 切换到"叙事"标签页
3. 在"一句话总结"输入框右侧，点击笑脸图标
4. 从弹出的心情选择器中选择一个 emoji
5. 选中的 emoji 会显示在按钮上
6. 可以点击"CLEAR MOOD"清除心情

## 心情列表

提供 12 种心情选项（参考 Daylio 风格）：

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

## UI 设计

- **触发按钮**：
  - 未选择：显示笑脸图标，白色背景，边框
  - 已选择：显示选中的 emoji，灰色背景
  
- **选择器弹窗**：
  - 4x3 网格布局
  - 每个选项显示大号 emoji + 英文标签
  - 选中项有背景高亮和边框
  - 底部有"CLEAR MOOD"按钮

## 未来计划

- [ ] 在心情日历中显示每日心情
- [ ] 心情统计分析
- [ ] 心情趋势图表
- [ ] 自定义心情 emoji 列表

## 相关文件

- `src/types.ts` - DailyReview 类型定义
- `src/components/MoodPicker.tsx` - 心情选择器组件
- `src/components/ReviewView/ReviewNarrativeTab.tsx` - 叙事标签页（集成心情选择器）
- `src/views/DailyReviewView.tsx` - 每日回顾视图（处理心情数据）
