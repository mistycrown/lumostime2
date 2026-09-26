# 主题压缩包导入规范设计

日期：2026-09-26

## 目标

把“投喂小鱼干”中的主题发布方式统一为一个可导入的主题压缩包：主题作者只需发布一个 ZIP，用户在方案 Tab 导入后即可得到一个可切换的主题方案。

主题包同时承载：

- 可选的主题配置；
- 主题所需的图片、贴纸、图标、字体等资源；
- 主题的元数据、版本和预览图。

导入后的配置继续通过现有主题方案和用户数据同步机制同步，二进制资源进入主题资源清单，不把大文件直接塞入 localStorage。

## 已确认的产品决策

### 导入结果

主题包导入后生成一个独立的、可命名和可切换的主题方案，而不是直接覆盖当前方案。

导入界面提供两种动作：

- **导入并应用**：导入完成后立即切换到新主题；
- **仅导入**：只保存主题，不改变当前使用的主题。

### 部分配置

所有配置项均为可选项。主题包只声明它想控制的内容：

- JSON 字段不存在：保持用户当前值；
- 字段存在且有值：应用主题包值；
- 字段显式为 `null`：恢复该配置项的应用默认值。

### 更新规则

主题包使用稳定的 `package.id` 和语义化 `package.version`：

- 同一 `package.id` 导入更高版本：更新原主题方案；
- 同一 ID、同一版本：要求用户确认覆盖；
- 导入更低版本：默认拒绝降级，允许用户显式确认。

## ZIP 目录规范

压缩包根目录必须包含 `theme.json`，所有资源放在 `assets/` 下。路径使用 `/`，不得使用绝对路径、盘符、`..` 或反斜杠。

推荐目录结构：

```text
moonlit-garden-1.0.0.zip
├─ theme.json
└─ assets/
   ├─ preview.webp
   ├─ background/main.webp
   ├─ uiicon/*.webp
   ├─ stickers/<set-id>/*
   ├─ navigation/background.webp
   ├─ navigation/icons/*
   ├─ timepal/<timepal-id>/stage-1.webp ... stage-5.webp
   ├─ fonts/*.(woff2|woff|ttf|otf)
   ├─ achievement-bottle/<pack-id>/*.webp
   └─ memoir-calendar/five-week.webp
      memoir-calendar/six-week.webp
```

资源命名使用英文、数字、短横线和下划线。图片第一版支持 WebP、PNG、JPG；字体支持 WOFF2、WOFF、TTF、OTF。JSON 使用 UTF-8。

## `theme.json` 顶层结构

```json
{
  "format": "lumostime-theme-package",
  "schemaVersion": 1,
  "package": {
    "id": "moonlit-garden",
    "name": "月下花园",
    "version": "1.0.0",
    "author": "主题作者",
    "description": "一套月光与花园风格的主题",
    "preview": "assets/preview.webp"
  },
  "config": {
    "background": {},
    "uiIcon": {},
    "stickers": [],
    "color": {},
    "navigation": {},
    "timePal": {},
    "font": {},
    "achievementBottle": {},
    "timeline": {},
    "memoirCalendar": {}
  }
}
```

`package.id` 必须稳定且只包含小写英文、数字和短横线；`package.version` 使用 `主版本.次版本.修订版本`；`preview` 必须引用包内资源。

## 配置项规范

### 整体背景

```json
"background": {
  "source": "asset",
  "file": "assets/background/main.webp",
  "fit": "cover",
  "position": "center",
  "opacity": 0.92
}
```

内置背景使用：

```json
"background": { "source": "builtin", "id": "forest" }
```

### UIIcon

内置 UIIcon：

```json
"uiIcon": { "source": "builtin", "themeId": "cat" }
```

主题包自带 UIIcon：

```json
"uiIcon": {
  "source": "asset",
  "themeId": "moonlit-garden",
  "files": {
    "record": "assets/uiicon/record.webp",
    "todo": "assets/uiicon/todo.webp",
    "timeline": "assets/uiicon/timeline.webp"
  }
}
```

图标通过逻辑槽位 ID 绑定，不能绑定到 DOM 位置。未声明的槽位保持现有配置。

### Sticker

```json
"stickers": [
  {
    "id": "moon",
    "name": "月亮贴纸",
    "cover": "assets/stickers/moon/cover.webp",
    "items": [
      {
        "id": "moon-001",
        "name": "月亮",
        "file": "assets/stickers/moon/001.webp",
        "keywords": ["月亮", "夜晚"]
      }
    ]
  }
]
```

每套 sticker 的 `id` 必须稳定；同一套内的条目 ID 不得重复；一个主题可以包含多套 sticker。

### 整体配色

第一版复用应用内置配色方案：

```json
"color": { "schemeId": "morandi-purple" }
```

第一版不允许主题包注入任意 CSS。自定义颜色 Token 作为后续 schema 版本扩展。

### 新版导航栏

```json
"navigation": {
  "background": {
    "source": "asset",
    "file": "assets/navigation/background.webp",
    "position": "center",
    "opacity": 0.9
  },
  "icons": {
    "source": "asset",
    "files": {
      "record": "assets/navigation/icons/record.webp",
      "todo": "assets/navigation/icons/todo.webp",
      "timeline": "assets/navigation/icons/timeline.webp",
      "review": "assets/navigation/icons/review.webp"
    }
  }
}
```

### 时间小友

```json
"timePal": {
  "selected": "moon-cat",
  "items": [
    {
      "id": "moon-cat",
      "name": "月光猫",
      "stages": {
        "1": "assets/timepal/moon-cat/stage-1.webp",
        "2": "assets/timepal/moon-cat/stage-2.webp",
        "3": "assets/timepal/moon-cat/stage-3.webp",
        "4": "assets/timepal/moon-cat/stage-4.webp",
        "5": "assets/timepal/moon-cat/stage-5.webp"
      },
      "thresholds": [0, 60, 180, 360, 720]
    }
  ]
}
```

每个自定义时间小友必须提供 5 张阶段图；阈值可选，缺省时使用应用默认阈值。

### 字体

内置字体：

```json
"font": { "source": "builtin", "fontId": "lxgw-wenkai" }
```

自定义字体：

```json
"font": {
  "source": "asset",
  "file": "assets/fonts/moon-serif.woff2",
  "fontId": "moon-serif",
  "displayName": "月光宋",
  "familyName": "LumoThemeMoonSerif",
  "format": "woff2"
}
```

字体导入后生成主题命名空间内的内部 ID，字体文件进入主题同步资源，不直接使用上传文件名。

### 成就瓶

```json
"achievementBottle": {
  "iconPack": {
    "source": "asset",
    "id": "moon-stars",
    "frames": [
      "assets/achievement-bottle/moon-stars/01.webp",
      "assets/achievement-bottle/moon-stars/02.webp"
    ]
  },
  "style": {
    "source": "builtin",
    "id": "pearlMist"
  }
}
```

第一版样式使用现有样式 ID；自定义样式对象留给后续 schema 版本。

### 时间线样式

```json
"timeline": {
  "themeId": "celestial",
  "configVersion": 1,
  "config": {
    "lineColor": "#8f91b8",
    "nodeColor": "#d9d8ef",
    "lineOpacity": 0.72,
    "lineWidth": 2,
    "nodeRadius": 6
  }
}
```

`config` 只能包含应用当前版本明确支持的字段，并由导入器做范围校验。

### Memoir 日历背景

```json
"memoirCalendar": {
  "background": {
    "fiveWeek": "assets/memoir-calendar/five-week.webp",
    "sixWeek": "assets/memoir-calendar/six-week.webp",
    "settings": {
      "offsetX": "0px",
      "offsetY": "0px",
      "scale": 1.35,
      "opacity": 1
    }
  }
}
```

五周和六周图片必须同时提供。

## 导入事务与错误处理

导入器按以下顺序执行：

1. 读取 ZIP 并确认根目录存在 `theme.json`。
2. 校验 `format`、`schemaVersion`、包 ID、版本号和 JSON 结构。
3. 校验所有资源引用存在，拒绝路径穿越和绝对路径。
4. 校验文件类型、文件大小和各资源数量；时间小友必须有 5 张阶段图，Memoir 必须有两种尺寸。
5. 将资源写入临时区域并计算稳定资源 ID。
6. 写入主题元数据和配置。
7. 根据用户选择应用主题。
8. 触发现有主题、贴纸、导航、TimePal、字体和日历背景刷新事件。

任意一步失败都回滚本次新增的配置和资源，不能留下“半套主题”。导入错误应明确指出配置路径，例如 `config.timePal.items[0].stages.3`。

## 同步与资源生命周期

主题配置元数据进入现有用户数据 / 外观同步 JSON；图片、贴纸、字体和图标进入现有主题资源清单与资源同步通道。

资源引用使用稳定命名空间，例如：

```text
theme:moonlit-garden:1.0.0:background.main
theme:moonlit-garden:1.0.0:timepal.moon-cat.stage-1
theme:moonlit-garden:1.0.0:font.moon-serif
```

删除或更新主题时，只有在资源不再被任何主题或用户配置引用时才允许清理资源。

## 安全边界

主题包是“资源 + 受控配置”，不是插件。第一版禁止：

- 任意 JavaScript；
- 任意 HTML；
- 任意 CSS 注入；
- 任意 Tailwind class；
- 外部 URL 资源；
- 通过资源路径访问应用数据。

这样可以保证主题包不会绕过应用权限，也不会因为主题资源导致用户数据泄露或界面执行未知代码。

## 实现拆分

后续实现分为五个阶段：

1. 定义 TypeScript 类型和 `theme.json` JSON Schema。
2. 实现 ZIP 读取、路径安全检查、资源校验和临时导入事务。
3. 扩展现有主题、贴纸、导航、TimePal、字体、成就瓶、时间线和 Memoir 服务的导入适配器。
4. 将主题包元数据和资源清单接入现有用户数据同步。
5. 在方案 Tab 增加导入、预览、版本更新、仅导入和导入并应用流程，并补充单元测试和手动 smoke test。

## 验证标准

- 只包含背景的最小主题包可以成功导入，其他设置保持不变。
- 含多套 sticker 和多组资源的主题包可以完整导入和切换。
- 无效路径、缺少资源、非法字体和版本不兼容时不会产生半套数据。
- 导入后的配置和二进制资源可以通过现有同步机制在另一设备恢复。
- 删除主题不会误删仍被其他主题使用的资源。
- 重新导入同一主题的更高版本会更新原方案，不产生重复主题。
- 执行 `npm run build`，并完成方案 Tab、背景、导航、贴纸、TimePal、字体、成就瓶和 Memoir 的手动验证。

