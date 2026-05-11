# Utils Architecture

Contains pure utility functions for data processing and business logic calculations.

## Files
- `sceneGroupStorage.ts`: [Active] - Loads, migrates, saves, auto-matches, and now reorders scene groups so one persisted group sequence can drive both settings management and the SceneView quick-switch list.
- `sceneCardFlipUtils.ts`: [Active] - Resolves persisted vs. forced scene-card back-side state so timer/todo cards can lock swipe-back only when a current-slot timeline record is forcing the flip.
- `sceneCardStoredFlipUtils.ts`: [Active] - Separates manual timer/todo flip persistence from legacy auto-flip booleans so stale cached backs no longer override current-slot timeline matching.
- `sceneTimelineMatchUtils.ts`: [Active] - Computes the active scene-slot time window, including overnight slots, and checks whether timer/todo cards have matching logs in the current timeline interval.
- `assistantMessageParts.ts`: [Active] - Normalizes structured assistant reply parts and applies conservative fallback splitting so one assistant turn can render as grouped multi-bubble chat bursts without fragmenting persistence.
- `goalUtils.ts`: [Active] - Calculates progress for Goals (duration, count, frequency).
- `logUtils.ts`: [Active] - Handles time log manipulation, specifically splitting cross-day logs.
- `achievementUtils.ts`: [Active] - Computes achievement daily snapshots, date ranges, and current star balances.
- `dailyCheckUtils.ts`: [Active] - Builds daily check items from templates, normalizes review check data, applies NFC/widget/manual punch actions, and tolerates legacy templates with missing `items` arrays.
- `checkStreakUtils.ts`: [Active] - Resolves per-item daily check streaks, global multiplier tiers, and weighted check-category completion values for achievement rules.
- `colorAdapterUtils.ts`: [Active] - Unifies chart/card/schedule/tag color rendering across Tailwind palette classes and custom HEX colors.
- `filterUtils.ts`: [Active] - Parses custom filter expressions, computes stats, normalizes saved custom filter order, and now also matches month-view todo hidden-filter expressions against todo title/category, linked activity/category, default scopes, and note text.
- `noteTemplateUtils.ts`: [Active] - Sorts note templates, builds context-aware note template recommendations, and appends template text into notes consistently.
- `scopeStatsUtils.ts`: [Active] - Centralizes scope duration aggregation and counts full duration for every linked scope on a log.
- `scopeSortUtils.ts`: [Active] - Centralizes scope selection ordering so batch tools, pickers, and scope-related filter chips all follow the saved scope-management order.
- `floatingWindowStartup.ts`: [Active] - Guards Android floating-window startup, keeps the overlay launchable when notifications are disabled, and reports whether permission-return recovery is needed.
- `floatingWindowStopUtils.ts`: [Active] - Normalizes live/persisted floating-window stop payloads and resolves which sessions should stop or cancel during Android resume reconciliation.
- `todoScheduleUtils.ts`: [Active] - Derives week-view todo badges, shared per-day schedule entries for the rolling month view, week-scoped sparse row layouts plus overlay-ready `Trace` segments so month cells can keep continuous in-progress bars across one calendar row, and today/tomorrow/this-week virtual-category matches; it also provides shared today-category helpers for `today + pin` views that include arrange-today, due-today, recurring-today, completed-today, and in-progress-today visibility without storing standalone occurrences, and now resolves subtask parent titles for inline `@parent` labels in week rows.
- `todoScheduleAssignUtils.ts`: [Active] - Filters, sorts, and builds hierarchy rows for arrange/due picker todos, including the rule that unfinished subtasks disappear when their parent todo is already completed.
- `todoListDisplayUtils.ts`: [Active] - Formats compact inline symbol-based date suffixes like `(05.06)[05.09]` and applies the shared category-list grouping rule that keeps incomplete todos ahead of completed ones while preserving incoming order inside each group.
- `todoRowInteraction.ts`: [Active] - Classifies todo-row taps, scrolls, and swipe releases, including a touch-safe long-left-swipe fallback that preserves completion toggles when move events fail to latch swipe intent while still keeping diagonal scrolls protected.
- `todoHierarchyUtils.ts`: [Active] - Centralizes one-level parent/subtask helpers for inheritance syncing, cascade deletion, sibling ordering, collapsed tree rendering, expanded-subtask display ordering with unfinished items first, visibility rules that hide unfinished subtasks beneath completed parents in todo-list views, preserves incoming root order so upstream pin-first schedule/picker sorting survives hierarchy rendering, and plain-text completed-subtask labels like `子任务 @父任务` for timeline done lists.
- `aiBackfillUtils.ts`: [Active] - Normalizes AI backfill tool-call dates, splits cross-midnight records into per-day segments, dedupes repeated tool calls, and provides shared date/time parsing helpers for the AI backfill flow.
- `todoAssociationUtils.ts`: [Active] - Builds collapsed parent/subtask row models for todo pickers, auto-expands the selected child's parent when hierarchy mode is enabled, hides finished todos by default while preserving the current linked completed todo, hides unfinished subtasks whose parent todo is already completed, and tags standalone subtasks with hidden-parent context when the parent row is outside the current picker pool.
- `todoCompletionModeUtils.ts`: [Active] - Gates one-shot completion mode for unfinished linked todos and sequences save-first, complete-second follow-up actions for focus-log submission flows.
- `lumosTimeUrlParser.ts`: [Active] - Normalizes LumosTime NFC/deep-link URIs across custom-scheme parsing differences, old action aliases, and legacy parameter names.

> Once the folder I belong to changes, please update me.
