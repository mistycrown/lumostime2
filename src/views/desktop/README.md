# Desktop Widget Views

`src/views/desktop/` contains the Electron-only widget surfaces. They run in separate windows and sync with the main app through IPC, IndexedDB snapshots, and `BroadcastChannel`.

## Updates

- 2026-05-17: 优化了月历小组件（DesktopMonthWidgetView.tsx）右侧计划栏的分类标签，将其顺序变更为 maybe / arrange / due 并默认选中 arrange 标签，标签样式改为英文小写形式。
- 2026-05-17: 新增并迭代重构了 `DesktopQuickWidgetView.tsx`（小事清单小组件）。移除了任务前面的颜色圆点、顶部控制栏的日期显示以及所有多余的分组标题（如置顶、今天、逾期等），使小事列表完全扁平化展示，视觉极致纯粹精简；同时新增了屏幕内快速添加小事的精致输入栏，完全打通了小事的新增、勾选、多端无感知同步。
- 2026-05-17: Added `DesktopTodayWidgetView.tsx` for the compact desktop today widget.
- 2026-05-17: Added `DesktopMonthWidgetView.tsx` for the desktop planning calendar widget.
- 2026-05-17: The desktop month widget now pages by `2 / 3 / 4` whole weeks instead of forcing one fixed month per screen. Header arrows and wheel gestures move by one page, `本月` jumps to the page containing today, and changing weeks-per-page no longer auto-resizes the widget window.
- 2026-05-17: `DesktopMonthCalendar.tsx` now renders a dynamic `7 x 2/3/4` week-page grid while preserving drag-to-schedule behavior and the right-side planning sidebar.
- 2026-05-17: The desktop month widget now supports a persisted top-right sidebar collapse toggle, and `DesktopMonthCalendar.tsx` now reuses the shared week-trace lane layout so cross-day `Trace` bars stay connected while `Maybe` and `Done` match the app month-view styling.
- 2026-05-17: `DesktopMonthCalendar.tsx` now estimates visible todo rows from the widget's real body height, so taller month-widget cells keep using spare vertical space before showing `+N`.

- 2026-05-17: `DesktopMonthWidgetView.tsx` now groups the right planning sidebar by todo category, removes the extra linked-category line, and keeps one-level subtasks visible under their parent rows or as standalone `子任务 @父任务` rows when the parent is filtered out.

## Included Views

### `DesktopQuickWidgetView.tsx`

- 渲染轻量级的桌面小事待办清单。
- 移除了专注计时（Play）按钮，去除了任务前面的颜色圆点以及控制栏的日期，**并彻底剔除了“置顶/今天/逾期”等日期与分组标题**，使待办事项呈完全扁平、一目了然的素雅纸条平铺状态，视觉无任何杂质。
- 新增屏内“快速添加小事”输入框（通过顶部控制栏 `+` 按钮触发），支持回车直接添加、ESC 取消输入并自动收起，拥有极其出色的按键 and 焦点响应。
- 拥有独立于今日小组件、月历小组件的透明度、深浅色模式等显示设置的持久化本地存储。

### `DesktopTodayWidgetView.tsx`

- Renders the lightweight desktop summary for pinned, today, and overdue tasks.
- Supports opening the main app, opening a todo, toggling completion, and focus shortcuts through the shared widget bridge.

### `DesktopMonthWidgetView.tsx`

- Owns the desktop month-widget shell, unified header, display settings, and sidebar.
- Persists theme, opacity, and weeks-per-page settings while keeping widget size unchanged when the weeks-per-page setting changes.
- Handles widget data refresh, cross-window sync, and drag-and-drop write-back.
- Renders grouped `Arrange / Maybe / Due` sidebar sections so tasks stay separated by todo group and subtasks remain visible.

### `DesktopMonthCalendar.tsx`

- Renders the week-paged calendar body for the desktop widget.
- Shows `2 / 3 / 4` whole weeks per page with a fixed seven-column weekday layout.
- Handles date-cell rendering, task strips, drag targets, and wheel-based page navigation.

## Sync Mechanisms

- `BroadcastChannel('lumostime-data-sync')`: propagates todo changes across windows.
- `window.focus`: refreshes widget data when the widget regains focus.
- Periodic refresh: provides a safety-net reload in case a sync event is missed.
