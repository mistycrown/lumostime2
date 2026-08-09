# 原则卡片小组件背景放大设计

**日期：** 2026-08-09

## 目标

原则卡片小组件继续从 Capacitor 打包后的 `public/card` 目录读取背景图片，自动兼容 PNG 与 WebP，并让新加入的 12 张图片进入既有的随机轮换队列。为隐藏源图圆角与组件圆角不一致时可能出现的白边，背景在 cover 缩放后再居中放大 3%。

## 方案

渲染器保留按宽高比例计算的 cover 缩放，随后乘以固定系数 `1.03f`。图片仍以组件中心为基准绘制，并由既有圆角裁剪路径截断溢出部分。这样不会改变文字区域、随机逻辑、PNG/WebP 筛选或 WebP 优先级。

## 验证

测试检查 PNG/WebP 支持、`public/card` 资源目录和 `BACKGROUND_OVERSCAN_SCALE = 1.03f` 常量。执行小组件服务测试、Web 构建和 Android Capacitor 同步；Android APK 由人工环境编译。
