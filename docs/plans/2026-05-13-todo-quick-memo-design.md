# Todo 小事分组设计

Date: 2026-05-13

## Problem

The current todo system is optimized for long-running, timer-oriented project tasks. That works well for tasks that need focus sessions, linked activities, scopes, or progress tracking, but it is too heavy for lightweight reminder-style items.

We want to support a second kind of todo:

- fast to capture;
- can still be arranged to a day or given a deadline;
- appears in the existing schedule views;
- cannot be used for timer tracking;
- does not require tag, activity, or scope setup.

## Approved approach

Use one shared todo data model, but add a lightweight subtype for small reminder-style items.

- Add a `kind` field to `TodoItem`:
  - `project`
  - `quick`
- Keep all existing project todos as `project` by default.
- Add a new virtual sidebar group `小事` fixed at the bottom of the Todo page.
- Keep the existing virtual `排期` group fixed at the top.
- Allow `quick` todos to appear in `排期` whenever they have `scheduledDate` or `deadlineDate`.
- In the `小事` group, the add action should be inline quick entry instead of opening the full detail modal.

This keeps storage, scheduling, completion state, and list rendering unified, while still giving users a much lighter capture flow.

## Why this approach

### Option A: Todo subtype plus virtual `小事` group

Pros:

- reuses the existing todo, schedule, and completion pipeline;
- keeps the product mental model clear: project todos and quick reminders are related, but not the same;
- leaves room for future conversion between the two modes.

Cons:

- requires several UI behavior branches based on todo kind.

### Option B: Separate memo entity

Pros:

- semantically pure.

Cons:

- duplicates scheduling, search, completion, calendar assignment, and storage logic;
- too expensive for the size of the feature.

### Option C: Plain todo category named `小事`

Pros:

- fastest to ship.

Cons:

- mixes reminder items into the same semantic layer as project categories;
- does not naturally prevent timer, tag, or scope behavior;
- likely to accumulate one-off exceptions later.

### Decision

Use Option A.

## Data model

Add a field to `TodoItem`:

```ts
kind?: 'project' | 'quick';
```

Behavior rules:

- missing `kind` is treated as `project` for existing data compatibility;
- `project` keeps all current behavior;
- `quick` supports:
  - `title`
  - `isCompleted`
  - `completedAt`
  - `scheduledDate`
  - `deadlineDate`
  - `note` as optional future-compatible storage
- `quick` does not expose:
  - linked activity / linked category
  - scope association
  - progress tracking
  - subtasks
  - recurrence
  - focus/timer start

## Todo page structure

The Todo sidebar should have three layers:

1. top virtual group: `排期`
2. middle real todo categories
3. bottom virtual group: `小事`

The new `小事` entry is a virtual grouping, not a persisted `TodoCategory`.

This keeps the sidebar semantics stable:

- `排期` answers “what needs attention by time”;
- real categories answer “what long-term buckets do these project tasks belong to”;
- `小事` answers “what reminder-style items did I jot down”.

## Creation flow

### Existing project categories

No change:

- tapping add still opens `TodoDetailModal`.

### `小事` group

Change the add behavior to a fast inline entry flow:

- tapping add reveals a single-line input row inside the list;
- user enters title only;
- pressing Enter creates a `quick` todo immediately;
- after save, focus stays in the input so the user can add multiple items quickly.

This is the core product change. The small-task flow should feel closer to jotting down checklist items than creating a structured task.

## Editing and row behavior

For first release, `quick` todos should avoid the full-detail flow by default.

- primary interaction stays lightweight;
- completion toggle works the same as normal todos;
- no timer/focus button is shown;
- row-level quick actions can include:
  - arrange date
  - deadline date
  - delete

If a `quick` todo is opened from an unexpected path, the app should still avoid exposing project-only configuration.

## Scheduling behavior

`quick` todos participate in the schedule system exactly when they have date metadata:

- `scheduledDate` puts them into arrange-based schedule views;
- `deadlineDate` puts them into due-based schedule views;
- they are shown in the top virtual `排期` group together with project todos;
- they can be assigned from existing schedule date pickers and schedule modals.

This keeps the schedule page as a unified “what happens on this date” surface rather than splitting project tasks and reminders apart.

## Restrictions for `quick` todos

For clarity and speed, first release should enforce these restrictions:

- cannot start focus / timer tracking;
- cannot link to activity/category tags;
- cannot link scopes;
- cannot configure progress tracking;
- cannot create subtasks;
- cannot use recurrence;
- does not require entering the detail page to be useful.

If a user tries to start timing from a path that still receives a `TodoItem`, show a toast explaining that `小事` is reminder-only and does not support timing.

## First-release non-goals

To keep scope tight, do not include these in v1:

- dedicated `quick` detail page;
- conversion UI between `project` and `quick`;
- quick-todo subtasks;
- quick-todo recurrence;
- quick-todo statistics;
- a separate persisted category for `小事`.

These can be added later if the capture model proves useful.

## Recommended implementation phases

### Phase 1: model and grouping

- add `TodoItem.kind`;
- treat missing kind as `project`;
- add virtual `小事` sidebar group after all real categories;
- filter that group to only `quick` todos.

### Phase 2: creation flow

- add inline quick-entry UI inside the `小事` list;
- create new items as `kind: 'quick'`;
- keep title-only creation path.

### Phase 3: interaction guardrails

- hide timer/focus affordances for `quick` todos;
- block focus start in shared handlers with a toast fallback;
- hide or disable project-only quick actions.

### Phase 4: scheduling polish

- allow quick todos to use existing assign/deadline flows;
- ensure `排期`, week, and month views render them naturally;
- keep schedule sorting unified with current rules.

## Affected areas

- `src/types.ts`
- `src/views/TodoView.tsx`
- `src/hooks/useTodoManager.ts`
- `src/components/TodoDetailModal.tsx`
- `src/components/TodoScheduleAssignModal.tsx`
- `src/utils/todoScheduleUtils.ts`
- `src/utils/todoListDisplayUtils.ts`
- related Todo tests

## Verification

- `小事` appears as a virtual sidebar group after real todo categories.
- Adding inside `小事` does not open the full detail modal.
- Pressing Enter in the inline input creates a `quick` todo immediately.
- `quick` todos can be completed normally.
- `quick` todos with schedule or deadline dates appear in `排期`.
- `quick` todos can be assigned to a date from the existing scheduling flow.
- `quick` todos do not show or allow timer/focus start.
- Existing `project` todos keep current behavior unchanged.
