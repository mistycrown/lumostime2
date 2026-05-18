# Desktop Widget Views

`src/views/desktop/` contains the Electron-only widget surfaces. They run in separate windows and sync with the main app through IPC, IndexedDB snapshots, and `BroadcastChannel`.

## Updates

- 2026-05-18: `DesktopTodayWidgetView.tsx` now renders one-level subtasks inline beneath visible parent rows, while subtasks whose parent is outside the current section fall back to standalone `子任务 @父任务` labels so the compact today widget no longer drops hierarchy context.
- 2026-05-18: `DesktopMonthWidgetView.tsx` now shifts the visible calendar by one week for vertical wheel/trackpad navigation while keeping header arrows as whole-page jumps, so `1/2/3 -> 2/3/4` works in 3-week mode.

- 2026-05-18: `DesktopMonthCalendar.tsx` 支持在月视图小组件中为如果是 recurring（循环）类型的任务靠右渲染 `Repeat2` 图标，模仿截止 (due) 条目的 Flag 样式，保持 UI 一致。

- 2026-05-17: `DesktopMonthWidgetView.tsx` and `DesktopMonthCalendar.tsx` now expose a dedicated month-entry background opacity slider in widget display settings, so users can strengthen or soften calendar item fills without changing the whole window opacity.

- 2026-05-17: `DesktopMonthCalendar.tsx` now colors desktop month rows from the shared month-entry `primaryKind`, so a todo that is both completed and due/arranged/maybe on the same day still renders with completed-first styling while the existing continuous trace strip layout remains intact.
- 2026-05-17: `DesktopMonthCalendar.tsx` 支持在格子中为由于 (due) 类型的条目加上 flag 图标（并实现超出截断且 flag 完整显示），并将 trace / 连续 trace 条目字色置为灰色。

- 2026-05-17: 修复并优化了桌面任务快捷编辑气泡框（`DesktopTodoQuickEditorPopover.tsx`）在 `inline` 模式下的最大高度限制和 flex 伸缩布局，解决子任务条目过多时由于外层未限高导致无法在独立 Electron 窗口内滚动显示的问题。
- 2026-05-17: 支持了桌面月历小组件中任务着色模式的屏内切换，用户可以在显示设置面板中选择“按排期”或“按分类”进行着色渲染，并能直接无缝同步和读取应用内已有的排期或分类颜色配置。
- 2026-05-17: `DesktopTodoQuickEditorWindowView.tsx` now hosts the shared widget quick editor inside its own transparent always-on-top Electron window, with an added quick toggle-complete action button next to the external-link button in the popover header, so todo clicks from today/quick/month widgets can open a larger editor beyond the source widget bounds instead of getting clipped by the widget `BrowserWindow`.
- 2026-05-17: `DesktopTodayWidgetView.tsx`, `DesktopQuickWidgetView.tsx`, `DesktopMonthWidgetView.tsx`, and `DesktopMonthCalendar.tsx` now route todo clicks into that external quick-editor window, using screen-space anchors instead of local popover coordinates.
- 2026-05-17: 优化了月历小组件计划栏，禁用列表项的点击跳转详情事件，移除了 hover 时向右的跳转详情箭头，变更为可点击的展开/收缩子任务按钮，支持父任务对其下子任务的收起与展开操作，无子任务的项则直接删除按钮，并在折叠状态下常驻显示展开图标。
- 2026-05-17: 新增了 `DesktopTimerWidgetView.tsx`（桌面计时器小组件）视图。长宽固定为 240px x 120px。静止（Resting）状态下大字呼吸计时，悬停（Hover）状态下展现活动标题与全功能操作按钮，支持主题与透明度调节，打通了结束专注与快速打开主页面的跨窗口动作转发。
- 2026-05-17: `DesktopMonthWidgetView.tsx` now keeps already dated unfinished todos visible across the right-side `arrange` / `maybe` / `due` tabs, sorts undated rows before dated rows inside each todo category, and shows compact trailing dates like `5/20` so items can be rescheduled in place.
- 2026-05-17: 优化了月历小组件（DesktopMonthWidgetView.tsx）右侧计划栏的分类标签，将其顺序变更为 maybe / arrange / due 并默认选中 arrange 标签，标签样式改为英文小写形式。
- 2026-05-17: 新增并迭代重构了 `DesktopQuickWidgetView.tsx`（小事清单小组件）。移除了任务前面的颜色圆点、顶部控制栏的日期显示以及所有多余的分组标题（如置顶、今天、逾期等），使小事列表完全扁平化展示，视觉极致纯粹精简；同时新增了屏幕内快速添加小事的精致输入栏，完全打通了小事的新增、勾选、多端无感知同步。
- 2026-05-17: Added `DesktopTodayWidgetView.tsx` for the compact desktop today widget.
- 2026-05-17: Added `DesktopMonthWidgetView.tsx` for the desktop planning calendar widget.
- 2026-05-17: The desktop month widget now pages by `2 / 3 / 4` whole weeks instead of forcing one fixed month per screen. Header arrows move by one page, `本月` jumps to the page containing today, and changing weeks-per-page no longer auto-resizes the widget window.
- 2026-05-17: `DesktopMonthCalendar.tsx` now renders a dynamic `7 x 2/3/4` week-page grid while preserving drag-to-schedule behavior and the right-side planning sidebar, and now wires up click handlers on monthly trace segments to trigger the quick actions popover outside widget bounds.
- 2026-05-17: The desktop month widget now supports a persisted top-right sidebar collapse toggle, and `DesktopMonthCalendar.tsx` now reuses the shared week-trace lane layout so cross-day `Trace` bars stay connected while `Maybe` and `Done` match the app month-view styling.
- 2026-05-17: `DesktopMonthCalendar.tsx` now estimates visible todo rows from the widget's real body height, so taller month-widget cells keep using spare vertical space before showing `+N`.

- 2026-05-17: `DesktopMonthWidgetView.tsx` now groups the right planning sidebar by todo category, removes the extra linked-category line, and keeps one-level subtasks visible under their parent rows or as standalone `子任务 @父任务` rows when the parent is filtered out.

## Included Views

### `DesktopTimerWidgetView.tsx`

- 桌面计时器小组件，长宽固定为 240px x 120px，不可拉伸，支持边缘 clamps 贴边和 bounds 持久化。
- 极简极致的毛玻璃设计语言。静止（Resting）时仅大字呼吸显示已用专注时间。
- 鼠标悬浮（Hover）时展现当前活动标题，滑入“结束提交”与“打开主页面”动作按钮，支持右上角一键收起。
- 带有屏内控制面板，用户可自由调节显示透明度以及深浅配色偏好，支持跨窗口 `window.storage` 本地秒级响应与数据自同步。

### `DesktopQuickWidgetView.tsx`

- 渲染轻量级的桌面小事待办清单。
- 移除了专注计时（Play）按钮，去除了任务前面的颜色圆点以及控制栏的日期，**并彻底剔除了“置顶/今天/逾期”等日期与分组标题**，使待办事项呈完全扁平、一目了然的素雅纸条平铺状态，视觉无任何杂质。
- 新增屏内“快速添加小事”输入框（通过顶部控制栏 `+` 按钮触发），支持回车直接添加、ESC 取消输入并自动收起，拥有极其出色的按键 and 焦点响应。
- 拥有独立于今日小组件、月历小组件的透明度、深浅色模式等显示设置的持久化本地存储。

### `DesktopTodayWidgetView.tsx`

- Renders the lightweight desktop summary for pinned, today, and overdue tasks.
- Keeps one-level subtasks visible by nesting children beneath visible parents and using `@parent` labels when a subtask appears without its parent in the same section.
- Supports opening the main app, opening a todo, toggling completion, and focus shortcuts through the shared widget bridge.

### `DesktopMonthWidgetView.tsx`

- Owns the desktop month-widget shell, unified header, display settings, and sidebar.
- Persists theme, opacity, and weeks-per-page settings while keeping widget size unchanged when the weeks-per-page setting changes.
- Handles widget data refresh, cross-window sync, and drag-and-drop write-back.
- Uses one-week vertical wheel/trackpad shifts while preserving whole-page header navigation.
- Renders grouped `Arrange / Maybe / Due` sidebar sections so tasks stay separated by todo group, subtasks remain visible, and every planning tab can show both undated and already dated unfinished todos for rescheduling.
- 计划栏支持父任务对其下子任务的折叠/展开操作，默认展开，并在折叠状态下有常驻的 `ChevronRight` 图标，禁用了条目详情跳转点击事件。

### `DesktopMonthCalendar.tsx`

- Renders the week-paged calendar body for the desktop widget.
- Shows `2 / 3 / 4` whole weeks per page with a fixed seven-column weekday layout.
- Handles date-cell rendering, task strips, drag targets, and wheel-based page navigation.

## Sync Mechanisms

- `BroadcastChannel('lumostime-data-sync')`: propagates todo changes across windows.
- `window.focus`: refreshes widget data when the widget regains focus.
- Periodic refresh: provides a safety-net reload in case a sync event is missed.
