# Collection Add Modal Design

## Context

`CollectionSettingsView.tsx` already exposes a mixed-item collection detail page with an `Edit` action for renaming the current collection. The next iteration should let users add existing focus logs and focus todos directly from that detail page without leaving the current collection context.

## Approved Direction

### Entry Point

- Keep the existing collection detail header.
- Change the right-side action area from a single `Edit` action into a vertical action stack with `Edit` on top and `Add` below.
- `Add` opens a lightweight centered modal that matches the page's minimalist print/editorial tone.

### Modal Structure

- The modal contains two tabs: `待办` and `记录`.
- Each tab has a single-line search input below the tab rail.
- Search runs in real time and matches against `标题 + 备注/内容`.
- The result list uses full-row selection with subtle borders, light metadata, and no heavy card nesting.

### Selection Rules

- Multi-select is supported within each tab.
- The footer shows `已选择 X 个条目`.
- The confirm button is tab-specific: `加入待办` or `加入记录`.
- Each tab only lists items that are not already part of the current collection, so repeated additions are prevented before submit.
- Empty states are shown for both "no available items" and "no search results" cases.

### Data Flow

- Reuse the existing `DataCollectionEntry` model.
- Add a shared utility that appends multiple item IDs into a target collection while preserving existing entries and deduplicating repeated IDs.
- After confirmation, immediately update collection entries and bump the target collection's `updatedAt`, then close the modal.

### Validation

- Add utility tests for batch append and duplicate avoidance.
- Run the focused utility test file and a production build to verify the new modal flow compiles cleanly.
