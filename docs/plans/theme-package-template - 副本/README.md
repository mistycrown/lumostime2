# 兔子云朵主题包

版本：1.0.0

“兔子云朵”是一套以兔子、云朵和柔和紫色为主题的 LumoTime 主题包，包含：

- 整体背景与莫兰迪紫配色
- 两套兔子贴纸（共 32 张）
- 新版导航背景与五枚导航图标
- 五阶段兔子时间小友
- Memoir 日历背景和四张卡片背景
- 内置 Pencil UIIcon 与 Celestial 时间线样式

本包不包含字体和成就瓶图标；导入时会保留用户当前的这两项选择。

## 发布文件

发布 `rabbit-clouds-theme-v1.0.0.zip`。压缩包解压后的根目录必须直接包含：

```text
theme.json
assets/
```

README、模板目录和 `.gitkeep` 均不应包含在发布 ZIP 中。主题采用 schemaVersion 2；资源路径均位于 `assets/` 下并使用 `/`。

相同 `package.id`（`rabbit`）再次导入会覆盖旧版本，因此后续更新请保持此 ID 不变，只提升 `package.version`。
