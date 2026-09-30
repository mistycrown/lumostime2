# 主题字体 Android 兼容设计

日期：2026-09-30

## 背景

“兔子云朵”主题包在资源中包含 `assets/fonts/rabbit-bear-diary.ttf`，并通过
`apply.font` 要求导入后使用该字体。现有导入流程会将字体 Blob 转为
`ArrayBuffer`，直接作为第二个参数传给 `FontFace`。桌面 Chromium 可以处理该
形式；部分 Android WebView 会将该二进制参数按 CSS 来源字符串处理，导致导入时
抛出 `e.split is not a function`。不含外部字体、只引用内置字体的“植物手帐”不会
经过该流程。

## 目标

让所有有效的主题包字体（`woff2`、`woff`、`ttf`、`otf`）可在 Android WebView
中导入，同时保持桌面端现有的高效加载方式和导入事务的回滚语义。

## 方案

字体注册保留两阶段策略：

1. 首先使用当前的 `ArrayBuffer` 来源注册 `FontFace`。
2. 若该注册或加载失败，将同一 Blob 转为 data URL，并使用 `url("...")` CSS
   来源重新注册。data URL 不依赖短生命周期的对象 URL，能够在字体记录从
   IndexedDB 恢复时再次使用。

只有在两个阶段都失败时，`addCustomFont` 才返回失败。主题包导入服务沿用其已有
的 `FONT_IMPORT_FAILED` 处理，回滚本次导入保存的图片、字体和主题元数据。

## 错误处理

- 不检测平台或 User-Agent；以实际 `FontFace` 注册结果决定是否回退，避免把某个
  WebView 版本硬编码为不兼容。
- 回退失败时记录首选路径与回退路径的错误，用户侧继续获得现有的中文字体导入失败
  提示，而不是压缩后的内部异常。
- 不能注册自定义字体的环境仍按失败处理，不静默导入一个无法应用字体的主题。

## 测试

- `ArrayBuffer` 路径成功时不构造 data URL。
- 首选路径失败、data URL 路径成功时导入成功且字体加入 `document.fonts`。
- 两种路径均失败时 `addCustomFont` 返回失败，主题导入服务保持既有事务回滚。

## 非目标

- 不修改兔子云朵主题包、不移除其字体资源。
- 不把主题字体编入 Android 安装包。
- 不改变现有字体文件大小限制、支持格式或本地 IndexedDB 存储模型。
