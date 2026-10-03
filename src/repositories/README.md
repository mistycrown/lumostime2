# Data repositories

- `storageRepository.ts` provides IndexedDB data/meta persistence and a localStorage fallback. `setBatch` uses one transaction across stores; fallback batches recover through a write-ahead journal.
- `dataRepository.ts` migrates and saves product datasets. Log writes atomically include Feishu automatic-sync metadata; completed logs, todos, categories and scopes writes wake the foreground scheduler.
- Repository tests cover migration, fallback recovery and atomic-write failure behavior.
