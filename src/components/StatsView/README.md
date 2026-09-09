# StatsView Components

Reusable stats-related helpers extracted from the legacy `StatsView.tsx` module.

## Files
- `useStatsData.ts`: Legacy hook bundle for category, todo, and scope stats.
- `index.ts`: Re-export entry for the legacy StatsView helper set.

## Scope Rule
- Scope stats in this folder must follow `src/utils/scopeStatsUtils.ts`.
- A log linked to multiple scopes contributes its full duration to every linked scope.
- Scope percentages should be based on total attributed scope duration, not distinct timeline duration.

## Note
- The main app currently uses the newer `src/hooks/useScopeStats.ts` and `src/components/stats/*` implementation.
- Keep any legacy helpers aligned with the active scope aggregation rule to avoid inconsistent analytics during refactors.

## Tags chart color modes
- The tags pie chart defaults to first-level category colors.
- The chart toggle can switch to second-level activity colors; the statistics rows and progress bars switch to the same activity-level aggregation.
