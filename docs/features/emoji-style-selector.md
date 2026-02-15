# Emoji 风格选择器功能

## Date
2026-02-15

## Overview
实现了多种 emoji 渲染风格支持，用户可以在原生 emoji、Twitter Emoji 和 Fluent Emoji 之间切换。

## 功能特性

### 1. 三种 Emoji 风格
- **原生 Emoji**: 使用系统默认的 emoji 样式
- **Twitter Emoji (Twemoji)**: Twitter 的开源 emoji 设计，扁平化风格
- **Fluent Emoji**: Microsoft 的 3D emoji 设计，现代立体风格

### 2. 设置位置调整
- 从"偏好设置"移动到"Emoji 相关"子设置页面
- 从简单的开关改为下拉选择器
- 提供更直观的风格预览

## 技术实现

### 1. SettingsContext 更新
**文件**: `src/contexts/SettingsContext.tsx`

**改动**:
- 将 `useTwemoji: boolean` 改为 `emojiStyle: EmojiStyle`
- 添加类型定义: `type EmojiStyle = 'native' | 'twemoji' | 'fluent'`
- 向后兼容：自动迁移旧的 `lumostime_use_twemoji` 设置
- 新的 localStorage key: `lumostime_emoji_style`

```typescript
export type EmojiStyle = 'native' | 'twemoji' | 'fluent';

// 向后兼容逻辑
const [emojiStyle, setEmojiStyle] = useState<EmojiStyle>(() => {
    const stored = localStorage.getItem('lumostime_emoji_style');
    if (!stored) {
        const oldTwemoji = localStorage.getItem('lumostime_use_twemoji');
        if (oldTwemoji === 'true') {
            return 'twemoji';
        }
    }
    return (stored as EmojiStyle) || 'native';
});
```

### 2. IconRenderer 组件更新
**文件**: `src/components/IconRenderer.tsx`

**改动**:
- 支持三种渲染模式：native、twemoji、fluent
- 实现 Fluent Emoji CDN 集成
- 优化 emoji codepoint 转换逻辑
- 添加图片加载失败的降级处理

**Fluent Emoji CDN**:
```typescript
// Fluent Emoji 3D 风格
const imgSrc = `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji/assets/${emoji}/3D/${codepoint.toUpperCase()}_3d.png`;
```

**特点**:
- 自动计算 emoji 的 Unicode codepoint
- 支持复杂 emoji（包括 ZWJ 序列）
- 图片加载失败时自动降级到原生 emoji
- 保持与现有 UI Icon 系统的兼容性

### 3. EmojiSettingsView 更新
**文件**: `src/views/settings/EmojiSettingsView.tsx`

**新增功能**:
- Emoji 渲染风格选择器
- 每个选项显示预览 emoji（😊、❤️、🎉、🔥）
- 当前选中项显示绿色对勾
- 提供简短的风格描述

**UI 设计**:
```tsx
<button className={`w-full text-left p-3 rounded-lg border ${
    emojiStyle === style.value
        ? 'border-stone-400 bg-stone-50'
        : 'border-stone-200 hover:border-stone-300'
}`}>
    <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold">{style.label}</span>
        {emojiStyle === style.value && <Check size={16} />}
    </div>
    <p className="text-xs text-stone-500">{style.desc}</p>
    <div className="flex gap-2 mt-2">
        {/* 预览 emoji */}
    </div>
</button>
```

### 4. PreferencesSettingsView 清理
**文件**: `src/views/settings/PreferencesSettingsView.tsx`

**改动**:
- 移除 Twemoji 开关
- 移除相关的 props: `useTwemoji`, `onToggleUseTwemoji`
- 简化组件接口

### 5. SettingsView 更新
**文件**: `src/views/SettingsView.tsx`

**改动**:
- 移除传递给 PreferencesSettingsView 的 Twemoji 相关 props
- 保持其他设置不变

## CDN 资源

### Twitter Emoji (Twemoji)
- **CDN**: `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/`
- **格式**: SVG
- **示例**: `1f60a.svg` (😊)

### Fluent Emoji
- **CDN**: `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji/assets/`
- **格式**: PNG (3D 渲染)
- **示例**: `😊/3D/1F60A_3d.png`
- **特点**: 
  - 3D 立体效果
  - 现代设计风格
  - 文件稍大但视觉效果更好

## 向后兼容

### 自动迁移
应用会自动检测旧的 `lumostime_use_twemoji` 设置：
- 如果为 `true`，自动设置为 `twemoji`
- 如果为 `false` 或不存在，设置为 `native`

### 数据迁移流程
```typescript
const stored = localStorage.getItem('lumostime_emoji_style');
if (!stored) {
    const oldTwemoji = localStorage.getItem('lumostime_use_twemoji');
    if (oldTwemoji === 'true') {
        return 'twemoji';
    }
}
return (stored as EmojiStyle) || 'native';
```

## 使用场景

### 全局应用
所有使用 `IconRenderer` 组件的地方都会自动应用选中的 emoji 风格：
- 心情日历
- Mood Picker
- Reaction 系统
- 活动图标
- 标签图标
- 所有其他 emoji 显示

### 实时切换
用户切换风格后，所有 emoji 会立即更新，无需刷新页面。

## 性能考虑

### 图片缓存
- 浏览器会自动缓存 CDN 图片
- 相同 emoji 只需加载一次

### 降级策略
- 图片加载失败时自动显示原生 emoji
- 不会出现空白或错误状态

### 网络优化
- 使用 jsDelivr CDN，全球加速
- SVG 格式（Twemoji）文件小，加载快
- PNG 格式（Fluent）文件稍大，但有 3D 效果

## 测试清单
- [x] 三种风格都能正常渲染
- [x] 风格切换实时生效
- [x] 向后兼容旧的 Twemoji 设置
- [x] 图片加载失败时正确降级
- [x] 所有使用 IconRenderer 的地方都正确应用风格
- [x] Reaction 系统正确渲染
- [x] 心情日历正确渲染
- [x] 设置页面 UI 正确显示
- [x] 从 PreferencesSettingsView 成功移除旧开关

## 未来扩展

### 可能添加的风格
1. **Noto Emoji (Google)**: 扁平化，Material Design 风格
2. **OpenMoji**: 开源，线条风格，可自定义颜色
3. **Apple Emoji**: 如果能获得授权

### 实现方式
在 `EmojiStyle` 类型中添加新选项，在 `IconRenderer` 中添加对应的 CDN URL 即可。

## 相关文件
- `src/contexts/SettingsContext.tsx` - 设置状态管理
- `src/components/IconRenderer.tsx` - Emoji 渲染核心
- `src/views/settings/EmojiSettingsView.tsx` - 设置界面
- `src/views/settings/PreferencesSettingsView.tsx` - 偏好设置（已移除 Twemoji）
- `src/views/SettingsView.tsx` - 设置主页面
- `src/components/ReactionComponents.tsx` - Reaction 系统
- `src/components/MoodPicker.tsx` - 心情选择器
- `src/components/MoodCalendar.tsx` - 心情日历

## 用户体验改进
1. 更直观的风格选择界面
2. 实时预览不同风格的效果
3. 统一的设置位置（Emoji 相关）
4. 更丰富的视觉选择
5. 无缝的风格切换体验
