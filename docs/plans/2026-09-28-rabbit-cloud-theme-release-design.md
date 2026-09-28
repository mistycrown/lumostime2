# 兔子云朵主题包发布整理设计

日期：2026-09-28

## 目标

将现有 schemaVersion 2 主题包整理为可直接导入和发布的“兔子云朵”主题包；发布内容只引用目录内真实存在的资源。

## 发布内容

- 保留整体背景、两套兔子贴纸、新版导航背景与图标、五阶段时间小友、Memoir 日历背景和四张卡片背景。
- 移除已删除的本机字体和成就瓶图标帧，且不设置对应的 `apply` 字段，避免覆盖用户当前选择。
- 使用稳定包 ID `rabbit`，外显名称统一为“兔子云朵”。资源 ID、资源目录和显示名称不再使用 `test` 或“测试”。
- 补齐新加入的 `assets/navigation/1.webp`、`assets/memoir-calendar/1.webp` 与四张 `assets/card-backgrounds/*.webp` 的资源定义。

## 包结构与交付

- ZIP 根目录仅包含 `theme.json` 和 `assets/`；不包含 README、模板目录或 `.gitkeep`。
- 清单继续采用 UTF-8 标准 JSON 与 schemaVersion 2，所有资源路径使用正斜杠并位于 `assets/` 下。
- README 更新为面向发布者的简明说明，描述实际包含内容和可导入的 ZIP 文件。

## 验证

- 检查 JSON 语法、资源引用、重复 ID 和命名规范。
- 使用应用的 `parseThemePackage` 对最终 ZIP 进行解析验证。
- 核对 ZIP 根目录及总体积，确认未将无关模板文件打入包内。
