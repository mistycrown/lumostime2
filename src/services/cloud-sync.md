# Stable AI backup reads

The 2026-10-02 versioned sync coordinator compares persisted content. `assistantMemoryService.getMemory()` and `dreamService.getState()` therefore persist generated defaults and legacy normalization once, without emitting edit notifications. Repeated reads must not invent new timestamps or IDs. Real writes still update their timestamps and signal synchronization.

Covered by `syncBackupStability.test.ts`, existing memory/backup tests, and the isolated production renderer smoke test. Transfer rules and checkpoint details are in `../utils/cloud-sync.md`.

Modern navigation backgrounds are included in appearance backups with their mode, selection, custom list, and adjustment settings. Both local settings references and backup image references retain originals and thumbnails in the theme group. Restores hydrate device-local image URLs and refresh navigation events; navigation changes also trigger automatic sync. Covered by `appearanceBackupService.test.ts`, image-reference/cleanup tests, and the renderer harness.

Theme sticker resources are available independently of the active theme. Imports register sticker metadata immediately; stored-state reads recover missing sets from all synchronized package manifests while preserving existing edits. Cloud restores persist top-level sticker metadata before appearance listeners reload it, preventing old local lists from replacing restored records. Resource registration preserves the current theme and picker defaults.
