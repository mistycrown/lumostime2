# 画廊导出手机端支持

## 问题分析

检查了现有的手机导出逻辑，发现：

### 1. 分享卡片 (ShareView.tsx) ✅
- **导出库**: `html-to-image` 的 `toPng`
- **平台检测**: `Capacitor.isNativePlatform()`
- **手机端逻辑**: 
  - 使用 `Filesystem.writeFile` API
  - 保存路径: `Pictures/LumosTime/`
  - 目录: `Directory.ExternalStorage`
  - 自动创建目录: `recursive: true`
- **桌面端逻辑**: 
  - 创建 `<a>` 标签触发下载
- **特性**:
  - 图片加载等待
  - 重试机制（skipFonts）
  - Base64 转换

### 2. 环形图统计 (StatsView.tsx) ✅
- 通过 ChronoPrint 视图导出
- ChronoPrint 内部也使用相同的手机端适配逻辑

### 3. 画廊导出 (GalleryExportView.tsx) ❌ → ✅
**问题**: 只实现了桌面端下载，缺少手机端适配

## 修复方案

### 修改内容

1. **添加 Capacitor 导入**
```typescript
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
```

2. **实现平台检测和分支逻辑**
```typescript
const isNative = Capacitor.isNativePlatform();

if (isNative) {
    // 手机端：保存到相册
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const filename = `Gallery_${currentPeriod}_${format(currentDate, 'yyyy-MM-dd')}_${Date.now()}.png`;
    
    await Filesystem.writeFile({
        path: `Pictures/LumosTime/${filename}`,
        data: base64Data,
        directory: Directory.ExternalStorage,
        recursive: true
    });
    
    onToast('success', '图片已保存到相册');
} else {
    // 桌面端：直接下载
    const link = document.createElement('a');
    link.download = `gallery-${currentPeriod}-${format(currentDate, 'yyyy-MM-dd')}.png`;
    link.href = dataUrl;
    link.click();
    
    onToast('success', '图片已下载');
}
```

3. **移除未使用的 Category 导入**
```typescript
// 修改前
import { Log, Category, DailyReview } from '../types';

// 修改后
import { Log, DailyReview } from '../types';
```

## 导出逻辑对比

| 功能 | 分享卡片 | 环形图统计 | 画廊导出 |
|------|---------|-----------|---------|
| 导出库 | html-to-image | html-to-image | html-to-image |
| 平台检测 | ✅ | ✅ | ✅ (已修复) |
| 手机端保存 | ✅ | ✅ | ✅ (已修复) |
| 桌面端下载 | ✅ | ✅ | ✅ |
| 图片等待 | ✅ | ✅ | ✅ |
| 重试机制 | ✅ | ✅ | ✅ |
| Blob转换 | ✅ | N/A | ✅ |

## 手机端导出流程

1. **图片预处理**
   - 将 blob URL 转换为 base64 data URL
   - 等待所有图片加载完成
   - 额外延迟确保渲染完成

2. **导出图片**
   - 使用 `html-to-image.toPng()` 生成 PNG
   - 第一次失败后使用 `skipFonts` 重试

3. **平台分支**
   - 检测 `Capacitor.isNativePlatform()`
   - 手机端: 提取 base64 数据 → 使用 Filesystem API 保存
   - 桌面端: 创建下载链接 → 触发下载

4. **用户反馈**
   - 成功: Toast 提示 "图片已保存到相册" / "图片已下载"
   - 失败: Toast 提示错误信息

## 文件路径

- **手机端保存路径**: `Pictures/LumosTime/Gallery_[period]_[date]_[timestamp].png`
- **桌面端文件名**: `gallery-[period]-[date].png`

## 测试建议

1. **Android 测试**
   - 检查存储权限
   - 验证文件保存到 Pictures/LumosTime 目录
   - 确认相册中可见

2. **iOS 测试**
   - 检查照片库权限
   - 验证文件保存成功
   - 确认照片应用中可见

3. **桌面端测试**
   - 验证下载功能正常
   - 检查文件名格式正确

4. **边界情况**
   - 无存储权限时的错误处理
   - 网络图片加载失败
   - 导出超大图片（年视图）

## 修改文件

- `src/components/GalleryExportView.tsx`

## 状态

✅ 已完成 - 画廊导出功能现已支持手机端保存到相册
