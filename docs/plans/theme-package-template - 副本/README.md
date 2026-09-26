# 测试主题包

本目录是已填入资源的 schemaVersion 2 示例，名称为“测试”。导入资源在 `resources` 中定义，主题选择写在 `apply` 中。UIIcon 使用应用内置 pencil 系列，因此只配置其 ID，不重复导入应用资源。

主题包含背景、莫兰迪紫、两组贴纸并合并成一个选择器大组、新版导航背景及图标、五阶段时间小友、本机字体、成就瓶自定义帧、第四种瓶身样式、第三种时间线样式和 Memoir 双图溢出背景。背景透明度为 30%。

## 打包

只将根目录 `theme.json` 和 `assets/` 压缩为 ZIP，不能再套一层目录，也不要将 README 放入 ZIP。解压后根目录应直接看到 `theme.json` 和 `assets/`。空目录中的 `.gitkeep` 会被忽略。

内置资源只在 `apply` 选择 ID，不要添加到 `resources`。更完整字段约定见[主题包格式规范](../2026-09-26-theme-package-design.md)。

Memoir 两张图使用 `mode: "overflow"`、`fiveWeek` 和 `sixWeek`；只有一张图时改用 `mode: "fill"` 与 `image`。
