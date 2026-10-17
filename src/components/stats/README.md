# Statistics components

`PieChartView.tsx` displays category/activity, todo and scope duration distributions.

`StatsView` enables log details by default for every pie range; callers can explicitly opt out with `enableLogDetails={false}`. Category, activity, todo-category, individual-todo and scope rows open their matching records. The entire summary row and its progress bar share the same action; yearly todo statistics also expose individual tasks.

Tag details receive `useStatsCalculation.filteredLogs`. Todo/scope details receive the independent log source and apply the same inclusive period boundaries and planned-log exclusion as their own hooks. Tag category exclusions therefore affect only tag details. `statsLogDetailsUtils.ts` resolves entities by ID, selects todo-category records through the category's current task IDs, and matches scopes through normalized `scopeIds`. Records across different tag categories retain their own activity identity.

`StatsLogsModal.tsx` renders a read-only, chronological list in a body portal. Day ranges show logs directly; week ranges show expandable days; months show weeks then days; years show months then weeks, days and logs. `statsLogGroupingUtils.ts` uses Monday–Sunday calendar weeks clipped to each parent month, including partial weeks, empty periods and leap days. Overnight records belong to their start date with their full chart duration. Descendants render only when expanded.

The dialog supports privacy mode, keyboard focus containment, focus/scroll restoration and Android back dismissal. Changing the date or range clears the selected detail.

Tag/todo durations use elapsed timestamps. Scope details use `getLogDurationSeconds`, matching `useScopeStats`: each linked scope receives the full duration, with each record appearing once in that scope. The selected duration metric is preserved in every month/week/day summary and log row.

Run `npm run build` then `node scripts/test-daily-stats-logs.mjs` for actual renderer interactions and Chinese-font mobile, desktop, dark-mode and long-list captures.
