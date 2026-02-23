# WebDAV 手机端测试清单

## 修复内容

已修复 Android 手机端 WebDAV 401 认证失败问题：
- ✅ 移除了所有 `serializer: 'raw'` 无效参数
- ✅ 在每次请求前正确调用 `HTTP.setDataSerializer('raw')`
- ✅ 修正了 timeout 单位（30 秒 = 30000 毫秒）
- ✅ 清理了重复的 setDataSerializer 调用

## 构建步骤

```bash
# 1. 构建项目
npm run build

# 2. 同步到 Android
npx cap sync android

# 3. 打开 Android Studio
npx cap open android
```

## 测试步骤

### 1. 连接测试
- [ ] 打开应用设置页面
- [ ] 进入 WebDAV 配置
- [ ] 输入服务器地址、用户名、密码
- [ ] 点击"测试连接"
- [ ] **预期结果**：显示"连接成功"

### 2. 上传数据测试
- [ ] 在应用中创建一些测试数据（添加几条记录）
- [ ] 点击"上传到云端"按钮
- [ ] 观察控制台日志
- [ ] **预期结果**：
  - 没有 401 错误
  - 显示"上传成功"
  - 日志中显示 `[WebDAV] Upload Success: status 200/201/204`

### 3. 下载数据测试
- [ ] 点击"从云端恢复"按钮
- [ ] **预期结果**：
  - 成功下载数据
  - 数据正确显示在应用中

### 4. 图片同步测试（如果有图片功能）
- [ ] 添加一条带图片的记录
- [ ] 触发同步
- [ ] **预期结果**：
  - 图片成功上传
  - 没有 401 错误

### 5. 自动同步测试
- [ ] 修改一些数据
- [ ] 等待自动同步触发
- [ ] **预期结果**：
  - 自动同步成功
  - 同步按钮显示旋转动画

## 日志检查

在 Android Studio 的 Logcat 中查找以下日志：

### 成功的日志
```
[WebDAV] Mobile Upload Data: lumostime_backup.json, size: XXXX
[WebDAV] Upload URL: https://hakata.infini-cloud.net/dav/lumostime/lumostime_backup.json
[WebDAV] Data size: XXXX bytes, type: Uint8Array
[WebDAV] Upload Success: status 201
```

### 失败的日志（不应该出现）
```
[WebDAV] Native Upload Error: ...
[WebDAV] Error status: 401
```

## 对比测试

### 电脑端/平板端
- [ ] 在电脑端或平板端测试相同操作
- [ ] **预期结果**：手机端和其他平台表现一致

### 不同 WebDAV 服务器
如果可能，测试不同的 WebDAV 服务器：
- [ ] 坚果云
- [ ] InfiniCLOUD（你当前使用的）
- [ ] 其他 WebDAV 服务

## 常见问题排查

### 如果仍然出现 401 错误

1. **检查认证信息**
   ```javascript
   // 在浏览器控制台测试 Base64 编码
   const username = "你的用户名";
   const password = "你的密码";
   const auth = btoa(`${username}:${password}`);
   console.log("Authorization: Basic " + auth);
   ```

2. **检查 URL 格式**
   - 确保 URL 以 `/` 结尾或不以 `/` 结尾的一致性
   - 确保路径正确（例如：`/dav/lumostime/`）

3. **检查服务器日志**
   - 查看 WebDAV 服务器的访问日志
   - 确认请求是否到达服务器
   - 确认 Authorization header 是否被接收

### 如果出现其他错误

1. **检查网络连接**
   - 确保手机可以访问 WebDAV 服务器
   - 尝试在浏览器中访问 WebDAV URL

2. **检查权限**
   - 确保应用有网络权限
   - 检查 Android 权限设置

3. **清除缓存**
   ```bash
   # 清除应用数据
   adb shell pm clear com.mistycrown.lumostime
   ```

## 成功标准

- ✅ 连接测试成功
- ✅ 上传数据成功（无 401 错误）
- ✅ 下载数据成功
- ✅ 图片同步成功（如适用）
- ✅ 自动同步正常工作
- ✅ 手机端表现与电脑端/平板端一致

## 相关文档

- [WEBDAV_AUTH_ANDROID_FIX.md](./WEBDAV_AUTH_ANDROID_FIX.md) - 详细的问题分析和修复说明
- [WEBDAV_AUTH_FIX.md](./WEBDAV_AUTH_FIX.md) - 之前的序列化问题修复记录

## 备注

- 修复时间：2026-02-23
- 问题类型：Android Cordova HTTP 插件参数使用错误
- 影响范围：仅 Android 手机端
- 修复方法：移除无效的 `serializer` 参数，使用正确的 API 调用方式
