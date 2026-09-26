# 主题压缩包导入实现计划

关联设计：[2026-09-26-theme-package-design.md](./2026-09-26-theme-package-design.md)

## 阶段 1：契约与解析层

目标：在不改变现有设置行为的情况下，能够读取并校验一个主题 ZIP。

- 新增主题包类型定义。
- 新增 `theme.json` 解析与 schemaVersion 校验。
- 新增 ZIP 路径安全校验。
- 校验资源引用存在、资源类型和必要数量。
- 为最小背景包、多 sticker 包、缺失资源包、路径穿越包补充测试。

## 阶段 2：资源导入事务

目标：将包内图片写入可同步的主题资源存储，将字体写入本机存储，并支持失败回滚。

- 为主题资源生成稳定的命名空间 ID。
- 图片通过 `imageService` 以 `theme` 分组写入。
- 字体通过 `customFontStorageService` 写入本机 IndexedDB，不加入云同步资源清单。
- 保存导入资源清单与主题资源元数据。
- 记录本次事务新增的文件，失败时逐项删除并恢复清单。

## 阶段 3：配置适配器

目标：把主题包配置映射到现有服务，不绕过现有校验。

- 背景：`backgroundService`。
- UIIcon：扩展 `uiIconService` 支持主题包资源。
- Sticker：复用 `customStickerAssetService` 的记录格式。
- 配色：复用 `colorSchemeService`。
- 新版导航背景和图标：扩展对应 navigation 服务。
- TimePal：复用 `timePalCustomService`。
- 字体：复用 `fontService`。
- 成就瓶：复用样式和图标包服务。
- 时间线：复用 timeline style service 的归一化函数。
- Memoir：复用 `moodCalendarBackgroundService` 的双尺寸背景结构。

## 阶段 4：方案与同步

目标：导入结果成为可切换主题方案，并能随用户数据同步。

- 扩展 `ThemePreset`，保存主题包 ID、版本、可选配置和资源引用。
- 更新 `themePresetService`，支持部分配置应用。
- 将主题包元数据加入 appearance backup；排除字体二进制和不可跨设备恢复的本机字体引用。
- 确认主题资源清单恢复后可以重新 hydration。
- 实现同 ID 版本更新、重复导入和降级确认。

## 阶段 5：方案 Tab 交互

目标：让用户在一个入口完成导入和使用。

- 添加“导入主题包”按钮。
- 解析后显示名称、作者、版本、预览图和将要变更的配置项。
- 提供“导入并应用”和“仅导入”。
- 显示明确的资源缺失和字段错误。
- 提供已导入主题的更新提示和删除入口。

## 阶段 6：验证

- 执行相关 Vitest 测试。
- 执行 `npm run build`。
- 手动验证 Web、Electron 方案 Tab。
- 手动验证导入后刷新、重启和图片资源同步恢复；跨设备缺少字体时应回退为默认字体。
- 检查主题删除不会清理其他主题仍引用的资源。
