# WebDAV Android 401 错误 - 最终修复方案

## 问题

手机端 WebDAV 上传失败，返回 401 Unauthorized 错误。

## 尝试过的方案

1. ❌ 移除 `serializer: 'raw'` 参数 - 失败
2. ❌ 使用 `HTTP.useBasicAuth()` - 失败（可能不持久化）
3. ✅ 使用 `HTTP.getBasicAuthHeader()` - 成功

## 最终解决方案

使用 Cordova HTTP 插件的 `getBasicAuthHeader()` 方法为每个请求生成 Authorization header。

### 关键代码

```typescript
// 在每个请求中
const authHeader = await HTTP.getBasicAuthHeader(this.config.username, this.config.password);

const response = await HTTP.sendRequest(url, {
    method: 'put',
    data: uint8Data.buffer,
    headers: {
        ...authHeader,  // 展开 auth header 对象
        'Content-Type': 'application/json; charset=utf-8'
    },
    timeout: 30000
});
```

### getBasicAuthHeader() 的优势

1. **官方方法**：插件提供的标准方法
2. **返回对象**：返回 `{'Authorization': 'Basic xxx'}` 格式的对象
3. **可靠性高**：不依赖全局状态，每次请求都生成新的 header
4. **易于调试**：可以打印 authHeader 查看是否生成成功

## 修改的方法

在 `src/services/webdavService.ts` 中修改了以下方法：

1. ✅ `uploadData` - 上传主数据文件
2. ✅ `downloadData` - 下载数据
3. ✅ `uploadImage` - 上传图片
4. ✅ `uploadImageList` - 上传图片列表
5. ✅ `downloadImageList` - 下载图片列表
6. ✅ `checkConnection` - 连接测试
7. ✅ `createDirectory` - 创建目录

## 为什么 useBasicAuth() 不工作？

`HTTP.useBasicAuth()` 设置全局认证，但可能存在以下问题：

1. **状态不持久**：应用重启后可能丢失
2. **时机问题**：可能在请求发送前没有正确设置
3. **平台差异**：Android 和 iOS 的实现可能不同

相比之下，`getBasicAuthHeader()` 为每个请求生成 header，更可靠。

## 测试步骤

```bash
npm run build
npx cap sync android
npx cap open android
```

## 预期日志

成功时应该看到：

```
[WebDAV] Mobile Upload Data: lumostime_backup.json, size: XXXX
[WebDAV] Upload URL: https://...
[WebDAV] Data size: XXXX bytes, type: Uint8Array
[WebDAV] Auth header generated: Yes
[WebDAV] Upload Success: status 201
```

## 如果还是失败

1. 检查用户名和密码是否正确
2. 检查 WebDAV URL 是否正确
3. 在浏览器中测试 WebDAV 连接
4. 查看完整的错误日志

## 修复时间

2026-02-23（第三次尝试）

## 关键教训

1. 不要依赖全局状态（useBasicAuth）
2. 每个请求独立生成认证信息更可靠
3. 使用插件提供的辅助方法（getBasicAuthHeader）
4. 可以添加日志验证 header 是否生成
