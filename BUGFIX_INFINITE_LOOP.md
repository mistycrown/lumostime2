# Bug 修复：无限循环错误

## 问题描述
当打开带有图片的时间记录时，控制台会持续显示以下错误：
```
useImageManager.ts:31 Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

## 根本原因

### 1. useImageManager.ts 中的循环依赖
**位置**: `src/hooks/useImageManager.ts` 第 73 行

**问题代码**:
```typescript
useEffect(() => {
  // ... 加载图片逻辑
  if (changed) {
    setImageUrls(prev => ({ ...prev, ...newUrls }));
  }
}, [images, imageUrls]); // ❌ imageUrls 在依赖数组中，但在 effect 内部被更新
```

**问题分析**:
- `useEffect` 依赖于 `imageUrls`
- effect 内部会更新 `imageUrls`
- 更新 `imageUrls` 触发 effect 再次执行
- 形成无限循环

### 2. AddLogModal.tsx 中的潜在循环
**位置**: `src/components/AddLogModal.tsx` 第 103-107 行

**问题代码**:
```typescript
useEffect(() => {
  if (imageManager.images !== formState.images) {
    updateField('images', imageManager.images);
  }
}, [imageManager.images, formState.images, updateField]); // ❌ 依赖过多
```

**问题分析**:
- `updateField` 每次渲染都创建新的引用
- `formState.images` 被更新后触发 effect
- 可能导致循环更新

## 解决方案

### 1. 修复 useImageManager.ts
**修改**: 移除 `imageUrls` 从依赖数组

```typescript
useEffect(() => {
  const loadUrls = async () => {
    const newUrls: Record<string, string> = {};
    const missingImgs: string[] = [];
    let changed = false;

    for (const img of images) {
      // 跳过已加载的图片
      if (imageUrls[img]) continue; // ✅ 使用闭包中的 imageUrls

      const url = await imageService.getImageUrl(img);
      if (!url) {
        missingImgs.push(img);
      } else {
        newUrls[img] = url;
        changed = true;
      }
    }

    // 只在组件仍然挂载时更新状态
    if (!isMountedRef.current) return;

    // 自动移除缺失的图片
    if (missingImgs.length > 0) {
      console.log('Auto-removing missing images:', missingImgs);
      setImages(prev => prev.filter(i => !missingImgs.includes(i)));
    }

    if (changed) {
      setImageUrls(prev => ({ ...prev, ...newUrls }));
    }
  };

  if (images.length > 0) {
    loadUrls();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [images]); // ✅ 只依赖 images
```

**原理**:
- 只在 `images` 数组变化时触发 effect
- 使用闭包访问当前的 `imageUrls`，检查是否已加载
- 避免了循环依赖

### 2. 修复 AddLogModal.tsx
**修改**: 简化依赖数组

```typescript
useEffect(() => {
  if (imageManager.images !== formState.images) {
    updateField('images', imageManager.images);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [imageManager.images]); // ✅ 只依赖 imageManager.images
```

**原理**:
- 只在 `imageManager.images` 变化时触发
- 避免了 `updateField` 和 `formState.images` 的循环依赖

### 3. 优化 useLogForm.ts
**修改**: 使用 `useCallback` 稳定函数引用

```typescript
import { useState, useEffect, useMemo, useCallback } from 'react';

// ...

// 更新单个字段 - 使用 useCallback 保持引用稳定
const updateField = useCallback(<K extends keyof LogFormState>(field: K, value: LogFormState[K]) => {
  setFormState(prev => ({ ...prev, [field]: value }));
}, []); // ✅ 空依赖数组，函数引用永远不变

// 批量更新字段 - 使用 useCallback 保持引用稳定
const updateFields = useCallback((updates: Partial<LogFormState>) => {
  setFormState(prev => ({ ...prev, ...updates }));
}, []); // ✅ 空依赖数组，函数引用永远不变
```

**原理**:
- `useCallback` 确保函数引用在组件生命周期内保持不变
- 避免了因函数引用变化导致的不必要的 effect 触发

## 修改文件清单

```
src/hooks/useImageManager.ts      - 修复主要的无限循环问题
src/components/AddLogModal.tsx    - 简化依赖数组
src/hooks/useLogForm.ts           - 使用 useCallback 优化
```

## 测试结果

✅ 编译通过，无语法错误
✅ 构建成功
✅ 打开带图片的记录不再出现无限循环错误
✅ 图片正常加载和显示

## 最佳实践总结

### useEffect 依赖数组的原则

1. **最小化依赖**: 只包含真正需要的依赖
2. **避免循环**: 不要依赖在 effect 内部更新的状态
3. **使用闭包**: 可以通过闭包访问最新值，而不必添加到依赖数组
4. **稳定引用**: 使用 `useCallback` 和 `useMemo` 保持引用稳定

### 常见的无限循环模式

❌ **错误模式 1**: 依赖在 effect 内部更新的状态
```typescript
useEffect(() => {
  setState(newValue);
}, [state]); // 循环！
```

❌ **错误模式 2**: 依赖每次渲染都变化的对象/函数
```typescript
const obj = { key: value };
useEffect(() => {
  // ...
}, [obj]); // 循环！obj 每次都是新对象
```

✅ **正确模式 1**: 只依赖原始值
```typescript
useEffect(() => {
  setState(newValue);
}, [primitiveValue]); // ✅
```

✅ **正确模式 2**: 使用 useCallback/useMemo
```typescript
const obj = useMemo(() => ({ key: value }), [value]);
useEffect(() => {
  // ...
}, [obj]); // ✅ obj 引用稳定
```

## 结论

通过正确管理 `useEffect` 的依赖数组和使用 `useCallback` 优化函数引用，成功解决了无限循环问题。这个修复不仅解决了当前的 bug，还提高了整体代码质量和性能。
