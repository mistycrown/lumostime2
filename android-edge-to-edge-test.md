# Android Edge-to-Edge 适配说明

## 问题原因

小米平板7运行 Android 15 或更新系统，强制启用了 edge-to-edge 模式。由于你的应用目标 SDK 是 35，系统会自动让应用内容延伸到状态栏和导航栏后面，导致标题栏与状态栏重合。

手机可能运行较旧的 Android 版本（< Android 15），所以没有这个问题。

## ✅ 已完成的配置

### 1. 安装了 Capawesome Edge-to-Edge 插件
```bash
npm install @capawesome/capacitor-android-edge-to-edge-support@7
```

### 2. 更新了 capacitor.config.ts
添加了以下配置：
```typescript
plugins: {
  SystemBars: {
    insetsHandling: 'disable',  // 禁用 Capacitor 内置的 insets 处理
  },
  EdgeToEdge: {
    backgroundColor: '#fdfbf7',  // 设置状态栏/导航栏背景色
  },
}
```

### 3. 在应用初始化时启用 Edge-to-Edge
在 `src/hooks/useAppInitialization.ts` 中添加了初始化代码：
- 自动启用 Edge-to-Edge 支持
- 获取并记录系统 insets
- 将 insets 应用到 CSS 变量（`--status-bar-height` 和 `--navigation-bar-height`）

### 4. 已同步到 Android 项目
```bash
npm run build
npx cap sync android
```

## 🧪 测试步骤

1. 在 Android Studio 中打开项目：
   ```bash
   npx cap open android
   ```

2. 在小米平板7上运行应用，检查状态栏是否还重合

3. 打开 Chrome DevTools（chrome://inspect），查看控制台日志：
   - 应该看到 `✅ Edge-to-Edge initialized successfully`
   - 应该看到 `📱 Edge-to-Edge insets: { top: XX, bottom: XX, ... }`

## 🔍 如果问题仍然存在

### 方案A：检查 CSS 变量是否生效

在 Chrome DevTools 控制台中运行：
```javascript
// 检查 insets 值
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
EdgeToEdge.getInsets().then(console.log);

// 检查 CSS 变量
getComputedStyle(document.documentElement).getPropertyValue('--status-bar-height');
```

### 方案B：手动调整 CSS

如果自动 insets 不准确，可以在你的组件中手动使用 CSS 变量：

```css
/* 在你的全局 CSS 或组件中 */
.your-header {
  padding-top: max(
    env(safe-area-inset-top), 
    var(--status-bar-height, 0px)
  );
}
```

### 方案C：修改 Android 主题（最后手段）

如果上述方法都不行，编辑 `android/app/src/main/res/values/styles.xml`：

```xml
<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
    <item name="windowActionBar">false</item>
    <item name="windowNoTitle">true</item>
    <item name="android:background">@null</item>
    <!-- 添加以下配置 -->
    <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    <item name="android:enforceNavigationBarContrast">false</item>
</style>
```

然后重新构建：
```bash
npx cap sync android
```

## 📊 调试信息

### 查看 Logcat 日志
在 Android Studio 中打开 Logcat，过滤 `EdgeToEdge` 或 `Capacitor`，查看相关日志。

### 检查插件是否加载
在应用启动后，控制台应该显示：
```
🔤 Font service initialized
✅ Edge-to-Edge initialized successfully
📱 Edge-to-Edge insets: { top: 48, bottom: 0, left: 0, right: 0 }
```

### 常见 insets 值
- 状态栏高度（top）：通常是 24-48px
- 导航栏高度（bottom）：通常是 0-48px（取决于设备是否有虚拟导航栏）

## 🎯 为什么平板和手机表现不同

1. **系统版本差异**：
   - Android 15+ 强制启用 edge-to-edge
   - Android 14 及以下默认不启用

2. **设备厂商定制**：
   - 小米可能在 MIUI 中提前启用了 edge-to-edge
   - 不同厂商的实现可能有差异

3. **屏幕尺寸和分辨率**：
   - 平板的状态栏高度可能与手机不同
   - DPI 差异导致 insets 计算不同

## 📚 参考资料

- [Capawesome Edge-to-Edge 插件文档](https://capawesome.io/plugins/android-edge-to-edge-support/)
- [Android Edge-to-Edge 官方指南](https://developer.android.com/develop/ui/compose/layouts/insets)
- [Ionic 论坛相关讨论](https://forum.ionicframework.com/t/status-bar-overlaps-the-app-content-help/247967)
- [Capacitor 7 Edge-to-Edge 迁移指南](https://capacitorjs.com/docs/updating/7-0)

## 💡 额外建议

1. **测试多个设备**：在不同品牌和系统版本的设备上测试
2. **考虑降级 targetSdkVersion**：如果问题严重，可以暂时降到 34（但不推荐）
3. **使用真机调试**：模拟器可能无法准确模拟 edge-to-edge 行为
4. **检查其他应用**：看看其他应用在小米平板7上的表现，了解最佳实践

