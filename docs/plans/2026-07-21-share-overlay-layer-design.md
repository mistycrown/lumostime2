# Share Overlay Layer Design

## Context

Opening Share from a record detail keeps the detail modal open. The detail modal uses `z-[220]`, while the root-mounted share overlay used `z-[110]`, causing the detail modal to cover Share.

## Decision

Keep Share mounted at the application root and raise its overlay to `z-[230]`. This preserves the open record detail beneath Share and restores it unchanged when Share is closed.

## Verification

Build the web application and manually open Share from a record detail. Confirm Share covers the entire detail modal and its back action reveals that modal again.
