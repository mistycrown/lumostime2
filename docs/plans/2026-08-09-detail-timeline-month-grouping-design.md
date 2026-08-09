# Detail Timeline Month Grouping Design

## Problem

The shared detail timeline showed date headings from earlier months while the month view was set to August. The headings had durations but no records because its duration map used all countable history while its log map used only the selected month.

## Decision

Update the shared `DetailTimelineCard` grouping logic.

- In month view, create date groups only for countable logs in the selected month.
- Include non-countable timeline blocks only when their date also contains a countable log.
- Hide dates containing only non-countable blocks in month view.
- Keep the all-records view unchanged.

## Scope

All callers of the shared component inherit the correction, including scope, tag, category, filter, todo-detail, and statistics timelines.

## Verification

Add regression coverage for selected-month grouping, cross-month exclusion, and same-day non-countable records.
