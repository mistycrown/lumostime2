# 应用跳转功能实现文档

## 功能概述

为场景卡片（计时卡片和待办卡片）添加了应用跳转功能，用户可以配置点击卡片时自动启动外部应用，实现自动化工作流程。

## 实现架构

### 1. 服务层 (Service Layer)

#### AppLauncherService.ts
- 位置：`src/services/AppLauncherService.ts`
- 功能：
  - 获取已安装应用列表
  - 启动外部应用
  - 检查应用是否可启动
- 平台支持：
  - Android：使用PackageManager和Intent
  - iOS：使用URL Scheme
  - Web：占位实现（不支持）

#### AppLauncherWeb.ts
- 位置：`src/services/AppLauncherWeb.ts`
- 功能：Web平台的占位实现
- 说明：Web平台不支持应用跳转，返回空数据

### 2. 原生插件 (Native Plugin)

#### AppLauncherPlugin.java
- 位置：`android/app/src/main/java/com/lumostime/app/AppLauncherPlugin.java`
- 功能：
  - `getInstalledApps()`: 获取已安装应用列表（包含应用名、包名、图标）
  - `launchApp()`: 通过包名启动应用
  - `canLaunchApp()`: 检查应用是否可启动
- 特性：
  - 自动获取应用图标并转为Base64
  - 按应用名称排序
  - 支持启动所有可启动的应用

#### MainActivity.java
- 位置：`android/app/src/main/java/com/mistycrown/lumostime/MainActivity.java`
- 修改：注册AppLauncherPlugin插件

### 3. UI组件 (UI Components)

#### AppSelector.tsx
- 位置：`src/components/AppSelector.tsx`
- 功能：应用选择器弹窗
- 特性：
  - 显示已安装应用列表（带图标）
  - 搜索功能（支持应用名和包名）
  - 手动输入功能（用于iOS或特殊应用）
  - 选中状态显示
  - 清除选择功能

#### SceneCard.tsx
- 位置：`src/components/SceneCard.tsx`
- 修改：
  - 导入AppLauncherService
  - 在handleCardClick中添加应用启动逻辑
  - 正面点击和反面点击都支持启动应用

#### SceneSettingsView.tsx
- 位置：`src/views/SceneSettingsView.tsx`
- 修改：
  - 导入AppSelector组件
  - 在计时和待办卡片配置中添加AppLaunchConfig组件
  - 新增AppLaunchConfig组件（应用跳转配置UI）

### 4. 类型定义 (Type Definitions)

#### types.ts
- 位置：`src/types.ts`
- 修改：在SceneCardAction接口中添加：
  ```typescript
  launchApp?: boolean;        // 是否启用应用跳转
  appPackageName?: string;    // Android包名或iOS URL Scheme
  appName?: string;           // 应用显示名称
  ```

## 数据流程

### 配置流程
1. 用户在场景设置中编辑计时/待办卡片
2. 开启"点击时启动应用"开关
3. 点击"选择应用"打开AppSelector
4. AppSelector调用AppLauncherService.getInstalledApps()
5. 原生插件返回应用列表
6. 用户选择应用或手动输入
7. 应用信息保存到卡片的action配置中

### 使用流程
1. 用户点击配置了应用跳转的卡片
2. SceneCard.handleCardClick检测到launchApp配置
3. 调用AppLauncherService.launchApp()
4. 原生插件通过Intent启动应用
5. 同时执行卡片原有动作（开始计时等）

## 文件清单

### 新增文件
```
src/services/AppLauncherService.ts          # 应用启动服务
src/services/AppLauncherWeb.ts              # Web平台占位实现
src/components/AppSelector.tsx              # 应用选择器组件
android/app/src/main/java/com/lumostime/app/AppLauncherPlugin.java  # Android原生插件
docs/user-guide/10-app-launcher.md          # 用户使用指南
docs/app-launcher-examples.md               # 常用应用配置示例
docs/FEATURE_APP_LAUNCHER.md                # 本文档
```

### 修改文件
```
src/types.ts                                # 添加应用跳转配置字段
src/components/SceneCard.tsx                # 添加应用启动逻辑
src/views/SceneSettingsView.tsx             # 添加应用跳转配置UI
android/app/src/main/java/com/mistycrown/lumostime/MainActivity.java  # 注册插件
```

## 技术细节

### Android实现

#### 获取应用列表
```java
Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
List<ResolveInfo> resolveInfoList = pm.queryIntentActivities(mainIntent, 0);
```

#### 启动应用
```java
Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
context.startActivity(launchIntent);
```

#### 图标转换
```java
// 将Drawable转为Bitmap，再转为Base64
Bitmap bitmap = drawableToBitmap(icon);
ByteArrayOutputStream stream = new ByteArrayOutputStream();
bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream);
String base64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP);
```

### iOS实现（预留）

iOS使用URL Scheme机制：
```typescript
window.location.href = urlScheme; // 例如：weixin://
```

注意：iOS需要应用在Info.plist中声明支持的URL Scheme。

### Web实现

Web平台不支持启动外部应用，返回空数据和失败状态。

## 使用示例

### 配置背单词卡片
```typescript
{
  type: 'timer',
  title: '背单词',
  action: {
    type: 'startTimer',
    activityId: 'english-study',
    categoryId: 'study',
    launchApp: true,
    appPackageName: 'com.jiongji.andriod.card',
    appName: '百词斩'
  }
}
```

### 点击卡片时的处理
```typescript
const handleCardClick = async () => {
  if (data.action.launchApp && data.action.appPackageName) {
    await AppLauncherService.launchApp(
      data.action.appPackageName,
      data.action.appPackageName
    );
  }
  onAction?.(data.action, data.autoEnterFocus);
};
```

## 权限要求

### Android
- 无需额外权限
- 使用系统标准API（PackageManager、Intent）
- 仅访问可启动的应用信息

### iOS
- 无需额外权限
- 使用URL Scheme机制
- 需要应用支持外部调用

## 兼容性

- Android 5.0+ (API Level 21+)
- iOS 10.0+
- Web平台不支持

## 安全性

1. **隐私保护**：
   - 仅在本地设备运行
   - 不上传任何应用信息
   - 不访问其他应用数据

2. **权限控制**：
   - 仅使用系统公开API
   - 不请求额外权限
   - 遵循平台安全规范

3. **错误处理**：
   - 应用不存在时优雅降级
   - 启动失败时不影响原有功能
   - 提供详细的错误日志

## 测试建议

### 功能测试
1. 测试应用列表获取
2. 测试应用搜索功能
3. 测试应用启动（常用应用）
4. 测试手动输入功能
5. 测试配置保存和加载
6. 测试卡片点击启动

### 边界测试
1. 应用未安装的情况
2. 包名错误的情况
3. 应用不支持外部启动
4. 网络断开的情况（不影响）
5. 大量应用的性能

### 兼容性测试
1. 不同Android版本
2. 不同设备厂商
3. 不同应用类型
4. Web平台降级

## 未来优化方向

1. **iOS完整支持**：
   - 实现iOS原生插件
   - 支持URL Scheme配置
   - 添加iOS应用列表获取

2. **功能增强**：
   - 支持传递参数给应用
   - 支持应用内特定页面跳转
   - 添加应用启动历史记录

3. **用户体验**：
   - 应用图标缓存优化
   - 应用列表分类显示
   - 常用应用快速访问

4. **性能优化**：
   - 应用列表懒加载
   - 图标异步加载
   - 搜索性能优化

## 相关文档

- [用户使用指南](./user-guide/10-app-launcher.md)
- [常用应用配置示例](./app-launcher-examples.md)
- [Capacitor插件开发文档](https://capacitorjs.com/docs/plugins)
- [Android Intent文档](https://developer.android.com/guide/components/intents-filters)
- [iOS URL Scheme文档](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app)

## 维护说明

### 代码维护
- 服务层代码位于`src/services/`
- UI组件位于`src/components/`
- 原生插件位于`android/app/src/main/java/com/lumostime/app/`

### 更新流程
1. 修改TypeScript代码
2. 如需修改原生功能，更新Java代码
3. 运行`npm run build`构建
4. 同步到Android项目：`npx cap sync android`
5. 在Android Studio中测试

### 调试方法
- TypeScript：使用Chrome DevTools
- Android：使用Android Studio Logcat
- 查看日志：`adb logcat | grep AppLauncher`

## 贡献者

- 功能设计：产品团队
- 前端实现：开发团队
- Android插件：开发团队
- 文档编写：开发团队

## 更新日志

### v1.0.0 (2024-02-25)
- ✨ 新增应用跳转功能
- ✨ 新增应用选择器组件
- ✨ 新增Android原生插件
- 📝 添加用户使用指南
- 📝 添加常用应用配置示例
