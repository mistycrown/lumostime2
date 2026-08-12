# AI Failure Debug Fallback Design

## Goal

Keep a per-message debug entry when an AI request fails in debug mode, including failures whose thrown error does not carry an `AIDebugExchange`.

## Design

- Preserve the existing full request/response exchange whenever the AI service provides it.
- When no exchange exists, attach a fallback debug section with the error name, message, stack when available, and an explicit note that transport-level request data was not captured.
- Keep the fallback restricted to debug mode and avoid adding secrets or API configuration values.

## Verification

- Add unit coverage for enabled and disabled fallback behavior.
- Run the affected Vitest suite and the production build.
