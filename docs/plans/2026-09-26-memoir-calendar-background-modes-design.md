# Memoir Calendar Background Modes

## Goal

Add a single-image Fill mode for custom Memoir mood-calendar backgrounds while preserving the existing paired-image Overflow mode. Switching modes must preserve each mode's background collection and current selection independently.

## Design

- Add an Overflow / Fill segmented control to the mood-calendar background selector.
- Keep existing built-in and custom five-week/six-week pairs in Overflow mode, including the existing image adjustment debugger.
- Fill mode accepts one image per custom background. Render it inside the calendar frame, aligned to the bottom-right and sized with `object-fit: cover`; expose per-image opacity without changing calendar-content opacity, and clip the image layer with an 8px radius. Do not expose overflow tuning controls.
- Keep Fill backgrounds and selection in separate persisted keys. Continue reading the existing background list and selection as Overflow data so existing users retain their setup.
- Keep the calendar contents above either background. Clip only the Fill background layer to the frame.
- Include Fill assets in appearance backup/restore and settings image-reference collection so sync and cleanup preserve them.

## Verification

- Test legacy Overflow data, independent mode selections, and Fill upload/delete persistence.
- Run the relevant Vitest service tests and `npm run build`.
- Manually verify mode switching, Fill clipping/alignment, and Overflow adjustment behavior.
