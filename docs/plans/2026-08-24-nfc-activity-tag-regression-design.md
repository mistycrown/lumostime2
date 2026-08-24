# NFC Activity Tag Regression Design

## Context

In version 1.6.4, Android NFC read testing still parses activity URLs such as
`lumostime://record?action=start&cat_id=eros&act_id=surf`, but scanning does
not start the configured activity.

The `quick_todo` URL branch was added inside `handleStartAction`, where no
`parsedUrl` variable exists. Every NFC or deep-link activity start therefore
throws before the activity lookup and start logic can run. Read testing masks
the issue because it returns the parsed payload before URL execution.

## Decision

Keep URL routing in `handleParsedUrl` and keep `handleStartAction` limited to
validated category and activity identifiers. Move the `quick_todo` branch to
the router and remove it from the activity handler.

## Behaviour

- A tag with no matching active session starts its configured activity.
- Scanning the same tag while its activity is active stops that activity only.
- Scanning a different activity tag starts a concurrent activity.
- Quick-todo URLs continue to open the quick-todo entry flow.

## Verification

- Add parser coverage for the affected `eros/surf` NFC URL.
- Run NFC utility tests, TypeScript checking, and the production web build.
