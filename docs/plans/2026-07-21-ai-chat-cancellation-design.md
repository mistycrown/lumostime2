# AI Chat Cancellation Design

## Goal

Make every foreground AI request visibly cancellable while it is active, and prevent Android native HTTP calls from waiting indefinitely when a provider stalls.

## Design

- Use explicit active-request UI state alongside the existing request reference. The composer shows Stop whenever an ordinary foreground request is registered, rather than relying only on a broad loading flag.
- Register the request before exposing the loading UI and clear it by the matching pending-message id. Stop clears the UI state immediately and aborts the registered controller.
- Preserve the existing AbortSignal transport path for ordinary chat, templates, review writeback, and Dream flows.
- Set the Cordova native HTTP timeout to 120 seconds because the plugin uses seconds.

## Verification

- Verify the modified source with TypeScript production build.
- Manually test normal chat: send, confirm the Stop icon appears, stop, confirm the request is replaced by a stopped message, then send again.