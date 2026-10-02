# Cloud sync verification

Run `node scripts/test-sync.mjs` for protocol/adapter/scheduler regressions.

Run `node scripts/test-sync-renderer.mjs` for the real React hook lifecycle tests. The runner uses the installed Electron and esbuild dependencies, an in-memory cloud adapter, a hidden window, and a fresh temporary profile. It does not access configured cloud credentials or the installed app's user data.

For production smoke testing:

1. `npm run build`
2. `node scripts/run-vite.js preview --host 127.0.0.1 --port 4179 --strictPort`
3. `node scripts/test-sync-renderer.mjs --smoke-url http://127.0.0.1:4179`

The runner reports the screenshot path in its temporary directory. It fails on uncaught renderer errors or an incomplete startup. Android compilation remains a manual user step.
