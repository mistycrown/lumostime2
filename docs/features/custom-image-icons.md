# 自定义图片图标功能

## 概述

IconRenderer 组件现在支持三种图标类型：
1. **Emoji** - 原生 emoji、Twemoji、OpenMoji
2. **UI Icons** - 主题相关的 UI 图标（格式：`ui:iconType`）
3. **自定义图片** - 本地或远程图片（格式：`image:/path/to/image.png`）

## 使用方法

### 1. 存储格式

自定义图片使用 `image:` 前缀，后跟图片路径：

```typescript
// 本地图片（从 public 文件夹）
const icon = "image:/dchh/cat.webp";

// 完整路径
const icon = "image:/background/forest.webp";

// 也支持远程图片（如果需要）
const icon = "image:https://example.com/icon.png";
```

### 2. 在心情日历中使用

在 EmojiSettingsView 中，用户可以创建包含自定义图片的 emoji 组：

```typescript
const customGroup = {
    id: 'custom-images',
    name: '自定义图片',
    emojis: [
        { emoji: 'image:/dchh/cat.webp', label: 'Cat' },
        { emoji: 'image:/dchh/bird.webp', label: 'Bird' },
        { emoji: '😊', label: 'Happy' }, // 可以混合使用 emoji
    ],
    isCustom: true
};
```

### 3. 渲染示例

IconRenderer 会自动识别并渲染自定义图片：

```tsx
// 自动识别为自定义图片
<IconRenderer icon="image:/dchh/cat.webp" size={32} />

// 支持所有 IconRenderer 的属性
<IconRenderer 
    icon="image:/dchh/cat.webp" 
    className="w-full h-full"
    size="100%"
    alt="Cat icon"
/>
```

### 4. 错误处理

如果图片加载失败：
- 如果提供了 `fallbackEmoji`，会显示降级 emoji
- 否则会触发 `imageError` 状态

```tsx
<IconRenderer 
    icon="image:/dchh/cat.webp" 
    fallbackEmoji="🐱"
/>
```

## 技术实现

### IconRenderer 组件

组件按以下优先级渲染图标：

1. **自定义图片** (`image:` 前缀)
   - 直接渲染 `<img>` 标签
   - 支持响应式尺寸
   
2. **UI Icons** (`ui:` 前缀，仅在自定义主题下)
   - 从主题文件夹加载图片
   - 支持降级处理
   
3. **Emoji** (其他所有情况)
   - 根据 emojiStyle 设置渲染
   - 支持原生、Twemoji、OpenMoji

### 尺寸处理

自定义图片支持多种尺寸格式：

```tsx
// 数字（像素）
<IconRenderer icon="image:/dchh/cat.webp" size={32} />

// CSS 字符串
<IconRenderer icon="image:/dchh/cat.webp" size="2rem" />

// 百分比（相对于容器）
<IconRenderer icon="image:/dchh/cat.webp" size="100%" />

// 自动从 className 推断
<IconRenderer icon="image:/dchh/cat.webp" className="text-3xl" />
```

## 在心情日历中的应用

### 当前实现

MoodCalendar 组件已经支持自定义图片，无需修改：

```tsx
// 在 MoodPicker 中选择
const handleSelectMood = (icon: string) => {
    // icon 可以是 emoji 或 "image:/path"
    onUpdateMood(selectedDate, icon);
};

// 在 MoodCalendar 中渲染
<IconRenderer 
    icon={mood} // 可能是 emoji 或 "image:/path"
    className="w-full h-full"
    size="100%"
/>
```

### 扩展 EmojiSettingsView

要让用户添加自定义图片，可以在 EmojiSettingsView 中添加图片选择器：

```tsx
// 添加图片输入
<input
    type="text"
    value={editingEmoji?.emoji || ''}
    onChange={(e) => setEditingEmoji({ 
        emoji: e.target.value, 
        label: editingEmoji?.label || '' 
    })}
    placeholder="😊 或 image:/dchh/cat.webp"
    className="..."
/>
```

## 可用的本地图片

项目中已有的图片资源：

### dchh 文件夹 (`/dchh/`)
- 动物：cat.webp, cat2.webp, bird.webp, fish.webp, rabbit.webp
- 植物：flower.webp, grass.webp, plant.webp, plant2.webp
- 自然：cloud.webp, night.webp, sea.webp, sun.webp
- 其他：book.webp, boat.webp, ghost.webp, mushroom.webp 等

### background 文件夹 (`/background/`)
- 各种背景图片

## 未来扩展

可以考虑添加：
1. 图片浏览器 UI，让用户可视化选择图片
2. 支持用户上传自定义图片
3. 图片预览功能
4. 图片分类和标签
