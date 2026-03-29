# Services Architecture

Contains business logic and external integrations.

Update 2026-03-12: timeline styling for normal timeline records is managed by `timelineStyleService.ts`.

## Files
- `aiService.ts`: [Active] - Handles AI integration (OpenAI/Gemini) for text parsing and narrative generation.
- `excelExportService.ts`: [Active] - Exports time logs to Excel format.
- `geminiService.ts`: [Placeholder] - Simple Gemini test service (likely deprecated/experimental).
- `imageCleanupService.ts`: [Active] - Checks unreferenced images, protects referenced business/settings images, and executes cleanup/report generation.
- `imageService.ts`: [Active] - Manages local image storage using Capacitor Filesystem (native) or IndexedDB (web). Handles thumbnail generation.
- `narrativeService.ts`: [Active] - Generates Daily/Weekly/Monthly narratives using AI.
- `NfcService.ts`: [Active] - Wrapper for Capacitor NFC plugin to read/write tags and receive retained scan/error payloads.
- `obsidianExportService.ts`: [Active] - Exports data to Obsidian markdown files.
- `settingsImageReferenceService.ts`: [Active] - Collects settings-level image references, currently including custom TimePal assets, for cleanup protection.
- `syncService.ts`: [Active] - Orchestrates image synchronization between local storage and WebDAV server. Handles deletions and bidirectional sync.
- `achievementBottleStyleService.ts`: [Active] - Defines achievement bottle skin options, including lighter glass palettes and the extended neutral bottle set.
- `timelineStyleService.ts`: [Active] - Manages timeline style themes, defaults, Memoir-specific offset values, and config normalization for shared timeline nodes.
- `themePresetService.ts`: [Active] - 主题预设应用服务，拆分复杂的主题切换逻辑为独立方法
- `customColorGroupService.ts`: [Active] - 自定义色组存储服务，负责 HEX 归一化、去重清洗、增删改查与排序持久化
- `updateService.ts`: [Active] - Checks for app updates from Gitee (primary) or GitHub (fallback).
- `webdavService.ts`: [Active] - WebDAV client implementation supporting Web (Proxy) and Native (Cordova HTTP) environments. Automatically converts Base64 images to ArrayBuffer for proper upload.

- `achievementBottleIconPackService.ts`: [Active] - Stores achievement bottle icon-pack options, dynamic discovery, and stable WebP preview paths for sponsorship settings, preset persistence, and bottle rendering.

## Recently Added (2026-02)
- `themePresetService.ts`: 新增 - 主题预设应用服务，将复杂的主题切换逻辑拆分为多个独立方法

> ⚠️ Once the folder I belong to changes, please update me.
> ⚠️ 本文档最后更新：2026-03-16
