# 配色方案快速参考

## 🎯 核心概念

**你不需要在每个页面单独处理配色！**

```
定义配色（一次）          使用配色（到处用）
themes.css          →    组件自动应用
```

## 📝 三步添加配色支持

### 1. 在组件中使用 CSS 类

```tsx
// 之前
<button className="bg-stone-900 text-white border border-stone-800 rounded-full">
  按钮
</button>

// 之后
<button className="floating-button rounded-full">
  按钮
</button>
```

### 2. 或者使用 CSS 变量

```tsx
<button className="bg-[var(--floating-button-bg)] text-[var(--floating-button-text)]">
  按钮
</button>
```

### 3. 完成！

切换配色时，所有使用 CSS 变量的组件自动更新。

## 🎨 常用 CSS 类

```tsx
// 悬浮按钮
<button className="floating-button">

// 次要按钮  
<button className="secondary-button">

// 卡片
<div className="theme-card">

// 输入框
<input className="theme-input" />

// 标签
<span className="theme-tag">
```

## 🔧 添加新配色

只需在 `src/styles/themes.css` 中添加：

```css
[data-color-scheme="blue"] {
  --floating-button-bg: #ffffff;
  --floating-button-border: rgba(59, 130, 246, 0.15);
  /* ... */
}
```

然后更新类型：

```typescript
// src/services/colorSchemeService.ts
export type ColorScheme = 'default' | 'purple' | 'blue';
```

## 📦 可用的 CSS 变量

| 变量名 | 用途 |
|--------|------|
| `--floating-button-bg` | 悬浮按钮背景 |
| `--floating-button-text` | 悬浮按钮文字 |
| `--floating-button-border` | 悬浮按钮边框 |
| `--secondary-button-bg` | 次要按钮背景 |
| `--card-bg` | 卡片背景 |
| `--card-border` | 卡片边框 |
| `--input-bg` | 输入框背景 |
| `--input-border` | 输入框边框 |
| `--tag-bg` | 标签背景 |
| `--accent-color` | 强调色 |

完整列表见 `src/styles/themes.css`

## ⚡ 性能

- ✅ 浏览器原生支持
- ✅ 无需 JavaScript 计算
- ✅ 切换配色只需更新一个 HTML 属性
- ✅ 所有组件自动更新

## 🎓 详细文档

查看 `docs/theme-system-guide.md` 了解更多。
