# Memoir 心情日历功能

## 功能说明

在 Memoir（回忆录）页面的顶部显示当月的心情日历卡片，展示每一天选择的心情 emoji。用户可以点击日历中的任意日期来选择或修改该天的心情。

## 显示位置

Memoir 页面（JournalView）时间轴顶部：
1. **心情日历卡片**：白色卡片，显示当月日历网格和每日心情 emoji
2. **引言文字**：低调的斜体文字，显示在日历下方，点击可跳转到月度回顾

## UI 设计（基于 monomood 风格）

### 心情日历卡片
- **样式**：白色背景，边框，轻微阴影，圆角
- **布局**：7列（周日到周六）网格，无行间距
- **星期标题**：S M T W T F S（灰色小号 mono 字体，大写）
- **日期格子**：
  - 正方形（aspect-square）
  - 白色背景，hover 时变为浅灰色
  - 今天的格子有浅灰色背景
  - 日期数字显示在左上角（10px mono 字体）
  - 心情 emoji 显示在格子中央（28px 大小）
- **网格样式**：使用 1px 灰色分隔线（gap-px bg-stone-100）
- **交互**：点击任意日期格子打开心情选择器模态框

### 引言文字
- **样式**：小号斜体，浅灰色（text-stone-400）
- **位置**：居中显示在日历卡片下方
- **默认文字**："Every day is a line in your life's letter."
- **自定义**：如果月度回顾中设置了引言（cite），则显示自定义引言
- **交互**：点击文字跳转到当月的月度回顾，hover 时颜色变深

## 交互流程

### 选择/修改心情
1. 用户点击日历中的某一天
2. 打开心情选择器模态框（MoodPickerModal）
3. 模态框标题显示该日期（YYYY/MM/DD 格式）
4. 如果该天已有心情，显示选中状态
5. 用户选择新的心情 → 自动保存并关闭模态框
6. 用户点击"CLEAR LOG" → 清除该天的心情并关闭模态框

### 跳转到月度回顾
1. 用户点击日历下方的引言文字
2. 打开当月的月度回顾页面

## 数据流

### 读取心情数据
```typescript
// 从 dailyReviews 中查找指定日期的心情
const getMoodForDate = (day: number): string | undefined => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const review = dailyReviews.find(r => r.date === dateStr);
    return review?.moodEmoji;
};
```

### 更新心情数据
```typescript
// 通过 onUpdateDailyReview 回调更新
onUpdateMood={(date, emoji) => {
    const existingReview = dailyReviews.find(r => r.date === date);
    if (existingReview && onUpdateDailyReview) {
        onUpdateDailyReview({ 
            ...existingReview, 
            moodEmoji: emoji, 
            updatedAt: Date.now() 
        });
    }
}}
```

### 清除心情数据
```typescript
onClearMood={(date) => {
    const existingReview = dailyReviews.find(r => r.date === date);
    if (existingReview && onUpdateDailyReview) {
        onUpdateDailyReview({ 
            ...existingReview, 
            moodEmoji: undefined, 
            updatedAt: Date.now() 
        });
    }
}}
```

## 技术实现

### MoodCalendar 组件

```typescript
interface MoodCalendarProps {
    year: number;          // 年份
    month: number;         // 月份（0-11）
    dailyReviews: DailyReview[];  // 每日回顾数据
    onUpdateMood: (date: string, emoji: string) => void;  // 更新心情回调
    onClearMood: (date: string) => void;  // 清除心情回调
}
```

**功能**：
1. 根据年月生成日历网格（一维数组，包含 null 表示空格）
2. 计算每月第一天是星期几（用于对齐）
3. 遍历 dailyReviews 查找每一天的 moodEmoji
4. 使用 IconRenderer 渲染 emoji（支持 Twemoji）
5. 集成 MoodPickerModal 用于选择心情

### 日历生成逻辑

1. **计算月份信息**：
   - 第一天是星期几（startDayOfWeek）
   - 当月有多少天（daysInMonth）

2. **生成一维数组**：
   - 第一周前面填充 null（空白格子）
   - 填充 1 到 daysInMonth 的日期
   - 使用 grid-cols-7 自动换行

3. **查找心情**：
   - 根据日期字符串（YYYY-MM-DD）查找对应的 DailyReview
   - 提取 moodEmoji 字段

## 与其他功能的关联

### 每日回顾
- 用户在每日回顾中选择心情
- 心情数据存储在 `DailyReview.moodEmoji`
- Memoir 心情日历读取并显示这些数据

### 月度回顾
- 点击引言文字打开月度回顾
- 月度回顾的引言（cite）显示在日历下方

### 时间轴
- 时间轴的"今日回顾"节点也显示心情 emoji
- 保持数据一致性

## 相关文件

- `src/components/MoodCalendar.tsx` - 心情日历组件
- `src/views/JournalView.tsx` - Memoir 页面（集成心情日历）
- `src/components/MoodPicker.tsx` - 心情选择器（用于选择心情）
- `src/components/AppRoutes.tsx` - 路由配置（传递更新回调）
- `src/hooks/useReviewManager.ts` - Review 管理 Hook（handleUpdateReview）
- `src/types.ts` - DailyReview 类型定义（moodEmoji 字段）
- `static/monomood/components/CalendarView.tsx` - UI 设计参考

## 设计理念

### 为什么使用 monomood 风格？

1. **简洁性**：白色背景 + 灰色边框，极简风格
2. **清晰性**：网格分隔线让日期一目了然
3. **一致性**：与 monomood 应用保持视觉一致
4. **专业性**：mono 字体 + 大写字母，更加精致

### 为什么点击格子而不是点击卡片？

1. **精确性**：用户可以选择具体的日期
2. **灵活性**：可以修改任意一天的心情
3. **直观性**：点击哪天就编辑哪天
4. **分离关注点**：日历用于编辑，引言用于跳转

## 总结

心情日历功能为 Memoir 页面增加了情感维度的可视化和编辑能力，让用户能够：
- 快速查看整个月的心情分布
- 点击任意日期选择或修改心情
- 通过视觉化方式记录情感历程
- 与每日回顾和月度回顾无缝集成

这个功能将 Memoir 从简单的时间轴升级为更丰富、更可交互的情感日记系统。
