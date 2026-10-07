# Application contexts

Update 2026-10-07: NodeContext optionally consumes ReviewContext, indexes daily answers beside logs, discovers bracketed nodes from answers, and retargets answer links during rename/merge without breaking lightweight NodeProvider hosts.

Update 2026-10-07: DataContext stores logs/node metadata in one React state and exposes `updateNodeRecords` for coupled transforms. NodeContext rename/merge use the latest queued snapshot, update every linked log and metadata together, and retain the existing atomic repository/outbox persistence. Merge redirects source navigation IDs to the primary without adjacent duplicate history entries.

Update 2026-10-07: NodeContext exposes `moveNode` and `reorderCategory`. Node/category array order is the persisted manual order, carried by existing atomic writes, exports and sync without separate sorting metadata.

Update 2026-10-07: DataContext persists node categories atomically with node/log snapshots. NodeContext exposes category creation and assignment, including assigning a newly created detail-page category within the same event. Nodes without valid assignments are displayed as 未分类.

Update 2026-10-06: DataContext discovers nodes from saved notes and serializes log/node persistence without rewriting existing hydrated logs. NodeContext derives backlinks/co-occurrence and manages metadata and detail history. Renames persist notes, metadata and the Feishu outbox in one transaction.

Contexts hydrate product state from repositories before enabling persistence. `DataContext.tsx` owns logs and todos; `CategoryScopeContext.tsx` owns categories and associated definitions.

2026-10-03: Persisted log hydration is not written back as a user edit. Missing logs are initialized once on a fresh install. Subsequent changes use the repository's atomic log/outbox persistence path, avoiding automatic-calendar deletion intentions from a stale window's bootstrap snapshot.

2026-10-04: `SettingsContext` initializes and rehydrates sticker state through the shared resource reader, including missing sets from every imported theme package. Cloud restore writes sticker metadata before triggering appearance rehydration, so incoming sets survive the refresh.
