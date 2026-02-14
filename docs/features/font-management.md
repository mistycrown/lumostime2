# 字体管理系统

## 概述

LumosTime 的字体管理系统提供了统一的字体切换功能，用户可以在"投喂功能"页面的"字体" Tab 中选择不同的字体。

## 架构设计

### 1. 字体服务 (fontService)

位置：`src/services/fontService.ts`

核心功能：
- 管理所有可用字体
- 处理字体切换逻辑
- 持久化字体设置
- 应用字体到页面

### 2. 字体选择器组件 (FontSelector)

位置：`src/components/FontSelector.tsx`

功能：
- 展示所有可用字体
- 提供字体预览
- 处理用户选择

### 3. 设置上下文 (SettingsContext)

位置：`src/contexts/SettingsContext.tsx`

新增状态：
- `fontFamily`: 当前选中的字体 ID
- `setFontFamily`: 更新字体设置

## 使用方式

### 在组件中使用字体设置

```typescript
import { useSettings } from '../contexts/SettingsContext';

const MyComponent = () => {
  const { fontFamily, setFontFamily } = useSettings();
  
  // 读取当前字体
  console.log('当前字体:', fontFamily);
  
  // 切换字体
  const handleFontChange = (newFont: string) => {
    setFontFamily(newFont);
  };
  
  return <div>...</div>;
};
```

### 直接使用字体服务

```typescript
import { fontService } from '../services/fontService';

// 获取所有字体
const fonts = fontService.getAllFonts();

// 切换字体
const result = fontService.setFont('lxgw-wenkai');
if (result.success) {
  console.log(result.message);
}

// 获取当前字体
const currentFont = fontService.getCurrentFont();
```

## 添加新字体

### 1. 准备字体文件

1. 下载字体的 woff2 格式文件（Regular 和 Bold 两个字重）
2. 创建字体目录：`public/fonts/[font-name]/`
3. 将字体文件放入目录

### 2. 更新字体 CSS

在 `public/fonts/fonts.css` 中添加 `@font-face` 定义：

```css
@font-face {
    font-family: 'Your Font Name';
    src: url('./your-font/YourFont-Regular.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'Your Font Name';
    src: url('./your-font/YourFont-Bold.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
}
```

### 3. 更新字体服务

在 `src/services/fontService.ts` 的 `FONT_OPTIONS` 数组中添加新字体：

```typescript
{
    id: 'your-font-id',
    name: 'your-font-id',
    displayName: '你的字体名称',
    description: '字体描述',
    fontFamily: '"Your Font Name", "Noto Serif SC", serif',
    type: 'custom'
}
```

## 字体应用机制

### 全局字体应用

字体通过以下方式应用到整个应用：

1. **初始化时**：在 `useAppInitialization` hook 中调用 `fontService.initializeFont()`
2. **切换时**：通过 `fontService.setFont()` 更新 `document.body.style.fontFamily`
3. **持久化**：字体设置保存在 `localStorage` 中，键名为 `lumostime_font_family`

### CSS 变量

字体也会设置为 CSS 变量，方便在样式中引用：

```css
body {
  font-family: var(--font-family);
}
```

## 注意事项

### 1. 字体回退

所有自定义字体都应该包含回退字体：

```typescript
fontFamily: '"Custom Font", "Noto Serif SC", serif'
```

这样即使自定义字体加载失败，也能显示默认字体。

### 2. 字体加载性能

- 使用 `font-display: swap` 确保文字立即显示
- 使用 woff2 格式获得最佳压缩率
- 只加载必要的字重（Regular 和 Bold）

### 3. 字体授权

确保所有添加的字体都有合法的商用授权：
- SIL Open Font License 1.1
- Apache License 2.0
- 或其他允许商用的开源协议

## 当前可用字体

| 字体 ID | 显示名称 | 授权 | 风格 |
|---------|---------|------|------|
| default | 默认 | - | 系统默认（Noto Serif SC） |
| lxgw-wenkai | 霞鹜文楷 | SIL OFL 1.1 | 温暖的手写风格 |
| source-han-serif | 思源宋体 | SIL OFL 1.1 | 优雅的传统宋体 |
| alibaba-puhuiti | 阿里巴巴普惠体 | 免费商用 | 现代简洁风格 |

## 未来改进

1. **字体预加载**：在应用启动时预加载字体文件
2. **字体子集化**：只加载常用汉字，减小文件体积
3. **动态加载**：按需加载字体文件，而不是一次性加载所有字体
4. **字体预览优化**：提供更丰富的字体预览文本
5. **字体大小调节**：允许用户调整字体大小
