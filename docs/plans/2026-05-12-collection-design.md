# Collection Design

## Goal

Add a dedicated `Collection` feature that lets users gather high-value records and todos into one themed place for later review, such as `社交复盘`.

## Product Definition

`Collection` is a lightweight themed container for curating existing app data.

In V1, a collection:
- has a name and optional description
- can contain both `Log` and `TodoItem`
- allows the same item to belong to multiple collections
- has its own list page and detail page

## Scope

- Add a `Collection` list page that shows all collections.
- Add a `Collection` detail page that shows the items inside one collection.
- Add a reusable entry-creation model so logs and todos can be attached to collections.
- Add `加入 Collection` actions from log detail and todo detail entry points.
- Support creating a new collection during the attach flow.

## Out Of Scope

- No keyword, tag, or global label system in V1.
- No text `[[双链]]` parsing or backlink graph.
- No collection-to-collection linking.
- No standalone multi-note system inside collections.
- No auto-recommendation or rule-based auto-collection.
- No advanced manual ordering, filtering, or smart views.

## Data Model

```ts
type CollectionItemType = 'log' | 'todo';

interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface CollectionEntry {
  id: string;
  collectionId: string;
  itemType: CollectionItemType;
  itemId: string;
  addedAt: number;
}
```

## Why This Model

- `Collection` needs to be a first-class entity because the user is organizing content by theme, not just toggling a favorite flag.
- `CollectionEntry` keeps the relationship extensible and naturally supports many-to-many membership.
- The existing `Log` and `TodoItem` types do not need new embedded membership arrays in V1.
- Future versions can extend `Collection` or `CollectionEntry` without refactoring the base log/todo contracts.

## UX

### Collection List Page

Show a simple directory of collections with:
- collection name
- optional description preview
- total item count
- last updated time

Primary actions:
- create collection
- open collection

### Collection Detail Page

Show one themed collection as a mixed content view.

Header:
- collection name
- description
- item count
- edit action

Content:
- mixed list of logs and todos
- default sort by `addedAt` descending

Log rows should show:
- time or date
- category and activity context
- note preview

Todo rows should show:
- title
- completion state
- note preview when present

### Add To Collection Flow

Expose a shared `加入 Collection` action from:
- log detail
- todo detail

The action opens a lightweight picker that can:
- select one or more existing collections
- create a new collection and attach immediately

## Implementation Plan

1. Extend `src/types.ts` with `Collection`, `CollectionEntry`, and `CollectionItemType`.
2. Add repository keys and persistence methods for collections and collection entries in `dataRepository.ts`.
3. Extend `DataContext` hydration and persistence to expose:
   - `collections`
   - `setCollections`
   - `collectionEntries`
   - `setCollectionEntries`
4. Add shared helpers for:
   - resolving all entries for a collection
   - resolving all collections for a log or todo
   - joining mixed entry ids back to displayable log/todo data
5. Add a collection list view and a collection detail view.
6. Add a reusable modal or sheet for attaching a log or todo to collections.
7. Wire the attach action into the existing log and todo detail surfaces.

## Testing

- Data-layer tests for persistence and hydration of `collections` and `collectionEntries`.
- Helper tests for mixed-item resolution and duplicate-attach prevention.
- UI smoke coverage for:
  - creating a collection
  - attaching a log
  - attaching a todo
  - rendering a mixed collection detail list

## Open Decisions Resolved In This Design

- V1 supports only `log` and `todo` as collection content.
- V1 keeps only one collection-level description, not a multi-note system.
- V1 does not include keyword, tag, or backlink features.

## Future Extensions

- Add review and goal types as collection content.
- Add optional collection keywords for search and recommendation.
- Add collection-level manual ordering or pinning.
- Add relation discovery between collections and source items.
