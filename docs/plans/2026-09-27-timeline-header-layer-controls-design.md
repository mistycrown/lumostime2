# 脉络顶部主题分层调试设计

## 目标

扩展“小王子星空”顶部主题：前三层背景保持单图配置，新增独立贴纸可逐项定位；深色顶部背景可定义并应用工具栏前景色。

## 配置模型

- `topBackground`：标题栏与日期区域的整体背景，仅一张。
- `dateBackground`：日期栏背景，仅一张；可横向和纵向缩放。
- `selectedDateBackground`：选中日期背景，仅一张；不参与调试。
- `stickers.header` / `stickers.weekCard`：任意数量的贴纸；每张有独立 X/Y 偏移。
- `toolbarForeground`：主题级工具栏颜色，控制图标、Today 文本与边框、展开按钮图标与边框。

## 小王子素材映射

- `01_top_header_background.png` → `topBackground`
- `02_date_bar_background.png` → `dateBackground`
- `08_selected_date_card.png` → `selectedDateBackground`
- `03–07` → 分布在标题栏和日期栏边缘的独立贴纸

## 调试器

前后按钮循环浏览“日期栏背景”与所有贴纸。日期栏背景仅显示横纵缩放；贴纸仅显示 X/Y 偏移。顶部背景、选中日期背景和工具栏前景色不进入位置调试。

## 验证

运行 `npm run build`，确认主题配置、设置持久化与调试器编译通过。
