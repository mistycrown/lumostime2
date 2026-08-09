# Timeline Idle Time Design

Date: 2026-08-09

## Goal

Make unrecorded intervals in the Chronicle split timeline directly actionable. A user can click an idle interval to create a real activity record with that interval's start and end time prefilled.

## Rules

1. Calculate intervals from real activity records only. Planned blocks are ignored and never split or remove idle time.
2. Consider the full available day: from 00:00 to the first record, between merged real records, and from the final record to the day boundary.
3. For today, the final boundary is the current time. For past dates it is 24:00; future dates have no available idle time.
4. Only show intervals at least as long as the existing `minIdleTimeThreshold` setting.
5. Empty days use the same rules and show a single interval for the available portion of the day.

## Interaction And Presentation

Idle intervals render beneath schedule blocks as low-contrast dashed outlines with a compact `Idle Time` label and time range. Planned blocks remain on top and retain their own interactions. Clicking exposed idle space invokes the existing record creation flow with the full interval range. When quick-color creation is active, idle intervals do not capture pointer input so drag creation remains uninterrupted.

## Verification

Unit tests cover day boundaries, overlapping real records, planned block exclusion, empty days, threshold filtering, and today's current-time boundary. Build validation ensures the split timeline still compiles.
