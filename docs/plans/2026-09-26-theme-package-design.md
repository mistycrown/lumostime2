# LumoTime 主题包格式规范

日期：2026-09-26

## 目标与兼容

主题作者发布一个 ZIP，用户从方案 Tab 导入后即可切换使用。新主题包将“随包导入的资源”和“应用时选择的设置”分开：`resources` 描述主题带来的资源，`apply` 描述启用哪些配置及选择哪个资源。

已有内置主题和用户保存的主题方案都是 apply-only，不包含资源包；它们继续使用现有快照格式。导入 ZIP 使用 `schemaVersion: 2`。应用继续兼容 `schemaVersion: 1` 的旧 ZIP（`config` 中资源定义和应用选择混合的旧格式），新发布包必须使用 v2。

## 导入与生命周期

- `package.id` 是稳定覆盖键。相同 ID 的 ZIP 再次导入时直接覆盖，不检查版本升降，也不保留旧版。
- 不同 ID 不可使用相同主题名。
- 删除主题需用户确认；确认后删除主题记录及该包拥有的图片、缩略图、贴纸、导航/时间小友/日历等资源和本机字体，不做引用保护。
- `apply` 中缺省的配置保持当前值；不要通过省略字段暗示默认值。
- 应用主题后，贴纸默认页指向导入的贴纸组；多个贴纸组可以在一个选择器合并组中作为大组展示。

## ZIP 目录

ZIP 根目录直接包含 `theme.json` 和 `assets/`，不可额外套目录。资源路径使用 `/`，必须在 `assets/` 下，不得含盘符、绝对路径、反斜线或 `..`。

```text
theme.json
assets/
  preview.webp
  background/main.webp
  stickers/<set-id>/*
  navigation/background.webp
  navigation/icons/*
  timepal/<item-id>/stage-1.webp ... stage-5.webp
  fonts/*.(woff2|woff|ttf|otf)
  achievement-bottle/<pack-id>/*.webp
  memoir-calendar/*
```

图片支持 BMP、GIF、JPG/JPEG、PNG、SVG、WebP；成就瓶帧限定 PNG/WebP。字体支持 WOFF、WOFF2、TTF、OTF。单 ZIP 最大 100 MB，单文件最大 30 MB，总解包资源最大 200 MB。JSON 使用 UTF-8 标准 JSON，不加注释和尾随逗号。

## 顶层结构

```json
{
  "format": "lumostime-theme-package",
  "schemaVersion": 2,
  "package": {
    "id": "moonlit-garden",
    "name": "月下花园",
    "version": "1.0.0",
    "author": "主题作者",
    "description": "一套月光与花园风格的主题",
    "preview": "assets/preview.webp"
  },
  "resources": {
    "backgrounds": [],
    "uiIcons": [],
    "stickers": [],
    "navigationBackgrounds": [],
    "navigationIcons": [],
    "navigationDecorations": [],
    "timePal": [],
    "fonts": [],
    "achievementBottleIconPacks": [],
    "memoirCalendarBackgrounds": []
  },
  "apply": {}
}
```

所有资源列表和 `apply` 字段均可选。每个包资源在其类别列表中有稳定 `id`，资源文件路径写在 `resources`，应用配置只使用对应 ID。`apply` 引用不存在的资源 ID 时导入失败。内置应用资源写在 `apply` 中，只填 ID，不复制应用文件到主题 ZIP。

## 资源与应用字段

### 整体背景

资源背景：

```json
"resources": { "backgrounds": [{
  "id": "main",
  "file": "assets/background/main.webp",
  "fit": "cover",
  "position": "center"
}] },
"apply": { "background": { "resourceId": "main", "opacity": 0.3 } }
```

内置背景不放在资源列表中：`"apply": { "background": { "source": "builtin", "id": "forest" } }`。透明度范围为 0 到 1。

### UIIcon

内置图标系列直接引用应用资源，例如：`"apply": { "uiIcon": { "source": "builtin", "themeId": "pencil" } }`。无需声明 `resources.uiIcons`，也不要重复导入图标。

自定义图标资源示例：

```json
"resources": { "uiIcons": [{
  "id": "outline",
  "files": {
    "record": "assets/uiicon/record.webp",
    "todo": "assets/uiicon/todo.webp",
    "timeline": "assets/uiicon/timeline.webp"
  }
}] },
"apply": { "uiIcon": { "resourceId": "outline" } }
```

`files` 通过应用逻辑槽位 ID 绑定，不绑定 DOM 位置。未声明的槽位保持不变。

### Sticker

`resources.stickers` 是贴纸组数组，每组有稳定 `id`、`name`、可选 `cover` 和 `items`。每项包含稳定 `id`、可选 `name`、`file` 和可选 `keywords`。例如：

```json
"resources": { "stickers": [
  { "id": "moon", "name": "月亮", "items": [
    { "id": "moon-001", "name": "月亮", "file": "assets/stickers/moon/001.webp" }
  ] },
  { "id": "stars", "name": "星星", "items": [
    { "id": "star-001", "file": "assets/stickers/stars/001.webp" }
  ] }
] },
"apply": { "stickers": {
  "defaultPage": "moon",
  "enabled": true,
  "groups": [{ "id": "all", "name": "主题贴纸", "sourceSetIds": ["moon", "stars"] }]
} }
```

`defaultPage` 可为导入贴纸组 ID 或配置组 ID。`groups` 是可选大组；一组可合并多套，`sourceSetIds` 必须引用 `resources.stickers[].id`。未指定 groups 且导入多套贴纸时，应用会将其合并成一个主题贴纸大组。

### 配色

第一版引用应用内置配色，不允许任意 CSS：`"apply": { "color": { "schemeId": "morandi-purple" } }`。自定义颜色 Token 留待后续 schema 版本。

### 导航栏

```json
"resources": {
  "navigationBackgrounds": [{ "id": "main", "file": "assets/navigation/background.webp", "position": "center", "opacity": 0.9 }],
  "navigationIcons": [{ "id": "main", "files": {
    "record": "assets/navigation/icons/record.webp",
    "todo": "assets/navigation/icons/todo.webp",
    "timeline": "assets/navigation/icons/timeline.webp",
    "review": "assets/navigation/icons/review.webp"
  } }]
},
"apply": { "navigation": { "mode": "modern", "backgroundId": "main", "iconsId": "main" } }
```

新版导航 `mode` 为 `modern`。旧版导航用 `mode: "legacy"` 并通过 `decorationId` 指定应用内置装饰 ID，或引用 `resources.navigationDecorations` 中自定义装饰。未声明模式的旧 ZIP 按旧配置兼容。

### 时间小友

每个 `resources.timePal[]` 项包含 `id`、`name` 和五阶段 `stages` 路径；`apply.timePal.selected` 引用条目 ID，`thresholds` 可选，缺省使用应用默认阈值。

```json
"resources": { "timePal": [{ "id": "moon-cat", "name": "月光猫", "stages": {
  "1": "assets/timepal/moon-cat/stage-1.webp",
  "2": "assets/timepal/moon-cat/stage-2.webp",
  "3": "assets/timepal/moon-cat/stage-3.webp",
  "4": "assets/timepal/moon-cat/stage-4.webp",
  "5": "assets/timepal/moon-cat/stage-5.webp"
} }] },
"apply": { "timePal": { "selected": "moon-cat", "thresholds": [0, 60, 180, 360, 720] } }
```

### 字体

内置字体直接用 `"apply": { "font": { "source": "builtin", "fontId": "lxgw-wenkai" } }`。

自定义字体放入 `resources.fonts`，字段包含 `id`、`file`、`displayName`、`familyName`、`format`；通过 `apply.font.resourceId` 选择。字体在导入设备本机保存，不参与云同步和跨设备外观备份；另一设备需重新导入主题包。

### 成就瓶

自定义帧在 `resources.achievementBottleIconPacks` 中声明 `id`、可选 `name` 和按播放顺序排列的 `frames`。应用时写 `apply.achievementBottle.iconPackId`；也可直接使用内置图标包 ID。瓶身样式用 `apply.achievementBottle.style.id` 指定现有样式 ID。

```json
"resources": { "achievementBottleIconPacks": [{
  "id": "moon-stars", "name": "月星", "frames": [
    "assets/achievement-bottle/moon-stars/01.webp",
    "assets/achievement-bottle/moon-stars/02.webp"
  ]
}] },
"apply": { "achievementBottle": { "iconPackId": "moon-stars", "style": { "id": "blushBloom" } } }
```

### 时间线样式

时间线使用应用内置主题 ID；`apply.timeline` 可包含 `themeId` 和经过应用范围校验的 `config`。例如：`"apply": { "timeline": { "themeId": "celestial" } }`。

### Memoir 日历背景

图片和模式属于资源；`apply.memoirCalendar.backgroundId` 选择资源 ID。`mode: "overflow"` 必须同时提供 `fiveWeek` 和 `sixWeek`；`mode: "fill"` 只提供 `image`。如需调节图片布局，将设置写入资源的 `settings`。

```json
"resources": { "memoirCalendarBackgrounds": [{
  "id": "main", "mode": "overflow",
  "fiveWeek": "assets/memoir-calendar/five-week.webp",
  "sixWeek": "assets/memoir-calendar/six-week.webp",
  "settings": { "offsetX": "0px", "offsetY": "0px", "scale": 1.35, "opacity": 1 }
}] },
"apply": { "memoirCalendar": { "backgroundId": "main" } }
```

若只有一张图片，使用 `mode: "fill"` 和 `image`。旧版 v1 成对图片缺省 mode 时仍按 overflow 兼容。

## 安全与校验

主题包是资源和受控设置，不是插件。禁止 JavaScript、HTML、任意 CSS、Tailwind class、外部 URL 和通过路径访问应用数据。导入器会校验包路径、类型、体积、所有资源文件引用、资源 ID、时间小友阶段数和 Memoir 背景模式。错误应包含具体路径，如 `resources.timePal[0].stages.3` 或 `apply.background.resourceId`。

图片经现有主题图片服务导入；自定义贴纸、导航和日历资源写入现有运行时数据结构；字体写入本机字体存储。应用或删除后应触发现有界面刷新事件。相同 ID 覆盖不会创建第二个方案；删除会清理主题包自己的资源和贴纸。

## 验收标准

- v2 最小包、完整包均能导入；v1 ZIP 仍能导入并按原语义应用。
- 缺失文件、路径穿越、未知资源 ID、非法字体等错误不会留下半套主题。
- 两套以上贴纸能默认进入导入贴纸，并可按 `sourceSetIds` 合并成一个大组。
- 主题删除后，该主题的静态资源、贴纸和字体记录消失。
- 相同 ID 直接覆盖；不同 ID 同名拒绝；保存方案仍为 apply-only。
- 完成相关 Vitest、`npm run build` 和方案 Tab 手动冒烟验证。
