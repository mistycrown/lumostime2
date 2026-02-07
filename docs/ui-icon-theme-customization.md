# UI 图标主题自定义指南

## 快速开始

本指南将帮助你为应用添加新的 UI 图标主题，并自定义按钮样式。

## 主题结构

每个主题包含两部分：
1. **图标资源**：16 张图标图片（WebP 格式）
2. **样式配置**：按钮的背景色、描边色等样式

## 添加新主题的步骤

### 1. 准备图标资源

在 `public/uiicon/` 目录下创建新主题文件夹，例如 `my-theme`：

```
public/uiicon/my-theme/
├── 01.webp  # 同步按钮
├── 02.webp  # 设置
├── 03.webp  # 管理
├── 04.webp  # 日历
├── 05.webp  # 增加记录
├── 06.webp  # 打点计时
├── 07.webp  # AI 补记
├── 08.webp  # 切换到标签
├── 09.webp  # 切换到领域
├── 10.webp  # 编年史
├── 11.webp  # 回忆录
├── 12.webp  # 阅读模式
├── 13.webp  # 编辑模式
├── 14.webp  # 正向排序
├── 15.webp  # 反向排序
└── 16.webp  # 数据视图
```

### 2. 注册主题名称

打开 `src/services/uiIconService.ts`，在 `UI_ICON_THEMES` 数组中添加新主题：

```typescript
export const UI_ICON_THEMES = [
    'default', 
    'purple', 
    'color', 
    'color2', 
    'prince',
    'my-theme'  // 添加你的主题
] as const;
```

### 3. 配置主题样式

在同一文件的 `THEME_STYLES` 对象中添加样式配置：

```typescript
const THEME_STYLES: Record<UIIconTheme, ThemeStyleConfig> = {
    // ... 其他主题配置
    'my-theme': {
        floatingButton: {
            backgroundColor: '#ffffff',      // 白色背景
            borderColor: '#3b82f6',          // 蓝色描边
            borderWidth: '2px',              // 2px 描边宽度
            shadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)'
        },
        headerButton: {
            backgroundColor: 'transparent',  // 透明背景
            borderColor: 'transparent',
            borderWidth: '0'
        }
    }
};
```

### 4. 测试主题

1. 启动应用
2. 进入设置页面
3. 找到"UI 图标主题"选项
4. 选择你的新主题
5. 检查所有悬浮按钮和图标是否正确显示

## 样式配置详解

### floatingButton（悬浮按钮）

悬浮按钮是页面右下角的圆形按钮，用于主要操作。

**配置示例：**

```typescript
floatingButton: {
    backgroundColor: '#ffffff',  // 背景色（十六进制或 CSS 颜色名）
    borderColor: '#9333ea',      // 描边色
    borderWidth: '2px',          // 描边宽度（带单位）
    shadow: '...'                // CSS box-shadow 值
}
```

**常见配色方案：**

- **白底紫边**（优雅风格）
  ```typescript
  backgroundColor: '#ffffff',
  borderColor: '#9333ea',  // purple-600
  ```

- **白底蓝边**（清新风格）
  ```typescript
  backgroundColor: '#ffffff',
  borderColor: '#3b82f6',  // blue-500
  ```

- **浅色底深色边**（温暖风格）
  ```typescript
  backgroundColor: '#fef3c7',  // amber-100
  borderColor: '#f59e0b',      // amber-500
  ```

### headerButton（顶部按钮）

顶部栏的功能按钮，通常不需要特殊样式。

**配置示例：**

```typescript
headerButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: '0'
}
```

## 现有主题参考

### Purple 主题
- 风格：优雅、专业
- 悬浮按钮：白底紫边
- 适用场景：正式、商务

### Color 主题
- 风格：清新、现代
- 悬浮按钮：白底蓝边
- 适用场景：日常使用

### Color2 主题
- 风格：自然、活力
- 悬浮按钮：白底绿边
- 适用场景：健康、运动

### Prince 主题
- 风格：温暖、童话
- 悬浮按钮：浅琥珀底深琥珀边
- 适用场景：轻松、创意

## 图标设计建议

1. **尺寸**：建议 512x512 像素或更高
2. **格式**：WebP（优先）或 PNG
3. **风格**：保持整套图标风格统一
4. **颜色**：考虑与主题样式配色协调
5. **清晰度**：确保在小尺寸下仍然清晰可辨

## 常见问题

### Q: 如何让图标在深色背景上显示？

A: 在设计图标时使用浅色或白色，或者在样式配置中调整按钮背景色。

### Q: 可以为不同按钮设置不同样式吗？

A: 目前系统支持两种按钮类型（floatingButton 和 headerButton）。如需更多类型，可以扩展 `ThemeStyleConfig` 接口。

### Q: 主题切换后图标没有更新？

A: 检查浏览器缓存，或者在开发者工具中禁用缓存后刷新页面。

## 高级自定义

如果需要更复杂的样式控制，可以：

1. 在 `ThemeStyleConfig` 接口中添加新的样式类型
2. 在 `UIIconService` 类中添加对应的获取方法
3. 创建新的 Hook 来使用这些样式

详细信息请参考 `src/services/THEME_STYLE_GUIDE.md`。
