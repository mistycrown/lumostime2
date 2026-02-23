# WebDAV 数据序列化问题修复

## 问题描述
手机端 WebDAV 同步时出现错误：`advanced-http: "data" option is configured to support only following data types: Uint8Array, ArrayBuffer`

## 问题根源

### 错误日志
```
[WebDAV] Native Upload Error: Error: advanced-http: "data" option is configured to support only following data types: Uint8Array, ArrayBuffer
```

### 根本原因
在 `src/services/webdavService.ts` 中，`HTTP.sendRequest()` 调用时传递了无效的 `serializer: 'raw'` 参数。

根据 [Cordova Advanced HTTP 插件文档](https://github.com/silkimen/cordova-plugin-advanced-http)，`serializer` 不是 `sendRequest()` 方法的有效参数。

正确的做法是：
1. 调用 `HTTP.setDataSerializer('raw')` 设置全局序列化器
2. 传递 `Uint8Array` 或 `ArrayBuffer` 作为 `data` 参数
3. 不要在 options 对象中包含 `serializer` 参数

## 修复方案

从所有 `HTTP.sendRequest()` 调用中移除无效的 `serializer: 'raw'` 参数：

### 修改前（错误）
```typescript
HTTP.setDataSerializer('raw');
const response = await HTTP.sendRequest(url, {
    method: 'put',
    data: uint8Data,
    headers: { ... },
    serializer: 'raw',  // ❌ 无效参数
    timeout: 30000
});
```

### 修改后（正确）
```typescript
HTTP.setDataSerializer('raw');
const response = await HTTP.sendRequest(url, {
    method: 'put',
    data: uint8Data,  // ✅ Uint8Array 配合全局 raw 序列化器
    headers: { ... },
    timeout: 30000
});
```

## 修改的位置

在 `src/services/webdavService.ts` 中修改了以下方法：

1. **uploadData** (~第 370 行) - 上传主数据文件
2. **uploadImageList** (~第 559 行) - 上传图片列表
3. **uploadImage** (~第 480 行) - 上传单个图片
4. **createDirectory** (~第 244 行) - 创建目录时的临时文件上传

## 技术细节

### Cordova HTTP 插件的序列化器

插件支持 5 种数据序列化器：

1. **urlencoded** (默认)
   - Content-Type: `application/x-www-form-urlencoded`
   - 数据必须是字典对象

2. **json**
   - Content-Type: `application/json`
   - 数据必须是数组或字典对象

3. **utf8**
   - Content-Type: `plain/text`
   - 数据必须是字符串

4. **multipart**
   - Content-Type: `multipart/form-data`
   - 数据必须是 FormData 实例

5. **raw**
   - Content-Type: `application/octet-stream`
   - 数据必须是 `Uint8Array` 或 `ArrayBuffer`

### 为什么使用 raw 序列化器

- WebDAV 需要发送原始二进制数据
- JSON 文件需要以 UTF-8 字节流形式上传
- 图片需要以原始二进制形式上传
- `raw` 序列化器不对数据进行任何转换

### 数据转换

代码中正确地将字符串转换为 Uint8Array：

```typescript
const encoder = new TextEncoder();
const uint8Data = encoder.encode(content);  // string -> Uint8Array
```

## 测试步骤

重新构建并测试：

```bash
npm run build
npx cap sync android
```

在 Android 设备上测试：
1. 配置 WebDAV 连接（测试连接应该成功）
2. 尝试手动同步上传
3. 检查控制台日志，确认没有序列化错误
4. 验证数据已成功上传到 WebDAV 服务器

## 预期结果

- 测试连接：✓ 成功
- 上传数据：✓ 成功（之前失败）
- 下载数据：✓ 成功
- 图片同步：✓ 成功

## 相关文档

- [Cordova Advanced HTTP Plugin](https://github.com/silkimen/cordova-plugin-advanced-http)
- [setDataSerializer 文档](https://github.com/silkimen/cordova-plugin-advanced-http#setdataserializer)
- [sendRequest 文档](https://github.com/silkimen/cordova-plugin-advanced-http#sendrequest)

## 经验教训

1. 仔细阅读插件文档，了解正确的 API 用法
2. `setDataSerializer()` 设置全局序列化器，不需要在每个请求中重复指定
3. `sendRequest()` 的 options 对象不接受 `serializer` 参数
4. 使用 `raw` 序列化器时，数据必须是 `Uint8Array` 或 `ArrayBuffer`
