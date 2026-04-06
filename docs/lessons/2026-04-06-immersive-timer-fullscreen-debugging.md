# 沉浸式计时安卓全屏适配经验教训

## 背景

这次沉浸式计时的目标是：

- 只保留单一黑底白字样式
- 安卓端真正铺满全屏
- 不再出现顶部摄像头/刘海区的白色区域

调试过程中，问题实际上分成了三层，而不是一个问题。

## 最终真正生效的方法

### 1. 先去掉 Edge-to-edge 插件给 WebView 加的边距

`@capawesome/capacitor-android-edge-to-edge-support` 会给 WebView 注入安全边距。
这会直接导致沉浸式计时出现左、右、底部留白。

最终做法：

- 进入沉浸式计时时临时 `EdgeToEdge.disable()`
- 退出沉浸式时再 `EdgeToEdge.enable()`

这一步解决的是左、右、底部白边，不解决顶部摄像头区域。

### 2. 沉浸式计时显示时，不能继续渲染白色宿主页

后面发现 `FocusDetailView` 在进入沉浸式时，底下那层白色详情页还在渲染。
这会让沉浸式计时即使是黑底，下面仍然可能透出白色宿主背景。

最终做法：

- `isImmersiveMode` 为 `true` 时，只渲染 `ImmersiveTimer`
- 不再同时渲染白色的 `FocusDetailView` 外壳

这一步解决的是“页面本身仍有白底宿主层”的问题。

### 3. 顶部摄像头/刘海区必须用原生保护层自己画黑色

最后剩下的顶部白色区域，根因不是 React、不是 CSS，也不是状态栏 API 没调用。

根因是：

- Android 15 起，`statusBarColor` 这类老方案已经不能可靠控制顶部状态栏/刘海区背景
- 系统栏默认变成透明后，应用必须自己在对应 inset 区域后面绘制保护背景

最终做法：

- 在 `MainActivity` 里创建一个原生 `immersiveProtectionOverlay`
- 根据 `systemBars()` 和 `displayCutout()` 的 inset 计算顶部、底部、左右保护区
- 进入沉浸式时显示这层黑色保护层
- 退出沉浸式时隐藏

这一步才是顶部摄像头区域最终变黑的关键修复。

## 这次踩过的坑

### 1. 只改 `statusBarColor`、`navigationBarColor` 没用

这类改动在旧安卓上可能还有效果，但对这次顶部摄像头区域的核心问题不是根因修复。
它们最多只是主题层面的兜底，不能替代原生 inset 保护层。

### 2. 只靠 Web 层黑底和 `safe-area-inset-top` 不够

WebView 本身黑了，不代表系统栏背后的区域也会跟着变黑。
如果系统把顶部区域当作透明系统栏处理，Web 页面并不能保证真正接管那块像素。

### 3. 看到“有一点改善”不等于根因找到了

这次先后出现过：

- 左右底部白边消失
- 页面主体黑了
- 顶部还是白

这些都是不同层级的问题。
如果把它们当成同一个问题去反复调样式，就会一直原地打转。

## 以后再遇到类似问题的排查顺序

建议固定按下面顺序排查：

1. 先确认是不是 WebView 被插件或容器加了 margin / padding
2. 再确认是不是宿主页背景还在沉浸式下面继续渲染
3. 最后再判断是不是 Android 系统栏/刘海区需要原生保护层

不要一上来就反复改：

- `statusBarColor`
- 主题颜色
- CSS 黑底
- `env(safe-area-inset-top)`

这些都可能只是表象修补。

## 当前项目里应该记住的结论

- 左右底部白边：优先检查 Edge-to-edge 插件是否给 WebView 加了 inset
- 页面主体仍发白：优先检查宿主白底页面是否仍在渲染
- 顶部摄像头/刘海区发白：优先考虑原生 `WindowInsets` 保护层，不要再优先押注 `statusBarColor`

## 相关代码位置

- `src/components/ImmersiveTimer.tsx`
- `src/views/FocusDetailView.tsx`
- `src/utils/statusBarTransitions.ts`
- `android/app/src/main/java/com/mistycrown/lumostime/MainActivity.java`
- `android/app/src/main/java/com/mistycrown/lumostime/ImmersiveModePlugin.java`
- `android/app/src/main/java/com/mistycrown/lumostime/ImmersiveProtectionInsets.java`

## 参考资料

- Android 15 behavior changes:
  https://developer.android.com/about/versions/15/behavior-changes-15
- Android edge-to-edge:
  https://developer.android.com/develop/ui/views/layout/edge-to-edge
- Capacitor StatusBar:
  https://capacitorjs.com/docs/apis/status-bar
