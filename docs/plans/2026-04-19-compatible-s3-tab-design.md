# Compatible S3 Tab Design

Date: 2026-04-19

## Goal

Keep the existing Tencent Cloud COS sync flow working as-is, and add a new settings tab for S3-compatible object storage providers such as Qiniu Kodo, Cloudflare R2, and generic S3-compatible endpoints.

The new tab should support:

- Saving a separate compatible S3 configuration
- Testing the connection
- Uploading app data and referenced images
- Restoring app data and referenced images

## Non-Goals

- Refactoring the existing COS service into a multi-provider abstraction
- Replacing the current COS SDK implementation
- Changing cloud object key layout, backup naming, or image manifest format

## Recommended Approach

Add a second service implementation instead of generalizing the current COS service.

Why:

- Lowest regression risk for the existing COS path
- Matches the requested UX: keep COS and add another tab
- Lets compatible S3 use a standard S3 client without touching COS-specific code

## Architecture

### Existing COS Path

- Keep `src/services/s3Service.ts` as the Tencent Cloud COS implementation
- Keep current COS storage keys and connection flow
- Keep current COS upload and restore buttons and behavior

### New Compatible S3 Path

- Add `src/services/compatibleS3Service.ts`
- Use `@aws-sdk/client-s3`
- Persist configuration under a separate localStorage namespace
- Reuse the same public storage interface shape already used by sync utilities:
  - `checkConnection`
  - `statFile`
  - `uploadData`
  - `downloadData`
  - `uploadImage`
  - `downloadImage`
  - `deleteImage`
  - `deleteFile`
  - `uploadImageList`
  - `downloadImageList`
  - `getImageListTimestamp`
  - `createDirectory`
  - `getDirectoryContents`

## Configuration Model

Add a new config type:

- `provider`: `qiniu | cloudflare-r2 | generic`
- `bucketName`
- `region`
- `endpoint`
- `accessKeyId`
- `secretAccessKey`
- `forcePathStyle`

Storage keys use a separate prefix such as:

- `lumos_compatible_s3_provider`
- `lumos_compatible_s3_bucket`
- `lumos_compatible_s3_region`
- `lumos_compatible_s3_endpoint`
- `lumos_compatible_s3_access_key_id`
- `lumos_compatible_s3_secret_access_key`
- `lumos_compatible_s3_force_path_style`

Draft values also use a separate namespace.

## Object Layout

Compatible S3 keeps the same remote object layout as COS:

- `lumostime_backup.json`
- `lumostime_images.json`
- `images/<filename>`
- backup uploads under `backups/` when existing restore helpers create them

This keeps sync, restore, and image consistency logic reusable.

## Settings UI

Update the S3 sync settings view into two tabs:

- `Tencent Cloud COS`
- `Compatible S3`

### COS Tab

- Preserve current behavior
- Only small copy cleanups if needed

### Compatible S3 Tab

Show a separate configuration form with:

- Provider selector
- Bucket
- Region
- Endpoint
- Access Key ID
- Secret Access Key
- Force Path Style toggle

After connection succeeds, show:

- Upload to Compatible S3
- Restore from Compatible S3
- Disconnect
- Clear Configuration

## Sync Wiring

Reuse the current sync helpers instead of duplicating upload or restore logic.

Required changes:

- Extend the cloud service union to include `compatibleS3Service`
- Add display naming for compatible S3 in shared messages
- Add a selection path so manual upload and restore can target the compatible S3 service when that tab is active
- Keep COS and WebDAV behavior unchanged

## Error Handling

Connection failures should bias toward actionable hints:

- missing endpoint
- invalid region
- invalid access keys
- bucket not found
- likely CORS/browser cross-origin issue

For Qiniu, the UI should mention:

- bucket should be the S3 space name
- endpoint should be the Qiniu S3 endpoint for the chosen region
- browser uploads may require correct CORS configuration

## Testing

Add focused regression coverage for:

- compatible S3 config persistence
- connection check request path
- JSON download parsing
- existing COS tests still passing

Manual verification:

1. Existing COS connect/upload/restore still works
2. Compatible S3 tab can save config and reconnect
3. Compatible S3 upload writes JSON and images with the expected keys
4. Compatible S3 restore reads JSON and image manifest successfully

## Risks

- Browser-side S3-compatible uploads may fail due to provider CORS settings
- Some providers require path-style addressing while others prefer virtual-host style
- Endpoint and region combinations are provider-specific and need clear UI hints

## Implementation Notes

- Prefer keeping the compatible S3 code path isolated from COS code
- Avoid changing top-level sync behavior beyond adding a new service option
- Preserve UTF-8 source encoding and existing TypeScript style
