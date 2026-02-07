# 配色方案系统使用指南

## 架构说明

我们采用 **CSS 变量 + 主题服务** 的混合方案，这是业界最佳实践。

### 工作原理

```
用户选择配色
    ↓
colorSchemeService.setScheme('purple')
    ↓
更新 <html data-color-scheme="purple">
    ↓
CSS 变量自动切换
    ↓
所有使用 CSS 变量的组件自动更新样式
```

## 如何为组件添加配色支持

### 方法 1：使用 CSS 变量类（推荐）

最简单的方式，直接使用预定义的类：

```tsx
// 悬浮按钮
<button className="floating-button rounded-full w-14 h-14">
  <Icon />
</button>

// 次要按钮
<button className="secondary-button px-4 py-2 rounded-lg">
  保存
</button>

// 卡片
<div className="theme-card p-4 rounded-lg">
  内容
</div>

// 输入框
<input className="theme-input px-3 py-2 rounded" />

// 标签
<span className="theme-tag px-2 py-1 rounded text-xs">
  标签
</span>
```

### 方法 2：直接使用 CSS 变量

如果需要自定义样式：

```tsx
<button 
  className="rounded-full w-14 h-14"
  style={{
    backgroundColor: 'var(--floating-button-bg)',
    color: 'var(--floating-button-text)',
    border: '0.5px solid var(--floating-button-border)',
    boxShadow: 'var(--floating-button-shadow)'
  }}
>
  <Icon />
</button>
```

### 方法 3：在 Tailwind 中使用

```tsx
<button className="bg-[var(--floating-button-bg)] text-[var(--floating-button-text)] border-[var(--floating-button-border)]">
  按钮
</button>
```

## 可用的 CSS 变量

### 悬浮按钮
- `--floating-button-bg` - 背景色
- `--floating-button-text` - 文字颜色
- `--floating-button-border` - 边框颜色
- `--floating-button-shadow` - 阴影

### 次要按钮
- `--secondary-button-bg` - 背景色
- `--secondary-button-text` - 文字颜色
- `--secondary-button-border` - 边框颜色
- `--secondary-button-hover-bg` - 悬停背景色

### 卡片
- `--card-bg` - 背景色
- `--card-border` - 边框颜色
- `--card-hover-border` - 悬停边框颜色
- `--card-shadow` - 阴影

### 输入框
- `--input-bg` - 背景色
- `--input-border` - 边框颜色
- `--input-focus-border` - 聚焦边框颜色
- `--input-text` - 文字颜色

### 标签
- `--tag-bg` - 背景色
- `--tag-text` - 文字颜色
- `--tag-border` - 边框颜色

### 其他
- `--divider-color` - 分割线颜色
- `--accent-color` - 强调色
- `--accent-hover` - 强调色悬停

## 添加新的配色方案

### 步骤 1：在 themes.css 中定义变量

```css
[data-color-scheme="blue"] {
  --floating-button-bg: #ffffff;
  --floating-button-text: #1e40af;
  --floating-button-border: rgba(59, 130, 246, 0.15);
  --floating-button-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1);
  
  --secondary-button-bg: #eff6ff;
  --secondary-button-text: #1e40af;
  --secondary-button-border: #bfdbfe;
  
  /* ... 其他变量 */
}
```

### 步骤 2：更新类型定义

```typescript
// src/services/colorSchemeService.ts
export type ColorScheme = 'default' | 'purple' | 'blue';
```

### 步骤 3：在选择器中添加色卡

```tsx
// src/components/ColorSchemeSelector.tsx
<button onClick={() => onSchemeChange('blue')}>
  <div className="bg-gradient-to-br from-blue-50 to-blue-100">
    {/* 预览 */}
  </div>
</button>
```

## 添加新的组件样式变量

如果要为新类型的组件添加配色支持：

### 1. 在 themes.css 中定义变量

```css
:root {
  /* 时间轴 */
  --timeline-line-color: #e7e5e4;
  --timeline-dot-color: #78716c;
  --timeline-dot-active: #1c1917;
}

[data-color-scheme="purple"] {
  --timeline-line-color: #e9d5ff;
  --timeline-dot-color: #c084fc;
  --timeline-dot-active: #9333ea;
}
```

### 2. 创建通用样式类（可选）

```css
.timeline-line {
  border-color: var(--timeline-line-color);
}

.timeline-dot {
  background-color: var(--timeline-dot-color);
}

.timeline-dot-active {
  background-color: var(--timeline-dot-active);
}
```

### 3. 在组件中使用

```tsx
<div className="timeline-line border-l-2" />
<div className="timeline-dot w-3 h-3 rounded-full" />
```

## 最佳实践

### ✅ 推荐做法

1. **优先使用预定义的 CSS 类**
   ```tsx
   <button className="floating-button">按钮</button>
   ```

2. **为常用组件创建通用类**
   ```css
   .my-component {
     background: var(--card-bg);
     border: 1px solid var(--card-border);
   }
   ```

3. **保持变量命名一致**
   - 使用 `--组件-属性` 格式
   - 例如：`--button-bg`、`--card-border`

### ❌ 避免做法

1. **不要硬编码颜色**
   ```tsx
   // ❌ 不好
   <button className="bg-purple-500">按钮</button>
   
   // ✅ 好
   <button className="bg-[var(--accent-color)]">按钮</button>
   ```

2. **不要在每个组件中重复定义样式**
   ```tsx
   // ❌ 不好
   <button style={{ background: scheme === 'purple' ? '#9333ea' : '#000' }}>
   
   // ✅ 好
   <button className="accent-button">
   ```

## 迁移现有组件

### 示例：迁移一个卡片组件

**之前：**
```tsx
<div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm hover:border-stone-300">
  内容
</div>
```

**之后：**
```tsx
<div className="theme-card rounded-lg p-4">
  内容
</div>
```

### 示例：迁移一个按钮

**之前：**
```tsx
<button className="bg-stone-900 text-white border border-stone-800 rounded-full w-14 h-14 shadow-2xl">
  <Icon />
</button>
```

**之后：**
```tsx
<button className="floating-button rounded-full w-14 h-14">
  <Icon />
</button>
```

## 性能优化

CSS 变量的性能非常好：
- ✅ 浏览器原生支持
- ✅ 无需 JavaScript 计算
- ✅ 切换配色时只需更新一个 HTML 属性
- ✅ 所有样式自动更新，无需重新渲染组件

## 调试技巧

### 查看当前配色方案

```javascript
// 在浏览器控制台
document.documentElement.getAttribute('data-color-scheme')
```

### 查看 CSS 变量值

```javascript
// 在浏览器控制台
getComputedStyle(document.documentElement).getPropertyValue('--floating-button-bg')
```

### 临时测试配色

```javascript
// 在浏览器控制台
document.documentElement.setAttribute('data-color-scheme', 'purple')
```

## 总结

这个系统的优势：
1. **集中管理** - 所有配色在 `themes.css` 中定义
2. **自动应用** - 组件使用 CSS 变量，自动响应配色切换
3. **易于扩展** - 添加新配色只需在 CSS 中定义变量
4. **高性能** - 浏览器原生支持，无需 JavaScript 计算
5. **易于维护** - 不需要在每个组件中单独处理配色逻辑

你只需要：
1. 在 `themes.css` 中定义新配色的变量
2. 在组件中使用 CSS 变量或预定义类
3. 就完成了！
