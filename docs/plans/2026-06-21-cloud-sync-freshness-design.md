# Cloud Sync Freshness Design

## Goal

Stop cloud sync from treating stale or incomplete data as the latest backup, with the current S3/COS flow as the reproduced failure path and WebDAV / compatible S3 checked at the same time.

## Approved Direction

1. Treat `lumostime_backup.json` as the only canonical cloud backup for sync direction, upload confirmation, and download restore.
2. Keep `backups/*.json` as recovery history only; never let those files influence latest-version detection.
3. After uploading the main backup, immediately read the canonical main file back from the cloud and verify it matches the payload that was just written.
4. Prefer the JSON payload `timestamp` as the canonical sync timestamp, with remote `LastModified` only as a fallback signal.
5. Make SettingsView manual sync build the same backup payload shape as the main sync manager so manual uploads cannot write a reduced dataset.

## Implementation Notes

- Add shared sync-payload metadata helpers for timestamp extraction and payload comparison.
- Strengthen `syncUtils.ts` so uploads verify the cloud main backup before reporting success.
- Make `useSyncManager.ts` read one canonical cloud snapshot for sync decisions instead of mixing stale `statFile` metadata with a later payload download.
- Update `SettingsView.tsx` and `App.tsx` so manual sync uses the same complete payload and writes back the canonical remote timestamp instead of `Date.now()`.
- Tighten WebDAV native reads with cache-busting URLs and unique temp filenames; tighten S3-compatible reads with unique response-query parameters.

## Verification

- Regression tests for payload timestamp extraction/comparison.
- Regression tests for upload verification and cache-busting request parameters on S3 / compatible S3.
- Manual smoke path: upload on device A, then download on device B, and confirm the restored payload timestamp and content match the just-uploaded main backup.
