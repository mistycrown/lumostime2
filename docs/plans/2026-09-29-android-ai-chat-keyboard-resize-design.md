# Android AI 对话键盘避让设计

## 背景

从手机端 AI 按钮进入对话页时，输入框会自动聚焦并拉起 Android 输入法。主 Activity 未声明 `adjustResize`，而 AI 对话的 Web 层又有意跳过 Android 的 `visualViewport` 键盘高度推断，导致 WebView 可用高度没有可靠缩小，最新消息可能被键盘遮挡。

## 目标

在 Android 上打开 AI 对话并显示键盘后，输入框保持在键盘上方，消息列表在键盘导致的布局重排完成后定位至最新消息；收起键盘时恢复正常布局。

## 决策

采用 Android 原生 `adjustResize` 作为键盘避让的唯一来源，并保留 Web 层对 Android 的 `visualViewport` 跳过策略。对话组件在输入框获得焦点时安排两次定位：当前帧一次、下一帧一次，以覆盖自动聚焦与原生键盘调整 WebView 尺寸之间的异步时序。

不引入 Capacitor Keyboard 插件，也不在 Android 上恢复基于 `visualViewport` 的高度估算，避免 edge-to-edge 模式下的重复留白和机型兼容性问题。

## 影响范围

- `android/app/src/main/AndroidManifest.xml`：仅为 `MainActivity` 添加 `android:windowSoftInputMode="adjustResize"`。
- `src/components/ai-chat/AIBackfillChatComposer.tsx`：在现有输入框 `onFocus` 的滚动后追加一帧布局稳定后的滚动；不改变桌面端、iOS 或手动输入行为。

## 验收

1. Android 端从任一 AI 入口打开已有长对话，键盘出现后最新消息与输入框均不被遮挡。
2. 关闭键盘后页面不残留额外底部空白。
3. 网页端与桌面 AI 对话窗口不出现布局回归。
