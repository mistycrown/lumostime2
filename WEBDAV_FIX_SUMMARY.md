# WebDAV 手机端 401 错误修复总结

## 问题

手机端 WebDAV 上传失败，返回 401 Unauthorized 错误，但电脑端和平板端正常。

## 根本原因

手动添加 `Authorization: Basic xxx` header 在 Android Cordova HTTP 插件中不可靠，会被忽略或覆盖。

## 解决方案

使用 Cordova HTTP 插件提供的 `HTTP.useBasicAuth()` 方法，让插件自动管理认证。

## 已完成的修改

### 1. 在 saveConfig 中设置全局 Basic Auth

```typescript
if (Capacitor.isNativePlatform()) {
    HTTP.useBasicAuth(config.username, config.password);
}
```

### 2. 移除所有手动添加的 Authorization header

在以下 8 个方法中移除了手动添加的 Authorization header：

1. ✅ `saveConfig` - 添加 `HTTP.useBasicAuth()` 调用
2. ✅ `checkConnection` - 移除手动 Authorization
3. ✅ `createDirectory` - 移除手动 Authorization
4. ✅ `uploadData` - 移除手动 Authorization
5. ✅ `downloadData` - 移除手动 Authorization
6. ✅ `uploadImage` - 移除手动 Authorization
7. ✅ `uploadImageList` - 移除手动 Authorization
8. ✅ `downloadImageList` - 移除手动 Authorization

### 3. 保留正确的配置

- ✅ 保留 `HTTP.setDataSerializer('raw')` 用于二进制数据
- ✅ 移除所有 `serializer: 'raw'` 无效参数
- ✅ 修正 timeout 单位为毫秒（30000）

## 测试步骤

```bash
# 1. 构建项目
npm run build

# 2. 同步到 Android
npx cap sync android

# 3. 打开 Android Studio
npx cap open android

# 4. 运行并测试
```

## 预期结果

- ✅ 连接测试成功
- ✅ 上传数据成功（不再出现 401 错误）
- ✅ 下载数据成功
- ✅ 图片同步成功
- ✅ 手机端与电脑端/平板端表现一致

## 关键要点

1. **使用 `HTTP.useBasicAuth()` 而不是手动添加 header**
2. **在配置时调用一次，对所有请求生效**
3. **让插件自动管理认证，不要手动干预**

## 相关文档

- [WEBDAV_AUTH_ANDROID_FIX.md](./WEBDAV_AUTH_ANDROID_FIX.md) - 详细的技术分析
- [WEBDAV_TEST_CHECKLIST.md](./WEBDAV_TEST_CHECKLIST.md) - 完整的测试清单
- [Cordova HTTP Plugin 文档](https://github.com/silkimen/cordova-plugin-advanced-http)

## 修复时间

2026-02-23

## 修复人员

Kiro AI Assistant
