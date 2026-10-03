# Application contexts

Contexts hydrate product state from repositories before enabling persistence. `DataContext.tsx` owns logs and todos; `CategoryScopeContext.tsx` owns categories and associated definitions.

2026-10-03: Initial log hydration is not written back as a user edit. Subsequent changes use the repository's atomic log/outbox persistence path, avoiding automatic-calendar deletion intentions from a stale window's bootstrap snapshot.
