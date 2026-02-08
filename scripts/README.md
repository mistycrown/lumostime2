# 图片优化脚本使用说明

## optimize-images.js

自动优化 PNG 图片为 WebP 格式，减小安装包体积。

### 功能

1. **自动备份**：将原始 PNG 文件备份到 `static/png_backup` 目录
2. **格式转换**：将 PNG 转换为 WebP 格式（质量 85%）
3. **自动清理**：删除原始 PNG 文件，只保留 WebP

### 使用方法

```bash
npm run optimize-images
```

### 处理的目录

- `public/background` - 背景图片
- `public/dchh` - 导航栏装饰
- `public/time_pal_origin` - 时光小友图片
- `public/icon_style` - 应用图标样式

### 优化效果

- **压缩率**：通常可达 85-95%
- **质量**：视觉上几乎无损
- **示例**：5.44 MB PNG → 0.37 MB WebP（减少 93.2%）

### 工作流程

当你添加新的 PNG 图片到上述目录后：

1. 运行 `npm run optimize-images`
2. 脚本会自动：
   - 备份 PNG 到 `static/png_backup`
   - 转换为 WebP 格式
   - 删除原始 PNG 文件
3. 如果 WebP 已存在，会自动跳过

### 恢复原始文件

如果需要恢复 PNG 文件：

```bash
# 从备份目录复制回来
cp static/png_backup/public/background/xxx.png public/background/
```

### 注意事项

- ✅ 自动跳过已转换的文件
- ✅ 备份文件不会被 Git 追踪（已添加到 .gitignore）
- ✅ 备份文件不会被打包到安装包中
- ⚠️ 确保代码中使用 `.webp` 扩展名引用图片

### 其他脚本

- `convert-to-webp.js` - 仅转换，不删除原文件（已废弃）
- `backup-and-clean-png.js` - 仅备份和删除（已废弃）

推荐使用 `optimize-images.js` 一键完成所有操作。


## convert-uiicon-to-webp.js

专门用于转换 `public/uiicon` 文件夹下的 UI 图标为 WebP 格式。

### 功能

- 将所有 PNG 图标转换为 WebP 格式
- 使用高质量设置（90%）确保图标清晰
- 自动删除原始 PNG 文件
- **不进行备份**（假设用户已有备份）

### 使用方法

```bash
npm run convert-uiicon
```

### 处理的目录

- `public/uiicon/cat` - 猫咪主题图标
- `public/uiicon/color` - 彩色主题图标
- `public/uiicon/color2` - 彩色主题图标 2
- `public/uiicon/forest` - 森林主题图标
- `public/uiicon/plant` - 植物主题图标
- `public/uiicon/prince` - 小王子主题图标
- `public/uiicon/purple` - 紫色主题图标

### 注意事项

- ⚠️ **此脚本不会备份原文件**，请确保已有备份！
- ⚠️ 转换后原始 PNG 文件会被永久删除
- ✅ 使用 90% 质量确保 UI 图标清晰度
- ✅ 自动递归处理所有子文件夹

### 使用场景

当你在 `public/uiicon` 文件夹下添加新的 UI 图标主题时：

1. 确保已备份原始 PNG 文件
2. 运行 `npm run convert-uiicon`
3. 脚本会自动转换所有 PNG 为 WebP 并删除原文件
4. 更新 `src/services/uiIconService.ts` 添加新主题配置
