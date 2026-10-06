# Settings Views

Update 2026-10-06: Settings → 内容 → 节点 opens `NodesSettingsView.tsx`, a compact two-line directory searchable by name/alias and sortable by recency, backlink count or name. Selection opens the global node-detail overlay.

2026-10-06：`FiltersSettingsView.tsx` 保存筛选器统计卡片和配色；编辑名称、表达式时保留既有配置与图标。

2026-10-03：飞书日历页增加本机、按账号保存的自动同步开关、队列状态与立即同步；历史手动同步保留，忽略分类偏好同时影响全局自动调度。

`src/views/settings/` contains full-screen settings subviews extracted from the main `SettingsView.tsx`.

## Updates

- 2026-10-03: Feishu test categories use the shared themed `CustomSelect`, category color dots and a portal dropdown. Archived/removed selections fall back to the same active category that the test uses; with no active categories, the main calendar is used.

- 2026-10-03: Feishu imports resolve linked todo/scope names from hydrated local data and include notes, attributes, focus/mood scores, progress and Log IDs in sectioned calendar descriptions. Existing imported events remain deduplicated rather than overwritten.

- 2026-10-03: Feishu now guides users to create their own app on Feishu, then authorize calendars from the second consent button. Electron uses the local main-process executor; Web/Android use the personal execution service. Existing test/import and numeric dates remain explicit user actions.

- 2026-10-02: The Feishu page always shows the connection entry, uses the unified service OAuth flow, and automatically creates/reuses one calendar per activity category with its initial category color. Users can test a selected category and explicitly import actual records; there are no service URL or credential fields.

- 2026-10-02: `FeishuCalendarSettingsView.tsx` uses eight-digit numeric text dates with 本周/本月/上周/上月 presets, validates real/reversed dates, previews eligible records/categories and imports five records per batch with progress and created/skipped/failed totals.

- 2026-10-02: `FeishuCalendarSettingsView.tsx` adds the manual calendar connectivity/test-block action; credentials stay on the server and test results are shown in the settings page.

- 2026-09-08: `ReviewOverviewQuestionVisibilityView.tsx` adds per-question display toggles grouped by review template; hidden questions are filtered from Review Overview counts and details without changing review data.

- 2026-08-09: `ReviewOverviewView.tsx` adds a `回顾总览` settings subpage that groups Daily/Weekly/Monthly review answers by template group and question, with newest-first answer detail.
- 2026-08-09: `ReviewOverviewView.tsx` now makes each answer date a low-key link into its source review while preserving the return stack: source detail, answer detail, then overview.
- 2026-08-09: `ReviewOverviewView.tsx` now matches tag-detail side spacing, hides its scrollbars, and renders choice answers as capsules plus rating answers as icon scores.
- 2026-07-29: `PreferencesSettingsView.tsx` keeps the Display-section Chronicle layout selector; the schedule canvas now starts from the current time and no longer exposes a default-hour selector.
- 2026-07-31: `PreferencesSettingsView.tsx` renames the Chronicle layout selector to `默认脉络布局`, clarifying that navigation taps can temporarily switch the active Timeline layout without changing this default.
- 2026-06-06: `FiltersSettingsView.tsx` now labels `@` syntax as `待办/分类`, aligning the settings help text with the shared custom-filter behavior for linked-log todo matches.
- 2026-05-17: 重构设置菜单布局，新增了“Windows 特性”分组，将“PC端小组件”与原在数据同步分类下的“导出到 Obsidian”归拢在此专有分组下，并确保其在安卓端不可见。
- 2026-05-17: 优化了显示条件，结合 !Capacitor.isNativePlatform() 逻辑彻底确保“PC端小组件”设置项在 Android 端隐藏。
- 2026-05-17: 进行了重命名与界面极简化修改，将设置项名称由“桌面今日小组件”更名为“PC端小组件”，并移除各小组件选项下的详细说明文字，仅保留标题。
- 2026-05-17: `DesktopWidgetSettingsView.tsx` added a toggle switch and IPC launcher for the "Desktop Month Widget" (桌面月历小组件).
- 2026-05-14: `AISettingsView.tsx` now supports named AI API presets with a built-in `默认预设`, custom preset create/rename/delete actions, provider-template switching, and per-preset `API Key / baseUrl / modelName` storage while switching the active preset immediately.
- 2026-05-10: `PreferencesSettingsView.tsx` changed the post-start timer jump behavior from a boolean toggle into a three-option selector.

## Current Subviews

### `DesktopWidgetSettingsView.tsx`
- Toggle switches for "Desktop Today Widget" and "Desktop Month Widget" (re-styled to only show titles for a cleaner look)
- Triggers open/close Electron IPC events for each desktop widget
- Validates desktop availability so it gracefully disables toggles on web/mobile clients

### `CloudSyncSettingsView.tsx`
- WebDAV connection settings
- Upload/download data with cloud sync
- Disconnect and clear sync config

### `AISettingsView.tsx`
- AI preset selection and quick switching
- Built-in `默认预设` plus custom preset create/rename/delete
- Provider template selection: Gemini, DeepSeek, 硅基流动, OpenAI 兼容, 自定义
- Independent `API Key / API 地址 / 模型名称` storage per preset
- Save and connection test

### `S3SyncSettingsView.tsx`
- S3 / COS connection settings
- Upload/download sync data
- Disconnect and clear config

### `DataManagementView.tsx`
- JSON import/export
- Excel export
- Image cleanup and consistency tools
- Cloud backup cleanup
- Reset and clear data actions

### `ReviewOverviewView.tsx`
- Browse Daily, Weekly, and Monthly review answers from Settings > Content
- Uses historical `templateSnapshot` groups before falling back to current review templates
- Opens per-question answer detail sorted newest first

## Integration Notes

- Each subview receives `onBack` so it can return to the main settings page.
- Shared state is still passed through props from `SettingsView.tsx`.
- Keep visual language consistent with the rest of settings: full-screen layout, soft stone palette, and minimal controls.
2026-10-03：飞书日历页引导用户在官方网页创建专属应用，再点击“授权飞书日历”；按阶段重新打开确认网页。创建和授权阶段都不导入日程。保留已连接后的测试、分类日历、八位数字日期和手动正式导入。

2026-10-03：手动同步增加更新、删除和分类迁移计数；删除由完整本地快照与账号账本比对，空范围仍可同步。日期变化或数据重新加载时停止后续批次，避免把尚未加载的记录判成删除。

2026-10-03：日期下方增加紧凑的“忽略分类”多选按钮，不显示分类色点，选中用深色背景和小勾表示。本机记住选择，并更新导入数量预览。忽略分类的记录不新增、更新、迁移或删除；来源分类也被忽略的迁移记录保留原日程，取消勾选后恢复同步。
