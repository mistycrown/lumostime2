# Services Architecture

Contains business logic and external integrations.

## Files
- `aiService.ts`: [Active] - Handles AI integration (OpenAI/Gemini) for text parsing and narrative generation.
- `excelExportService.ts`: [Active] - Exports time logs to Excel format.
- `geminiService.ts`: [Placeholder] - Simple Gemini test service (likely deprecated/experimental).
- `imageService.ts`: [Active] - Manages local image storage using Capacitor Filesystem (native) or IndexedDB (web). Handles thumbnail generation.
- `narrativeService.ts`: [Active] - Generates Daily/Weekly/Monthly narratives using AI.
- `NfcService.ts`: [Active] - Wrapper for Capacitor NFC plugin to read/write tags.
- `obsidianExportService.ts`: [Active] - Exports data to Obsidian markdown files.
- `syncService.ts`: [Active] - Orchestrates image synchronization between local storage and WebDAV server. Handles deletions and bidirectional sync.
- `themePresetService.ts`: [Active] - 主题预设应用服务，拆分复杂的主题切换逻辑为独立方法
- `updateService.ts`: [Active] - Checks for app updates from Gitee (primary) or GitHub (fallback).
- `webdavService.ts`: [Active] - WebDAV client implementation supporting Web (Proxy) and Native (Cordova HTTP) environments. Automatically converts Base64 images to ArrayBuffer for proper upload.

## Recently Added (2026-02)
- `themePresetService.ts`: 新增 - 主题预设应用服务，将复杂的主题切换逻辑拆分为多个独立方法

> ⚠️ Once the folder I belong to changes, please update me.
> ⚠️ 本文档最后更新：2026-02-09
