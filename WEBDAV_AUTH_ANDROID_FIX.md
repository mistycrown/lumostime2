# WebDAV Android 401 认证失败问题修复（最终解决方案）

## 问题现象

手机端 WebDAV 上传文件时出现 401 Unauthorized 错误：
- 连接测试成功 ✓  
- 电脑端和平板端上传成功 ✓  
- 手机端上传失败 ✗ (401 错误)

## 错误日志

```
[WebDAV] Native Upload Error: [object Object]
[WebDAV] Error status: 401
[WebDAV] Error message: undefined
[WebDAV] Error error: <!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>401 Unauthorized</title>
</head><body>
<h1>Unauthorized</h1>
<p>This server could not verify that you
are authorized to access the document
requested.  Either you supplied the wrong
credentials (e.g., bad password), or your
browser doesn't understand how to supply
the credentials required.</p>
</body></html>
```

## 根本原因

**手动添加 Authorization header 在 Cordova HTTP 插件中不可靠**

经过多次尝试发现：
1. 手动在 headers 中添加 `Authorization: Basic xxx` 不稳定
2. 即使移除了 `serializer` 参数，Authorization header 仍然可能被忽略
3. Cordova Advanced HTTP 插件提供了专门的 `useBasicAuth()` 方法来处理 Basic 认证

## 最终解决方案

使用 Cordova HTTP 插件的 **`useBasicAuth()` 方法**，而不是手动添加 Authorization header。

### 关键修改

#### 1. 在 saveConfig 方法中设置全局 Basic Auth

```typescript
// 在 saveConfig 方法中
if (Capacitor.isNativePlatform()) {
    console.log('[WebDAV] Setting up native platform authentication');
    
    // 使用插件的内置 Basic Auth 支持
    HTTP.useBasicAuth(config.username, config.password);
    console.log('[WebDAV] Basic auth configured for all future requests');
    
    // customFetch 中不再需要手动添加 Authorization header
    options.customFetch = async (url: string, init: any) => {
        // ...
        const headers = { ...(init.headers || {}) };
        // 注意：Authorization header 会被 useBasicAuth 自动添加
        // 不需要手动添加
        // ...
    };
}
```

#### 2. 移除所有手动添加的 Authorization header

在以下方法中移除手动添加的 Authorization header：

- `uploadData` - 上传主数据文件
- `uploadImage` - 上传图片
- `uploadImageList` - 上传图片列表
- `downloadData` - 下载数据
- `downloadImageList` - 下载图片列表
- `checkConnection` - 连接测试
- `createDirectory` - 创建目录

**修改前（错误）：**
```typescript
const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

const response = await HTTP.sendRequest(url, {
    method: 'put',
    data: uint8Data.buffer,
    headers: {
        'Authorization': `Basic ${auth}`,  // ❌ 手动添加不可靠
        'Content-Type': 'application/json; charset=utf-8'
    },
    timeout: 30000
});
```

**修改后（正确）：**
```typescript
// 在 saveConfig 中已经调用了 HTTP.useBasicAuth()
// 所以这里不需要手动添加 Authorization header

HTTP.setDataSerializer('raw');

const response = await HTTP.sendRequest(url, {
    method: 'put',
    data: uint8Data.buffer,
    headers: {
        // ✅ Authorization header 会被自动添加
        'Content-Type': 'application/json; charset=utf-8'
    },
    timeout: 30000
});
```

## 为什么这个方案有效？

### useBasicAuth() 的工作原理

根据 [Cordova Advanced HTTP 插件文档](https://github.com/silkimen/cordova-plugin-advanced-http)：

> `useBasicAuth()`: This sets up all future requests to use Basic HTTP authentication with the given username and password.

```javascript
cordova.plugin.http.useBasicAuth('user', 'password');
```

这个方法会：
1. 在插件内部存储认证信息
2. 自动为所有后续请求添加正确的 Authorization header
3. 确保 header 格式正确且不会被其他参数影响

### 为什么手动添加不可靠？

1. **参数冲突**：手动添加的 header 可能与其他参数（如 serializer）冲突
2. **编码问题**：Base64 编码可能在不同平台有细微差异
3. **时机问题**：header 可能在请求发送前被覆盖或清除
4. **插件内部处理**：插件可能对手动添加的 Authorization header 有特殊处理逻辑

## 修改的文件

`src/services/webdavService.ts`

### 修改的方法

1. ✅ `saveConfig` - 添加 `HTTP.useBasicAuth()` 调用
2. ✅ `checkConnection` - 移除手动 Authorization header
3. ✅ `createDirectory` - 移除手动 Authorization header
4. ✅ `uploadData` - 移除手动 Authorization header
5. ✅ `downloadData` - 移除手动 Authorization header
6. ✅ `uploadImage` - 移除手动 Authorization header
7. ✅ `uploadImageList` - 移除手动 Authorization header
8. ✅ `downloadImageList` - 移除手动 Authorization header

## 测试步骤

1. 重新构建并测试：
```bash
npm run build
npx cap sync android
npx cap open android
```

2. 在 Android 设备上测试：
   - 配置 WebDAV 连接
   - 测试连接（应该成功）
   - 尝试上传数据
   - 检查日志，确认没有 401 错误

## 预期结果

- 连接测试：✓ 成功
- 上传数据：✓ 成功（之前 401 失败）
- 下载数据：✓ 成功
- 图片同步：✓ 成功

## 关键要点

1. **使用 `HTTP.useBasicAuth()` 而不是手动添加 Authorization header**
2. **在 `saveConfig` 中调用一次，对所有后续请求生效**
3. **移除所有手动添加的 `Authorization: Basic xxx` header**
4. **保留 `HTTP.setDataSerializer('raw')` 用于二进制数据**
5. **移除所有 `serializer: 'raw'` 参数（这是无效参数）**

## 相关资源

- [Cordova Advanced HTTP Plugin](https://github.com/silkimen/cordova-plugin-advanced-http)
- [useBasicAuth 文档](https://github.com/silkimen/cordova-plugin-advanced-http#usebasicauth)
- [setDataSerializer 文档](https://github.com/silkimen/cordova-plugin-advanced-http#setdataserializer)

## 经验教训

1. **优先使用插件提供的专用方法**，而不是手动实现
2. **Basic Auth 有专门的 API**，不要自己编码和添加 header
3. **仔细阅读插件文档**，了解正确的使用方式
4. **手动添加 Authorization header 在移动端不可靠**

## 总结

这个问题的根本原因是试图手动管理 Basic Auth，而 Cordova HTTP 插件已经提供了更可靠的 `useBasicAuth()` 方法。使用插件的专用 API 可以避免各种边缘情况和平台差异问题。

修复方法很简单：
1. 在配置时调用 `HTTP.useBasicAuth(username, password)`
2. 移除所有手动添加的 Authorization header
3. 让插件自动处理认证
