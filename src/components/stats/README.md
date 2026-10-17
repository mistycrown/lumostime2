# Statistics components

`PieChartView.tsx` displays category/activity, todo and scope duration distributions.

Daily Review opts into `logDetails` through `StatsView.enableLogDetails`. Category rows and their bars open all matching daily logs; activity rows and bars additionally filter by activity ID within the selected category. The modal receives `useStatsCalculation.filteredLogs`, so its records and totals follow the same date range, excluded-category and planned-log rules as the chart. Other callers keep their existing behavior.

`StatsLogsModal.tsx` renders a read-only, chronological list in a body portal, supports privacy mode, restores focus and scrolling, and consumes Android back before the underlying review closes. Changing the review date clears the selected detail.

Run `npm run build` then `node scripts/test-daily-stats-logs.mjs` for actual renderer interactions and Chinese-font mobile, desktop, dark-mode and long-list captures.
