# 画廊导出 Toast 提示修复

## 问题描述

用户反馈：手机端保存画廊导出图片后，没有弹出 Toast 提示导出成功。

## 问题分析

经过代码审查，发现了两个问题：

### 1. TimelineView 未传递 onToast

**问题位置**: `src/views/TimelineView.tsx`

```typescript
// 修复前
<GalleryView
    logs={logs}
    categories={categories}
    onClose={() => setShowGalleryView(false)}
    onEditLog={onEditLog}
    refreshKey={refreshKey}
    // ❌ 缺少 onToast 和 dailyReviews
/>
```

TimelineView 调用 GalleryView 时没有传递 `onToast` prop，导致 GalleryExportView 收到的 `onToast` 为 `undefined`。

### 2. 缺少 Fallback 机制

**问题位置**: `src/components/GalleryExportView.tsx`

```typescript
// 修复前
if (onToast) {
    onToast('success', '图片已保存到相册');
}
// ❌ 如果 onToast 不存在，用户没有任何反馈
```

虽然代码检查了 `onToast` 是否存在，但如果不存在，用户完全没有反馈，不知道保存是否成功。

## 解决方案

### 修复 1: 传递 onToast 和 dailyReviews

**文件**: `src/views/TimelineView.tsx`

```typescript
// 修复后
<GalleryView
    logs={logs}
    categories={categories}
    dailyReviews={dailyReview ? [dailyReview] : []}  // ✅ 添加
    onClose={() => setShowGalleryView(false)}
    onEditLog={onEditLog}
    refreshKey={refreshKey}
    onToast={onToast}  // ✅ 添加
/>
```

**说明**:
- 传递 `onToast` 确保 Toast 提示能正常工作
- 传递 `dailyReviews` 确保画廊导出功能能访问每日回顾数据（用于提取文字内容）

### 修复 2: 添加 Fallback Alert

**文件**: `src/components/GalleryExportView.tsx`

```typescript
// 修复后 - 成功时
if (onToast) {
    onToast('success', '图片已保存到相册');
} else {
    alert('图片已保存到相册');  // ✅ Fallback
}

// 修复后 - 失败时
if (onToast) {
    onToast('error', '保存失败：' + (err.message || '请检查存储权限'));
} else {
    alert('保存图片失败：' + (err.message || '请检查存储权限'));  // ✅ Fallback
}

throw err; // ✅ 重新抛出错误，让外部 catch 也能处理
```

**说明**:
- 添加 `alert` 作为 fallback，确保即使 `onToast` 不存在，用户也能得到反馈
- 在内部 catch 中重新抛出错误，确保错误能被外部 catch 捕获
- 与 ShareView.tsx 的实现保持一致

## 对比其他导出功能

| 功能 | onToast 传递 | Fallback Alert | 错误重抛 |
|------|-------------|---------------|---------|
| 分享卡片 (ShareView) | ✅ | ✅ | ❌ |
| 画廊导出 (修复前) | ❌ | ❌ | ❌ |
| 画廊导出 (修复后) | ✅ | ✅ | ✅ |

## 测试场景

### 1. 正常流程测试
1. 打开画廊视图
2. 点击分享按钮进入导出视图
3. 选择主题、布局、时间段
4. 点击导出按钮
5. **预期**: 显示 Toast "图片已保存到相册"

### 2. 权限拒绝测试
1. 拒绝存储权限
2. 尝试导出
3. **预期**: 显示 Toast "保存失败：请检查存储权限"

### 3. Fallback 测试
1. 在没有 Toast 系统的环境中测试
2. 导出成功
3. **预期**: 显示 alert "图片已保存到相册"

### 4. 桌面端测试
1. 在桌面浏览器中测试
2. 导出成功
3. **预期**: 显示 Toast "图片已下载"

## 修改文件

1. `src/views/TimelineView.tsx` - 传递 onToast 和 dailyReviews
2. `src/components/GalleryExportView.tsx` - 添加 fallback alert 和错误重抛

## 相关问题

这个问题也暴露了一个潜在的架构问题：

**问题**: `onToast` 是可选的 (`onToast?`)，但很多功能依赖它来提供用户反馈。

**建议**: 
- 考虑将 `onToast` 改为必需参数
- 或者在所有使用 `onToast` 的地方都添加 fallback alert
- 或者创建一个全局的 Toast context，避免 prop drilling

## 状态

✅ 已完成 - 画廊导出现在能正确显示 Toast 提示
