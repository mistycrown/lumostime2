# 手机端同步跨域问题修复总结

## 问题描述
手机端（Android/iOS Capacitor 应用）无法进行 WebDAV 和 S3 同步，系统提示跨域限制错误。电脑端（Electron）正常工作。

## 问题根源

### 根本原因
在最近的两次提交中（`bc2c971` 和 `c782a42`），修改了同步逻辑，引入了 `statFile()` 优化：
- 为了提高性能，先使用 `statFile()` 快速获取文件修改时间
- 只有当时间差明显时才下载完整数据

### 为什么在手机端失败？
1. **WebDAV 的 `statFile`**：在移动端使用原生 HTTP 插件，但某些 WebDAV 服务器可能不支持或返回错误
2. **S3/COS 的 `statFile`**：使用 `headObject` 方法，在移动端遇到跨域问题
3. **错误的代理逻辑**：`webdavService.ts` 中有一段代码在非 Electron 且非开发环境下尝试使用不存在的 `/api/webdav-proxy` 代理

## 修复方案

### 1. 修改 `src/services/webdavService.ts`
移除了错误的 Web 生产环境代理逻辑：
```typescript
// 删除了这段错误的代码
else if (!isElectron && !import.meta.env.DEV) {
    options.customFetch = async (url: string, init: any) => {
        const proxyUrl = `/api/webdav-proxy?url=${encodeURIComponent(url)}`;
        // ... 尝试使用不存在的代理端点
    };
}
```

### 2. 修改 `src/hooks/useSyncManager.ts`
在移动端跳过 `statFile` 优化，直接下载完整数据：
```typescript
// 在移动端，跳过 statFile 优化，直接下载数据以避免跨域问题
if (isNative) {
    console.log(`[Sync][Step 2] 移动端环境，直接下载数据获取时间戳`);
    cloudData = await activeService.downloadData();
    cloudTimestamp = cloudData?.timestamp || 0;
} else {
    // 桌面端使用 statFile 优化
    // ...
}
```

### 3. 更新 `capacitor.config.ts`
添加了 WebDAV 服务器域名到允许列表：
```typescript
allowNavigation: [
  'https://*.myqcloud.com',           // 腾讯云 COS
  'https://*.tencentcos.cn',          // 腾讯云 COS
  'https://*.cos.ap-*.myqcloud.com',  // 腾讯云 COS 区域端点
  'https://dav.jianguoyun.com',       // 坚果云 WebDAV
  'https://*.jianguoyun.com'          // 坚果云其他服务
]
```

### 4. 增强 `src/services/s3Service.ts` 的错误日志
添加了详细的错误日志，帮助诊断问题：
```typescript
console.error(`[COS] Error details:`, {
    code: err.code,
    message: err.message,
    statusCode: err.statusCode,
    isNative: Capacitor.isNativePlatform()
});
```

## 修改的文件
1. `src/services/webdavService.ts` - 移除错误的代理逻辑
2. `src/hooks/useSyncManager.ts` - 移动端跳过 statFile 优化
3. `src/services/s3Service.ts` - 增强错误日志和移动端配置
4. `capacitor.config.ts` - 添加 WebDAV 域名到允许列表

## 测试建议
1. **重新构建应用**：
   ```bash
   npm run build
   npx cap sync
   npx cap open android
   ```

2. **测试 WebDAV 同步**：
   - 连接 WebDAV 服务器
   - 尝试上传数据
   - 尝试下载数据
   - 检查图片同步
   - 查看控制台日志

3. **测试 S3 同步**：
   - 连接腾讯云 COS
   - 尝试上传数据
   - 尝试下载数据
   - 检查图片同步
   - 查看控制台日志

## 性能影响
- **桌面端**：无影响，继续使用 `statFile` 优化
- **移动端**：每次同步都会下载完整数据，但避免了跨域问题
  - 数据文件通常较小（几百 KB），下载速度快
  - 相比无法同步，这是可接受的权衡

## 技术细节

### 为什么 Electron 没有问题？
Electron 应用在主进程中禁用了 CORS 检查，所以可以直接访问任何 URL。

### 为什么昨天还能用？
昨天的代码没有使用 `statFile` 优化，每次都直接下载完整数据，所以没有遇到跨域问题。

### 为什么 statFile 在移动端有问题？
1. **WebDAV**：某些 WebDAV 服务器可能不支持 OPTIONS 请求或返回错误的 CORS 头
2. **COS SDK**：`headObject` 方法在移动端的 WebView 中可能遇到跨域限制
3. **Capacitor 环境**：虽然是原生应用，但 WebView 仍然有一些浏览器安全限制

### 为什么不在移动端也使用原生 HTTP 插件？
- COS SDK 是官方 SDK，内部实现复杂，难以完全替换为原生 HTTP
- 直接下载数据是更简单、更可靠的方案
- 性能影响可接受（数据文件通常较小）

## 后续优化建议
1. 考虑为移动端实现专门的 COS 原生插件（如果性能成为问题）
2. 添加更详细的错误日志，帮助诊断同步问题
3. 考虑添加网络状态检测，在网络不可用时给出友好提示
4. 监控移动端同步性能，如果数据文件变大，考虑其他优化方案
