# 原则卡片小组件单层圆角设计

**日期：** 2026-08-10

## 目标

消除原则卡片背景图片缺失或带透明圆角时出现的白色边层，确保组件只由渲染器统一裁剪圆角。

## 方案

移除原则卡片布局上的 `widget_background` 白色背景，改为透明。保留 `WidgetPrincipleCardBitmapRenderer` 中的 `24dp` 圆角裁剪和无图片时的浅色 fallback。这样位图透明角落只会显示启动器背景，不会再叠加第二个白色圆角。

## 验证

测试检查原则卡片布局不再引用 `widget_background`；执行小组件测试、Web 构建和 Android Capacitor 同步。Android APK 由人工环境编译。
