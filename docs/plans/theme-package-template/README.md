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
  card-backgrounds/
  floating-button-backgrounds/
```

## 完整 UI 图标

模板默认启用一套完整 UI 图标。请在 `assets/uiicon/` 放入 `01` 至 `96` 的 PNG 或 WebP 图片，每个编号只能有一张；可混用 PNG 与 WebP。主题包导入会检查 96 张图片齐全且无重复，随后按编号映射到应用的全部 UI 图标槽位。若不需要自定义 UI 图标，可同时删除 `resources.uiIcons` 和 `apply.uiIcon`。

复制本文件夹后，可按主题需要创建资源子目录；空目录和 `.gitkeep` 不会作为资源导入。

## 导航图标大小

自定义图片导航图标可在 `apply.navigation.iconScale` 中使用 70 到 140 的整数百分比调节大小；例如：`"navigation": { "mode": "modern", "iconsId": "my-navigation-icons", "iconScale": 110 }`。省略该字段时保留用户当前大小设置，文字导航不受影响。

## 卡片背景

卡片背景资源组放在 `resources.cardBackgroundGroups`，应用时用 `apply.cardBackground.groupId` 选择。每组可配置多张图片和右侧对齐位置；透明度范围为 0 到 1。主题组会追加到用户已有卡片背景组，不会覆盖原有组。

```json
{
  "resources": {
    "cardBackgroundGroups": [{
      "id": "scene-cards",
      "name": "场景卡片",
      "alignment": "right-bottom",
      "files": [
        "assets/card-backgrounds/scene-01.webp",
        "assets/card-backgrounds/scene-02.webp"
      ]
    }]
  },
  "apply": {
    "cardBackground": { "groupId": "scene-cards", "opacity": 0.3 }
  }
}
```

## 悬浮按钮背景

全局悬浮按钮背景资源定义在 `resources.floatingButtonBackgrounds`，可填写多项，导入后会全部注册为可选方案；`apply.floatingButtonBackground.resourceId` 选择初始方案。图片放在 `assets/floating-button-backgrounds/`；`scale` 为图片在圆形按钮内的大小百分比，范围是 50 到 200，默认 100。

```json
{
  "resources": {
    "floatingButtonBackgrounds": [{
      "id": "flower-button",
      "image": "assets/floating-button-backgrounds/flower.webp"
    }]
  },
  "apply": {
    "floatingButtonBackground": {
      "resourceId": "flower-button",
      "scale": 100
    }
  }
}
```

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
