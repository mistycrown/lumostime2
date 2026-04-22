# Utils Architecture

Contains pure utility functions for data processing and business logic calculations.

## Files
- `goalUtils.ts`: [Active] - Calculates progress for Goals (duration, count, frequency).
- `logUtils.ts`: [Active] - Handles time log manipulation, specifically splitting cross-day logs.
- `achievementUtils.ts`: [Active] - Computes achievement daily snapshots, date ranges, and current star balances.
- `colorAdapterUtils.ts`: [Active] - Unifies chart/card/schedule/tag color rendering across Tailwind palette classes and custom HEX colors.
- `filterUtils.ts`: [Active] - Parses custom filter expressions, computes stats, and normalizes saved custom filter order.
- `noteTemplateUtils.ts`: [Active] - Sorts note templates, builds context-aware note template recommendations, and appends template text into notes consistently.
- `scopeStatsUtils.ts`: [Active] - Centralizes scope duration aggregation and counts full duration for every linked scope on a log.
- `floatingWindowStartup.ts`: [Active] - Guards Android floating-window startup, keeps the overlay launchable when notifications are disabled, and reports whether permission-return recovery is needed.
- `todoScheduleUtils.ts`: [Active] - Derives week-view todo badges plus today/tomorrow/this-week virtual-category matches, and now also provides shared todo-picker helpers for the `pin or arranged today` virtual category without storing standalone occurrences.
- `todoHierarchyUtils.ts`: [Active] - Centralizes one-level parent/subtask helpers for inheritance syncing, cascade deletion, sibling ordering, collapsed tree rendering, and expanded-subtask display ordering with unfinished items first.
- `todoAssociationUtils.ts`: [Active] - Builds collapsed parent/subtask row models for todo pickers and auto-expands the selected child's parent when hierarchy mode is enabled.
- `lumosTimeUrlParser.ts`: [Active] - Normalizes LumosTime NFC/deep-link URIs across custom-scheme parsing differences, old action aliases, and legacy parameter names.

> ⚠️ Once the folder I belong to changes, please update me.
