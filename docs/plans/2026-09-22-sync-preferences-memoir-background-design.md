# 同步偏好、Memoir 筛选与自定义背景设计

## 目标

- 将偏好页中的持久化设置与 Memoir 筛选条件纳入统一云同步主负载。
- 保持自定义背景与时间小友一致：元数据进入外观快照，图片文件进入统一图片清单并随云端图片同步。
- 图片重建、检查和清理时保护仍被偏好引用的背景图片及缩略图。
- 兼容旧备份：缺少新增字段时继续使用本地现有值。

## 方案

新增 `preferencesData` 版本化快照服务，读取偏好页对应的 localStorage 键，并额外保存 `memoirFilterConfig`。同步主负载在构建时写入该快照，恢复时通过 SettingsContext 的 setter 写入运行态和 localStorage。旧 payload 没有 `preferencesData` 时不覆盖本地设置。

自定义背景继续由 `appearanceData` 保存元数据与当前选择；导入背景图片时立即加入 `imageService` 的引用图片列表，删除时沿用 `deleteImage` 的删除墓碑逻辑。统一图片引用收集、图片列表重建和图片清理都继续从设置元数据读取背景文件名及 `thumb_` 文件名，确保背景不会被误删。

## 数据流

1. 本地编辑偏好/Memoir → Context state → localStorage → 同步相关时间戳与自动同步。
2. 上传 → `preferencesData` + `appearanceData` 写入主 JSON；背景文件名由引用收集器写入图片清单，图片文件单独上传。
3. 下载 → 下载图片后应用 `preferencesData`、`appearanceData`；背景 hydration 使用已恢复的图片文件。
4. 图片重建/清理 → 业务记录 + 设置图片引用 → 保留背景、时间小友、贴纸及其他设置资产。

## 验证

- 为偏好快照补序列化/恢复兼容测试。
- 为自定义背景新增图片列表注册与引用重建测试。
- 运行相关 Vitest，并执行 `npm run build`。
