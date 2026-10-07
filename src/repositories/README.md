# Data repositories

Update 2026-10-07: Core snapshots include optional `nodeCategories` with an empty legacy default. Log saves and node metadata saves can include categories in their batch transaction, preserving empty categories and assignments across reloads.

Update 2026-10-06: `dataRepository.ts` hydrates optional `nodes` with an empty default for existing installations. `saveLogs(logs, nodes)` persists linked metadata atomically with logs and the Feishu outbox; metadata-only edits use `saveNodes`.

- `storageRepository.ts` provides IndexedDB data/meta persistence and a localStorage fallback. `setBatch` uses one transaction across stores; fallback batches recover through a write-ahead journal.
- `dataRepository.ts` migrates and saves product datasets. Log writes atomically include Feishu automatic-sync metadata; completed logs, todos, categories and scopes writes wake the foreground scheduler.
- Repository tests cover migration, fallback recovery and atomic-write failure behavior.
- Core snapshots distinguish missing logs from persisted hydration so first installs can initialize without rewriting existing datasets.
