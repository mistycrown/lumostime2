# 飞书本机执行逻辑

`personalService.ts`、`oauthService.ts`、`calendarImport.ts`、`calendarSync.ts` 和 `calendarTest.ts` 是 Android 与 Electron 共用的执行核心，基于已有飞书实现提取。不要在两端另行复制授权或同步算法。

- `connectionStore.ts` 定义存储接口；Electron 接入已有 AES-GCM SQLite 与操作系统安全存储，保持原路径和数据兼容。
- `nativeStore.ts` 在 Android 内存中处理连接与同步账本；`feishuNativeConnection.ts` 串行执行动作，在每次飞书请求前和动作结束时保存快照。
- Android 原生 `FeishuNativePlugin` 将快照通过 Keystore AES-GCM 加密，原子写入 `noBackupFilesDir/feishu/connection.enc`。系统密钥不返回 JavaScript；执行模块只在内存中处理解密后的凭证，状态与结果返回值不含密钥、设备码或用户令牌。不得将这些凭证写入 UI 状态、浏览器存储、日志或普通云备份。
- `nativeHttp.ts` 调用 Capacitor 原生 HTTP，只允许飞书官方 HTTPS 接口，禁用重定向。
- `crypto.ts` 使用固定版本 `@noble/hashes`，保持 SHA-256 账号、分类和同步来源标记与旧 Node 实现一致。

授权网页由系统浏览器打开，不能覆盖应用 WebView。手机与电脑分别确认本机授权；此功能不复制另一台设备的密钥。Web 页面继续使用连接服务。

存储读取失败、密钥丢失、密文损坏时，不清空或覆盖现有文件，也不回退到明文存储。写入失败时阻止后续网络写操作。服务端独立部署仍保留 `server/feishu` 的原有实现和打包边界。

分类通过账号与分类 ID 绑定日历，不按名称匹配或翻译。手动同步涉及该分类时，日历名称统一为 `LumosTime · 当前分类名称`；本地改名更新原日历，管理员更新标题及已有备注名，编辑者只更新当前身份的备注名。本地分类颜色未变时保留飞书自选颜色；本地颜色变化时更新。

已绑定日历返回不存在、已删除的官方错误码或 `is_deleted` 时，保留本地记录身份，清理该账号的旧远端位置并重建、订阅分类日历，再写入本次范围内记录。只有删除请求时直接完成旧位置清理，不新建空日历。`deleted_calendars` 保留已删除位置的账号绑定标记，避免重启或旧账本升级重新带入失效位置；日历创建结果未知仍先按来源标记核查。权限不足、网络错误不触发重建。

`calendarRecovery.test.ts` 对共用核心和独立服务端执行相同恢复用例；独立服务端保留无依赖部署边界，修改同步逻辑时需保持这组用例通过。

验证：`npm run feishu:test`、`npm run build`、`npx cap sync android`。Android 浏览器 URL 策略 JVM 测试及真实 Keystore instrumentation 测试已提供；按仓库要求由用户在 Android 构建环境运行。
