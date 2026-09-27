# 专注详情懒加载恢复设计

## 问题

从 Android 计时悬浮窗进入正在计时页时，`FocusDetailView` 的动态导入会加载 `ImmersiveTimer`，并间接请求屏幕方向插件的 Vite 优化产物。开发服务器重建优化依赖后，已打开页面仍引用旧的带版本参数 URL，Vite 返回 `504 Outdated Optimize Dep`，导致动态模块导入被拒绝并触发未捕获的 React 错误。

## 方案

- 在专注详情的懒加载边界外增加专用错误边界。
- 只在错误消息表明 Vite 优化依赖过期或动态模块抓取失败时，使用 `sessionStorage` 在 30 秒内最多自动刷新一次；因此刷新后仍无法加载时不会循环刷新，而会显示加载失败状态。
- 在 Vite 的 `optimizeDeps.include` 中显式预构建 `@capawesome/capacitor-screen-orientation`，让该懒加载依赖在服务器启动时保持稳定。
- 为错误匹配逻辑添加单元测试，并运行生产构建验证。

## 非目标

- 不改变悬浮窗、计时会话或沉浸模式的业务流程。
- 不取消专注详情的代码分割。
