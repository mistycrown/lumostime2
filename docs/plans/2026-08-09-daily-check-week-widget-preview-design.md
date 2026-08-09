# 日课周统计小组件 XML 预览设计

## 目标

为 Android 桌面选择器中的日课周统计 4x4 小组件提供静态 XML 预览图。

## 方案

- 使用 `layer-list` drawable，不新增位图资源。
- 固定 250dp 方形白色圆角背景，匹配小组件的初始 4x4 尺寸。
- 用标题/日期占位条、刷新图标、六行日课标签占位条和七列状态圆点构成预览。
- 使用多种完成色与未完成灰色，表达周统计矩阵而不展示真实数据。
- 在 `widget_info_daily_check_week_4x4.xml` 中通过 `previewImage` 注册该资源。

## 验证

- 解析新增 drawable 与 provider XML。
- 检查 provider 引用存在且预览尺寸保持 4x4。
