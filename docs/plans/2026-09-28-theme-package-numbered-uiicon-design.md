# 主题包完整 UIIcon 设计

主题包模板增加完整 UIIcon 资源声明：`resources.uiIcons` 使用 `numberedDirectory: "assets/uiicon"`，并由 `apply.uiIcon` 选择该资源。作者只需将 `01` 至 `96` 的 PNG 或 WebP 图片放到该目录。

解析主题包时，对声明 `numberedDirectory` 的 UIIcon 资源强制校验目录中恰好包含每个编号一张 PNG/WebP。应用主题时，按文件编号映射到既有 UI 图标槽位。旧版以 `files` 字段提供部分图标映射的主题包保持兼容。
