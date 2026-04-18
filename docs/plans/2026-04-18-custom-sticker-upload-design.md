# Custom Sticker Upload Design

## Goal

Add a user-managed custom sticker feature for the Memoir mood calendar.

After this change:

- Users can create custom sticker groups.
- Each group can contain up to 16 uploaded sticker images.
- Active custom groups appear in the existing sticker picker alongside preset groups.
- Uploaded sticker assets participate in export/import and cloud sync.
- Soft-deleted groups disappear from the picker but do not break historical mood entries.
- Image cleanup does not delete active custom sticker assets or historically referenced sticker assets.
- Unreferenced assets inside archived groups can be reclaimed automatically.

## Confirmed Product Decisions

- Group deletion uses soft delete.
- When a group is soft-deleted, sticker images still referenced by historical daily reviews must be kept.
- Sticker images that are no longer referenced anywhere should be deleted.
- Active groups protect all of their sticker assets from cleanup, even if the user has not used them yet.

## User Flow

### Manage Sticker Groups

1. User opens the existing Emoji and Sticker settings page.
2. User enters a new `Custom Sticker Groups` section.
3. User creates a group with a name and optional description.
4. User uploads up to 16 images into the group.
5. User can reorder stickers, remove a sticker, rename the group, or archive the group.

### Pick a Sticker

1. User opens the existing mood picker from Memoir / Daily Review.
2. User swipes or taps to a custom sticker page.
3. User selects a sticker.
4. The selected value is stored in the existing `DailyReview.moodEmoji` field as an image-backed sticker reference.

### Archive a Group

1. User archives a custom sticker group in settings.
2. The group no longer appears in the picker.
3. Historical daily reviews that already reference stickers from the archived group continue to render.
4. Sticker assets from the archived group are only deleted later if they are no longer referenced anywhere.

## Data Model

### New Persistent Records

Add two persisted record types.

`CustomStickerSetRecord`

- `id`
- `name`
- `description?`
- `stickerIds: string[]`
- `status: 'active' | 'archived'`
- `createdAt`
- `updatedAt`

`CustomStickerRecord`

- `id`
- `setId`
- `imageFilename`
- `thumbnailFilename?`
- `label?`
- `sortOrder`
- `status: 'active' | 'archived'`
- `createdAt`
- `updatedAt`

### Existing Review Field Reuse

Keep using `DailyReview.moodEmoji`.

For custom stickers, store the selected value as:

- `image:<imageFilename>`

Do not encode the group id into `moodEmoji`.

Reason:

- Renaming a group does not affect historical rendering.
- Reordering a group does not affect historical rendering.
- Archiving a group does not affect historical rendering.
- Cleanup logic can reason directly from the underlying image filename.

### Runtime View Model

Keep `stickerService.getAllStickerSets()` as the runtime adapter layer that returns the picker-facing `StickerSet[]`.

It should merge:

- preset sticker sets from static `/sticker/...` assets
- custom sticker sets assembled from persisted records

Rules:

- only `active` custom sets appear in the picker
- archived sets are hidden from the picker
- archived stickers may still render in history if their image filename is referenced by `DailyReview.moodEmoji`

## State Ownership

Custom sticker metadata should become part of the main synced app state, not only a local `localStorage` side store.

Recommended ownership:

- `SettingsContext` holds `customStickerSets` and `customStickers`

This keeps the feature close to the existing emoji / sticker configuration surface while still participating in sync.

The following flows must include the new state:

- export JSON
- import JSON
- manual cloud upload
- manual cloud download
- normal sync conflict resolution / sync state replacement

## Storage and File Lifecycle

### Asset Storage

Uploaded custom sticker images should be stored through the existing image repository path, using `imageService`.

That means:

- local files are stored in the same managed image warehouse as user-uploaded log images
- cloud sync reuses the existing image sync pipeline into the remote `images/` directory
- optional thumbnails can reuse the existing thumbnail generation approach

### Metadata Storage

Custom sticker set metadata and sticker metadata are stored in synced JSON data.

This separates:

- binary assets in the image warehouse
- business metadata in synced JSON

### Upload Order

The write order should be:

1. save image file successfully
2. save thumbnail if needed
3. create sticker record
4. update set record

Do not create metadata first and upload the image later.

Reason:

- avoids empty stickers that point to missing files
- reduces sync inconsistency after interrupted uploads

## Cleanup Rules

### Referenced Asset Sources

Image cleanup must expand its reference analysis beyond logs and todo covers.

Protected custom sticker asset sources become:

1. all sticker assets belonging to `active` custom groups
2. all custom sticker assets referenced by `dailyReviews[].moodEmoji`

Static preset sticker paths such as `/sticker/water1/01` are not part of the image warehouse and do not enter local cleanup calculations.

### Active Group Protection

All sticker assets inside an active custom group count as referenced for cleanup purposes.

Reason:

- a user may upload a sticker today and use it later
- cleanup must not remove newly uploaded stickers before the user selects them

### Archived Group Reclamation

For archived groups:

- if a sticker image is still referenced by any `DailyReview.moodEmoji`, keep it
- if a sticker image is no longer referenced anywhere, delete the sticker file and thumbnail
- when all stickers in an archived group are gone, delete the empty archived group record

### Delete Behaviors

#### Archive Group

- mark the set as `archived`
- hide the set from picker and settings active list
- do not delete files immediately

#### Remove Sticker from Group

If the sticker is still referenced historically:

- archive the sticker record or otherwise hide it from the group UI
- keep the image asset

If the sticker is not referenced:

- remove the sticker record
- delete image and thumbnail files

### Cleanup Implementation Shape

Use `imageCleanupService` as the main file deletion authority.

Add custom sticker references into its referenced-image calculation rather than building a second file-deletion rule set.

An optional lightweight metadata cleanup step can remove empty archived sets after image cleanup finishes.

## Sync and Export / Import

### Export

Add custom sticker metadata to the exported JSON payload:

- `customStickerSets`
- `customStickers`

Custom sticker image files continue to use the existing image export / sync mechanisms.

### Import

Import rules:

- if the JSON contains custom sticker metadata, restore it
- if the JSON does not contain those fields, treat it as an older backup and continue without error
- restored custom sticker metadata should work with the normal image restore path

### Cloud Sync

Cloud sync must cover both:

- sticker metadata inside the main data JSON
- sticker image files inside the existing image sync system

Cross-device success criteria:

- the destination device receives the metadata
- the destination device downloads the referenced sticker images
- active custom groups appear in the picker
- historical mood stickers continue to render

## UI Design

### Settings Entry

Add management UI to the existing emoji and sticker settings page rather than to the picker itself.

Reason:

- picker should remain lightweight and selection-focused
- upload, reorder, rename, and archive are management actions
- this keeps sticker resource management in one predictable place

### Settings Section Structure

Add a `Custom Sticker Groups` section to the emoji settings page.

Each group card shows:

- group name
- optional description
- sticker count as `x / 16`
- group status
- preview of several stickers

Each group supports:

- upload sticker
- reorder stickers
- remove sticker
- rename group
- edit description
- archive group

### Picker Behavior

In the mood picker:

- show active custom groups after preset groups
- keep the existing page-based sticker navigation model
- one group maps naturally to one page because of the 16-item max
- if an image fails to load, render a safe placeholder tile without breaking the page

### Confirmation Copy

Archive group confirmation should clearly communicate:

- the group will disappear from the picker
- previously used stickers stay visible in history
- unused assets may be cleaned automatically later

Remove sticker confirmation should communicate:

- historically used stickers stay visible in history
- unreferenced sticker assets will be removed

## Migration and Compatibility

### Current Situation

`stickerService` already has a local-storage-only custom sticker concept, but it only stores lightweight metadata and does not own uploaded assets through the managed image repository.

### Compatibility Strategy

Keep the public service shape where possible and upgrade the internals.

Recommended approach:

- keep `getAllStickerSets()`
- keep the preset sticker set contract
- migrate custom set reads away from direct `localStorage` dependence
- use synced state as the new source of truth

### One-Time Migration

On app startup or first access:

- read old `lumostime_custom_sticker_sets`
- if new synced custom sticker state is empty and the old local payload exists, migrate what is valid
- only migrate metadata that can still be represented safely
- do not fabricate missing image files

If old custom entries only point to paths that are not in the managed image store, prefer conservative compatibility over aggressive migration.

## Module Impact

Likely impacted modules:

- `src/types.ts`
- `src/contexts/SettingsContext.tsx`
- `src/services/stickerService.ts`
- `src/components/MoodPicker.tsx`
- `src/views/settings/EmojiSettingsView.tsx`
- `src/App.tsx`
- `src/services/imageCleanupService.ts`
- `src/services/settingsImageReferenceService.ts` or a new custom-sticker reference helper
- sync state update pipeline used by `useSyncManager`

Potential new modules:

- `src/services/customStickerService.ts`
- `src/services/customStickerCleanupService.ts` for metadata-only cleanup if needed

## Validation

Must verify the following flows:

1. Create a custom sticker group and upload 1 sticker.
2. Create a custom sticker group and upload 16 stickers.
3. Confirm the picker shows the new active group.
4. Select a custom sticker and confirm `DailyReview.moodEmoji` persists and reloads correctly.
5. Export data, then import it, and confirm custom groups and stickers remain available.
6. Sync to another device / profile and confirm custom groups and historical stickers render correctly.
7. Archive a group and confirm it disappears from the picker while historical entries still render.
8. Run image cleanup and confirm:
   - active custom sticker assets are kept
   - historically referenced archived sticker assets are kept
   - unreferenced archived sticker assets are deleted
9. Remove a sticker from an active group and confirm referenced vs unreferenced behavior is correct.

## Risks

- The highest-risk area is image reference calculation. If custom sticker references are omitted, cleanup may delete valid assets.
- A second risk is metadata / asset sync skew, where a device restores sticker metadata before the corresponding images arrive.
- A third risk is over-aggressive migration from the old local-storage-only custom sticker format.

## Recommendation

Implement this feature by treating custom stickers as first-class managed image assets plus synced metadata.

This is the smallest design that satisfies all confirmed requirements:

- picker integration
- soft delete with historical continuity
- cloud sync
- export / import
- safe cleanup of only truly unreferenced assets
