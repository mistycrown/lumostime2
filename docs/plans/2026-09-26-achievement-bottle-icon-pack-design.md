# Custom Achievement Bottle Icon Packs

## Goal

Allow users to add and remove custom achievement bottle icon-pack schemes by importing a ZIP archive containing PNG and/or WebP images.

## User Experience

- The ZIP filename becomes the scheme name.
- Supported images are collected recursively and sorted naturally by archive path.
- All images become animation frames; the first frame is used as the scheme preview.
- Users can select, add, and delete custom schemes alongside the bundled packs.
- Deleting the selected scheme switches the selection back to the built-in default.

## Data and Sync

- Save extracted images through `imageService` in the `theme` reference group.
- Persist custom pack IDs and ordered image filenames in the existing custom achievement icon-pack setting.
- Include that setting in appearance backup/sync, and keep each image in the theme image manifest through the settings image reference collector.
- Removing a scheme removes its configuration and references; normal image cleanup can then remove unreferenced binaries.

## Validation and Failure Handling

- Ignore unsupported files and reject archives with no PNG/WebP images.
- Do not publish a pack unless all images have been saved and the configuration write succeeds.
- If importing fails after saving some images, delete those newly saved images before returning the error.
- Keep built-in packs undeletable.

## Implementation Areas

- Extend the achievement bottle icon-pack service with dynamic custom options, registration, and deletion.
- Add a ZIP parsing service and focused tests.
- Add upload and delete controls to the existing icon-pack selector.
- Ensure restored appearance data rehydrates custom pack URLs.
