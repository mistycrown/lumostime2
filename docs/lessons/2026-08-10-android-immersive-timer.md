# Android 沉浸式计时排障复盘

## 现象与范围

Android 16 设备进入沉浸式计时后，页面曾短暂正确渲染，随后被横屏启动图覆盖；排查期间还出现过应用启动后闪退。竖屏最终正常，横屏仍需验证状态栏是否会在旋转完成后重新出现。

## 已验证的根因

- `AppTheme.NoActionBarLaunch` 把整张 `@drawable/splash` 设置为 `android:background`。固定旋转期间，系统会重新使用这个旧式窗口预览，覆盖已经渲染的 WebView。
- 专注通知服务通过 `startForegroundService()` 启动，但在该设备上未能及时进入前台服务状态。Android 因超时抛出 `ForegroundServiceDidNotStartInTimeException` 并终止应用进程。
- 横屏白条是旋转后重新出现的系统状态栏区域。单次隐藏系统栏不足以应对 Android 配置变化和焦点恢复。

## 保留的修复

- 启动主题不再把全屏启动图作为 `android:background`，并禁用 legacy preview；保留黑色的系统启动背景。
- `FocusNotificationService` 改为在前台应用内以普通服务启动，并隔离后台启动或前台化失败，避免通知服务杀死宿主进程。
- `MainActivity` 保存沉浸式状态，并在 `onConfigurationChanged` 与 `onWindowFocusChanged` 后重新设置黑色背景、隐藏系统栏。

## 已撤回的实验

- 在 JavaScript 中固定等待 700ms，再隐藏系统栏：日志显示等待完成后问题仍然发生，不能解决启动图覆盖。
- 用四个黑色原生 View 遮挡系统栏/刘海区：不能处理系统重新显示状态栏，且增加了层级和 inset 维护成本。
- 在配置变化后重复 `setTheme()`：没有解决启动图问题，并与前台服务启动异常同时出现，已撤回。
- 诊断用 `[ImmersiveDebug]` 日志：已完成定位，已从 React、Capacitor 插件与 Activity 中移除。

## 回归检查

- 从竖屏进入横屏沉浸式计时：无启动图、无白色状态栏条。
- 从横屏进入竖屏沉浸式计时：内容全屏，退出后正常恢复页面状态栏。
- 在沉浸式状态旋转、锁屏后返回、切换应用后返回：系统栏保持隐藏或以黑色瞬态显示。
- 正在计时时冷启动应用：不出现 `ForegroundServiceDidNotStartInTimeException`，应用不闪退。

## 后续原则

- Android 12+ 启动图使用 `windowSplashScreen*` 属性；不要把整张启动图设置为 Activity 的 `android:background`。
- 对全屏模式，旋转与焦点变化是独立事件。全屏状态必须由原生 Activity 重放，而不能依赖一次性的 Web 层调用或固定延时。
- 临时调试日志和视觉遮罩须在根因验证后立即删除，并记录验证结果与回归项。
