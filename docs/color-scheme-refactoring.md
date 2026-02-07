# 配色方案系统重构文档

## 重构日期：2026-02-07

## 重构目标

将"配色方案"从"UI 主题"中独立出来，使两个概念更加清晰：
- **UI 主题（UI Icon Theme）**：控制图标的样式（图片资源）
- **配色方案（Color Scheme）**：控制按钮的描边颜色和整体配色

## 架构变更

### 1. 新增文件

#### `src/services/colorSchemeService.ts`
- 独立的配色方案服务
- 管理配色方案的切换和样式配置
- 提供 React Hooks：`useFloatingButtonStyle`、`useColorSchemeStyles`

#### `src/components/ColorSchemeSelector.tsx`
- 配色方案选择器组件
- 提供可视化的配色方案选择界面
- 支持预览效果

### 2. 修改文件

#### `src/components/FloatingButton.tsx`
- 从 `uiIconService` 改为使用 `colorSchemeService`
- 按钮样式现在由配色方案控制

#### `src/contexts/SettingsContext.tsx`
- 新增 `colorScheme` 和 `setColorScheme` 状态
- 配色方案独立于 UI 主题进行管理

#### `src/views/SponsorshipView.tsx`
- 新增"配色" Tab
- 集成 `ColorSchemeSelector` 组件

## 配色方案配置

### 当前支持的配色方案

#### 1. Default（默认）
- 经典黑白配色
- 不应用特殊样式
- 适合传统风格

#### 2. Purple（紫色）
- 白色背景 + 15% 透明度紫色细描边
- 描边宽度：0.5px
- 优雅紫调风格

### 配色方案样式结构

```typescript
interface ColorSchemeStyleConfig {
    floatingButton?: {
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: string;
        shadow?: string;
    };
    headerButton?: {
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: string;
    };
}
```

## 使用方法

### 在设置页面选择配色

1. 进入"投喂功能"页面
2. 点击"配色" Tab
3. 选择想要的配色方案
4. 配色会立即应用到所有悬浮按钮

### 在代码中使用配色样式

```typescript
import { useFloatingButtonStyle } from '@/services/colorSchemeService';

const MyComponent = () => {
    const buttonStyle = useFloatingButtonStyle();
    
    return (
        <button style={buttonStyle}>
            我的按钮
        </button>
    );
};
```

### 使用 FloatingButton 组件

```typescript
import { FloatingButton } from '@/components/FloatingButton';

// 自动应用配色方案
<FloatingButton onClick={handleClick}>
    <Icon />
</FloatingButton>

// 禁用配色方案（使用默认样式）
<FloatingButton onClick={handleClick} disableThemeStyle={true}>
    <Icon />
</FloatingButton>
```

## 数据存储

### LocalStorage 键值

- **配色方案**：`lumostime_color_scheme`
  - 值：`'default'` | `'purple'`
  
- **UI 主题**：`lumostime_ui_icon_theme`
  - 值：`'default'` | `'purple'` | `'color'` | `'color2'` | `'prince'`

### 事件系统

配色方案切换时会触发全局事件：
```typescript
window.dispatchEvent(new CustomEvent('color-scheme-changed', { 
    detail: { scheme: 'purple' } 
}));
```

## 扩展配色方案

### 添加新配色方案的步骤

1. **更新类型定义**
   ```typescript
   // src/services/colorSchemeService.ts
   export type ColorScheme = 'default' | 'purple' | 'blue';
   ```

2. **添加样式配置**
   ```typescript
   const COLOR_SCHEME_STYLES: Record<ColorScheme, ColorSchemeStyleConfig> = {
       // ... 现有配色
       'blue': {
           floatingButton: {
               backgroundColor: '#ffffff',
               borderColor: 'rgba(59, 130, 246, 0.15)',
               borderWidth: '0.5px',
               shadow: '...'
           }
       }
   };
   ```

3. **更新选择器组件**
   ```typescript
   // src/components/ColorSchemeSelector.tsx
   // 添加新的配色方案按钮
   ```

## 与 UI 主题的关系

### 独立但互补

- **UI 主题**：决定使用哪套图标资源（purple、color、color2、prince）
- **配色方案**：决定按钮的描边颜色和视觉风格

### 推荐搭配

- Purple UI 主题 + Purple 配色方案
- Color UI 主题 + 自定义蓝色配色方案（待添加）
- Default UI 主题 + Default 配色方案

## 向后兼容性

- ✅ 完全向后兼容
- ✅ 旧用户默认使用 default 配色方案
- ✅ 现有代码无需修改
- ✅ 配色方案可以独立于 UI 主题切换

## 注意事项

1. **配色方案与 UI 主题是独立的**
   - 可以使用 purple UI 主题但选择 default 配色
   - 也可以使用 default UI 主题但选择 purple 配色

2. **部分按钮可以禁用配色**
   - 使用 `disableThemeStyle={true}` 属性
   - 适用于需要保持原始样式的按钮（如快速打点、AI 补记）

3. **配色方案实时生效**
   - 切换配色后立即应用到所有按钮
   - 无需刷新页面

## 未来规划

1. 添加更多配色方案（蓝色、绿色、琥珀色等）
2. 支持自定义配色方案
3. 配色方案预设组合推荐
4. 配色方案导入导出功能
