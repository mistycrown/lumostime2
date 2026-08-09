# Principle Card Widget Design

## Goal
Build a dedicated Android home-screen widget in 4x2 landscape format that:
- uses the 8 images in `public/card/` as randomized backgrounds
- reads principles from the app's principle library
- flips between front and back text on tap
- advances to the next principle card from a top-right refresh button
- supports both `.png` and `.webp` background assets during the transition period

## Scope
In scope:
- a new native widget provider/layout for the principle card
- native storage for per-widget card state
- native rendering for background + text + flip state
- web-to-native sync for principle library changes
- asset scanning that accepts both PNG and WebP backgrounds

Out of scope:
- changing the principle library editor UI
- converting the background assets now
- auto-rotating on a timer

## Chosen Approach
Use a new Android `AppWidgetProvider` rather than extending the existing timer/scene widgets.

Why:
- the current 4x2 widget family already has unrelated slot/timer behavior
- the principle card needs its own card state, refresh action, and rendering rules
- isolated storage and refresh routing keep the feature easier to debug

## Data Flow
1. The app keeps principles in `localStorage` as it already does.
2. `useWidgetBridgeSync` pushes the normalized principle list to native whenever the library changes or the app restores synced data.
3. Native stores the latest principle library in `WidgetStores`.
4. Each widget instance keeps its own state:
   - current principle id
   - current background asset
   - shuffle-bag order / cursor
   - front/back face flag
5. Taps on the card flip the face.
6. Taps on the refresh button advance both the principle and the background.

## Native Storage Model
Persist a per-instance state map keyed by `appWidgetId`.

Suggested fields:
- `currentPrincipleId`
- `currentBackgroundKey`
- `principleOrder`
- `backgroundOrder`
- `principleCursor`
- `backgroundCursor`
- `isBackSideVisible`
- `updatedAt`

The principle library payload itself should be stored separately, as a normalized array of `{ id, title, frontText, backText }`.

## Background Asset Handling
Scan `public/card/` from Android assets and accept:
- `*.png`
- `*.webp`

When both formats exist for the same stem, prefer WebP.
If only PNG exists, use PNG as-is.
If an asset disappears, reseed the bag and continue with the remaining files.

## Rendering
Render the widget as a bitmap-backed card with:
- full-bleed cropped background image
- light readability overlay
- text anchored from the top-left and occupying roughly the left 3/4 of the card
- a small refresh button in the top-right corner

Face behavior:
- front side shows the front text
- back side shows the back text
- a subtle label can be used if needed, but the main content is the principle text itself

## Interaction
- Tapping the main card area flips the face
- Tapping the refresh button advances to the next principle card and next background
- If the current principle no longer exists, reseed from the latest library
- If the library is empty, fall back to the default preset set or a minimal empty-state copy

## Web / Native Sync
Add a new bridge payload and method, likely named along the lines of:
- `syncPrincipleCardWidgetData`

Trigger it from:
- app startup hydration
- `principleLibraryChanged`
- sync restore paths that rewrite the principle library

## Verification
Validate the following:
- PNG backgrounds render correctly
- WebP backgrounds render correctly
- the card flips without changing the selected principle
- the refresh button advances to a new card
- native state survives app restarts
- principle-library edits in the app update the widget

