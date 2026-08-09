# Principle Card Widget Visual Refresh Design

## Goal
Adjust the dedicated Android 4x2 principle-card widget so it feels like text floating over the provided card artwork:
- rounded corners are applied to the image itself
- the background image remains fully visible, with no left-side white mask
- text uses a native sans-serif/black-style typeface instead of a serif/Song-style face
- body text scales based on card length and available space
- unlocking the phone advances to a random next principle/background

## Decisions

### Rounded Image
The widget is rendered as a single bitmap inside an `ImageView`, so the outer layout cannot reliably crop the image. The renderer should create a rounded-rectangle bitmap with transparent corners. This makes the image and text share one clipped surface.

### Typography
Do not attempt to reuse the WebView font setting in this pass. The app's Chinese built-in fonts are currently Web-oriented `.woff2` assets, and uploaded fonts are IndexedDB blobs. Android native widget rendering cannot directly use those CSS fonts. Use Android native sans-serif faces:
- title: `sans-serif-medium`
- body: `sans-serif`

This gives a black-style appearance and avoids the current serif/Song-style rendering.

### Background Visibility
Remove the readability gradient mask. Keep the artwork complete. Preserve readability with subtle text shadow only.

### Text Sizing
Use a smaller baseline size than the first implementation. Pick an initial body size from text length, then continue shrinking only if the rendered layout exceeds the available height. Increase line spacing slightly so long cards feel less compressed.

### Unlock Refresh
Use Android's `Intent.ACTION_USER_PRESENT` broadcast as the nearest reliable signal for "the user opened the phone". App widgets do not receive a signal when the launcher scrolls to a specific home-screen page. On unlock, advance both the principle and background shuffle state and return to the front side.

## Verification
Add regression coverage for:
- rounded bitmap clipping is applied in the renderer
- readability mask is removed
- sans-serif text rendering is used
- dynamic body text sizing is present
- `USER_PRESENT` is registered and advances the principle-card widget
