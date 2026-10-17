# Statistics components

`PieChartView.tsx` displays category/activity, todo and scope duration distributions.

`StatsView` enables category/activity log details by default for every pie range; callers can explicitly opt out with `enableLogDetails={false}`. Category rows and their bars open matching logs; activity rows and bars additionally filter by activity ID within the selected category. The modal receives `useStatsCalculation.filteredLogs`, so records and totals follow the same date range, excluded-category and planned-log rules as the chart.

`StatsLogsModal.tsx` renders a read-only, chronological list in a body portal. Day ranges show logs directly; week ranges show expandable days; months show weeks then days; years show months then weeks, days and logs. `statsLogGroupingUtils.ts` uses Monday–Sunday calendar weeks clipped to each parent month, including partial weeks, empty periods and leap days. Overnight records belong to their start date with their full chart duration. Descendants render only when expanded.

The dialog supports privacy mode, keyboard focus containment, focus/scroll restoration and Android back dismissal. Changing the date or range clears the selected detail.

Run `npm run build` then `node scripts/test-daily-stats-logs.mjs` for actual renderer interactions and Chinese-font mobile, desktop, dark-mode and long-list captures.
