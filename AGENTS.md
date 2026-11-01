# Repository Guidelines
所有操作，只要用户没用明确说明，都按照native方式执行，不用开Subagent-driven，不需要询问用户。
简单任务不需要写执行计划plan，直接执行修复即可。

## Sentry 错误排查
- 用户发送错误 ID（包括截图中的错误编号）时，必须先使用本机 Sentry CLI 查询事件详情，再结合代码和提交记录分析原因及修复状态。
- 优先使用已登录的新版 `sentry` 命令；不要仅因项目内旧版 `sentry-cli` 未登录或浏览器不可连接，就判断无法查询。可用 `sentry auth status` 检查登录状态。
- 当前项目查询示例：`sentry event view beijing-normol/javascript-react <错误ID> --fresh --json`。
- 核对事件的发生时间、release、异常堆栈和 breadcrumbs，并查询关联 issue 的状态、最近发生时间及新版本是否复发。区分“代码已有修复”“新版本暂无上报”和“已在报错设备验证解决”，不要把它们混为一谈。
- 若 CLI 查询确实失败，明确说明实际报错及缺失的访问条件；不要只根据截图或本地搜索结果断定问题已修复。

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
- Reuse the existing `CustomSelect` component for dropdowns instead of native `select` controls. Selected and focused controls must not have orange borders, outlines, or rings; use the existing neutral stone styling and retain a visible neutral keyboard-focus indicator.
- Date and time inputs must use plain digit entry: 8 digits `YYYYMMDD` for dates and 4 digits `HHMM` for times, with numeric keyboards and validation. Do not use native or custom date/calendar pickers, time pickers, or `input type="date"`, `type="time"`, or `type="datetime-local"`. Statistical calendars are visualizations, not date-entry controls.
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
