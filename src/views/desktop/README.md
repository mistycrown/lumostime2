# 桌面小组件视图

`src/views/desktop/` 保存 Electron 桌面小组件专用视图。它们运行在独立窗口里，通过 IPC、IndexedDB 和 `BroadcastChannel` 与主应用同步。

## 更新日志

- 2026-05-17: 新增 `DesktopTodayWidgetView.tsx`，提供桌面今日任务小组件。
- 2026-05-17: 新增 `DesktopMonthWidgetView.tsx`，提供桌面月历排期小组件。
- 2026-05-17: 新增 `DesktopMonthCalendar.tsx`，把月历主体改为固定 6x7 整月网格，保证每个格子始终显示日期和紧凑任务条目，并让格子内边距、条目留白、标记条样式更贴近应用内月视图。
- 2026-05-17: 修复桌面月历中 `Maybe` 条目拖拽改期时原日期不会移除的问题，避免写回重复的 `maybeDates`。
- 2026-05-17: 将桌面月历重构为单层标题栏，外层统一承接“上个月 / 下个月 / 本月 / 显示设置”，并支持鼠标滚轮切换月份及小组件高度预设。

## 包含的视图

### `DesktopTodayWidgetView.tsx`

- 轻量展示今日任务、Pin、Overdue 等桌面摘要内容。
- 支持从小组件回到主应用、打开任务、切换完成状态。

### `DesktopMonthWidgetView.tsx`

- 作为桌面月历窗口的外层容器。
- 左侧挂载固定整月月历，右侧提供常驻 `Arrange / Maybe / Due` 侧栏。
- 负责数据刷新、统一标题栏、窗口显示设置、BroadcastChannel 同步和拖拽写回。

### `DesktopMonthCalendar.tsx`

- Reuses `TodoMonthView.tsx` in an embedded desktop mode so the widget calendar now scrolls continuously across months instead of switching one fixed month screen at a time.
- Bridges desktop-specific month-jump requests, active visible-month reporting, and external sidebar drag state into the shared rolling month-view engine.

- 桌面月历专用的固定月视图。
- 使用传统 6x7 整月网格而不是滚动周视图。
- 负责星期栏、格子渲染、条目展示、拖拽落点和滚轮换月。

## 同步机制

- `BroadcastChannel('lumostime-data-sync')`：跨窗口同步 todo 变更。
- `window.focus`：窗口重新聚焦时刷新数据。
- 定时刷新：作为兜底，定期重新读取最新快照。
