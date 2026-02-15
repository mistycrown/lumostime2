# Emoji 和 Sticker 系统设计

## 核心理念

Emoji 和 Sticker 是两个**独立并行**的系统：
- **Emoji**：字符本身（如 "😊"），用户可以从 emoji 组中选择
- **Sticker**：图片路径（如 "image:/emoji/watercolor/cat.webp"），用户可以从贴纸集中选择
- 用户可以**混合使用**，一个日期格子只能放一个（emoji 或 sticker）

## UI 设计

### MoodPicker 组件 - 滑动切换设计

```
┌─────────────────────────────────┐
│   How was 2024/01/01?          │
│   SELECT YOUR MOOD              │
├─────────────────────────────────┤
│  ← Emoji →  ← 页面导航           │
├─────────────────────────────────┤
│                                 │
│  页面 1: Emoji                  │
│  ┌──┬──┬──┬──┐                 │
│  │😊│🥰│😎│😊│                 │
│  ├──┼──┼──┼──┤                 │
│  │😌│😐│😴│+│                  │
│  └──┴──┴──┴──┘                 │
│                                 │
│  ● ○ ○ ○  ← 页码指示器          │
└─────────────────────────────────┘

滑动到下一页 →

┌─────────────────────────────────┐
│   How was 2024/01/01?          │
│   SELECT YOUR MOOD              │
├─────────────────────────────────┤
│  ← 水彩风格 →  ← 页面导航        │
│  柔和的水彩画风格贴纸            │
├─────────────────────────────────┤
│                                 │
│  页面 2: 水彩风格贴纸            │
│  ┌──┬──┬──┬──┐                 │
│  │🐱│🐶│🌸│☀️│  ← 无标签       │
│  ├──┼──┼──┼──┤                 │
│  │🌙│⭐│❤️│😊│                 │
│  └──┴──┴──┴──┘                 │
│                                 │
│  ○ ● ○ ○  ← 页码指示器          │
└─────────────────────────────────┘
```

### 页面结构

- **页面 1**：Emoji 组（保持原有逻辑）
- **页面 2**：贴纸集 1（如：水彩风格）
- **页面 3**：贴纸集 2（如：像素风格）
- **页面 4**：贴纸集 3（如：可爱风格）
- ...

### 交互方式

1. **左右箭头** - 切换页面
2. **页码指示器** - 点击跳转到指定页面
3. **滑动手势**（移动端）- 左右滑动切换页面（可选实现）

### 贴纸显示

- **无标签** - 贴纸默认不显示标签，视觉更简洁
- **可选标签** - 如果贴纸定义了 label，则显示在下方（9px 小字）
- **网格布局** - 4 列网格，自动换行
- **滚动支持** - 如果贴纸数量多，支持垂直滚动

## 渲染逻辑

### IconRenderer 组件

已经支持三种图标类型，无需修改：

```typescript
// 1. Emoji
<IconRenderer icon="😊" />

// 2. UI Icon
<IconRenderer icon="ui:book" />

// 3. Sticker
<IconRenderer icon="image:/emoji/watercolor/cat.webp" />
```

### 判断逻辑

```typescript
// 检查是否是贴纸
const isSticker = icon.startsWith('image:');

// 检查是否是 emoji
const isEmoji = icon.length <= 4 && !icon.startsWith('image:') && !icon.startsWith('ui:');
```

## 贴纸服务 API

### stickerService

```typescript
// 获取所有贴纸集
const stickerSets = stickerService.getAllStickerSets();
// 返回：[{ id: 'watercolor', name: '水彩风格', stickers: [...] }, ...]

// 获取指定贴纸集
const watercolorSet = stickerService.getStickerSet('watercolor');

// 获取所有贴纸（扁平化）
const allStickers = stickerService.getAllStickers();

// 检查是否是贴纸路径
const isSticker = stickerService.isStickerPath('image:/emoji/watercolor/cat.webp'); // true

// 检查是否是 emoji
const isEmoji = stickerService.isEmoji('😊'); // true

// 添加自定义贴纸集
stickerService.addCustomStickerSet({
    id: 'my-stickers',
    name: '我的贴纸',
    stickers: [
        { path: '/emoji/my-stickers/cat.webp', label: 'Cat' }
    ],
    isCustom: true
});
```

## 使用示例

### 1. 用户选择 Emoji

```typescript
// 在 MoodPicker 中
onSelect('😊'); // 直接传递 emoji

// 存储到数据库
dailyReview.moodEmoji = '😊';

// 在 MoodCalendar 中渲染
<IconRenderer icon={dailyReview.moodEmoji} /> // 渲染 😊
```

### 2. 用户选择 Sticker

```typescript
// 在 MoodPicker 中
onSelect('image:/emoji/watercolor/cat.webp'); // 传递完整路径

// 存储到数据库
dailyReview.moodEmoji = 'image:/emoji/watercolor/cat.webp';

// 在 MoodCalendar 中渲染
<IconRenderer icon={dailyReview.moodEmoji} /> // 渲染贴纸图片
```

### 3. 混合使用

```typescript
// 用户可以在不同日期使用不同的内容
dailyReviews = [
    { date: '2024-01-01', moodEmoji: '😊' },                              // Emoji
    { date: '2024-01-02', moodEmoji: 'image:/emoji/watercolor/cat.webp' }, // 水彩贴纸
    { date: '2024-01-03', moodEmoji: 'image:/emoji/pixel/smile.webp' },    // 像素贴纸
    { date: '2024-01-04', moodEmoji: '🥰' },                              // Emoji
];

// 渲染时自动识别类型
dailyReviews.forEach(review => {
    <IconRenderer icon={review.moodEmoji} />
});
```

## 添加新贴纸集

### 1. 准备图片

在 `public/emoji/` 下创建新文件夹，添加图片：

```
public/emoji/
  my-new-set/
    sticker1.webp
    sticker2.webp
    sticker3.webp
    ...
```

### 2. 注册贴纸集

在 `stickerService.ts` 的 `PRESET_STICKER_SETS` 中添加：

```typescript
{
    id: 'my-new-set',
    name: '我的新贴纸集',
    description: '这是一个新的贴纸集',
    isCustom: false,
    stickers: [
        { path: '/emoji/my-new-set/sticker1.webp', label: 'Sticker 1' },
        { path: '/emoji/my-new-set/sticker2.webp', label: 'Sticker 2' },
        { path: '/emoji/my-new-set/sticker3.webp', label: 'Sticker 3' },
        // ... 可以有任意数量
    ]
}
```

### 3. 完成

用户在 MoodPicker 中切换到 Stickers 页面，就可以看到新贴纸集了。

## 与 Emoji 系统的关系

### 完全独立

- **Emoji 系统**：管理 emoji 组（在 EmojiSettingsView 中配置）
- **Sticker 系统**：管理贴纸集（在 stickerService 中配置）
- 两者互不干扰，用户可以同时使用

### 共享渲染

- 都通过 `IconRenderer` 组件渲染
- 都存储在 `dailyReview.moodEmoji` 字段
- 通过前缀区分类型（emoji 无前缀，sticker 有 "image:" 前缀）

## 优势总结

1. ✅ **简单直接** - 不需要 ID 映射，直接存储路径
2. ✅ **灵活混用** - 用户可以使用不同贴纸集的贴纸
3. ✅ **易于扩展** - 添加新贴纸集只需添加文件和配置
4. ✅ **向后兼容** - 现有 emoji 数据完全不受影响
5. ✅ **路径唯一** - 每个贴纸有唯一标识，不会混淆
6. ✅ **无需迁移** - 新旧数据可以共存
