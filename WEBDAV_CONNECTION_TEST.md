# WebDAV 连接测试改进

## 问题

之前使用 PROPFIND 方法测试连接，但在某些 WebDAV 服务器上不可靠，即使密码正确也可能返回失败。

## 解决方案

使用**实际上传和删除测试文件**的方法来验证连接。

## 实现逻辑

### 测试流程

1. **生成唯一测试文件名**
   ```typescript
   const testFileName = '.webdav_test_' + Date.now() + '.txt';
   ```
   - 使用 `.` 开头（隐藏文件）
   - 添加时间戳避免冲突

2. **上传小测试文件**
   ```typescript
   const testContent = 'WebDAV connection test';
   const encoder = new TextEncoder();
   const testData = encoder.encode(testContent);
   
   HTTP.setDataSerializer('raw');
   
   const uploadResponse = await HTTP.sendRequest(testUrl, {
       method: 'put',
       data: testData.buffer,
       headers: {
           'Authorization': `Basic ${auth}`,
           'Content-Type': 'text/plain'
       },
       timeout: 10000
   });
   ```

3. **检查上传结果**
   - 200/201/204 = 成功，认证正确
   - 401 = 认证失败，用户名或密码错误
   - 其他错误 = 网络或服务器问题

4. **删除测试文件**
   ```typescript
   if (uploadResponse.status === 200 || uploadResponse.status === 201 || uploadResponse.status === 204) {
       try {
           await HTTP.sendRequest(testUrl, {
               method: 'delete',
               headers: {
                   'Authorization': `Basic ${auth}`
               },
               timeout: 5000
           });
       } catch (deleteErr) {
           // 删除失败不影响测试结果
       }
       return true;
   }
   ```

## 优势

### 1. 真实性
- 执行实际的上传操作
- 和真实使用场景完全一致
- 如果测试通过，实际上传也一定能成功

### 2. 准确性
- 直接测试认证是否有效
- 401 错误明确表示认证失败
- 不依赖服务器对特定 WebDAV 方法的支持

### 3. 兼容性
- PUT 和 DELETE 是基本的 HTTP 方法
- 所有 WebDAV 服务器都支持
- 不依赖 PROPFIND、OPTIONS 等可能不一致的方法

### 4. 清洁性
- 自动清理测试文件
- 使用隐藏文件名（`.` 开头）
- 即使删除失败，文件也很小且不影响使用

## 与其他方法的对比

### ❌ OPTIONS 方法
```typescript
// 问题：很多服务器不验证认证
const response = await HTTP.sendRequest(url, {
    method: 'options',
    headers: { 'Authorization': `Basic ${auth}` }
});
```
- 可能即使密码错误也返回 200
- 主要用于 CORS 预检，不是认证测试

### ❌ PROPFIND 方法
```typescript
// 问题：某些服务器实现不一致
const response = await HTTP.sendRequest(url, {
    method: 'propfind',
    data: '<?xml version="1.0"?>...',
    headers: { 'Authorization': `Basic ${auth}` }
});
```
- 需要正确的 XML 格式
- 某些服务器可能返回意外的状态码
- 实现因服务器而异

### ✅ PUT + DELETE 方法（当前方案）
```typescript
// 优势：真实、准确、兼容
// 1. 上传测试文件
const uploadResponse = await HTTP.sendRequest(testUrl, {
    method: 'put',
    data: testData.buffer,
    headers: { 'Authorization': `Basic ${auth}` }
});

// 2. 删除测试文件
await HTTP.sendRequest(testUrl, {
    method: 'delete',
    headers: { 'Authorization': `Basic ${auth}` }
});
```
- 真实测试上传功能
- 准确验证认证
- 所有服务器都支持

## 错误处理

### 认证错误（401）
```typescript
if (nativeErr?.status === 401) {
    console.error('[WebDAV] Authentication failed - wrong username or password');
}
```
- 明确表示用户名或密码错误
- UI 显示："认证失败：用户名或密码错误"

### 网络错误
```typescript
catch (nativeErr: any) {
    console.error('[WebDAV] Connection test failed:', nativeErr);
    return false;
}
```
- 可能是网络问题
- 可能是 URL 错误
- UI 显示："连接失败：请检查 URL 和网络连接"

### 删除失败
```typescript
catch (deleteErr) {
    console.warn('[WebDAV] Failed to delete test file (not critical):', deleteErr);
}
```
- 不影响测试结果
- 测试文件很小，不影响使用
- 只记录警告日志

## 测试文件规格

- **文件名格式**：`.webdav_test_[timestamp].txt`
- **文件大小**：约 23 字节
- **文件内容**：`"WebDAV connection test"`
- **文件类型**：`text/plain`
- **生命周期**：创建后立即删除

## 用户体验

### 测试成功
1. 用户点击"Save & Connect"
2. 显示"Connecting..."
3. 上传测试文件成功
4. 删除测试文件
5. 显示"WebDAV 连接成功"
6. 进入已连接状态

### 测试失败（认证错误）
1. 用户点击"Save & Connect"
2. 显示"Connecting..."
3. 上传测试文件失败（401）
4. 显示"认证失败：用户名或密码错误"
5. 保持在配置界面，用户可以修改密码

### 测试失败（其他错误）
1. 用户点击"Save & Connect"
2. 显示"Connecting..."
3. 上传测试文件失败（网络/URL 错误）
4. 显示"连接失败：请检查 URL 和网络连接"
5. 保持在配置界面

## 总结

通过实际上传和删除测试文件的方法：
- ✅ 真实测试上传功能
- ✅ 准确验证认证信息
- ✅ 兼容所有 WebDAV 服务器
- ✅ 自动清理测试文件
- ✅ 提供明确的错误信息

这是最可靠的 WebDAV 连接测试方法。
