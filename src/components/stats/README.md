# Statistics components

`PieChartView.tsx` displays category/activity, todo and scope duration distributions.

`StatsView` enables log details by default for every pie range; callers can explicitly opt out with `enableLogDetails={false}`. Category, activity, todo-category, individual-todo and scope rows open their matching records. The entire summary row and its progress bar share the same action; yearly todo statistics also expose individual tasks.

Tag details receive `useStatsCalculation.filteredLogs`. Todo/scope details receive the independent log source and apply the same inclusive period boundaries and planned-log exclusion as their own hooks. Tag category exclusions therefore affect only tag details. `statsLogDetailsUtils.ts` resolves entities by ID, selects todo-category records through the category's current task IDs, and matches scopes through normalized `scopeIds`. Records across different tag categories retain their own activity identity.

`StatsLogsModal.tsx` renders a read-only, chronological list in a body portal. Day ranges show logs directly; week ranges show expandable days; months show weeks then days; years show months then weeks, days and logs. `statsLogGroupingUtils.ts` uses Monday–Sunday calendar weeks clipped to each parent month, including partial weeks, empty periods and leap days. Overnight records belong to their start date with their full chart duration.

Grouping is genuinely incremental: each call partitions its source once into only the immediate period summaries. Opening a year builds 12 months; cached `loadChildren()` calls build weeks or days only after their parent expands. `loadLogs()` sorts only the selected day, once, and never sorts parent periods. New source arrays rebuild caches. Collapsing a branch unmounts its descendants; day record lists initially render 50 rows and add 50 on each “加载更多” action. Shared tag/todo lookup maps are also created only when a record list first mounts. Summary counts and durations do not read log titles or notes.

The dialog supports privacy mode, keyboard focus containment, focus/scroll restoration and Android back dismissal. Changing the date or range clears the selected detail.

Tag/todo durations use elapsed timestamps. Scope details use `getLogDurationSeconds`, matching `useScopeStats`: each linked scope receives the full duration, with each record appearing once in that scope. The selected duration metric is preserved in every month/week/day summary and log row.

Run `npm run build` then `node scripts/test-daily-stats-logs.mjs` for actual renderer interactions and Chinese-font mobile, desktop, dark-mode and long-list captures. The renderer also exercises 100,800 annual records, checks that collapsed branches never read record payloads, caps the initial day DOM at 50 rows, verifies batch loading/collapse cleanup, and reports local timings.
