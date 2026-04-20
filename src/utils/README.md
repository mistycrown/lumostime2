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
- `todoScheduleUtils.ts`: [Active] - Derives week-view todo badges for assigned, deadline, recurring, completed, and in-progress states without storing standalone occurrences.

> ⚠️ Once the folder I belong to changes, please update me.
