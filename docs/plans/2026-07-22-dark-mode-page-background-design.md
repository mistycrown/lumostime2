# Dark Mode Page Background Design

## Goal

Keep the selected background image visible on the Record, Todo, Timeline, and Archive pages in dark mode while preserving readable foreground content.

## Options Considered

1. Add a shared class to each page's existing background overlay and make that overlay translucent in dark mode. Selected because it preserves the established background-image flow and is narrowly scoped.
2. Remove the global dark-mode overrides for inline paper colors. Rejected because unrelated legacy views depend on those overrides.
3. Set separate inline dark overlay values in each page. Rejected because it duplicates theme behavior and is harder to maintain.

## Design

The four page overlays will receive a common `page-background-overlay` class. Under `html[data-theme-mode=dark]`, that class will use a translucent warm-black surface. Page text and controls keep their existing dark-mode rules.

## Verification

Build the web application, then synchronize Capacitor Android assets. Confirm that each page displays the configured background image in dark mode and retains readable content.
