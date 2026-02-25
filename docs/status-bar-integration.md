# 状态栏透明融合功能

## 功能说明

应用现在支持透明状态栏，让背景图片完全延伸到状态栏区域，实现无缝融合的视觉效果。

## 工作原理

1. **透明背景**：状态栏背景设置为完全透明
2. **背景延伸**：背景图片延伸到状态栏区域
3. **亮度分析**：自动分析背景图片顶部区域的亮度
4. **图标调整**：
   - 深色背景（亮度 < 0.5）→ 白色图标
   - 浅色背景（亮度 ≥ 0.5）→ 黑色图标

## 技术实现

### 核心 API

#### `StatusBar.setOverlaysWebView({ overlay: true })`
设置状态栏为透明，让 WebView 内容延伸到状态栏区域。

#### `StatusBar.setStyle({ style: Style.Light | Style.Dark })`
设置状态栏图标颜色：
- `Style.Light`：深色图标（黑色）
- `Style.Dark`：浅色图标（白色）

### 服务架构

#### `statusBarService.ts`
负责管理状态栏：
- 初始化时设置透明背景
- 分析背景图片顶部区域的亮度
- 根据亮度自动选择图标颜色
- 提供重置和查询方法

#### `backgroundService.ts`
在原有背景管理功能基础上：
- 集成状态栏服务
- 在切换背景时自动更新状态栏
- 在调整透明度时同步更新状态栏

#### `ImmersiveTimer.tsx`
沉浸式计时器的特殊处理：
- 进入时：设置不透明状态栏，使用主题颜色
- 退出时：恢复透明状态栏，根据背景调整图标

### 图片分析算法

```typescript
// 1. 只分析图片顶部区域（状态栏位置）
const sampleHeight = Math.min(100, img.height);

// 2. 采样像素（每隔10个像素）
for (let i = 0; i < data.length; i += 40) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
}

// 3. 计算感知亮度
const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// 4. 判断深浅
const isDark = brightness < 0.5;
```

### 使用方式

功能已自动集成，无需额外配置。

### 调试

```javascript
// 查看当前图标样式
statusBarService.getCurrentStyle()

// 手动测试特定背景
statusBarService.updateForBackground('/background/red.webp')

// 重置为透明 + 深色图标
statusBarService.reset()
```

## 兼容性

- ✅ Android：完全支持透明状态栏
- ✅ iOS：完全支持透明状态栏
- ⚠️ Web：自动跳过，不影响功能

## 注意事项

1. 状态栏分析只针对图片顶部区域，确保与实际显示位置匹配
2. 使用采样算法提高性能，避免分析每个像素
3. 如果图片加载失败，会自动回退到默认样式（透明 + 深色图标）
4. 沉浸式计时器有独立的状态栏管理，不受背景服务影响

## 视觉对比

### 之前（不透明状态栏）
- 状态栏有固定的白色或黑色背景
- 与彩色背景图片产生明显割裂
- 视觉上不够统一

### 现在（透明状态栏）
- 状态栏完全透明
- 背景图片延伸到顶部
- 完美融合，无割裂感
