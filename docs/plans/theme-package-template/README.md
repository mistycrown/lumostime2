# LumoTime 主题包模板

复制整个模板目录，编辑 `theme.json` 并将图片、贴纸、字体等文件放入 `assets/`。打包时只选 `theme.json` 和 `assets/`，ZIP 根目录不能再套模板文件夹，也不要加入本说明文件。

主题包使用 UTF-8 JSON 和 `schemaVersion: 2`：

- `resources` 写随包导入的文件及其稳定 ID。
- `apply` 写要应用的配置，并用 ID 选择 `resources` 中的项目。
- 只使用应用已有资源时，只写 `apply` 中的内置 ID，不要把应用文件复制进包。例如 UIIcon 使用 `{"source":"builtin","themeId":"pencil"}`。
- 未写入 `apply` 的设置保持用户当前值。

## 推荐目录

```text
theme.json
assets/
  background/
  uiicon/
  stickers/<set-id>/
  navigation/
  timepal/<item-id>/stage-1.webp ... stage-5.webp
  fonts/
  achievement-bottle/<pack-id>/
  memoir-calendar/
```

复制本文件夹后，可按主题需要创建资源子目录；空目录和 `.gitkeep` 不会作为资源导入。

## 贴纸

将图片定义在 `resources.stickers`，然后在 `apply.stickers` 设置默认页。多套贴纸可以并到一个大组：

```json
{
  "resources": {
    "stickers": [
      { "id": "set-one", "name": "第一组", "items": [{ "id": "one", "file": "assets/stickers/set-one/01.webp" }] },
      { "id": "set-two", "name": "第二组", "items": [{ "id": "two", "file": "assets/stickers/set-two/01.webp" }] }
    ]
  },
  "apply": {
    "stickers": {
      "defaultPage": "set-one",
      "enabled": true,
      "groups": [{ "id": "all", "name": "全部贴纸", "sourceSetIds": ["set-one", "set-two"] }]
    }
  }
}
```

完整字段和所有资源类型示例见[主题包格式规范](../2026-09-26-theme-package-design.md)。资源路径必须在 `assets/` 下，使用 `/`；禁止绝对路径、反斜杠和 `..`。相同 `package.id` 再次导入会直接覆盖，改名但沿用 ID 即可更新名称。
