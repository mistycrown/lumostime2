# Daily Newspaper Comment Threads Design

## Goal

Add lightweight, local multi-turn comments to daily AI newspapers. A user can reply to an AI annotation in the newspaper page, and the AI can continue the exchange. The conversation is stored only inside that day's `DailyReview.aiNewspaper`, similar to comments under a social post.

## Chosen Approach

Use one comment thread per AI annotation. Each thread is keyed by the annotation's `logId` and contains ordered user/assistant turns. This keeps the interaction close to the newspaper content and avoids mixing newspaper follow-ups into the global AI chat history.

## Data Flow

`DailyNewspaper` gains optional `commentThreads`. The newspaper view renders comments under each annotated timeline item. On submit, the view sends the day context, the newspaper summary, the target annotation, the existing thread, and the user's reply to `dailyNewspaperService`, which builds a strict JSON prompt. The returned AI reply is appended together with the user's turn and persisted through `setDailyReviews`.

## UI Direction

The comment area stays visually quiet: thin rules, serif assistant text, compact user rows, and a small editorial input line. It should feel like marginalia under the printed AI comment rather than a separate chat room.

## Testing

Add service-level coverage for prompt assembly, response parsing, comment normalization, and local append behavior.
