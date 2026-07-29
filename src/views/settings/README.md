# Settings Views

`src/views/settings/` contains full-screen settings subviews extracted from the main `SettingsView.tsx`.

## Updates

- 2026-07-29: `PreferencesSettingsView.tsx` adds Display-section Chronicle layout and schedule-canvas default-hour selectors using the existing anchored dropdown/listbox pattern.
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

## Integration Notes

- Each subview receives `onBack` so it can return to the main settings page.
- Shared state is still passed through props from `SettingsView.tsx`.
- Keep visual language consistent with the rest of settings: full-screen layout, soft stone palette, and minimal controls.
