# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the product code (React + TypeScript).
- `src/components/` holds reusable UI blocks; `src/views/` contains page-level screens.
- `src/services/` contains integration and business services (sync, AI, export, image, etc.).
- `src/hooks/`, `src/utils/`, `src/contexts/`, and `src/constants/` store shared logic and app state helpers.
- `electron/` contains desktop runtime entry points (`main.ts`, `preload.ts`).
- `android/` is the Capacitor Android project.
- `public/` stores runtime assets; `static/` stores reference/backup assets used by scripts/docs.
- `scripts/` contains asset-processing utilities; `docs/` contains user and project documentation.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server.
- `npm run build` creates production web assets in `dist/`.
- `npm run preview` serves the production build locally for verification.
- `npm run electron:build` builds web assets and packages the Electron app.
- `npm run optimize-images` converts/optimizes PNG assets to WebP (with backups).
- `npm run convert-uiicon` converts `public/uiicon` PNG icons to WebP.
- `npx cap sync android` syncs web assets/config into the Android project when mobile changes are made.
- Do not attempt to compile the Android app from this repository workspace. Android compilation is handled manually by the user.

## Coding Style & Naming Conventions
- Use UTF-8 encoding for all files.
- Follow existing TypeScript style: 2-space indentation, single quotes, and semicolons.
- Use `PascalCase` for React components/views (`StatsView.tsx`), `camelCase` for utilities/services/hooks (`syncService.ts`, `useTodoManager.ts`).
- Keep files focused; prefer small pure helpers in `src/utils/`.
- Preserve and update file header comments (`@file`, `@input`, `@output`, etc.) when modifying source files.
- In frontend UI, avoid adding explanatory microcopy under buttons, options, or menu items unless explicitly requested. Prefer concise labels only.
- Prefer a minimalist editorial/print-inspired frontend style. Avoid box-inside-box, card-inside-card, or overly nested container treatments unless the existing screen already requires them.

## Testing Guidelines
- Vitest is available (`vitest` dependency), but no default `npm test` script is defined yet.
- Add tests as `*.test.ts` / `*.test.tsx` near the module or under `__tests__/`.
- For each PR, at minimum run `npm run build` and perform a manual smoke test of affected views/platforms.
- Android-native changes should include `android` Gradle test checks where applicable.

## Commit & Pull Request Guidelines
- Follow the repository’s existing commit style: short, focused subjects (often concise Chinese phrases such as `修复状态栏`).
- Keep one logical change per commit.
- When a code change reaches a relatively complete, verifiable feature or bug fix, run the relevant checks and create a Git commit automatically in the same task. This applies to changes in `src/`, `electron/`, `android/`, `scripts/`, configuration, and tests; do not wait for a separate request to commit.
- Do not create an automatic commit solely because a Plan, documentation, or other planning artifact was written or updated. Commit those files only when they are part of the completed code change or the user explicitly asks for it.
- Before committing, inspect `git status` and the diff, stage only files changed for the current task, and leave unrelated pre-existing or user changes unstaged. If the feature is not yet complete or verification is unavailable, defer the commit and state why.
- PRs should include: purpose, key files changed, test/verification steps, and screenshots/GIFs for UI changes.
- Link related issues/tasks and call out any data migration or breaking behavior explicitly.

## Security & Configuration Tips
- Never commit secrets or signing materials (`.env*`, `*.jks`, `redemption_codes_SECRET.*`).
- Review `.gitignore` before adding new generated assets or backup folders.
