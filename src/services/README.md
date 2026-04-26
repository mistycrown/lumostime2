# Services Architecture

Contains business logic and external integrations.

Update 2026-04-26: Added the first Android-agent service layer: `assistantAgentConfigService.ts`, `assistantMemoryService.ts`, `assistantReminderQueueService.ts`, `assistantPromptService.ts`, and `assistantOrchestratorService.ts`, plus a new `aiService.ts` system-turn decision endpoint so background assistant runs can reuse the same provider/debug pipeline as foreground chat.
Update 2026-04-25: `aiService.ts` now also exposes dedicated edit-log, update-todo, and create-subtask planning flows that return id-plus-patch payloads, letting the unified AI dialog keep create/edit intents separate and apply edits locally through existing save logic. Subtask planning now treats schedule fields as opt-in only and suppresses them unless the user explicitly asked for dates.
Update 2026-04-22: `aiService.ts` now exposes lightweight AI intent classification plus debug-aware chat reply, add-log planning, and add-todo planning so the unified AI dialog can route each turn with only the needed context.
Update 2026-04-22: `aiService.ts` now also exposes single-turn backfill tool planning, debug-oriented request/response capture, abort-signal plumbing, and per-tool-call date planning with latest-log/todo-hierarchy context for the AI backfill dialog.
Update 2026-04-22: `aiService.ts` now accepts persona guidance and optional cached conversation history for unified AI sessions, and aligns OpenAI/Gemini request construction so quick-context and persona settings affect chat, add-log, and add-todo flows consistently.

Update 2026-04-20: `backgroundService.ts` now emits background snapshot events, preloads image switches, and avoids the old 500ms fallback polling loop; `statusBarService.ts` now caches per-image brightness analysis results.

Update 2026-04-09: `obsidianExportService.ts` now supports copying referenced log images into a user-defined Obsidian attachment folder during desktop exports.

Update 2026-03-12: timeline styling for normal timeline records is managed by `timelineStyleService.ts`.

## Files
- `aiService.ts`: [Active] - Handles AI integration (OpenAI/Gemini) for text parsing, lightweight intent classification, persona-aware chat replies, cached-conversation context injection, dated AI-planned backfill tool calls, root-todo creation, todo updates, subtask creation, log editing, abort-aware chat requests, and narrative generation, with subtask schedule fields emitted only when explicitly requested.
- `assistantAgentConfigService.ts`: [Active] - Persists background assistant runtime settings such as polling enablement, long-term-memory enablement, random check-in ranges, and future reminder toggles so the AI chat settings panel and native Android service can stay aligned.
- `assistantMemoryService.ts`: [Active] - Stores structured assistant memory for the Android-first background AI agent, including profile facts, open loops, working summaries, recent decisions, and active reminders.
- `assistantReminderQueueService.ts`: [Active] - Persists and queries the assistant's follow-up reminder queue, including due-reminder lookup and memory synchronization.
- `assistantPromptService.ts`: [Active] - Loads or falls back to local assistant persona and system-trigger prompt templates, then assembles compact background agent prompts from memory and trigger context.
- `assistantOrchestratorService.ts`: [Active] - Runs structured assistant system turns by combining memory, trigger context, prompt building, `aiService` inference, reminder writes, and persisted assistant-message surfacing.
- `excelExportService.ts`: [Active] - Exports time logs to Excel format.
- `geminiService.ts`: [Placeholder] - Simple Gemini test service (likely deprecated/experimental).
- `imageCleanupService.ts`: [Active] - Checks unreferenced images, protects referenced business/settings images, and executes cleanup/report generation.
- `imageService.ts`: [Active] - Manages local image storage using Capacitor Filesystem (native) or IndexedDB (web). Handles thumbnail generation and native camera file-path saves.
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

## Recently Added (2026-03)
- `navigationDecorationService.ts`: 支持自定义导航栏装饰上传和存储

> ⚠️ Once the folder I belong to changes, please update me.
> ⚠️ 本文档最后更新：2026-04-22
