# AI Chat Hardware Back Design

## Goal

Make Android hardware back behave like layered navigation inside the shared AI chat window:

- Back from AI subpages returns to the previous AI layer.
- Back from the root AI chat closes the AI window.
- Closing AI returns the user to the underlying app page instead of exiting the app.

## Recommended Approach

Use a shared AI back handler instead of duplicating AI-specific state checks inside the global hardware-back hook.

- `AIBackfillChatModal.tsx` owns the actual AI subpage state, so it should define the AI-internal back order.
- `AIChatWindowContext.tsx` should expose a small bridge that lets the app ask the AI window to consume a hardware-back press when it is open.
- `useHardwareBackButton.ts` should treat the AI window as a top-priority overlay and call the shared AI back handler before falling through to the existing app-wide close and exit logic.

## Back Order

1. Debug viewer
2. Background history viewer
3. Long-term memory viewer sub-states
4. Persona panel sub-states
5. History panel sub-states
6. Root AI chat window close

Within each viewer, transient confirmation or edit states close before the viewer itself.

## Verification

- AI root -> hardware back -> close AI only
- AI root -> history -> back -> AI root
- AI root -> settings/persona -> back -> AI root
- AI root -> settings -> long-term memory -> back -> settings -> back -> AI root
- AI opened over another app page -> back from AI root returns to that page without exiting
