# Services Architecture

Contains business logic and external integrations.

Update 2026-04-27: `assistantOrchestratorService.ts` now records readable background decision summaries, silent reasons, and post-silent side effects in both assistant memory and background call history, while background replies can persist grouped multi-bubble display parts for later chat rendering.
Update 2026-04-27: `assistantTurnService.ts` now skips memory rules and memory snapshots when long-term memory is disabled, while foreground chat omits reminder-summary context when background polling is off so unified assistant turns stop paying unnecessary prompt cost for disabled features.
Update 2026-04-26: `assistantPromptService.ts` now biases the shared assistant baseline toward companionship and continuity-awareness, so background turns prefer short state-preserving check-ins over reflexive silence when the user's thread has gone stale.
Update 2026-04-26: `assistantMemoryService.ts` now exposes narrow append/remove helpers for manually maintained profile and preference memory entries, so the AI panel can manage those lists without duplicating persistence logic in the UI.
Update 2026-04-26: Background AI replies can now surface Android system notifications with exact session/message navigation, while `assistantOrchestratorService.ts` also backfills a default chat session if the assistant needs to persist a background reply before the user has ever opened the AI panel.
Update 2026-04-26: Assistant reminder timestamps are now normalized before persistence, background turns receive explicit local/UTC current-time anchors, and `assistantOrchestratorService.ts` can attach per-message debug sections to surfaced background replies when debug mode is enabled.
Update 2026-04-26: `assistantMemoryService.ts` now truly replaces `activeReminders` instead of merging stale entries back in, so completed reminders disappear from memory after background dispatch.
Update 2026-04-26: Reorganized assistant prompts into a shared `assistant-base` layer plus separate foreground/background mode assets, and tightened the unified turn schema so memory updates are now returned explicitly as part of the main foreground/background turn result.
Update 2026-04-26: `assistantOrchestratorService.ts` now preserves reminder arrays, explicit memory decisions, persona prompts, and dictionary context from the shared background turn instead of collapsing them back into the older single-action shape.
Update 2026-04-26: Added the first Android-agent service layer: `assistantAgentConfigService.ts`, `assistantMemoryService.ts`, `assistantReminderQueueService.ts`, `assistantPromptService.ts`, and `assistantOrchestratorService.ts`, all wired through the shared unified-turn pipeline for foreground and background assistant runs.
Update 2026-04-25: `aiService.ts` now also exposes dedicated edit-log, update-todo, and create-subtask planning flows that return id-plus-patch payloads, letting the unified AI dialog keep create/edit intents separate and apply edits locally through existing save logic. Subtask planning now treats schedule fields as opt-in only and suppresses them unless the user explicitly asked for dates.
Update 2026-04-22: `aiService.ts` now exposes lightweight AI intent classification plus debug-aware chat reply, add-log planning, and add-todo planning so the unified AI dialog can route each turn with only the needed context.
Update 2026-04-22: `aiService.ts` now also exposes single-turn backfill tool planning, debug-oriented request/response capture, abort-signal plumbing, and per-tool-call date planning with latest-log/todo-hierarchy context for the AI backfill dialog.
Update 2026-04-22: `aiService.ts` now accepts persona guidance and optional cached conversation history for unified AI sessions, and aligns OpenAI/Gemini request construction so quick-context and persona settings affect chat, add-log, and add-todo flows consistently.

Update 2026-04-20: `backgroundService.ts` now emits background snapshot events, preloads image switches, and avoids the old 500ms fallback polling loop; `statusBarService.ts` now caches per-image brightness analysis results.

Update 2026-04-09: `obsidianExportService.ts` now supports copying referenced log images into a user-defined Obsidian attachment folder during desktop exports.

Update 2026-03-12: timeline styling for normal timeline records is managed by `timelineStyleService.ts`.

## Files
- `aiService.ts`: [Active] - Handles AI integration (OpenAI/Gemini) for text parsing, unified foreground/background assistant-turn requests, lightweight intent classification, persona-aware chat replies, cached-conversation context injection, dated AI-planned backfill tool calls, root-todo creation, todo updates, subtask creation, log editing, abort-aware chat requests, and narrative generation, with subtask schedule fields emitted only when explicitly requested.
- `assistantAgentConfigService.ts`: [Active] - Persists background assistant runtime settings such as polling enablement, long-term-memory enablement, and user-editable random check-in ranges so the AI chat settings panel and native Android service can stay aligned.
- `assistantActionExecutor.ts`: [Active] - Executes assistant-planned create/edit tool calls for logs, todos, and subtasks against local app data, returning applied-action snapshots plus the next logs/todos state for UI reuse.
- `assistantMemoryService.ts`: [Active] - Stores structured assistant memory for the Android-first background AI agent, including profile facts, open loops, working summaries, the latest readable decision summary, and active reminders, with explicit replacement semantics for the active reminder list plus narrow helpers for manually appending and removing profile/preference memory notes.
- `assistantReminderQueueService.ts`: [Active] - Persists and queries the assistant's follow-up reminder queue, canonicalizes reminder timestamps, computes due reminders against parsed datetimes, and keeps assistant memory in sync.
- `assistantPromptService.ts`: [Active] - Loads or falls back to shared assistant-base, foreground-mode, background-mode, and foreground tool-schema prompt templates for the unified assistant flow.
- `assistantOrchestratorService.ts`: [Active] - Runs structured assistant system turns by combining memory, trigger context, reminder summaries, persona/dictionary context, `aiService` inference, reminder writes, readable silent-decision summaries, persisted assistant-message surfacing with optional grouped reply parts, optional Android system-notification emission with exact chat navigation metadata, and optional debug-section persistence for background replies.
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
