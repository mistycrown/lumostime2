# 飞书本机连接：Android 与电脑

2026-10-03：Android 现在与 Electron 共用“创建个人专属应用 → 授权飞书日历 → 手动测试/同步”的实现。Android 不再依赖 `VITE_FEISHU_SERVICE_URL`，不需要部署连接服务器；普通 Web 版仍使用连接服务。

Android 使用系统浏览器打开官方飞书确认页，返回应用后继续检查授权状态。重启应用会从本机加密存储恢复待授权/已连接状态以及同步账本。手机和电脑分别授权，不会把电脑密钥复制到手机。

## 构建与验证

1. 执行 `npm run feishu:test` 和 `npm run build`。
2. 执行 `npx cap sync android`。
3. 由用户在 Android 构建环境重新打包并安装新 APK。仅同步 Web 资源不能给旧 APK 增加原生桥接。
4. 在未配置远程服务地址时，进入“设置 → 飞书日历”，点击连接，确认创建专属应用；回到应用后打开“授权飞书日历”并确认日历读取、写入与离线权限。
5. 返回应用确认连接成功；先手动导入测试块，再选择少量日志同步，核对新增、修改、删除、分类迁移及重复同步。
6. 分别在创建阶段、授权阶段和连接成功后重启应用，确认状态能恢复；关闭网络或取消授权时应显示可恢复的状态。

手机凭证由 Android Keystore AES-GCM 加密，文件位于不参与普通系统备份的应用目录；实际密钥保持在 Keystore。加密存储失败时停止后续操作，不把现有连接覆盖为空，不自动改用明文存储。

## 原生测试

在用户 Android 构建环境运行：

```powershell
./gradlew.bat :app:testDebugUnitTest --tests com.mistycrown.lumostime.FeishuAuthorizationPolicyTest
./gradlew.bat :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.mistycrown.lumostime.FeishuSecureStoreTest
```

URL 策略测试覆盖官方网页、外部站点、凭证 URL 与本机来源限制。设备测试使用独立临时目录和测试 Keystore 别名，验证 UTF-8 往返、密文不含明文凭证、重启恢复以及损坏/密钥丢失时拒绝覆盖，不操作生产连接数据。

官方参考：[Android Keystore](https://developer.android.com/privacy-and-security/keystore)、[AtomicFile](https://developer.android.com/reference/android/util/AtomicFile)。

## 本次实际验证

142 项飞书回归、2 项纯 Java URL 策略测试、飞书相关模块的独立 TypeScript 检查、Web/Electron 生产构建以及 Android 资源同步已通过。全库 TypeScript 检查仍报告其他模块的既有错误。未编译 Android 应用，未运行真实设备 Keystore instrumentation 或真实账号授权，也未完成浏览器页面实测（环境没有可用浏览器连接）。

尚未创建 Git 提交：原生设备验证不可用，且共享桌面入口依赖此前尚未提交的飞书专属应用改动；保持这些已有改动未暂存。
