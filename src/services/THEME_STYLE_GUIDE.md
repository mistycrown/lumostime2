# UI 图标主题样式管理指南

## 概述

本系统支持为不同的 UI 图标主题配置独立的样式（背景色、描边色、阴影等），使得每个主题可以有自己独特的视觉风格。

## 主题样式配置

### 配置位置

主题样式配置在 `src/services/uiIconService.ts` 文件中的 `THEME_STYLES` 对象。

### 配置结构

```typescript
const THEME_STYLES: Record<UIIconTheme, ThemeStyleConfig> = {
    'purple': {
        floatingButton: {
            backgroundColor: '#ffffff',      // 背景色
            borderColor: '#9333ea',          // 描边色
            borderWidth: '2px',              // 描边宽度
            shadow: '...'                    // 阴影效果
        },
        headerButton: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: '0'
        }
    }
}
```

## 样式类型

### 1. floatingButton（悬浮按钮）

用于页面右下角或其他位置的圆形悬浮按钮，如：
- 脉络页的"增加记录"按钮
- 脉络页的"打点计时"按钮
- 脉络页的"AI 补记"按钮
- 索引页的"切换标签/领域"按钮
- 档案页的"切换编年史/回忆录"按钮

**可配置属性：**
- `backgroundColor`: 背景颜色
- `borderColor`: 描边颜色
- `borderWidth`: 描边宽度
- `shadow`: 阴影效果（CSS box-shadow 值）

### 2. headerButton（顶部栏按钮）

用于页面顶部的功能按钮，如：
- 同步按钮
- 设置按钮
- 管理按钮
- 日历按钮

**可配置属性：**
- `backgroundColor`: 背景颜色
- `borderColor`: 描边颜色
- `borderWidth`: 描边宽度

## 添加新主题

### 步骤 1: 添加主题名称

在 `UI_ICON_THEMES` 数组中添加新主题：

```typescript
export const UI_ICON_THEMES = ['default', 'purple', 'color', 'color2', 'prince', 'your-new-theme'] as const;
```

### 步骤 2: 配置主题样式

在 `THEME_STYLES` 对象中添加新主题的样式配置：

```typescript
const THEME_STYLES: Record<UIIconTheme, ThemeStyleConfig> = {
    // ... 其他主题
    'your-new-theme': {
        floatingButton: {
            backgroundColor: '#your-bg-color',
            borderColor: '#your-border-color',
            borderWidth: '2px',
            shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        },
        headerButton: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: '0'
        }
    }
}
```

### 步骤 3: 准备图标资源

在 `public/uiicon/` 目录下创建新主题文件夹，并放入 16 张图标：

```
public/uiicon/your-new-theme/
├── 01.webp  (同步按钮)
├── 02.webp  (设置)
├── 03.webp  (管理)
├── 04.webp  (日历)
├── 05.webp  (增加记录)
├── 06.webp  (打点计时)
├── 07.webp  (AI 补记)
├── 08.webp  (切换到标签)
├── 09.webp  (切换到领域)
├── 10.webp  (编年史)
├── 11.webp  (回忆录)
├── 12.webp  (阅读模式)
├── 13.webp  (编辑模式)
├── 14.webp  (正向排序)
├── 15.webp  (反向排序)
└── 16.webp  (数据视图)
```

## 使用示例

### 在组件中使用 FloatingButton

```typescript
import { FloatingButton } from '@/components/FloatingButton';
import { UIIcon } from '@/components/UIIcon';
import { Plus } from 'lucide-react';

// 悬浮按钮会自动应用当前主题的样式
<FloatingButton onClick={handleClick}>
    <UIIcon type="add-record" fallbackIcon={Plus} size={24} className="text-white" />
</FloatingButton>
```

### 手动获取主题样式

```typescript
import { useFloatingButtonStyle } from '@/services/uiIconService';

const MyComponent = () => {
    const floatingStyle = useFloatingButtonStyle();
    
    return (
        <button style={floatingStyle}>
            自定义按钮
        </button>
    );
};
```

## 颜色建议

### Purple 主题
- 背景：白色 `#ffffff`
- 描边：紫色 `#9333ea` (purple-600)
- 适合：优雅、专业的风格

### Color 主题
- 背景：白色 `#ffffff`
- 描边：蓝色 `#3b82f6` (blue-500)
- 适合：清新、现代的风格

### Color2 主题
- 背景：白色 `#ffffff`
- 描边：绿色 `#10b981` (green-500)
- 适合：自然、活力的风格

### Prince 主题
- 背景：浅琥珀色 `#fef3c7` (amber-100)
- 描边：琥珀色 `#f59e0b` (amber-500)
- 适合：温暖、童话的风格

## 扩展样式类型

如果需要为其他类型的按钮添加样式配置，可以在 `ThemeStyleConfig` 接口中添加新的属性：

```typescript
export interface ThemeStyleConfig {
    floatingButton?: { ... };
    headerButton?: { ... };
    // 添加新的按钮类型
    tabButton?: {
        backgroundColor?: string;
        activeColor?: string;
        inactiveColor?: string;
    };
}
```

然后在 `UIIconService` 类中添加对应的获取方法：

```typescript
getTabButtonStyle(): React.CSSProperties {
    const styles = this.getThemeStyles();
    if (!styles.tabButton) return {};
    
    return {
        backgroundColor: styles.tabButton.backgroundColor,
        // ... 其他样式
    };
}
```

## 注意事项

1. **颜色格式**：建议使用十六进制颜色代码（如 `#9333ea`）或 Tailwind CSS 颜色值
2. **阴影效果**：使用标准的 CSS box-shadow 语法
3. **响应式**：样式会自动适配不同屏幕尺寸
4. **降级支持**：如果主题样式未配置，会自动使用默认的变体样式
5. **性能**：主题切换时会触发全局事件，所有使用主题样式的组件会自动更新

## 测试主题

在设置页面中可以切换不同的主题进行测试：

1. 打开应用设置
2. 找到"UI 图标主题"选项
3. 选择不同的主题查看效果
4. 检查所有悬浮按钮和顶部按钮的样式是否正确应用
