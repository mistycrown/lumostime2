# 场景小组件时间段滚动设计

日期：2026-08-10

## 目标

场景小组件左侧保留当前时间段图标的尺寸和视觉样式，同时支持上下滑动查看第 7 个及之后的时间段。滚动条不显示。

## 方案

将左侧 6 个固定 `FrameLayout` 替换为 Android `ListView` 集合视图。新增 `RemoteViewsService` 为每个时间段生成列表项，并通过集合视图的 pending-intent template 将点击事件回传给现有场景 Provider。列表项复用 `WidgetSceneTabBitmapRenderer`，因此选中态、UI 图标资源和 emoji fallback 与现有实现一致。

## 数据流与行为

- Provider 更新小组件时，为左侧 `ListView` 设置远程适配器和点击模板。
- 列表服务按小组件实例读取 `resolveState`，返回当前场景组的全部时间段。
- 点击列表项携带 `scene_slot_id`，继续走 `ACTION_SELECT_SCENE_TAB`，现有选择持久化和卡片刷新逻辑不变。
- 数据刷新时通知左侧列表和右侧卡片集合视图更新。
- `ListView` 关闭滚动条和 overscroll 视觉反馈，避免显示额外滚动指示器。

## 验证

- 时间段少于 6 个时不出现空白占位项。
- 时间段超过 6 个时可通过左侧上下滑动访问第 7 个及以后项目。
- 点击任意时间段仍能切换右侧卡片，选中态正确显示。
- 执行 Android Gradle 的源码检查；不在本仓库编译完整 Android APK。
