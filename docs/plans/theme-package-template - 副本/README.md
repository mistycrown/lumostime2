# 测试主题包

主题清单已按 LumoTime `schemaVersion: 1` 整理。UIIcon 使用应用内置的 `pencil` 系列，只在 `theme.json` 中设置 `source: "builtin"`、`themeId: "pencil"`，不重复打包应用资源。

包内自带背景、莫兰迪紫配色、两套贴纸、新版导航背景与五个图标槽位、五阶段时间小友、字体、成就瓶自定义图标帧，以及 Memoir 五周和六周溢出背景。UIIcon 使用应用内置 pencil 系列。成就瓶图标帧放在 `assets/achievement-bottle/<pack-id>/`，并在 `theme.json` 的 `achievementBottle.iconPack.frames` 中按动画顺序列出；瓶身样式单独由 `achievementBottle.style.id` 配置。字体文件只会在导入设备本机保存，不参与云同步。

## 打包

将本目录中的 `theme.json` 和 `assets/` 压缩为 ZIP，不能额外套一层目录。不要把本说明文件放进 ZIP。压缩包解开后应为：

```text
theme.json
assets/
```

模板遗留的 `.gitkeep` 文件会被导入器忽略。完整字段定义见[主题包规范](../2026-09-26-theme-package-design.md)。

第一版样式使用现有样式 ID：莫兰迪紫配色为 `morandi-purple`，成就瓶第四种样式为 `blushBloom`，时间线第三种样式为 `celestial`。内置资源只填写 ID，不复制应用资源进包。

成就瓶自定义图标包需要将 PNG/WebP 帧放进 `assets/achievement-bottle/<pack-id>/`，并逐一填写 `frames` 路径。`iconPack.name` 为可选的展示名称；缺省时使用主题名称。示例帧可替换成你通过“成就瓶图标包”导入的 ZIP 中的 PNG/WebP 图片。

## Memoir 日历背景

两张图片时配置 `mode: "overflow"`，并同时提供 `fiveWeek` 与 `sixWeek`。只有一张图片时配置 `mode: "fill"` 和 `image`，导入后会切换到填充模式。
