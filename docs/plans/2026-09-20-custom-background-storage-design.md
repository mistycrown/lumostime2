# Custom Background Storage Quota Fix

## Problem

Android hydration reads image files as Base64 data URLs and writes those values back into `localStorage` under `lumos_custom_backgrounds`. Large backgrounds, duplicated into `url` and `thumbnail`, exceed the WebView storage quota.

## Design

- Persist custom background metadata and image references only; never persist `data:` URLs.
- Keep hydrated URLs in a runtime map so the UI can use them without expanding `localStorage`.
- On native platforms, prefer the existing `backgrounds/<filePath>` URI. Fall back to the image service only for records without a native background file.
- Sanitize every custom-background write, covering new uploads and legacy migrations.
- Keep the existing event-driven refresh path so views can update after asynchronous hydration.

## Verification

- Unit-test persistence sanitization for Base64 URLs and lightweight URLs.
- Build the application with `npm run build`.
- Confirm the changed files are limited to this fix and the design record.
