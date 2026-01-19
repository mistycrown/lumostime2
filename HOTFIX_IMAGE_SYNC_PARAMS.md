# 紧急修复：handleImageSync 参数缺失

## 🐛 问题

电脑端报错：
```
TypeError: Cannot read properties of undefined (reading 'length')
at handleImageSync (App.tsx:1959:42)
```

## 🔍 原因

在图片上传和删除的事件监听器中，调用 `handleImageSync()` 时**没有传递必需的参数**：

```typescript
// ❌ 错误：缺少参数
await handleImageSync();

// ✅ 正确：传递图片列表
await handleImageSync(imageList);
```

## ✅ 修复

### 修改位置：App.tsx

**图片删除事件监听器**:
```typescript
const handleImageDeleted = async (event: CustomEvent) => {
  // ...
  setTimeout(async () => {
    try {
      const imageList = imageService.getReferencedImagesList(); // 添加
      await handleImageSync(imageList); // 传递参数
      console.log('[App] 图片删除同步完成');
    } catch (error) {
      console.error('[App] 图片删除同步失败:', error);
    }
  }, 1000);
};
```

**图片上传事件监听器**:
```typescript
const handleImageUploaded = async (event: CustomEvent) => {
  // ...
  setTimeout(async () => {
    try {
      const imageList = imageService.getReferencedImagesList(); // 添加
      await handleImageSync(imageList); // 传递参数
      console.log('[App] 图片上传同步完成');
    } catch (error) {
      console.error('[App] 图片上传同步失败:', error);
    }
  }, 2000);
};
```

## 🧪 测试

修复后请测试：
1. ✅ 电脑端上传图片
2. ✅ 电脑端删除图片
3. ✅ 查看console，不应该再有错误

## 📝 说明

`handleImageSync` 函数需要一个图片列表参数：
```typescript
const handleImageSync = async (imageList: string[]) => {
  console.log(`[App] 图片列表: ${imageList.length} 个`); // 这里需要 imageList.length
  // ...
}
```

如果不传递参数，`imageList` 就是 `undefined`，导致 `imageList.length` 报错。

现在已修复，所有调用都会传递正确的参数！
