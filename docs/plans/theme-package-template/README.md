# LumoTime 主题包模板

复制整个 `theme-package-template` 文件夹，按需替换资源和编辑根目录的 `theme.json`，然后将 `theme.json` 与 `assets/` 一起压缩为 ZIP。ZIP 根目录必须直接包含 `theme.json`，不能再多套一层文件夹。

## 目录结构

```text
theme-package-template/
|-- theme.json
`-- assets/
    |-- preview.webp                 # 可选：方案预览图
    |-- background/main.webp         # 整体背景
    |-- uiicon/                       # UIIcon 主题图标
    |-- stickers/<set-id>/            # 每套贴纸一个子目录
    |   |-- cover.webp
    |   `-- 001.webp
    |-- navigation/
    |   |-- background.webp           # 新版导航背景
    |   `-- icons/                     # 新版导航栏图标
    |-- timepal/<timepal-id>/          # 每只时间小友一个子目录
    |   |-- stage-1.webp
    |   |-- stage-2.webp
    |   |-- stage-3.webp
    |   |-- stage-4.webp
    |   `-- stage-5.webp
    |-- fonts/                         # 本机字体，不会云同步
    |-- achievement-bottle/<pack-id>/  # 成就瓶帧图
    `-- memoir-calendar/
        |-- five-week.webp
        `-- six-week.webp
```

所有配置均可选。不使用某类资源时，保持对应目录为空，并且不要在 `config` 中添加该配置。配置字段和完整示例见[主题压缩包导入规范](../2026-09-26-theme-package-design.md)。

## 编辑步骤

1. 将 `package.id` 改为稳定的英文小写 ID，只能包含小写字母、数字和短横线；发布新版本时不要更改它。
2. 更新 `package.name`、`author`、`description` 和语义化 `version`。
3. 只把需要启用的设置写进 `config`。将资源文件放入 `assets/` 后，在 JSON 中使用相对路径，例如 `assets/background/main.webp`。
4. 如设置 `package.preview`，确保它指向实际存在的图片。
5. 删除没有使用的配置块；配置路径拼错或引用缺失文件会导致导入校验失败。
6. 只将 `theme.json` 和 `assets/` 压缩为 ZIP，不要加入本说明文件，也不要多套一层模板文件夹；检查解压后的根目录就是 `theme.json` 和 `assets/`。

模板中的 `.gitkeep` 仅用于保留空目录，导入器会忽略它；它不会作为主题资源导入。

## 资源约定

- 路径统一使用 `/`，不得使用绝对路径、盘符、反斜杠或 `..`。
- 图片使用 WebP、PNG、JPG 等受支持格式；字体使用 WOFF2、WOFF、TTF 或 OTF。
- 自定义时间小友提供 `stage-1` 到 `stage-5` 五张图。
- Memoir 日历背景必须同时提供 `five-week.webp` 和 `six-week.webp`。
- 贴纸套和自定义图标包使用稳定 ID；文件名建议只用英文、数字、短横线和下划线。
- `theme.json` 使用 UTF-8 编码和标准 JSON 语法，不添加注释或尾随逗号。
