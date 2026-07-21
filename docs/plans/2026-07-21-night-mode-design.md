# Night Mode Design

## Goal

Add a display mode that supports light, dark, and system-following behavior while preserving the user's existing color scheme selection.

## Approved Design

- Display mode is independent from the existing color scheme: `light`, `dark`, and `system`.
- The application keeps `data-color-scheme` for the accent palette and adds `data-theme-mode` for surface, text, border, and shadow tokens.
- `system` resolves through `prefers-color-scheme` and updates while the application is open.
- The saved display mode is applied before React mounts to avoid a light flash on startup.
- The setting is stored locally, consistent with the existing settings architecture.

## Implementation Plan

1. Add a focused display-mode utility for storage parsing, system-mode resolution, and document attribute application.
2. Add persisted display-mode state to `SettingsContext`, including system preference change handling.
3. Apply the stored mode from `index.html` before React begins rendering.
4. Add the mode control to Settings and preserve the existing color scheme controls.
5. Add dark-mode CSS tokens, then migrate shared shell and high-frequency UI colors from hard-coded light classes.
6. Test storage parsing and effective-mode resolution; build and smoke-test Web, Electron, and Android paths.

## Scope And Rollout

The first increment establishes the state, startup behavior, settings entry point, and global tokens. Shared components and high-frequency screens are adapted next. Remaining isolated hard-coded surfaces are tracked and migrated incrementally, rather than risking a broad unverified visual rewrite.

## Acceptance Criteria

- Users can choose light, dark, or system mode.
- The choice survives a restart.
- System mode reacts to operating-system appearance changes.
- Existing color schemes remain selected when the display mode changes.
- The application starts in the correct mode without a visible light flash.
- `npm run build` succeeds and the principal Web, Electron, and Android screens remain legible.
