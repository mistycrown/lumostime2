# Utils Architecture

Contains pure utility functions for data processing and business logic calculations.

## Files
- `assistantMessageParts.ts`: [Active] - Normalizes structured assistant reply parts and applies conservative fallback splitting so one assistant turn can render as grouped multi-bubble chat bursts without fragmenting persistence.
- `goalUtils.ts`: [Active] - Calculates progress for Goals (duration, count, frequency).
- `logUtils.ts`: [Active] - Handles time log manipulation, specifically splitting cross-day logs.
- `achievementUtils.ts`: [Active] - Computes achievement daily snapshots, date ranges, and current star balances.
- `dailyCheckUtils.ts`: [Active] - Builds daily check items from templates, normalizes review check data, applies NFC/widget/manual punch actions, and tolerates legacy templates with missing `items` arrays.
- `checkStreakUtils.ts`: [Active] - Resolves per-item daily check streaks, global multiplier tiers, and weighted check-category completion values for achievement rules.
- `colorAdapterUtils.ts`: [Active] - Unifies chart/card/schedule/tag color rendering across Tailwind palette classes and custom HEX colors.
- `filterUtils.ts`: [Active] - Parses custom filter expressions, computes stats, and normalizes saved custom filter order.
- `noteTemplateUtils.ts`: [Active] - Sorts note templates, builds context-aware note template recommendations, and appends template text into notes consistently.
- `scopeStatsUtils.ts`: [Active] - Centralizes scope duration aggregation and counts full duration for every linked scope on a log.
- `floatingWindowStartup.ts`: [Active] - Guards Android floating-window startup, keeps the overlay launchable when notifications are disabled, and reports whether permission-return recovery is needed.
- `todoScheduleUtils.ts`: [Active] - Derives week-view todo badges plus today/tomorrow/this-week virtual-category matches, and now also provides shared today-category helpers for `today + pin` views that include arrange-today, due-today, and recurring-today todos without storing standalone occurrences.
- `todoScheduleAssignUtils.ts`: [Active] - Filters, sorts, and builds hierarchy rows for arrange/due picker todos, including the rule that unfinished subtasks disappear when their parent todo is already completed.
- `todoHierarchyUtils.ts`: [Active] - Centralizes one-level parent/subtask helpers for inheritance syncing, cascade deletion, sibling ordering, collapsed tree rendering, expanded-subtask display ordering with unfinished items first, visibility rules that hide unfinished subtasks beneath completed parents in todo-list views, and plain-text completed-subtask labels like `子任务 @父任务` for timeline done lists.
- `aiBackfillUtils.ts`: [Active] - Normalizes AI backfill tool-call dates, splits cross-midnight records into per-day segments, dedupes repeated tool calls, and provides shared date/time parsing helpers for the AI backfill flow.
- `todoAssociationUtils.ts`: [Active] - Builds collapsed parent/subtask row models for todo pickers, auto-expands the selected child's parent when hierarchy mode is enabled, and hides unfinished subtasks whose parent todo is already completed.
- `lumosTimeUrlParser.ts`: [Active] - Normalizes LumosTime NFC/deep-link URIs across custom-scheme parsing differences, old action aliases, and legacy parameter names.

> ⚠️ Once the folder I belong to changes, please update me.
