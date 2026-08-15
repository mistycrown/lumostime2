# Android Native ActionBar Compatibility Design

## Problem

On some Android ROMs, including affected Xiaomi devices, the app can launch through an `activity-alias` using the application-level `AppTheme`. That theme currently inherits `Theme.AppCompat.Light.DarkActionBar`, so Android creates a native title bar that displays the app name (`LumosTime`). The native bar occupies the same visual space expected for the React header and affects every route, including Record, Todo, and Scope.

## Decision

Make the application-level fallback theme action-bar-free and retain the splash theme's post-splash transition to the same action-bar-free theme. Add a `MainActivity` runtime safeguard that hides a native support action bar if a device or ROM still creates one.

## Scope

- Android only.
- Preserve the React-owned page header, including centered titles and right-side settings actions.
- Do not change iOS behavior or React page layouts.

## Verification

- Inspect the resolved Android theme declarations and the runtime guard.
- Run the web production build.
- Sync the generated web assets into the Android project.
- Android compilation and device verification remain manual because this workspace does not build Android artifacts.
