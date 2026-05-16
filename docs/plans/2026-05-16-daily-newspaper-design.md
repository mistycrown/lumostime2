# Daily Newspaper Design

## Goal

Add a new AI chat command `小报` that analyzes the real timeline for one day, stores a lightweight structured result on `DailyReview`, returns an in-chat result card, and opens a dedicated full-screen editorial newspaper page based on the `static/chronos-ai` reference demo.

## Chosen Approach

Use a new optional `DailyReview.aiNewspaper` field as the single persisted source of truth.

Why:

- It keeps storage close to the existing daily narrative record.
- It reuses current Daily Review persistence and date lookup.
- It avoids duplicating timeline body data that already exists in logs.
- It supports lightweight historical replay by resolving `logId` references at render time.

## Stored Shape

Persist only the minimum information needed to reconstruct the page:

- `version`
- `date`
- `title`
- `assistantReply`
- `overallComment`
- `annotations: [{ logId, comment }]`
- `updatedAt`

The page resolves all other display data from real logs, categories, todos, and scopes.

## Chat Flow

Only ordinary chat sessions support the `小报` command.

Flow:

1. User sends `小报`.
2. The app ensures a `DailyReview` exists for today.
3. The app builds one-day real timeline context from logs/todos/review state.
4. AI returns strict JSON containing:
   - `assistantReply`
   - optional ordinary `toolCalls`
   - `newspaperToolCall`
5. The app applies any normal tool calls.
6. The app writes `newspaperToolCall` into `DailyReview.aiNewspaper`.
7. The assistant message renders a dedicated newspaper result card.

If a newspaper already exists for that date, the flow asks for local overwrite confirmation, mirroring the current daily narrative writeback behavior.

## Navigation

Add a dedicated full-screen newspaper page instead of merging the content into the existing Daily Review tabs.

New navigation state:

- `isDailyNewspaperOpen`
- `currentDailyNewspaperDate`

Entry points:

- In-chat newspaper result card
- A new item under the AI narrative area inside `DailyReviewView`

## UI

The full-screen page should closely follow the reference demo:

- editorial date header
- large serif title
- overall AI impression block
- continuous vertical timeline
- per-log domain chips, tags, todo rows, notes
- annotation quote blocks under matching events

The page should tolerate missing logs gracefully by marking them as deleted/unavailable instead of failing the render.

## Compatibility

- Daily review normalization must preserve older records that do not have `aiNewspaper`.
- Persistence remains repository-backed through the existing `dailyReviews` save path.
- The AI chat session/message normalization must preserve the new result card payload.

## Validation

- `小报` command creates a newspaper when none exists.
- Existing newspaper prompts overwrite confirmation.
- In-chat result card opens the newspaper page.
- `DailyReviewView` shows a historical newspaper entry when data exists.
- Build passes with `npm run build`.
