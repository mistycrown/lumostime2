# AI Chat Request Avatar Group Design

## Context

The AI chat conversation pane currently decides whether to render an avatar by checking whether the previous message has the same role. That merges consecutive assistant messages into one visual group, which means a later AI reply can lose its leading avatar when it follows another assistant reply directly.

The desired behavior is narrower: every assistant request/response should start with its own avatar, while multiple bubbles produced from the same assistant message should still share that single avatar.

## Decision

Keep the existing message model and multi-bubble `displayParts` behavior unchanged.

Only adjust the conversation renderer so:

- every assistant message always renders its avatar slot;
- user messages keep the current consecutive-message grouping behavior;
- one assistant message with multiple `displayParts` still renders one avatar and multiple bubbles.

## Implementation

1. Update `src/components/ai-chat/AIBackfillChatConversationPane.tsx`.
2. Change the avatar visibility condition to treat assistant messages as standalone groups.
3. Leave session persistence, message normalization, and reply splitting untouched.

## Verification

- Run `npm run build`.
- Manually confirm that:
  - one assistant message split into multiple bubbles still shows one avatar;
  - the next assistant reply shows a fresh avatar even when it follows another assistant reply.
