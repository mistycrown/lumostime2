# 应用跳转功能 - 快速开始

## 5分钟快速体验

### 步骤1：构建项目

```bash
# 安装依赖（如果还没有）
npm install

# 构建Web资源
npm run build

# 同步到Android
npx cap sync android
```

### 步骤2：在Android Studio中打开项目

```bash
# 打开Android项目
npx cap open android
```

### 步骤3：运行应用

在Android Studio中点击运行按钮，或使用命令：

```bash
# 运行到连接的设备
npx cap run android
```

### 步骤4：配置测试卡片

1. 打开应用，进入"场景设置"
2. 选择任意时间段，点击"添加快捷方式"
3. 选择"计时"类型
4. 输入标题，如"测试应用跳转"
5. 选择一个活动（如果没有，先创建一个）
6. 向下滚动，找到"点击时启动应用"开关
7. 打开开关，点击"选择应用"
8. 从列表中选择一个常用应用（如微信、浏览器等）
9. 点击"保存"

### 步骤5：测试功能

1. 返回主界面
2. 点击刚才配置的卡片
3. 观察是否自动启动了选择的应用
4. 同时检查计时是否正常开始

## 开发调试

### 查看日志

```bash
# 查看所有日志
adb logcat

# 只查看应用相关日志
adb logcat | grep lumostime

# 只查看AppLauncher插件日志
adb logcat | grep AppLauncher
```

### 常见日志输出

成功启动应用：
```
[AppLauncher] Launching app: com.tencent.mm
[AppLauncher] App launched successfully
```

应用不存在：
```
[AppLauncher] App not found: com.example.notexist
[AppLauncher] Launch intent is null
```

### 调试技巧

1. **检查插件是否注册**：
   ```bash
   adb logcat | grep "registerPlugin"
   ```
   应该能看到：`registerPlugin(AppLauncherPlugin.class)`

2. **测试应用列表获取**：
   在Chrome DevTools Console中执行：
   ```javascript
   const { AppLauncher } = Capacitor.Plugins;
   const result = await AppLauncher.getInstalledApps();
   console.log(result);
   ```

3. **测试应用启动**：
   ```javascript
   const { AppLauncher } = Capacitor.Plugins;
   const result = await AppLauncher.launchApp({ 
     packageName: 'com.tencent.mm' 
   });
   console.log(result);
   ```

## 测试用例

### 测试1：获取应用列表

**预期结果**：返回设备上所有可启动的应用

```javascript
import { AppLauncherService } from './services/AppLauncherService';

const apps = await AppLauncherService.getInstalledApps();
console.log(`找到 ${apps.length} 个应用`);
console.log(apps[0]); // 查看第一个应用的信息
```

### 测试2：启动微信

**预期结果**：成功启动微信应用

```javascript
const success = await AppLauncherService.launchApp('com.tencent.mm');
console.log('启动结果:', success);
```

### 测试3：启动不存在的应用

**预期结果**：返回false，不崩溃

```javascript
const success = await AppLauncherService.launchApp('com.notexist.app');
console.log('启动结果:', success); // 应该是 false
```

### 测试4：检查应用是否可启动

**预期结果**：正确返回应用是否存在

```javascript
const canLaunch = await AppLauncherService.canLaunchApp('com.tencent.mm');
console.log('微信是否可启动:', canLaunch);

const canLaunch2 = await AppLauncherService.canLaunchApp('com.notexist.app');
console.log('不存在的应用是否可启动:', canLaunch2); // 应该是 false
```

## 常见问题排查

### 问题1：应用列表为空

**可能原因**：
- 插件未正确注册
- 权限问题
- Android版本不兼容

**排查步骤**：
1. 检查MainActivity.java中是否注册了插件
2. 查看logcat日志
3. 确认Android版本 >= 5.0

### 问题2：应用无法启动

**可能原因**：
- 包名错误
- 应用未安装
- 应用不支持外部启动

**排查步骤**：
1. 确认包名拼写正确
2. 手动打开应用确认已安装
3. 查看logcat错误信息
4. 尝试其他应用测试

### 问题3：图标不显示

**可能原因**：
- 图标转换失败
- Base64编码问题
- 内存不足

**排查步骤**：
1. 查看logcat是否有异常
2. 检查返回的icon字段
3. 尝试减少应用列表数量

### 问题4：Web版本报错

**预期行为**：Web版本不支持此功能，应该优雅降级

**检查**：
- 应用列表应该为空
- 启动应用应该返回false
- 不应该有JavaScript错误

## 性能测试

### 测试应用列表加载时间

```javascript
console.time('getInstalledApps');
const apps = await AppLauncherService.getInstalledApps();
console.timeEnd('getInstalledApps');
console.log(`加载了 ${apps.length} 个应用`);
```

**预期**：
- 少于100个应用：< 1秒
- 100-200个应用：1-2秒
- 200+个应用：2-3秒

### 测试应用启动速度

```javascript
console.time('launchApp');
await AppLauncherService.launchApp('com.tencent.mm');
console.timeEnd('launchApp');
```

**预期**：< 100ms

## 集成测试

### 完整流程测试

```javascript
// 1. 获取应用列表
const apps = await AppLauncherService.getInstalledApps();
console.log('✓ 获取应用列表成功');

// 2. 选择第一个应用
const firstApp = apps[0];
console.log('✓ 选择应用:', firstApp.appName);

// 3. 检查是否可启动
const canLaunch = await AppLauncherService.canLaunchApp(firstApp.packageName);
console.log('✓ 检查可启动:', canLaunch);

// 4. 启动应用
if (canLaunch) {
  const success = await AppLauncherService.launchApp(firstApp.packageName);
  console.log('✓ 启动应用:', success);
}
```

## 下一步

完成快速测试后，你可以：

1. 阅读[用户使用指南](./user-guide/10-app-launcher.md)了解详细功能
2. 查看[常用应用配置示例](./app-launcher-examples.md)获取更多应用包名
3. 阅读[功能实现文档](./FEATURE_APP_LAUNCHER.md)了解技术细节
4. 根据需求自定义和扩展功能

## 反馈和支持

如果遇到问题：
1. 查看logcat日志
2. 检查本文档的常见问题部分
3. 查看GitHub Issues
4. 提交新的Issue（附带日志和复现步骤）

## 贡献

欢迎贡献代码和文档：
1. Fork项目
2. 创建功能分支
3. 提交Pull Request
4. 等待代码审查

---

祝你使用愉快！🚀
