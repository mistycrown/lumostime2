# LumoTime 社区主题包制作指南

本文件夹是可直接复制的主题包模板。按需放入资源、编辑 `theme.json`，然后把**文件夹里的内容**压缩成 ZIP，即可在 LumoTime「方案」中导入。

## 1. 最终 ZIP 结构

ZIP 根目录必须直接有 `theme.json`，不能再包一层主题文件夹。

```text
正确：my-theme.zip
├── theme.json
└── assets/
    └── ...

错误：my-theme.zip
└── my-theme/                 ← 多包了一层，无法导入
    ├── theme.json
    └── assets/
```

所有资源目录均按需使用。未使用时可以删除目录、对应的 `resources` 条目和 `apply` 条目；空目录与 `.gitkeep` 不会导入。

```text
theme.json                    ← 必须，UTF-8 标准 JSON
assets/
  preview.webp                ← 可选：主题封面
  background/main.webp        ← 可选：全局背景
  uiicon/01.png ... 96.png    ← 可选：完整 UI 图标组，必须刚好 96 张
  stickers/<set-id>/001.webp  ← 可选：贴纸；子目录通常是一套贴纸
  navigation/
    background.webp           ← 可选：新版导航栏背景
    icons/record.webp         ← 可选：新版导航图标（共五个槽位）
    icons/todo.webp
    icons/timeline.webp
    icons/review.webp
    icons/index.webp
    decoration.webp           ← 可选：旧版导航装饰
  timepal/<item-id>/stage-1.webp ... stage-5.webp  ← 可选：时间小友，必须 5 阶段
  fonts/my-font.woff2         ← 可选：字体
  achievement-bottle/<pack-id>/01.webp ...         ← 可选：成就瓶动画帧
  memoir-calendar/background.webp                   ← 可选：Memoir 日历背景
  card-backgrounds/scene-01.webp                    ← 可选：卡片背景
  floating-button-backgrounds/flower.webp            ← 可选：悬浮按钮圆形背景
```

文件名可以自定义；JSON 路径必须与 ZIP 内路径完全一致，并统一用 `/`，例如 `assets/stickers/moon/001.webp`。资源必须放在 `assets/` 下，禁止绝对路径、`\\`、`..` 和外部网址。

## 2. 打包前必读

- JSON 必须是 UTF-8 标准 JSON：不写注释、不写尾随逗号。
- `schemaVersion` 固定为数字 `2`；新主题不要使用旧版 `config` 写法。
- `package.id` 是稳定唯一 ID，只能由字母、数字及中间的连字符组成，例如 `moonlit-garden`。相同 ID 再次导入会更新旧主题。
- `package.version` 用 `主版本.次版本.修订号`，例如 `1.0.0`、`1.2.0-beta.1`。
- 同一资源列表的 `id` 不可重复。`apply` 引用资源时，必须使用对应列表中已有的 `id`。
- 图片支持 BMP、GIF、JPG/JPEG、PNG、SVG、WebP；字体支持 WOFF、WOFF2、TTF、OTF；成就瓶帧仅限 PNG 或 WebP。
- ZIP 不超过 100 MB，单个文件不超过 30 MB，解压资源总和不超过 200 MB。

## 3. `theme.json` 总览

这是一个最小主题包：只指定内置 UI 图标与时间线样式。

```json
{
  "format": "lumostime-theme-package",
  "schemaVersion": 2,
  "package": {
    "id": "moonlit-garden",
    "name": "月下花园",
    "version": "1.0.0",
    "author": "作者名称",
    "description": "一句简短的主题介绍",
    "preview": "assets/preview.webp"
  },
  "resources": {},
  "apply": {
    "uiIcon": { "source": "builtin", "themeId": "pencil" },
    "timeline": { "themeId": "celestial" }
  }
}
```

| 顶层字段 | 必填 | 写法与作用 |
| --- | --- | --- |
| `format` | 是 | 固定字符串 `"lumostime-theme-package"`。 |
| `schemaVersion` | 是 | 固定数字 `2`。 |
| `package` | 是 | 主题元数据，见下表。 |
| `resources` | 是 | 自带图片、字体、贴纸等资源；没有时写 `{}`。 |
| `apply` | 是 | 导入后自动应用的设置；没有时写 `{}`。 |

| `package` 字段 | 必填 | 写法与作用 |
| --- | --- | --- |
| `id` | 是 | 稳定唯一 ID，如 `moonlit-garden`；更新主题时不要改。 |
| `name` | 是 | 面向用户的主题名称，不能为空；不同主题 ID 不能重名。 |
| `version` | 是 | 版本号，如 `1.0.0`。 |
| `author` | 否 | 作者名称。 |
| `description` | 否 | 主题简介。 |
| `preview` | 否 | 封面图片路径，如 `assets/preview.webp`；文件必须真实存在。 |

## 4. `resources`：资源清单

每个资源字段都是数组，每项都必须有非空 `id`。该 ID 只用于 JSON 引用，建议英文小写加连字符，如 `moon-cat`。

| 字段 | 对应目录 | 用途 |
| --- | --- | --- |
| `backgrounds` | `assets/background/` | 全局背景图。 |
| `uiIcons` | `assets/uiicon/` | 应用全部 UI 图标。 |
| `stickers` | `assets/stickers/<贴纸组-id>/` | 贴纸组。 |
| `navigationBackgrounds` | `assets/navigation/` | 新版导航栏背景。 |
| `navigationIcons` | `assets/navigation/icons/` | 新版导航栏五个图标槽位。 |
| `navigationDecorations` | `assets/navigation/` | 旧版导航装饰。 |
| `timePal` | `assets/timepal/<小友-id>/` | 五阶段时间小友。 |
| `fonts` | `assets/fonts/` | 自定义字体。 |
| `achievementBottleIconPacks` | `assets/achievement-bottle/<图标包-id>/` | 成就瓶动画帧。 |
| `memoirCalendarBackgrounds` | `assets/memoir-calendar/` | Memoir 日历单图背景。 |
| `cardBackgroundGroups` | `assets/card-backgrounds/` | 卡片背景组（最多一项）。 |
| `floatingButtonBackgrounds` | `assets/floating-button-backgrounds/` | 悬浮按钮背景图。 |

### 4.1 全局背景 `backgrounds`

```json
"backgrounds": [{
  "id": "main-background",
  "file": "assets/background/main.webp",
  "fit": "cover",
  "position": "center"
}]
```

`id`、`file` 为核心字段；`file` 是图片路径。`fit`、`position` 可选，常用值是 `"cover"`、`"center"`。用 `apply.background.resourceId` 选中它。

### 4.2 完整 UI 图标 `uiIcons`

推荐使用编号目录：`assets/uiicon/` 内必须只有 `01` 到 `96` 的 PNG 或 WebP，每号一张，不能缺号、重复或混入其他文件。

```json
"uiIcons": [{
  "id": "moon-ui-icons",
  "numberedDirectory": "assets/uiicon"
}]
```

`id`、`numberedDirectory` 必填。选择此资源后，系统将按 `01` 至 `96` 的固定顺序映射全部 UI 槽位。不做自定义 UI 图标时，应同时删除 `resources.uiIcons` 与 `apply.uiIcon`。

也兼容按槽位写 `files` 的旧方式，但社区新主题优先使用 96 张编号方式：

```json
"uiIcons": [{
  "id": "partial-icons",
  "files": { "record": "assets/uiicon/record.webp" }
}]
```

### 4.3 贴纸 `stickers`

```json
"stickers": [{
  "id": "moon",
  "name": "月亮",
  "cover": "assets/stickers/moon/cover.webp",
  "items": [{
    "id": "moon-001",
    "name": "弯月",
    "file": "assets/stickers/moon/001.webp",
    "keywords": ["月亮", "夜晚"]
  }]
}]
```

贴纸组的 `id` 必填，`name`、`cover` 可选，`items` 是贴纸数组。每张贴纸建议写 `id`、`file`；`name`、`keywords` 可选，`keywords` 为字符串数组。所有图片路径都必须真实存在。用 `apply.stickers` 决定默认页与合并展示方式。

### 4.4 新版导航栏 `navigationBackgrounds`、`navigationIcons`

```json
"navigationBackgrounds": [{
  "id": "nav-background",
  "file": "assets/navigation/background.webp",
  "offsetX": "0px",
  "offsetY": "0px",
  "scale": 1,
  "verticalStretch": 1,
  "opacity": 0.9
}],
"navigationIcons": [{
  "id": "nav-icons",
  "files": {
    "record": "assets/navigation/icons/record.webp",
    "todo": "assets/navigation/icons/todo.webp",
    "timeline": "assets/navigation/icons/timeline.webp",
    "review": "assets/navigation/icons/review.webp",
    "index": "assets/navigation/icons/index.webp"
  }
}]
```

导航背景使用 `id`、`file`；`offsetX`、`offsetY` 是 CSS 长度字符串，`scale`、`verticalStretch`、`opacity` 是数字，均可选。导航图标使用 `id`、`files`；`files` 的合法键只有 `record`、`todo`、`timeline`、`review`、`index`。可以只提供部分图标，但完整五项体验最佳。用 `apply.navigation.mode: "modern"` 和 `backgroundId`、`iconsId` 启用。

### 4.5 旧版导航装饰 `navigationDecorations`

```json
"navigationDecorations": [{
  "id": "moon-decoration",
  "file": "assets/navigation/decoration.webp",
  "offsetX": "0px",
  "offsetY": "60px",
  "scale": 1,
  "opacity": 1
}]
```

`id`、`file` 为核心字段，其余字段可选。它仅用于 `apply.navigation.mode: "legacy"`，再以 `decorationResourceId` 选择；旧版导航也可直接用 `decorationId` 指定应用内置装饰。

### 4.6 时间小友 `timePal`

```json
"timePal": [{
  "id": "moon-cat",
  "name": "月光猫",
  "stages": {
    "1": "assets/timepal/moon-cat/stage-1.webp",
    "2": "assets/timepal/moon-cat/stage-2.webp",
    "3": "assets/timepal/moon-cat/stage-3.webp",
    "4": "assets/timepal/moon-cat/stage-4.webp",
    "5": "assets/timepal/moon-cat/stage-5.webp"
  }
}]
```

`id`、`stages` 必填，`name` 可选。`stages` 必须有字符串键 `"1"` 至 `"5"`，每项都指向真实图片；不能缺阶段。

### 4.7 字体 `fonts`

```json
"fonts": [{
  "id": "moon-handwriting",
  "file": "assets/fonts/moon-handwriting.woff2",
  "displayName": "月光手写体",
  "familyName": "Moon Handwriting",
  "format": "woff2"
}]
```

`id`、`file` 为核心字段；`displayName` 是设置页显示名称，建议填写。`familyName`、`format` 只用于说明，可选。字体保存在导入设备本机，换设备须重新导入。

### 4.8 成就瓶 `achievementBottleIconPacks`

```json
"achievementBottleIconPacks": [{
  "id": "moon-stars",
  "name": "月星",
  "frames": [
    "assets/achievement-bottle/moon-stars/01.webp",
    "assets/achievement-bottle/moon-stars/02.webp"
  ]
}]
```

`id`、`frames` 必填，`name` 可选。`frames` 至少一张，按数组顺序播放；每帧必须为 `assets/` 下的 `.png` 或 `.webp`。

### 4.9 Memoir 日历 `memoirCalendarBackgrounds`

```json
"memoirCalendarBackgrounds": [{
  "id": "memoir-moon",
  "image": "assets/memoir-calendar/background.webp",
  "settings": { "opacity": 0.85 }
}]
```

`id`、`image` 为核心字段；`settings` 可写如 `opacity` 的图片设置。仅支持 `image` 单图；不要写 `mode`、`fiveWeek`、`sixWeek`，否则导入失败。

### 4.10 卡片背景 `cardBackgroundGroups`

```json
"cardBackgroundGroups": [{
  "id": "moon-cards",
  "name": "月下卡片",
  "alignment": "right-bottom",
  "files": [
    "assets/card-backgrounds/scene-01.webp",
    "assets/card-backgrounds/scene-02.webp"
  ]
}]
```

一个包最多一个背景组。`id`、非空 `files` 必填，`name` 可选；`alignment` 只可为 `"right"`、`"right-top"`、`"right-bottom"`。导入后会追加为可选背景组，是否自动选中由 `apply.cardBackground` 决定。

### 4.11 悬浮按钮背景 `floatingButtonBackgrounds`

```json
"floatingButtonBackgrounds": [{
  "id": "moon-flower",
  "image": "assets/floating-button-backgrounds/flower.webp"
}]
```

`id`、`image` 必填，图片必须位于 `assets/`。可放多项作为可选方案；`apply.floatingButtonBackground.resourceId` 决定初始选中的一项。

## 5. `apply`：自动启用配置

所有 `apply` 字段均可选，且互不影响。每个 `resourceId`、`backgroundId`、`iconsId`、`groupId` 等都必须引用对应 `resources` 数组中的 `id`。

### 全局背景、配色、UI 图标

```json
"apply": {
  "background": { "resourceId": "main-background", "opacity": 0.3 },
  "color": { "schemeId": "morandi-purple" },
  "uiIcon": { "resourceId": "moon-ui-icons" }
}
```

- `background.resourceId` 选择 `backgrounds`；`opacity` 常用范围为 `0` 到 `1`。
- 内置背景写 `{ "source": "builtin", "id": "内置背景ID" }`，不需要资源文件。
- `color.schemeId` 仅能用应用已有的配色 ID；社区包不能注入任意 CSS。
- `uiIcon.resourceId` 选择 `uiIcons`。内置图标写 `{ "source": "builtin", "themeId": "pencil" }`。

### 导航栏

```json
"navigation": {
  "mode": "modern",
  "backgroundId": "nav-background",
  "iconsId": "nav-icons",
  "showLabelWithIcon": true,
  "iconScale": 100,
  "transparentTitleBar": false
}
```

- `mode` 仅可为 `"modern"` 或 `"legacy"`。
- 新版使用 `backgroundId`、`iconsId` 分别选择导航背景、图标；`iconMode: "text"` 可强制纯文字导航。
- `showLabelWithIcon`、`transparentTitleBar` 为布尔值。
- `iconScale` 必须是 70 到 140 的整数，建议 100。
- 旧版必须额外提供内置 `decorationId` 或自定义 `decorationResourceId`，例如 `{ "mode": "legacy", "decorationResourceId": "moon-decoration" }`。

### 贴纸与时间小友

```json
"stickers": {
  "enabled": true,
  "defaultPage": "moon",
  "groups": [{
    "id": "moon-and-stars",
    "name": "月夜贴纸",
    "sourceSetIds": ["moon", "stars"]
  }]
},
"timePal": {
  "selected": "moon-cat",
  "thresholds": [0, 60, 180, 360, 720]
}
```

- `stickers.enabled` 为是否启用贴纸选择器。
- `stickers.defaultPage` 是贴纸组 ID，或 `groups` 中大组的 ID。
- `groups` 可选；每项的 `id`、`name`、`sourceSetIds` 分别是大组 ID、显示名、要合并的贴纸组 ID 数组。`sourceSetIds` 必须来自 `resources.stickers`。
- `timePal.selected` 选择时间小友资源；`thresholds` 是可选的五阶段阈值数字数组，省略则使用应用默认值。

### 字体、成就瓶、时间线

```json
"font": { "resourceId": "moon-handwriting" },
"achievementBottle": {
  "iconPackId": "moon-stars",
  "style": { "id": "blushBloom" }
},
"timeline": {
  "themeId": "celestial",
  "config": {
    "iconSize": 12,
    "iconAngle": 0,
    "lineWidth": 1.5,
    "offsetX": 0,
    "memoirOffsetX": 0,
    "timelineWidth": 3,
    "railOffsetX": 0,
    "timeNodeOffsetY": 0,
    "uniformNodes": false,
    "nodeColor": "#5B647A",
    "lineColor": "#AAB3C1",
    "lineOpacity": 26
  }
}
```

- `font.resourceId` 选择自定义字体；内置字体写 `{ "source": "builtin", "fontId": "内置字体ID" }`。
- `achievementBottle.iconPackId` 可选择自定义资源，或直接写内置图标包 ID；`style.id` 是现有瓶身样式 ID。
- `timeline.themeId` 可用：`default`、`vine`、`celestial`、`track`、`stitches`、`paw`、`music`。
- `timeline.config` 可按需覆盖示例字段；数值会限制到安全范围，颜色必须是 `#RGB` 或 `#RRGGBB`，`uniformNodes` 是布尔值。只写 `themeId` 也可以。

### Memoir、卡片背景、悬浮按钮

```json
"memoirCalendar": { "backgroundId": "memoir-moon" },
"cardBackground": { "groupId": "moon-cards", "opacity": 0.3 },
"floatingButtonBackground": { "resourceId": "moon-flower", "scale": 100 }
```

- `memoirCalendar.backgroundId` 选择 `memoirCalendarBackgrounds`。
- `cardBackground.groupId` 选择卡片背景组；`opacity` 必须为 `0` 到 `1` 的数字。
- `floatingButtonBackground.resourceId` 选择按钮背景；`scale` 为 50 到 200 的数字百分比，建议 100。
- 明确恢复默认悬浮按钮背景时写 `{ "none": true }`，不能同时写 `resourceId`。

## 6. 完整示例

下列示例覆盖全部资源类型。可复制进 `theme.json` 后删去不需要的段落；每个 `assets/...` 路径都必须放入对应真实文件。

```json
{
  "format": "lumostime-theme-package",
  "schemaVersion": 2,
  "package": {
    "id": "moonlit-garden",
    "name": "月下花园",
    "version": "1.0.0",
    "author": "主题作者",
    "description": "月色、花园与手写感",
    "preview": "assets/preview.webp"
  },
  "resources": {
    "backgrounds": [{ "id": "main", "file": "assets/background/main.webp" }],
    "uiIcons": [{ "id": "moon-icons", "numberedDirectory": "assets/uiicon" }],
    "stickers": [{ "id": "moon", "name": "月亮", "items": [{ "id": "moon-001", "file": "assets/stickers/moon/001.webp" }] }],
    "navigationBackgrounds": [{ "id": "nav", "file": "assets/navigation/background.webp", "opacity": 0.9 }],
    "navigationIcons": [{ "id": "nav-icons", "files": { "record": "assets/navigation/icons/record.webp", "todo": "assets/navigation/icons/todo.webp", "timeline": "assets/navigation/icons/timeline.webp", "review": "assets/navigation/icons/review.webp", "index": "assets/navigation/icons/index.webp" } }],
    "timePal": [{ "id": "moon-cat", "name": "月光猫", "stages": { "1": "assets/timepal/moon-cat/stage-1.webp", "2": "assets/timepal/moon-cat/stage-2.webp", "3": "assets/timepal/moon-cat/stage-3.webp", "4": "assets/timepal/moon-cat/stage-4.webp", "5": "assets/timepal/moon-cat/stage-5.webp" } }],
    "fonts": [{ "id": "moon-font", "file": "assets/fonts/moon-font.woff2", "displayName": "月光手写体" }],
    "achievementBottleIconPacks": [{ "id": "moon-stars", "name": "月星", "frames": ["assets/achievement-bottle/moon-stars/01.webp"] }],
    "memoirCalendarBackgrounds": [{ "id": "memoir", "image": "assets/memoir-calendar/background.webp", "settings": { "opacity": 0.85 } }],
    "cardBackgroundGroups": [{ "id": "cards", "name": "月下卡片", "alignment": "right-bottom", "files": ["assets/card-backgrounds/scene-01.webp"] }],
    "floatingButtonBackgrounds": [{ "id": "flower", "image": "assets/floating-button-backgrounds/flower.webp" }]
  },
  "apply": {
    "background": { "resourceId": "main", "opacity": 0.3 },
    "uiIcon": { "resourceId": "moon-icons" },
    "navigation": { "mode": "modern", "backgroundId": "nav", "iconsId": "nav-icons", "showLabelWithIcon": true, "iconScale": 100 },
    "stickers": { "enabled": true, "defaultPage": "moon" },
    "timePal": { "selected": "moon-cat", "thresholds": [0, 60, 180, 360, 720] },
    "font": { "resourceId": "moon-font" },
    "achievementBottle": { "iconPackId": "moon-stars" },
    "memoirCalendar": { "backgroundId": "memoir" },
    "cardBackground": { "groupId": "cards", "opacity": 0.3 },
    "floatingButtonBackground": { "resourceId": "flower", "scale": 100 },
    "timeline": { "themeId": "celestial" }
  }
}
```

## 7. 导入失败时先检查

1. ZIP 根目录是否直接包含 `theme.json`，而不是多一层文件夹。
2. JSON 是否出现中文逗号、注释、尾随逗号，或 `schemaVersion` 不是数字 `2`。
3. 所有 `assets/...` 路径是否真实存在，大小写和后缀是否一致。
4. 完整 UI 图标是否刚好有 `01` 到 `96`，且都是 PNG 或 WebP。
5. 时间小友是否完整提供 `"1"` 到 `"5"` 五张图片。
6. 每个资源引用 ID 是否能在对应 `resources` 数组中找到。
7. 卡片背景组是否超过一个，导航图标槽位是否写成允许的五个名称。
8. 文件类型和 ZIP 体积是否在限制内。

同一 `package.id` 的新包会覆盖旧主题；要发布独立主题时，必须换一个 `package.id` 和主题名称。
