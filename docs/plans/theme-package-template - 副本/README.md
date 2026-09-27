# 测试主题包

本目录是已填入资源的 schemaVersion 2 示例，名称为“测试”。导入资源在 `resources` 中定义，主题选择写在 `apply` 中。UIIcon 使用应用内置 pencil 系列，因此只配置其 ID，不重复导入应用资源。

主题包含背景、莫兰迪紫、两组贴纸并合并成一个选择器大组、新版导航背景及图标、五阶段时间小友、本机字体、成就瓶自定义帧、第四种瓶身样式、第三种时间线样式、Memoir 单图填充背景和卡片背景组。整体背景透明度为 30%，卡片背景透明度为 30%。

## 打包

只将根目录 `theme.json` 和 `assets/` 压缩为 ZIP，不能再套一层目录，也不要将 README 放入 ZIP。解压后根目录应直接看到 `theme.json` 和 `assets/`。空目录中的 `.gitkeep` 会被忽略。

内置资源只在 `apply` 选择 ID，不要添加到 `resources`。更完整字段约定见[主题包格式规范](../2026-09-26-theme-package-design.md)。

Memoir 日历背景只支持一张图片：在 `memoirCalendarBackgrounds` 中使用 `image` 指向资源路径。不要添加 `mode`、`fiveWeek` 或 `sixWeek` 字段。
