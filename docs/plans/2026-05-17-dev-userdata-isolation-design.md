# DEV UserData Isolation Design

## Goal

Keep Electron development builds separate from the packaged desktop app so local debugging cannot read or overwrite the installed app's desktop data.

## Problem

LumosTime desktop persistence currently flows through Electron `userData`, browser `localStorage`, browser `IndexedDB`, and widget-state JSON files stored under `app.getPath('userData')`.

When the Vite-powered DEV build and the packaged install resolve to the same Electron storage root, they end up sharing:

- `localStorage`
- `IndexedDB`
- persisted widget window-state files

That makes test data and production-like data bleed into each other.

## Approaches Considered

### 1. Redirect only DEV `userData`

Detect the Vite dev server at main-process startup and set `app.setPath('userData', ...)` to a dedicated DEV directory before any windows are created.

Pros:

- leaves the packaged app untouched
- isolates all Electron-backed browser storage automatically
- keeps the change local to the Electron shell

Cons:

- DEV starts with a fresh storage profile the first time

### 2. Change the DEV app name

Give the development build a different Electron app identity.

Pros:

- can isolate more than storage

Cons:

- broader side effects on notifications, window identity, and desktop behavior

### 3. Build a profile switcher

Add an explicit profile-selection mechanism.

Pros:

- flexible for future test profiles

Cons:

- much more complexity than needed for the immediate bug

## Decision

Use approach 1.

During DEV runs, Electron will redirect `userData` to `LumosTime Dev`. Packaged installs continue using the existing directory, so current installed data remains in place.

## Implementation Notes

- Compute `IS_DEV` from `VITE_DEV_SERVER_URL`.
- Call `app.setPath('userData', path.join(app.getPath('appData'), 'LumosTime Dev'))` before window creation.
- Keep repository and renderer persistence logic unchanged so isolation applies automatically to `localStorage`, `IndexedDB`, and widget-state JSON.
- Document the behavior in `electron/README.md`.

## Verification

- Run `npm run build` to confirm the Electron entry still compiles.
- Launch DEV and packaged builds separately and confirm they no longer share desktop data.
