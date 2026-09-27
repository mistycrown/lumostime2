# Unified Theme Management Design

## Goal

Unify built-in legacy presets, saved local themes, and imported theme packages in the Scheme tab. All entries use one card layout and consistent apply/delete actions. Imported and user-saved themes can be removed; built-in presets remain protected. User-saved themes are immutable: changes are made in Appearance settings, then saved as a new theme.

## Compatibility Model

Keep the existing legacy preset storage and application adapter so old preset IDs and their appearance remain compatible. Legacy presets explicitly declare `navigation.mode: "legacy"` and continue applying `navigationDecorationService` values. New theme-package navigation defaults to the modern navigation service; packages may explicitly opt into legacy navigation with a legacy decoration ID.

The Scheme tab adapts each source into a shared view model instead of migrating every built-in record or rewriting imported packages. Imported packages retain their manifest and package version metadata. Legacy presets retain their stable IDs and existing apply behavior.

## Saved Theme Snapshot

Saving current settings creates an immutable local theme record that captures the complete supported appearance state, including UIIcon, color scheme, background, both navigation systems and icon selection, TimePal, font selection, achievement-bottle style and icon pack, timeline style/configuration, Memoir background mode/settings, and package-managed sticker/resource references. Snapshot application restores this state using existing services and emits the existing refresh events.

Previously saved legacy custom presets remain readable and are displayed in the unified list. They may be applied or deleted, but are not editable. New saves use the complete snapshot format.

## Deletion and Resource Lifecycle

Deleting an imported theme removes its package metadata and package-local font record. If it is active, apply the protected built-in default theme first and clear its active ID. Remove package-derived custom records where they are not referenced by user data or another saved theme. Only delete image files after the application reference collectors confirm they are unused; shared, diary-referenced, or snapshot-referenced assets remain intact.

Deleting a saved local theme removes its snapshot metadata. Built-in presets cannot be deleted. The existing default fallback remains available if the active saved theme is deleted.

## Validation

- All theme sources share the same card composition, selected state, apply action, and delete affordance where deletion is allowed.
- Old built-in presets still apply their legacy navigation decorations.
- Imported legacy-navigation packages apply through the legacy navigation service.
- A new saved snapshot restores each supported setting, including independent Memoir fill/overflow mode and modern navigation settings.
- Active-theme deletion returns the app to the default preset before resource cleanup.
- Deleting a theme preserves images referenced by another theme or user content.
- Preset editing UI and update paths are removed; creating a new saved theme remains available.
