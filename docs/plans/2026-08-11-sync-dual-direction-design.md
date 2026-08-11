# Dual-Path Cloud Sync Direction

## Goal

Keep cloud sync simple for sequential multi-device use while retaining JSON-size conflict protection. The local timestamp represents the user's last sync-relevant data edit. The cloud timestamp represents the cloud backup's upload time.

## Timestamp Sources

- `lumostime_local_timestamp` stores `localModifiedAt`. It is written only after a user-initiated change to sync-relevant local data.
- A cloud backup timestamp is read from the provider's `Last-Modified` metadata. If unavailable, sync falls back to the backup payload's legacy `timestamp` field.
- Missing or invalid timestamps resolve to `0`; reading a missing value must never manufacture `Date.now()`.
- Restores, successful uploads, and manual sync operations must not overwrite `localModifiedAt`.
- A local `lastSeenCloudUploadedAt` acknowledgement prevents a device from repeatedly restoring the cloud version it has already applied.

## Direction Rules

Two independent signals decide the direction:

1. Timestamp direction compares `localModifiedAt` with the cloud upload timestamp.
2. JSON-size direction compares the serialized user-data payloads, excluding sync metadata timestamps.

When both signals give the same non-equal direction, sync proceeds automatically. If one signal is equal, the other signal supplies the direction. Opposite upload and restore directions open the existing confirmation modal. Both equal signals do nothing.

## Compatibility And Safety

- Older cloud backups without new metadata continue to use provider modification time, then their legacy payload timestamp.
- Existing local timestamp values are retained as the migration source. A missing value is neutral rather than "now".
- Imported JSON is an explicit local user change and updates the local timestamp.
- Before every restore, the existing local safety backup remains in place.

## Coverage

The implementation keeps Context-based timestamp updates for main data, categories, reviews, achievements, and sync-relevant settings. It also routes widget-template and custom-color localStorage events through the same user-change timestamp helper. Appearance-specific mutation events remain a separate follow-up because the current appearance backup service only exposes a restore event, not a change event.

## Verification

Tests cover timestamp-vs-size agreement, opposite-direction conflicts, neutral-signal tie breaking, missing timestamp behavior, cloud metadata fallback, restore acknowledgement, and the rule that sync completion never changes the local user-modified timestamp.
