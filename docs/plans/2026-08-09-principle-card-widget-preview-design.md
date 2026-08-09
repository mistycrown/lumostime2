# 原则卡片小组件预览设计

**日期：** 2026-08-09

## 目标

为 Android 系统组件选择器提供原则卡片 4x2 的专用预览，并降低运行时原则文字的黑度。

## 方案

新增一个 XML `layer-list` 预览 drawable，并由 `widget_info_principle_card_4x2.xml` 的 `previewImage` 引用。预览沿用现有组件的 440dp x 220dp 基准、圆角和纯 XML 资源模式：暖灰图像感背景、左侧三行深灰文字示意、右上刷新标记。它不读取动态原则库或 Capacitor assets，因此在系统选择器中稳定可用。

实际小组件保持 PNG/WebP 背景渲染与随机逻辑不变，只将标题和正文绘制色统一为 `#2F2F2F`。

## 验证

组件服务测试检查专用预览资源的注册与文字色常量；执行 Web 构建和 Android Capacitor 同步。Android APK 仍由人工环境编译。
