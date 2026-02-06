# 图片格式降级方案说明

## 概述

为了方便开发调试，我们实现了 PNG → WebP 的图片格式降级机制。在开发时使用 PNG 格式，发布时转换为 WebP 格式以节省空间。

## 实现范围

### 1. 时间小友图片
- **路径**: `/public/time_pal_origin/{type}/{level}.png`
- **降级**: 自动尝试 `.webp` 格式
- **最终降级**: 显示 emoji 占位符

### 2. 背景图片
- **路径**: `/public/background/*.png`
- **降级**: 自动尝试 `.webp` 格式
- **最终降级**: 显示"加载失败"提示

### 3. 导航栏装饰图片
- **路径**: `/public/dchh/*.png`
- **降级**: 自动尝试 `.webp` 格式
- **最终降级**: 隐藏装饰图片

## 工作流程

### 开发阶段
1. 将图片以 PNG 格式放置在对应目录
2. 应用会优先加载 PNG 格式
3. 方便调试和快速迭代

### 发布阶段
1. 运行转换脚本将 PNG 转为 WebP
2. 删除 PNG 文件
3. 应用自动降级到 WebP 格式
4. 节省存储空间和带宽

## 技术实现

### 服务层
- `src/services/backgroundService.ts` - 导出 `getBackgroundFallbackUrl()`
- `src/services/navigationDecorationService.ts` - 导出 `getNavigationDecorationFallbackUrl()`
- `src/constants/timePalConfig.ts` - 导出 `getTimePalImagePathFallback()`

### 组件层
所有相关组件都实现了三级降级逻辑：
1. 尝试加载 PNG 格式
2. PNG 失败后尝试 WebP 格式
3. WebP 失败后显示降级内容

### 修改的文件
- ✅ `src/constants/timePalConfig.ts`
- ✅ `src/components/TimePalCard.tsx`
- ✅ `src/views/TimePalSettingsView.tsx`
- ✅ `src/services/backgroundService.ts`
- ✅ `src/services/navigationDecorationService.ts`
- ✅ `src/components/BackgroundSelector.tsx`
- ✅ `src/components/NavigationDecorationSelector.tsx`
- ✅ `src/components/BottomNavigation.tsx`

## 使用示例

### 开发时
```bash
# 1. 添加新的时间小友图片
public/time_pal_origin/cat/1.png
public/time_pal_origin/cat/2.png
...

# 2. 添加新的背景图片
public/background/new_bg.png

# 3. 添加新的导航装饰
public/dchh/new_decoration.png
```

### 发布时
```bash
# 运行转换脚本（需要创建）
npm run convert-images

# 或手动转换
# 1. 使用 scripts/convert-to-webp.js
# 2. 删除 PNG 文件
# 3. 应用自动使用 WebP
```

## 注意事项

1. **自定义背景图片**：用户上传的自定义背景不会被转换，保持原格式
2. **向后兼容**：即使只有 WebP 格式，应用也能正常工作
3. **性能影响**：降级检测只在图片加载失败时触发，不影响正常性能
4. **错误处理**：所有降级都有最终的占位符，确保不会出现空白

## 优势

- ✅ 开发时使用 PNG，方便调试
- ✅ 发布时使用 WebP，节省空间（通常减少 25-35%）
- ✅ 自动降级，无需手动干预
- ✅ 向后兼容，支持混合格式
- ✅ 用户体验无感知

## 相关脚本

可以使用现有的转换脚本：
- `scripts/convert-to-webp.js` - 批量转换图片为 WebP
- `scripts/backup-and-clean-png.js` - 备份并清理 PNG 文件
