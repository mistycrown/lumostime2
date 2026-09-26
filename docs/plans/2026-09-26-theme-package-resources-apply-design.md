# Theme Package Resources and Apply Design

## Goal

Separate resources bundled by an imported theme from choices made when applying it. Existing built-in and saved themes remain apply-only. Existing schema-version-one ZIP themes remain readable.

## Manifest Model

New ZIP themes use schema version 2 with two top-level sections:

- `resources` declares package-owned backgrounds, navigation assets, sticker sets, TimePal items, fonts, UI icons, achievement-bottle packs, and Memoir backgrounds. Asset paths and imported item IDs live here.
- `resources` also declares card-background groups and their ordered image files/alignment.
- `apply` selects resources by ID and stores active appearance choices. Sticker settings include a default page and optional merged groups whose `sourceSetIds` refer to imported sticker-set IDs. New sticker groups append while preserving groups from other sources.
- `apply.cardBackground` optionally selects an imported card-background group and its opacity; applying it appends the group to existing card-background groups.

The parser adapts schema version 2 into the existing application model. Schema version 1 `config` remains supported and receives a first-imported-sticker default when applied.

## Lifecycle

`package.id` is the stable overwrite key. Reimporting it replaces the existing package directly; another ID cannot claim an existing package name. Deleting an imported package removes all of its image assets (including thumbnails), its local font, and package-namespaced runtime records without reference-retention checks. Delete/apply events refresh mounted settings and sticker pickers.

## Saved Themes

Saved local themes remain apply-only snapshots. They also capture and restore the sticker selector default page and merged-group configuration. No resource archive is added to saved snapshots; their existing image-reference retention remains in force.

## Implementation Checklist

- [x] Parse schema version 2 resources/apply manifests and adapt schema version 1 manifests.
- [x] Apply sticker default-page and merged-group configuration using namespaced runtime IDs; preserve existing selector groups.
- [x] Support card-background package resources and apply settings, appending groups without replacing existing ones.
- [x] Replace package ID imports directly and reject conflicting names with different IDs.
- [x] Remove package-owned resources directly on deletion and refresh in-memory state.
- [x] Include sticker selector preferences in saved theme snapshots and restore them.
- [x] Update the editable template, test ZIP, and format specification; add parser and application regression coverage.
- [x] Add parser, import/delete, application, and snapshot regression coverage; run focused tests and production build.
- [x] Review and commit only task files.
