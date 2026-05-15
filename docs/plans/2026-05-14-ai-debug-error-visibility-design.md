# AI Debug Error Visibility Design

## Goal

Make AI request failures easier to diagnose from the chat UI by:

- showing a readable failure summary in the assistant error bubble
- exposing the full raw upstream response in `查看调试`

## Chosen Approach

Use one shared formatting helper for malformed/non-JSON responses.

- Detect HTML and other non-JSON raw responses from `debug.response.body.rawResponseText`
- Derive a short user-facing summary from status code, HTML title, visible text, and common gateway markers
- Add explicit debug-view blocks for:
  - `原始响应摘要`
  - `解析失败原因`
  - `原始响应文本`
  - `完整响应体`

## Tradeoffs

- Keeping the bubble summary short preserves the existing chat layout
- Adding full raw text only inside `查看调试` avoids flooding the main conversation with long HTML pages
- A shared pure utility makes this logic easy to test without mounting the full AI modal

## Verification Plan

- Add unit tests for HTML error-page summaries
- Add unit tests for plain-text non-JSON summaries
- Add unit tests for debug-block generation on malformed responses
