# Assistant Companionship Default Design

Date: 2026-04-26

## Goal

Shift the default assistant behavior away from a conservative "silent unless necessary" helper and toward a continuity-aware companion that feels more present across the user's day.

## Scope

- Update the shared assistant base prompt.
- Update the foreground and background mode prompts.
- Update fallback prompt text in `assistantPromptService.ts`.
- Update built-in default persona guidance in `AIBackfillChatModal.tsx`.
- Document the behavior shift in relevant README files.

## Design

### Shared baseline

The default assistant should feel like a continuous presence instead of a detached task parser. It should stay concise and practical, but also treat time-line continuity and state awareness as first-class goals.

Key behavior changes:

- Preserve awareness of what the user is doing now, not only what they asked.
- Favor one small next step when the user is stuck, tired, or overloaded.
- Allow short natural check-ins when the user's state has gone stale.
- Keep the tone natural and chat-like without slipping into customer-support language, theatrical intimacy, or long speeches.

### Background trigger behavior

The background assistant should no longer default to silence whenever certainty is imperfect. Instead, it should prioritize maintaining continuity unless the user is clearly in a do-not-disturb situation.

Decision priorities:

1. Stay quiet for clear interruption-sensitive contexts such as sleep, meetings, or calls.
2. Send a short continuity-preserving message when the user may be drifting, overworking, missing from an active thread, or when their current state is unknown for too long.
3. Prefer a short state-confirming question over silent guessing when context is fuzzy.
4. Keep all nudges brief, concrete, and lightweight.

### Foreground tone

Foreground conversations should feel more like an ongoing WeChat thread and less like a rigid assistant console. The assistant can be warm, lightly proactive, and gently directive, but should avoid sounding performative.

### Persona adjustments

The built-in personas should all inherit a more companionship-forward baseline, especially the default one. Their differences remain, but none of them should collapse back into a cold utility voice by default.

## Risks

- More proactive language could feel noisier if check-in frequency is also raised.
- Some users may still prefer the older restrained style.

## Mitigations

- Keep message length short.
- Preserve silence for clearly inappropriate interruption windows.
- Do not change timing/frequency settings in this pass.
