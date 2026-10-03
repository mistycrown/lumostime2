# 飞书本机执行逻辑

`personalService.ts`、`oauthService.ts`、`calendarImport.ts`、`calendarSync.ts` 和 `calendarTest.ts` 是 Android 与 Electron 共用的执行核心，基于已有飞书实现提取。不要在两端另行复制授权或同步算法。

- `connectionStore.ts` 定义存储接口；Electron 接入已有 AES-GCM SQLite 与操作系统安全存储，保持原路径和数据兼容。
- `nativeStore.ts` 在 Android 内存中处理连接与同步账本；`feishuNativeConnection.ts` 串行执行动作，在每次飞书请求前和动作结束时保存快照。
- Android 原生 `FeishuNativePlugin` 将快照通过 Keystore AES-GCM 加密，原子写入 `noBackupFilesDir/feishu/connection.enc`。系统密钥不返回 JavaScript；执行模块只在内存中处理解密后的凭证，状态与结果返回值不含密钥、设备码或用户令牌。不得将这些凭证写入 UI 状态、浏览器存储、日志或普通云备份。
- `nativeHttp.ts` 调用 Capacitor 原生 HTTP，只允许飞书官方 HTTPS 接口，禁用重定向。
- `crypto.ts` 使用固定版本 `@noble/hashes`，保持 SHA-256 账号、分类和同步来源标记与旧 Node 实现一致。

授权网页由系统浏览器打开，不能覆盖应用 WebView。手机与电脑分别确认本机授权；此功能不复制另一台设备的密钥。Web 页面继续使用连接服务。

存储读取失败、密钥丢失、密文损坏时，不清空或覆盖现有文件，也不回退到明文存储。写入失败时阻止后续网络写操作。服务端独立部署仍保留 `server/feishu` 的原有实现和打包边界。

验证：`npm run feishu:test`、`npm run build`、`npx cap sync android`。Android 浏览器 URL 策略 JVM 测试及真实 Keystore instrumentation 测试已提供；按仓库要求由用户在 Android 构建环境运行。
