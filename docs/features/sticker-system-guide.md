# 贴纸系统使用指南

## 概述

贴纸系统允许用户使用自定义图片集来替代 emoji 显示心情。每个贴纸组包含 16 个固定的心情贴纸。

## 文件结构

```
public/
  emoji/
    monomood/              # 示例贴纸组
      radical.webp         # 对应 "Radical" 心情
      loved.webp           # 对应 "Loved" 心情
      proud.webp
      happy.webp
      calm.webp
      meh.webp
      tired.webp
      anxious.webp
      sad.webp
      angry.webp
      sick.webp
      awful.webp
      grateful.webp
      blessed.webp
      excited.webp
      custom.webp          # 自定义心情
```

### 命名规范

1. **文件夹名称**：贴纸组的唯一标识（如 `monomood`）
2. **图片命名**：必须与心情 ID 一致（如 `smile.webp`, `cry.webp`）
3. **图片格式**：支持 `.webp` 或 `.png`
4. **固定数量**：每组必须包含 16 张图片

## 数据存储方案

### 1. 在日报中存储

**只存储心情 ID（label），不存储完整路径**

```typescript
// ✅ 正确 - 只存储心情 ID
dailyReview.moodEmoji = "smile";
dailyReview.moodEmoji = "cry";
dailyReview.moodEmoji = "happy";

// ❌ 错误 - 不要存储完整路径
dailyReview.moodEmoji = "image:/emoji/monomood/smile.webp";
```

### 2. 贴纸组配置

用户选择的贴纸组存储在 localStorage：

```typescript
// 当前使用的贴纸组
localStorage.setItem('lumostime_mood_sticker_set', 'monomood');

// 或使用原生 emoji
localStorage.setItem('lumostime_mood_sticker_set', 'emoji');
```

### 3. 自定义贴纸组

```typescript
const customStickerSet = {
    id: 'my-custom-set',
    name: '我的贴纸',
    path: '/emoji/my-custom-set',
    format: 'webp',
    isCustom: true,
    moods: [
        { id: 'smile', label: 'Happy', emoji: '😊' },
        { id: 'cry', label: 'Sad', emoji: '😢' },
        // ... 共 16 个
    ]
};

// 存储到 localStorage
localStorage.setItem('lumostime_custom_sticker_sets', JSON.stringify([customStickerSet]));
```

## 读取流程

### 1. 显示心情（在 MoodCalendar 中）

```typescript
// 从数据库读取
const dailyReview = { date: '2024-01-01', moodEmoji: 'smile' };

// 使用 stickerService 转换为实际图标
const displayIcon = stickerService.getMoodIcon(dailyReview.moodEmoji);
// 如果使用贴纸组 'monomood'：返回 "image:/emoji/monomood/smile.webp"
// 如果使用原生 emoji：返回 "😊"

// 渲染
<IconRenderer icon={displayIcon} />
```

### 2. 选择心情（在 MoodPicker 中）

```typescript
// 获取当前贴纸组的心情列表
const moods = stickerService.getCurrentMoods();
// 返回：[{ id: 'smile', label: 'Happy', emoji: '😊' }, ...]

// 用户选择后，只存储 ID
onSelect('smile'); // 不是 "image:/emoji/monomood/smile.webp"
```

## 核心 API

### stickerService

```typescript
// 获取当前贴纸组
const currentSet = stickerService.getCurrentStickerSet();

// 切换贴纸组
stickerService.setCurrentSet('monomood');

// 将心情 ID 转换为图标字符串
const icon = stickerService.getMoodIcon('smile');
// 返回：'image:/emoji/monomood/smile.webp' 或 '😊'

// 从图标字符串提取心情 ID
const moodId = stickerService.extractMoodId('image:/emoji/monomood/smile.webp');
// 返回：'smile'

// 获取当前心情列表
const moods = stickerService.getCurrentMoods();
// 返回：[{ id: 'smile', label: 'Happy', emoji: '😊' }, ...]

// 检查是否使用贴纸
const isUsingStickers = stickerService.isUsingStickerSet();
```

## 优点

### 1. 数据库更小
- 只存储 "smile" 而不是 "image:/emoji/monomood/smile.webp"
- 节省存储空间

### 2. 灵活切换
- 用户可以随时切换贴纸组
- 历史数据自动使用新贴纸显示
- 无需迁移数据

### 3. 向后兼容
- 如果存储的是 emoji（如 "😊"），系统会自动识别
- 支持混合使用 emoji 和贴纸

### 4. 降级处理
- 如果贴纸加载失败，自动显示对应的 emoji
- 如果贴纸组不存在，自动切换到 emoji 模式

## 使用示例

### 添加新贴纸组

1. 在 `public/emoji/` 下创建文件夹（如 `kawaii`）
2. 添加 16 张图片，命名为心情 ID
3. 在代码中注册贴纸组：

```typescript
// 在 stickerService.ts 的 PRESET_STICKER_SETS 中添加
{
    id: 'kawaii',
    name: 'Kawaii 风格',
    path: '/emoji/kawaii',
    format: 'webp',
    isCustom: false,
    moods: [
        { id: 'smile', label: 'Happy', emoji: '😊' },
        { id: 'cry', label: 'Sad', emoji: '😢' },
        // ... 共 16 个
    ]
}
```

### 在设置中切换贴纸组

```typescript
// 在 EmojiSettingsView 中添加贴纸组选择器
const stickerSets = stickerService.getAllStickerSets();

<select onChange={(e) => stickerService.setCurrentSet(e.target.value)}>
    <option value="emoji">原生 Emoji</option>
    {stickerSets.map(set => (
        <option key={set.id} value={set.id}>{set.name}</option>
    ))}
</select>
```

## 迁移现有数据

如果之前存储的是完整路径，需要迁移：

```typescript
// 迁移脚本
function migrateOldData() {
    const reviews = getAllDailyReviews();
    
    reviews.forEach(review => {
        if (review.moodEmoji?.startsWith('image:')) {
            // 提取心情 ID
            const moodId = stickerService.extractMoodId(review.moodEmoji);
            review.moodEmoji = moodId;
        }
    });
    
    saveDailyReviews(reviews);
}
```

## 注意事项

1. **固定数量**：每个贴纸组必须包含 16 个心情
2. **命名一致**：图片文件名必须与心情 ID 完全一致
3. **格式统一**：同一贴纸组内的图片格式应保持一致
4. **降级 emoji**：每个心情都应该有对应的 emoji 作为降级显示
5. **路径规范**：贴纸路径以 `/emoji/` 开头，不要使用绝对路径
