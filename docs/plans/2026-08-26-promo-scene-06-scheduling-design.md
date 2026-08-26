# Scene 06 Todo Scheduling Design

## Goal

Replace the former NFC storyboard scene with a ten-second calendar-first scene that presents LumosTime's todo scheduling system as precise, flexible, and grounded in real project progress.

The scene must make all six scheduling types legible: Arrange, Due, Complete, Trace, Repeat, and Maybe.

## Approved Copy

### Title

> 待办排期，
> 不止一种写法。

### Supporting Copy

> 安排、截止、完成、追踪、重复、可能。
> 把确定与弹性，放进同一张日历。

### Closing Copy

> 计划的同时，允许变化；
> 推进的同时，看见进度。

## Composition

- Retain the established landscape film language from scenes 01-05: warm paper surface, subtle grid and grain, left editorial copy, and a single app surface on the right.
- The right-side app surface is a calm monthly calendar. It first appears empty, so the audience can understand its structure before schedule information arrives.
- Task cards initially appear in the lower portion of the app surface as full objects. Each card then reduces to its calendar representation and settles into the appropriate date cell.
- Do not add an explanatory legend, an extra panel, or persistent type labels after cards land. Motion, color, shape, and placement carry the semantic distinction.
- Do not show the `未来` pool. The user guide defines it as unplanned work that does not appear in the scheduling view.

## Schedule Card Grammar

| Type | Example task | Calendar representation | Motion |
| --- | --- | --- | --- |
| Arrange | 完成课程第 3 章 | Solid purple card in one date cell | A single card settles decisively onto its scheduled date. |
| Due | 提交课程作业 | Warm orange card with a deadline flag or boundary accent | The card lands at its final permitted date. |
| Complete | 读完本周章节 | Muted green card with a check mark | A check resolves after the card lands. |
| Trace | 英语听力训练 | Blue connected bars across several adjacent dates | A line grows through consecutive dates to show actual work over time. |
| Repeat | 每周复盘 | Earth-red card with a repeat mark on recurring weekday cells | One card replicates rhythmically into later weekly instances. |
| Maybe | 周末公开课 | Light, dashed card in two candidate date cells | One card gently forks into two future candidate dates. |

The examples are illustrative and should remain concise enough for the calendar scale. English schedule-type labels may appear briefly on the initial cards only, while the Chinese task titles remain the primary readable content.

## Motion Timeline

| Time | Beat |
| --- | --- |
| 0.0-1.5 s | Two title lines enter on the left. |
| 1.5-2.8 s | The app surface enters and the month calendar draws in: header, weekday row, dates, then cell grid. |
| 2.8-3.8 s | Hold the empty calendar briefly. |
| 3.8-6.8 s | Arrange, Due, and Complete cards appear in sequence below the calendar and settle into their dates. |
| 6.8-8.4 s | Trace grows across dates; Repeat reproduces by weekly rhythm; Maybe forks into two candidate dates. |
| 8.4-9.2 s | The full month rests so all six semantics can be scanned together. |
| 9.2-10.0 s | Closing copy enters at lower left and the completed calendar holds for the transition to scene 07. |

## Visual Intent

The scene should not read as a feature checklist. It should demonstrate that the calendar represents both future intention and actual project history:

- Arrange, Due, and Maybe express future plans with different levels of certainty.
- Trace and Complete express actual progress and outcome.
- Repeat expresses an enduring rule rather than isolated tasks.

The animation must make those meanings intuitive even for a viewer who does not read the schedule-type labels.

## Transition Context

Scene 05 shows an AI conversation that can create a future plan. Scene 06 makes that plan concrete by placing it in a calendar alongside deadlines, repeated commitments, uncertainty, real work, and completion. Scene 07 can then continue the narrative with one project moving through time.

## Verification

- The source is UTF-8 and retains the common 16:9 storyboard frame, paper texture, left-copy/right-app composition, and 10-second local playback control.
- All six type names and their six distinct visual behaviors are present.
- The calendar begins empty and task cards originate below it before filling date cells.
- No task text, card, or closing copy overlaps the playback control at 960 x 540 or larger.
- The final hold is long enough to see Arrange, Due, Complete, Trace, Repeat, and Maybe concurrently.
