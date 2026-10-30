# Compatible S3 User-Agent Implementation Plan

> Implemented natively in the current session, following the repository's execution preference.

**Goal:** Add an optional per-provider User-Agent that can be entered in settings and honored by Electron and Android compatible-S3 transports without changing requests when unset.

**Architecture:** Persist `userAgent` beside the existing compatible-S3 credentials. Keep AWS SDK signing in the renderer, but route Electron requests through a constrained preload/main IPC transport so the main process can set the standard `User-Agent`; preserve the existing Android native handler and default web behavior. Reuse the Smithy response shape and existing S3 service/cache logic.

**Tech Stack:** React + TypeScript, Electron IPC/net, AWS SDK v3, Capacitor HTTP, Vitest, Vite.
**Spec:** `docs/plans/2026-10-30-compatible-s3-user-agent-design.md`

## Global Constraints

- Use UTF-8; preserve source header comments and update modification history.
- Keep 2-space TypeScript formatting, single quotes, and semicolons.
- Do not change Android build workflow; validate with Vitest and web build.
- Leave `userAgent` empty by default and do not alter other providers when empty.
- Validate user input as trimmed, single-line, bounded text.

## Review Focus

- Existing saved configurations without `userAgent` must load and behave exactly as before.
- Data Capsule values must reach the standard `User-Agent` header in Electron, not only an SDK-specific auxiliary header.
- Empty or whitespace-only values must not send a blank header.
- Renderer-controlled IPC headers must not allow Cookie, proxy, or connection-header injection.
- Android and web paths must retain their existing response parsing and cache behavior.

### Task 1: Persist and edit the optional setting

**Files:**
- Modify: `src/services/compatibleS3Service.ts`
- Modify: `src/views/settings/S3SyncSettingsView.tsx`
- Test: `src/services/compatibleS3Service.test.ts`

**Interfaces:**
- `CompatibleS3Config.userAgent?: string`.
- `CompatibleS3Service.saveConfig()` trims and stores the value; `loadConfig()` treats missing storage as empty.

- [x] Add regression tests for loading legacy config without `userAgent`, trimming a saved value, and omitting an empty value from the normalized config.
- [x] Run the focused tests and inspect missing-field behavior.
- [x] Implement storage keys, config normalization, and settings input. Show `S3Drive` as the example/placeholder for Data Capsule endpoints without auto-overwriting user input.
- [x] Run the focused service/settings tests and verify they pass.

### Task 2: Add the constrained Electron transport

**Files:**
- Modify: `electron/preload.ts`
- Modify: `electron/main.ts`
- Create or modify: `electron/compatibleS3Request.ts`
- Test: `electron/compatibleS3Request.test.ts`

**Interfaces:**
- Preload exposes `compatibleS3Connection.request(request: DesktopS3Request): Promise<DesktopS3Response>`, using `Uint8Array` for binary request/response bodies and an optional millisecond timeout.
- Main handler validates HTTP method/url, filters forbidden request headers, applies `userAgent` only when non-empty, and returns status/headers/body.

- [x] Add unit tests for setting `User-Agent`, omitting it when empty, and filtering Cookie/Proxy-Connection headers.
- [x] Run the focused Electron tests and inspect transport behavior.
- [x] Implement the request helper with Electron `net.request`, safe IPC registration, and binary response collection.
- [x] Run the focused Electron tests and verify they pass.

### Task 3: Route compatible S3 SDK requests by platform

**Files:**
- Modify: `src/services/compatibleS3Service.ts`
- Modify: `src/services/compatibleS3Service.test.ts`
- Modify: `src/utils/cloudJsonCache.ts` only if response conversion needs a shared helper.

**Interfaces:**
- Electron request handler implements the Smithy `HttpHandler` contract and uses the preload bridge; Android handler remains unchanged except for forwarding the configured `userAgent`.

- [x] Add regression tests proving Electron requests use the bridge with the configured standard User-Agent and no bridge call when no User-Agent is configured.
- [x] Implement platform detection and request/response conversion while preserving signing, conditional reads, and existing error status propagation.
- [x] Add/update Android header assertions and run all compatible-S3 tests.

### Task 4: Improve actionable 401 diagnostics and verify the feature

**Files:**
- Modify: `src/services/compatibleS3Service.ts` or `src/utils/syncUtils.ts` where compatible-S3 errors are translated.
- Test: relevant existing service/sync tests.

- [x] Add a regression assertion that a 401 includes an actionable User-Agent/configuration hint while preserving the original status.
- [x] Run focused Vitest tests.
- [x] Run `npm run build`.
- [x] Inspect `git diff` and `git status`, stage only implementation files, and commit the completed feature.

## Verification results

- 64 tests pass under `vitest.s3.config.ts`, including real AWS SDK desktop/native response handling.
- `npm run build` produces web, Electron main and preload bundles.
- `scripts/test-s3-user-agent.mjs` exercises a real isolated Electron app against a local HTTP server: standard User-Agent, signed uploads/downloads, binary images, conditional GET, 401 and settings draft/save/reload.
- The full TypeScript check retains 118 existing errors. The S3 settings errors are the pre-existing zero-argument `confirm` wrapper; the new transport modules have no reported type errors.
- Main IPC permits only expected top-level frames of the known main and AI app windows, since both use the existing sync lifecycle.
