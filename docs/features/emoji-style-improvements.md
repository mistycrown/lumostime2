# Emoji 风格系统改进

## 日期
2026-02-15

## 概述
改进了 emoji 渲染系统，修复了特定 emoji 无法加载的问题，并将 Fluent Emoji 替换为 OpenMoji。

## 主要改动

### 1. Emoji 风格选项更新
**变更**: 将 Fluent Emoji 替换为 OpenMoji

**原因**:
- OpenMoji 是完全开源的 emoji 项目
- 提供更好的 CDN 支持和稳定性
- 设计风格更加统一和现代

**支持的风格**:
- `native`: 原生系统 emoji
- `twemoji`: Twitter 的开源 emoji 设计
- `openmoji`: 开源的彩色 emoji 设计

### 2. Codepoint 计算优化
**问题**: 某些 emoji（如 ❤️、☹️）无法正确加载，显示为原生 emoji

**原因**: 
- 这些 emoji 包含变体选择器（Variation Selector, U+FE0F）
- 旧的 codepoint 计算方法会将变体选择器包含在内
- 导致生成的 URL 不正确，CDN 无法找到对应的图片

**解决方案**:
改进 `getEmojiCodepoint` 函数，过滤掉特殊字符：
- 变体选择器 (U+FE0F)
- 零宽连接符 (U+200D)

```typescript
const getEmojiCodepoint = (emoji: string): string => {
    const codePoints = [];
    for (const char of emoji) {
        const code = char.codePointAt(0);
        if (code !== undefined) {
            // 跳过变体选择器和零宽连接符
            if (code !== 0xFE0F && code !== 0x200D) {
                codePoints.push(code.toString(16));
            }
        }
    }
    return codePoints.join('-');
};
```

**示例**:
- ❤️ (U+2764 U+FE0F) → `2764` (正确)
- ☹️ (U+2639 U+FE0F) → `2639` (正确)
- 🎉 (U+1F389) → `1f389` (正确)

### 3. Emoji 预览组件
**新增**: `EmojiPreview` 组件用于在设置页面预览不同风格的 emoji

**功能**:
- 独立渲染指定风格的 emoji
- 不受全局 `emojiStyle` 设置影响
- 支持加载失败时回退到原生 emoji

**使用场景**:
- Emoji 设置页面的风格选择器
- 显示每种风格的实际效果

### 4. CDN 配置

**Twemoji**:
```
https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/{codepoint}.svg
```

**OpenMoji**:
```
https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/{CODEPOINT}.svg
```
注意: OpenMoji 使用大写的 codepoint

## 修改的文件

### 1. src/contexts/SettingsContext.tsx
- 更新 `EmojiStyle` 类型: `'fluent'` → `'openmoji'`

### 2. src/components/IconRenderer.tsx
- 改进 `getEmojiCodepoint` 函数，过滤变体选择器
- 更新 emoji 风格处理逻辑，支持 OpenMoji
- 移除 Fluent Emoji 相关代码

### 3. src/views/settings/EmojiSettingsView.tsx
- 添加 `EmojiPreview` 组件
- 更新风格选项: Fluent → OpenMoji
- 为每个风格添加预览 emoji
- 使用改进的 codepoint 计算方法

## 技术细节

### Emoji Unicode 结构
某些 emoji 由多个 Unicode 字符组成：
1. **基础字符**: 主要的 emoji 字符
2. **变体选择器 (U+FE0F)**: 指定使用 emoji 样式而非文本样式
3. **零宽连接符 (U+200D)**: 用于组合多个 emoji（如肤色、性别等）

### 为什么要过滤这些字符？
- CDN 上的 emoji 图片文件名通常只包含基础字符的 codepoint
- 变体选择器和连接符是渲染指令，不是图片标识符
- 包含这些字符会导致 URL 不匹配，图片加载失败

### 错误处理
所有 emoji 渲染都包含错误处理：
```typescript
img.onerror = () => {
    if (emojiRef.current) {
        emojiRef.current.innerHTML = emoji; // 回退到原生 emoji
    }
};
```

## 测试建议

### 需要测试的 Emoji
1. **带变体选择器的 emoji**:
   - ❤️ (红心)
   - ☹️ (悲伤脸)
   - ⭐ (星星)
   - ☀️ (太阳)

2. **组合 emoji**:
   - 👨‍👩‍👧‍👦 (家庭)
   - 👍🏻 (带肤色的大拇指)

3. **普通 emoji**:
   - 😊 (笑脸)
   - 🎉 (庆祝)
   - 🔥 (火焰)

### 测试场景
1. 在 Emoji 设置页面切换不同风格
2. 查看预览是否正确显示
3. 在心情日历中选择和显示 emoji
4. 在 reaction 系统中使用 emoji
5. 检查加载失败时是否正确回退到原生 emoji

## 已知限制

1. **OpenMoji 覆盖范围**: 某些较新的 emoji 可能在 OpenMoji 中不存在
2. **网络依赖**: 需要网络连接才能加载 Twemoji 和 OpenMoji
3. **缓存**: 首次加载可能较慢，后续会被浏览器缓存

## 未来改进方向

1. **本地缓存**: 考虑将常用 emoji 图片打包到应用中
2. **懒加载**: 只加载可见区域的 emoji 图片
3. **更多风格**: 可以添加更多 emoji 风格选项（如 Noto Emoji）
4. **自定义 CDN**: 允许用户配置自己的 emoji CDN 地址

## 相关文件
- `src/contexts/SettingsContext.tsx` - Emoji 风格设置
- `src/components/IconRenderer.tsx` - Emoji 渲染核心组件
- `src/views/settings/EmojiSettingsView.tsx` - Emoji 设置页面
- `src/components/ReactionComponents.tsx` - Reaction 系统
