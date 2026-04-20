# Compatible S3 Android Native Transport Design

Date: 2026-04-20

## Goal

Keep the existing web and desktop compatible S3 implementation unchanged, but make Android use a native network transport path instead of WebView `fetch`, so compatible S3 can connect and sync on mobile without being blocked by WebView networking or CORS behavior.

## Problem Summary

Current compatible S3 behavior:

- Web and desktop use `@aws-sdk/client-s3` successfully
- Android also uses the browser-style S3 client transport
- In Android WebView this fails during `HeadBucket` and other requests with `failed to fetch`

Observed facts:

- Tencent COS path already works on desktop
- Compatible S3 path works on desktop
- WebDAV has an explicit native network path for mobile
- Compatible S3 does not

## Recommended Approach

Reuse the existing AWS S3 client for signing and protocol behavior, but replace the request transport on native platforms with a custom native HTTP request handler.

Why:

- Keeps one logical S3 client instead of duplicating request signing logic
- Avoids hand-writing AWS Signature V4 logic
- Minimizes risk to the working desktop/web path
- Mirrors the existing WebDAV strategy: browser path for web, native path for mobile

## Architecture

### Web and Desktop

- Keep the existing `S3Client` behavior
- Continue using the browser transport

### Android Native

- Create a custom request handler for the S3 client
- The request handler receives the already-signed Smithy HTTP request
- Convert the signed request into a native HTTP request through `cordova-plugin-advanced-http`
- Convert the native response back into a Smithy `HttpResponse`

This means:

- Signing stays inside the AWS SDK
- Transport moves to native networking only on mobile

## Scope

The native transport must support these operations used by the current service:

- `HeadBucket`
- `HeadObject`
- `GetObject`
- `PutObject`
- `DeleteObject`
- `ListObjectsV2`

That is enough for:

- connect test
- data upload / restore
- image upload / restore
- image manifest upload / restore
- remote directory listing for sync reconciliation

## Request Handling Details

### Request URL

Build the final URL from the signed Smithy request:

- protocol
- hostname
- port when present
- path
- query string

### Headers

Forward the signed headers as-is, including:

- `Authorization`
- `x-amz-date`
- `x-amz-content-sha256`
- `host`

### Body

Normalize outgoing request bodies to types accepted by the native HTTP plugin:

- string -> UTF-8 serializer
- `ArrayBuffer` / `Uint8Array` / `Blob` -> raw serializer
- no body for `GET` / `HEAD`

### Response

Normalize native HTTP plugin responses back to Smithy-compatible responses:

- preserve status code
- preserve headers
- convert body into string or binary bytes depending on response type

## Error Handling

Improve Android-specific errors:

- if native network fails before HTTP response, say the native request failed
- if the response is an S3 error status, preserve it so the AWS SDK can parse it
- keep user-facing messaging actionable:
  - invalid key
  - signature mismatch
  - bucket not found
  - network failure

After the native path lands, the old Android-specific `failed to fetch` hint should become a fallback, not the primary expected path.

## Non-Goals

- Refactoring Tencent COS to the same transport layer
- Replacing the desktop/web compatible S3 path
- Adding new UI fields
- Changing object key layout or manifest format

## Testing

### Automated

- existing compatible S3 tests should still pass
- build should pass

### Manual Android Verification

1. `Save & Connect` succeeds on Android
2. `Upload` writes `lumostime_backup.json`
3. `Upload` writes `images/...`
4. `Upload` writes `lumostime_images.json`
5. repeated upload does not falsely skip missing images
6. `Restore` succeeds on Android

## Risks

- Native HTTP response body shape may differ by platform/plugin version
- Signed request handling must preserve query parameters exactly
- Some SDK middleware assumptions may require slight response normalization tweaks

## Chosen Tradeoff

Favor transport replacement over signing reimplementation.

That keeps the current service behavior aligned across platforms, while limiting the Android-specific code to one narrow layer: the HTTP request handler.
