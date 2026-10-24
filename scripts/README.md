# 图片优化脚本使用说明

2026-10-24：手账渲染检查年度、月度、周度 Time Distribution，标签/待办的父子分组、无关键字统计、应用内排期标签、左页单一时间轴、7.5pt 概览摘录、原始用户配色及完整图文。原有年度心情年历、双字体、A4/A5 方向、Collection、引导分组和单行贴纸检查保留。主检查命令可同时传入 A4、A5 主册及两个年度心情示例。

2026-10-23：手账示例补充多图、多选/文本/数值属性、评分、reaction、评论、原位节点别名和六维统计数据。检查脚本验证四档字号、0.375pt 描边、所有图片比例、评论仅打印一次、节点仅在原备注显示，以及 A4/A5 封面、打卡、环图、每日分栏和图文续页。浏览器用例同时验证日志原图缺失时明确失败且不下载残缺 PDF。

2026-10-23：真实渲染测试额外导出 `journal-mood-year-a5.pdf`，含 365 天心情数据。检查脚本支持该文件，断言年度矩阵只有一页、贴纸放置恰好 365 次、尺寸小于 15pt，16 条一句话总结在一张双栏页内，并生成年度贴纸/总结预览图。

2026-10-23：手账 PDF 检查增加 A4 全书横版、A5 偶数起始跨页、真实空白页、八列复盘、贴纸图片、月周日顺序与实际 Log 的断言；渲染输出 `month-calendar.png` 和 `weekly-timeline.png` 便于检查完整摊开布局。示例包含实际关联待办的跨日追踪、父子目标进度和本地原始贴纸。

2026-10-23：手账示例数据改为 `scripts/fixtures/journal-demo.ts` 中整月分布的自然记录与排期；压力测试文本不再用于预览交付。字体准备脚本同时生成 Noto Sans SC 印刷字体，源文件为本地 `public/fonts/NotoSansSC-500.woff`。PDF 检查脚本新增字体角色、段落间隔、日程格内容、溢出标记和备注仅出现一次的断言。

2026-10-23：手账 PDF 使用 `python scripts/prepare-journal-font.py` 从现有本地文楷 WOFF2 生成 TrueType 资源（需要 fontTools 和 Brotli，生成资源遵循 public/ 不入库的现有规则）。构建后运行 `node scripts/test-journal-pdf-renderer.mjs` 检查实际表单、A4/A5 下载、取消和失败恢复；随后运行 `python scripts/check-journal-pdf.py <a4.pdf> <a5.pdf>` 验证中文实际可见、正文完整和页面边界，并输出逐页 PNG 与联系表。

2026-10-11：`node scripts/check-note-autocomplete-smoke.mjs` 增加真实补记弹窗在桌面/手机宽度下的首次定位回归，模拟键盘缩放、延迟移动和原生过度滚动，并检查手动滚动、输入、失焦、超时和卸载会停止校正。

2026-10-11：`node scripts/check-note-autocomplete-smoke.mjs` 同时验证回顾引导回答的历史补全、真实回答更新、Tab/点击/原生触屏接受、输入法、展开、节点括号及阅读/选择题模式，输出桌面和手机截图。

2026-10-11：`node scripts/test-check-stats-renderer.mjs` 在隔离的 Electron 窗口中验证日课年视图的原生横向触屏滚动、年份箭头、缓存更新、周/月视图和桌面布局。运行前执行 `npm run build`；截图明确加载并验证微软雅黑字体，输出到临时目录。

2026-10-10：个人词典浏览器验证还使用真实 DataProvider/NodeProvider 检查节点名称和未使用过的别名参与补全、节点词保留完整分词、改名/别名变更/删除即时刷新，以及节点词不显示或存入手动词典。

2026-10-09：`node scripts/check-personal-dictionary-smoke.mjs` uses an isolated Chrome profile and a verified Microsoft YaHei font to check dictionary entry/search/removal, note completion, actual word clouds and preference restore at desktop/mobile widths. Screenshots and results are saved under `node_modules/.cache/personal-dictionary-smoke`.

2026-10-07：节点渲染验证还覆盖可搜索分类选择器、胶囊布局、通过原生鼠标及触屏事件进行的跨分类拖动、空分类接收、节点/分类排序、取消和重新加载。管理页包含手机与桌面截图。

节点渲染验证：先运行 `npm run build`，再运行 `node scripts/test-nodes-renderer.mjs`。测试使用隐藏的独立 Electron 配置，验证详情、备注草稿提示、别名编辑、重命名、持久化和返回；截图显式加载微软雅黑，保存在系统临时目录，不访问用户日常应用数据。

## test-ai-log-attributes-renderer.mjs

`node scripts/test-ai-log-attributes-renderer.mjs` 在隔离、隐藏的 Electron 中验证 AI 补记四种属性的结果卡显示、实时编辑、清空、撤销和旧消息兼容性。先运行 `npm run build`；明确加载已验证的微软雅黑字体，桌面及手机宽度截图保存在临时目录，不访问用户数据。

## test-detail-statistics-renderer.mjs

2026-10-09：补充词云的合并词、停用词、高频词选择、删除规则、独立保存、重新加载、时间范围、备注和条件属性，以及 Escape 和硬件返回检查；截图在桌面与窄屏之间恢复对应尺寸。

`node scripts/test-detail-statistics-renderer.mjs` 在隔离、隐藏的 Electron 中验证筛选器和领域统计的来源限制、历史数据、卡片/配色保存、编辑表达式、清空和恢复卡片，以及跨午夜时长热力图。先运行 `npm run build`；使用已验证的微软雅黑字体，桌面及窄屏截图保存到临时目录。

## test-feedback-report-renderer.mjs

`node scripts/test-feedback-report-renderer.mjs` 在隔离、隐藏的 Electron 中验证反馈弹窗持续显示、移动端布局、反馈 ID / 用户编号 / 合并复制、复制失败保留弹窗，以及关闭、Escape、硬件返回。先运行 `npm run build`；截图保存到临时目录。

## check-feishu-auto-smoke.mjs

`node scripts/check-feishu-auto-smoke.mjs` 在隔离、隐藏的 Electron 中检查飞书自动同步页面及真实 IndexedDB 持久化，使用模拟 API。覆盖首次安装数据初始化与演示数据保护、开关、事务回滚、新增修改删除、离线重开恢复及暂停后继续。

## run-feishu-server.mjs

2026-10-03：默认服务改为专属应用设备流程，不再要求公共 App ID/Secret 或授权回调。开发服务自动保存固定加密密钥；生产仍需维护者提供持久化存储和加密密钥。Electron 本机主进程直连无需该服务。`check-feishu-personal.mjs` 可检查真实注册入口，只输出阶段和官方网页来源，不打印设备码或创建应用；运行 `node --experimental-sqlite --experimental-strip-types scripts/check-feishu-personal.mjs`。下方 2026-10-02 的公共应用配置仅用于旧模式兼容。

2026-10-02：`npm run dev` 通过 `feishu-dev-service.mjs` 自动准备本机飞书 API（默认 3003）：复用已运行的服务，或启动并清理自己创建的子进程。配置远端服务时不启动本地 API，构建/预览也不会启动。`npm run feishu:dev` 可单独联调，`npm run feishu:start` 强制生产配置校验并支持托管平台 `PORT`。需要 Node 22.12+、维护者注册的飞书应用及持久化加密 SQLite。服务未配置时只返回未开通状态，不生成假的授权链接。部署配置见 [飞书日历授权说明](../docs/feishu-calendar-test.md)。

## optimize-images.js

自动优化 PNG 图片为 WebP 格式，减小安装包体积。

### 功能

1. **自动备份**：将原始 PNG 文件备份到 `static/png_backup` 目录
2. **格式转换**：将 PNG 转换为 WebP 格式（质量 85%）
3. **自动清理**：删除原始 PNG 文件，只保留 WebP

### 使用方法

```bash
npm run optimize-images
```

### 处理的目录

- `public/background` - 背景图片
- `public/dchh` - 导航栏装饰
- `public/time_pal_origin` - 时光小友图片
- `public/icon_style` - 应用图标样式

### 优化效果

- **压缩率**：通常可达 85-95%
- **质量**：视觉上几乎无损
- **示例**：5.44 MB PNG → 0.37 MB WebP（减少 93.2%）

### 工作流程

当你添加新的 PNG 图片到上述目录后：

1. 运行 `npm run optimize-images`
2. 脚本会自动：
   - 备份 PNG 到 `static/png_backup`
   - 转换为 WebP 格式
   - 删除原始 PNG 文件
3. 如果 WebP 已存在，会自动跳过

### 恢复原始文件

如果需要恢复 PNG 文件：

```bash
# 从备份目录复制回来
cp static/png_backup/public/background/xxx.png public/background/
```

### 注意事项

- ✅ 自动跳过已转换的文件
- ✅ 备份文件不会被 Git 追踪（已添加到 .gitignore）
- ✅ 备份文件不会被打包到安装包中
- ⚠️ 确保代码中使用 `.webp` 扩展名引用图片

### 其他脚本

- `convert-to-webp.js` - 仅转换，不删除原文件（已废弃）
- `backup-and-clean-png.js` - 仅备份和删除（已废弃）

推荐使用 `optimize-images.js` 一键完成所有操作。


## convert-uiicon-to-webp.js

专门用于转换 `public/uiicon` 文件夹下的 UI 图标为 WebP 格式。

### 功能

- 将所有 PNG 图标转换为 WebP 格式
- 使用高质量设置（90%）确保图标清晰
- 自动删除原始 PNG 文件
- **不进行备份**（假设用户已有备份）

### 使用方法

```bash
npm run convert-uiicon
```

### 处理的目录

- `public/uiicon/cat` - 猫咪主题图标
- `public/uiicon/color` - 彩色主题图标
- `public/uiicon/color2` - 彩色主题图标 2
- `public/uiicon/forest` - 森林主题图标
- `public/uiicon/plant` - 植物主题图标
- `public/uiicon/prince` - 小王子主题图标
- `public/uiicon/purple` - 紫色主题图标

### 注意事项

- ⚠️ **此脚本不会备份原文件**，请确保已有备份！
- ⚠️ 转换后原始 PNG 文件会被永久删除
- ✅ 使用 90% 质量确保 UI 图标清晰度
- ✅ 自动递归处理所有子文件夹

### 使用场景

当你在 `public/uiicon` 文件夹下添加新的 UI 图标主题时：

1. 确保已备份原始 PNG 文件
2. 运行 `npm run convert-uiicon`
3. 脚本会自动转换所有 PNG 为 WebP 并删除原文件
4. 更新 `src/services/uiIconService.ts` 添加新主题配置


## convert-achievement-bottle-icons-to-webp.js

专门用于整理 `public/stars` 下的成就瓶图标包素材。

### 功能

- 递归扫描 `public/stars` 下所有图标素材
- 先备份到 `static/png_backup/public/stars`
- PNG/JPG/JPEG 会统一转换为 WebP
- 所有图标会在各自文件夹内重命名为 `01.webp`、`02.webp`、`03.webp`...

### 使用方法

```bash
npm run convert-achievement-bottle-icons
```

### 适用场景

当你给成就瓶新增或替换图标包素材时：

1. 把新的 PNG 放进 `public/stars/<pack>/`
2. 运行 `npm run convert-achievement-bottle-icons`
3. 脚本会自动转换并把每个图标包整理成统一序号命名

2026-10-24：`test-journal-pdf-renderer.mjs` 另外导出六种封面排版、六种内置字体和上传 WOFF2 字体样张，并检查解锁状态、独立字体选择及自定义色。`check-journal-covers-fonts.py <样张目录>` 验证可搜索中文与可见字形，生成封面拼图及六页封面 PDF。
