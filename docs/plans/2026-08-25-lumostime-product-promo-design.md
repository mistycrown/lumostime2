# LumosTime Product Promo Design

## Goal

Create an independent Android product-promo project for LumosTime. The finished vertical film introduces the product philosophy, differentiating strengths, and basic ways to start using the app without changing the application source tree.

The intended audience is people interested in time management who want a coherent, approachable tool for starting, recording, and reflecting on their time.

## Product Promise

The film is built around one message:

> 从一次开始，到一条脉络，再到看见自己。

LumosTime is not presented as a tool for controlling every minute. It helps people preserve real effort as a searchable, reviewable, and continuing personal time system.

## Audience And Tone

- Audience: Android users who are interested in time management and want an approachable, durable system.
- Tone: calm, capable, personal, and grounded in real use.
- Language: concise Chinese subtitles, with optional concise Chinese voiceover.
- Format: 1080 x 1920 vertical, 30 fps, approximately 75 seconds.
- Surface: one coherent Android device surface throughout. Do not show browser chrome, desktop windows, or emulator controls.

## Narrative Spine

Use one fictional but credible learning project, such as an English-learning or thesis-writing project, to connect features. The story is not a feature catalog:

`一次开始 -> 多种记录入口 -> 项目与长期方向 -> 计划和实际 -> AI 协作 -> 洞察与回顾 -> 数据归属 -> 品牌收束`

## Product Strengths

1. **无感记录，随时开始**
   - Click-to-start activity tracking, manual backfill, quick time points, AI backfill, Android NFC, and the floating timer ball.
   - The film makes clear that users can begin from the method that fits the moment.

2. **把“做什么”与“为了什么”连接起来**
   - Activities/tags represent what the user did; scopes represent long-term directions; todos represent concrete projects; goals quantify accumulated progress.
   - Their cross-linking avoids a deeply nested, duplicate tag hierarchy.

3. **待办是项目日志，不是短期清单**
   - A project can preserve schedule, deadline, completion, maybedate, and trace information.
   - Planned timeline blocks and real completed blocks make the project lifecycle visible.

4. **时间记录形成可回看的脉络**
   - Timeline records combine time, tasks, notes, images, plans, and actual work.
   - Search and custom filters keep historical effort retrievable, including on-this-day records.

5. **AI 住在结构化系统里**
   - AI can help create backfilled logs, todos, schedules, subtasks, summaries, and reviews.
   - Results return to searchable app data instead of remaining isolated in a conversation.

6. **从数据到洞察，再到复盘**
   - Distribution, continuity, trend, schedule, and daily-check views show how time is spent and changes over time.
   - Daily, weekly, and monthly reviews combine data, guided reflection, and AI narrative.

7. **数据属于用户，界面可以属于用户**
   - Local-first storage, WebDAV/S3 sync, and JSON, Excel, and Obsidian export support data control.
   - Themes, icon systems, backgrounds, TimePal, and Android widgets allow the product surface to adapt to the user.

## Storyboard

| Time | Objective | Native Evidence | Motion And Copy |
| --- | --- | --- | --- |
| 0-6s | State the product philosophy. | Brand asset or a deliberately constructed title scene. | A warm paper surface receives isolated time marks which resolve into one continuous line. Copy: `时间不会自动成为积累。` |
| 6-16s | Show the easiest first action. | Android Record view, activity selection, floating timer. | Tap an activity. A local pulse resolves into a real timeline block. Copy: `从一次开始。` |
| 16-25s | Demonstrate that recording adapts to real life. | Manual backfill, quick point, AI backfill, NFC capture where repeatable. | Each input form uses the same "time point lands on the timeline" grammar. Copy: `怎么开始，都可以。` |
| 25-36s | Explain the data model without an abstract lecture. | Real activity, scope, todo, and goal screens. | An Android screen anchors the scene. HTML labels briefly reveal `做什么 / 为了什么 / 正在推进什么 / 积累了什么`, then converge into one project card. |
| 36-46s | Show a project moving through time. | Todo detail and Timeline views with planned and actual blocks. | A shared project card carries dates and blocks through `计划 -> 投入 -> 完成`. Use one representative project rather than listing every schedule type. |
| 46-56s | Position AI as a structured assistant. | AI chat and resulting real app states. | One concise request leads to created subtasks, a planned item, or backfilled logs. The result visibly enters a Todo, Timeline, or Review screen. Copy: `AI 是管家，也住在系统里。` |
| 56-66s | Convert records into insight and reflection. | Statistics, daily checks, daily review, search, and on-this-day state. | Timeline blocks aggregate into data views and settle on a review page. A short retrieval moment shows historical records remain findable. Copy: `看见时间，也看见自己。` |
| 66-72s | Establish ownership and personal fit. | Settings, export/sync, theme/icon/widget states. | A local archive motif connects to export, sync, and a short set of personalized surfaces. Keep each feature legible; do not create a security claim beyond verified behavior. |
| 72-75s | Close the promise. | Constructed brand close. | All prior marks return to the stable LumosTime mark. Copy: `LumosTime` and `记录时间，看见自己。` |

## Motion Direction

The film's motion identity is **time becoming a visible record**.

- Use four recurring semantic actions: a point lands, a block extends, related records connect, and many records aggregate.
- Use actual Android screenshots or short captures for product proof. Use HTML/React layers only to enlarge small content, explain connections, and bridge states.
- Preserve an editorial visual system derived from the app: warm paper ground (`#fdfbf7`), stone/graphite text, restrained low-saturation category accents, and Chinese serif typography where the captured product permits it.
- Each shot has `enter`, `explain`, `settle`, and `handoff` phases. A high-density explanation receives a 2-3 second reading hold.
- The device frame and other parent containers stop moving at the settle frame. Only local signals such as a cursor, timer number, or small highlight may continue afterwards.
- Never use generic neon, particle fields, perpetual floating phones, random decorative drift, browser captures, or synthetic device chrome that duplicates a captured status bar.
- Use shared elements for transitions. The representative project card and timeline block are the preferred handoff anchors.

## Capture Contract

- Build and run the Android app without modifying product behavior.
- Use a single emulator/device family, fixed locale, portrait orientation, stable demo time, and sanitized fictional records.
- Capture with `adb exec-out screencap -p` for screenshots and use short `adb shell screenrecord` clips only when a static capture plus frame-driven reconstruction cannot prove an interaction.
- Do not expose user names, email addresses, account IDs, device serials, API keys, project paths, real messages, or private history.
- Record every asset in `capture-manifest.json`: source state, platform, target device, orientation, status-bar presence, synthetic-frame treatment, evidence IDs, and sanitization notes.
- Every audience-facing claim must map to source documentation, source code, or a repeatable Android state. Constructed states must be labeled when they could be mistaken for live output.

## Independent Project Boundary

All video work lives outside the product source. The target structure is:

```text
promo-output/
├── docs/
│   ├── product-brief.md
│   ├── evidence-matrix.md
│   ├── decision-matrix.md
│   ├── design-spec.md
│   ├── motion-direction.md
│   ├── storyboard.md
│   ├── shot-map.md
│   ├── audio-attribution.md
│   └── final-qa.md
├── captures/
│   ├── capture-manifest.json
│   └── sanitized-native-assets/
├── remotion/
└── out/
    ├── preview/
    ├── qa/
    └── final/
        ├── lumostime-promo-bgm.mp4
        └── lumostime-promo-no-bgm.mp4
```

The video-production folder is created only when implementation begins. This design document does not add a Remotion dependency or alter the existing app build.

## Audio

- Lock picture before selecting BGM and sound effects.
- Use a restrained, forward-moving instrumental bed. Avoid motivational trailer crescendos.
- Tie sound effects to semantic actions: tap, record landing, project connection, and data aggregation.
- Keep a source and license ledger for every audio asset.
- Render one BGM version and one no-BGM/SFX-only version with identical visuals.

## Completion Criteria

- The final film communicates the philosophy and core basic use path in under 75 seconds.
- Every functional claim is verified or visibly labeled as a demonstration.
- Captured content is Android-only, sanitized, correctly framed, and free of duplicate status bars or device chrome.
- Each scene is inspected at entry, peak action, settle, and exit; no black/blank frames, accidental hard cuts, cropped critical UI, or subtitle overflow remains.
- No major parent transform continues during a reading hold and no full composition remains static for more than five seconds.
- Rendering is deterministic: representative frames rendered twice are byte-identical; no `Date.now()`, unseeded random values, or free-running CSS animations control visible motion.
- Final MP4s have the requested resolution, constant frame rate, exact frame count, synchronized audio duration, and documented media metadata.

## Evidence Sources

- `README.md`
- `docs/user-guide/00-time-tracking-methods.md`
- `docs/user-guide/01-getting-started.md`
- `docs/user-guide/02-todo-management.md`
- `docs/user-guide/04-scope-and-goals.md`
- `docs/user-guide/05-data-statistics.md`
- `docs/user-guide/06-daily-review.md`
- `docs/user-guide/07-search.md`
- `docs/user-guide/08-data-sync.md`
- `docs/user-guide/09-personalization.md`
- `docs/Blog/爆肝500h，真的不是玩具.md`
