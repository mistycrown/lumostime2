# App Awareness Design

## Goal

Add an Android-only `应用感知` feature that detects configured foreground apps and runs a step-by-step workflow in a floating overlay above the target app. The workflow should help users notice what they are doing, decide how long they intend to stay, and then start a normal LumosTime activity record with synchronized state across the app, floating window, and Android status notification.

## Product Boundaries

1. `应用感知` is a new feature group and is not a replacement for `应用关联标签规则`.
2. `应用关联标签规则` stays available for its existing tag / floating prompt behavior.
3. If the same app is configured for `应用感知`, then `应用关联标签规则` must not fire for that app.
4. That override rule must be clearly explained in both related settings UIs.
5. First version is Android-only.
6. First version supports linear workflows only, with no branching.
7. First version allows only one active app-awareness workflow run at a time.

## Chosen Approach

Use an in-app React configuration surface plus an Android native floating-window runtime.

- Configuration stays in the existing settings architecture and is persisted in local storage alongside other product settings.
- Foreground-app detection continues to reuse the existing accessibility-based app detection chain.
- Workflow execution happens in the floating overlay above the target app rather than inside LumosTime pages.
- Formal activity records still use the existing session / log pipeline so the feature remains aligned with current timers, floating-window stop actions, and Android notification syncing.

This keeps the new capability native where it must be native, while reusing the current app detection and timer infrastructure.

## Workflow Model

### Template Types

`应用感知` is built from reusable workflow templates and app bindings.

1. `AppAwarenessWorkflowTemplate`
   - `id`
   - `name`
   - `description?`
   - `isPreset`
   - `enabled`
   - `steps`
   - `createdAt`
   - `updatedAt`
2. `AppAwarenessAppBinding`
   - `packageName`
   - `appName`
   - `workflowTemplateId`
   - `enabled`
3. `AppAwarenessRun`
   - `id`
   - `templateId`
   - `packageName`
   - `appName`
   - `status`
   - `currentStepIndex`
   - `answers`
   - `startedAt`
   - `completedAt?`
   - `linkedSessionId?`
   - `expectedDurationTimer?`
   - `extensionHistory?`

### Supported Step Types

First version supports five linear step types.

1. `text_question`
   - Collects free-form text such as purpose or note.
   - Stores a string answer under `answers[answerKey]`.
2. `single_choice`
   - Collects a single text-valued choice such as usage intent.
   - Stores the selected value under `answers[answerKey]`.
3. `cooldown_wait`
   - Shows a countdown such as “先冷静 30 秒”.
   - Does not create an activity record.
   - Can optionally allow skipping.
4. `expected_duration`
   - Lets the user choose an intended duration such as `5 / 10 / 20 / 30` minutes.
   - Stores the chosen minutes under `answers.durationMinutes` or another configured `answerKey`.
   - Does not by itself start a record.
5. `start_record`
   - Merges activity selection and timer start into one action step.
   - Lets the user choose an activity type.
   - Immediately starts a normal LumosTime positive timer session.
   - If a previous `expected_duration` answer exists, also starts the background countdown used for overtime reminders.

### Removed / Replaced Concepts

To keep the runtime consistent:

- standalone `activity_category` is replaced by `start_record`
- standalone `start_timer` is replaced by `start_record`

This ensures one step is responsible for both choosing the activity and beginning the formal record.

## Runtime Flow

### Main Path

1. Accessibility detection reports that the foreground app changed to a configured app such as `小红书`.
2. The system checks whether an app-awareness binding exists for that app.
3. If a binding exists, the system checks whether there is already an active run for that `packageName`.
4. If not, it creates an `AppAwarenessRun` with `currentStepIndex = 0`.
5. The floating window switches from idle ball mode into workflow-card mode.
6. Steps execute one at a time:
   - `text_question`: user enters text, then moves forward
   - `single_choice`: user selects an option, then moves forward
   - `cooldown_wait`: countdown runs to zero, then auto-advances
   - `expected_duration`: user chooses intended duration, then moves forward
   - `start_record`: user selects an activity and taps `开始记录`
7. When `start_record` completes:
   - a normal LumosTime active session is created
   - the run stores `linkedSessionId`
   - if expected duration exists, a parallel countdown timer is started
8. During recording, three state surfaces stay in sync:
   - in-app active session state
   - floating-window timer state
   - Android persistent status notification
9. When expected duration countdown ends:
   - if the target app is still foreground, show a floating reminder asking whether to stop
   - if the target app is not foreground, do not interrupt
10. If the user chooses `结束当前活动`, stop the existing session and finalize one record.
11. If the user chooses `继续 15 分钟`, keep the same activity session and restart only the expected-duration countdown.

### Overtime Rule

The expected-duration countdown does not create a second record.

- overtime continuation is appended to the same session
- `extensionHistory` records the extra planned blocks such as `+15`
- final session duration is the total elapsed time until the user actually ends the activity

## Runtime States

Suggested run states:

1. `idle`
2. `running_step`
3. `waiting_cooldown`
4. `paused_away`
5. `timer_running`
6. `timer_overtime_pending`
7. `completed`
8. `abandoned`
9. `cancelled`

These states keep “workflow in progress” separate from “formal activity already recording” while still linking both to the same run.

## Conflict Rules

### App Awareness vs App Tag Rules

These features are parallel, not replacements.

- `应用关联标签规则` remains available globally.
- `应用感知` remains an independent feature group with separate bindings.
- If an app is included in `应用感知`, then `应用关联标签规则` must not trigger for that same app.
- The UI must explain this clearly where users configure app-awareness bindings and where they manage app tag rules.

### Multiple App-Awareness Apps

First version uses single-run priority.

- if one app-awareness workflow run is already active, later bound apps do not preempt it
- if one app-awareness session is already recording, another bound app does not open a second workflow

This keeps the floating runtime stable and avoids overlapping overlays.

## UI Direction

### Settings Structure

Keep both features visible as separate entries.

Under settings:

1. `应用关联标签规则`
2. `应用感知`

Inside `应用感知`, provide two pages:

1. `工作流模板`
2. `启动应用设置`

### Workflow Templates Page

Use a linear step editor.

- show `预设模板` and `我的模板`
- each template card shows name, step count, binding count, enabled state
- preset templates are copyable but not directly editable
- custom templates open a step-list editor
- each step card shows type, title, summary, move up, move down, delete
- adding a step offers:
  - `问答题`
  - `选择题`
  - `等待/冷静`
  - `预计时长`
  - `开始记录`

### App Binding Page

Use the installed-app list pattern already familiar in settings.

- top area keeps accessibility permission status
- each app row shows icon, app name, package name, ignore state, and bound workflow
- entering an app detail sheet allows:
  - choosing a workflow template
  - toggling ignore state
  - previewing the workflow summary
- if the app is bound to app awareness, show a warning that app-tag rules no longer take effect for that app

### Floating Runtime UI

Do not force all workflow interaction into the current tiny round ball.

Recommended first version:

1. Keep the existing round floating ball as the docked / idle form.
2. Expand into a compact floating card during workflow execution.
3. Show only one step at a time.
4. Include:
   - title
   - step progress such as `2/5`
   - current step content
   - primary action
   - secondary action if needed

Per-step runtime:

- `text_question`: input box + next button
- `single_choice`: compact option list
- `cooldown_wait`: large countdown + optional skip
- `expected_duration`: duration choices
- `start_record`: activity choices + `开始记录`

Once formal recording begins, collapse back to the existing timer-focused floating state to reduce screen obstruction.

### Overtime Reminder UI

When expected duration expires and the target app is still foreground:

- expand the floating card again
- show `时间到了`
- ask `是否结束当前活动`
- primary choices:
  - `结束当前活动`
  - `继续 15 分钟`

Optional extension presets can be configurable later, but first version can start with one or a few fixed choices.

## Data Persistence

Store template and binding configuration in web local storage to match the current settings architecture. Native Android handles detection, overlay rendering, and event bridging only.

Suggested storage keys:

1. `lumostime_app_awareness_workflow_templates`
2. `lumostime_app_awareness_bindings`
3. `lumostime_app_awareness_active_run`
4. `lumostime_app_awareness_run_history` optional for later

Existing storage remains:

1. `appRules` for `应用关联标签规则`
2. existing session persistence and logs for formal activity records

## Session and Log Integration

Formal records should stay on the existing session/log pipeline, but carry extra metadata.

Recommended additions to `ActiveSession` and `Log`:

- `appAwarenessMeta`
  - `sourceAppPackage`
  - `sourceAppName`
  - `workflowTemplateId`
  - `workflowTemplateName`
  - `answers`
  - `expectedDurationMinutes`
  - `extensionHistory`

The human-readable summary can still be written into `note`, but structured metadata should be stored separately so later stats and analysis can distinguish cases like “搜索东西” vs “漫无目的刷”.

## Native Integration Direction

Reuse existing Android capabilities where possible.

- foreground app detection continues to build on the accessibility / app monitor chain
- floating overlay continues to build on `FloatingWindowService`
- notification syncing continues to build on `FocusNotificationPlugin`, `UnifiedServiceNotificationManager`, and existing active-session sync

Main new native work is:

1. extending floating-window runtime modes beyond idle / prompt / focus timer
2. rendering workflow-card content above third-party apps
3. bridging workflow step events between native overlay and web runtime
4. tracking expected-duration countdown while the formal session runs

## Failure and Edge Handling

1. Missing overlay permission
   - app awareness cannot execute above target apps
   - settings must explain that the workflow requires overlay permission
2. Missing accessibility permission
   - users may still configure templates and bindings
   - runtime does not trigger until permission is granted
3. User leaves target app before `start_record`
   - mark the run `abandoned`
   - do not create a formal record
4. User leaves target app during `cooldown_wait` or question steps
   - preserve run state
   - restore when the user returns to the target app
5. User leaves target app after recording starts
   - formal recording continues
   - expected-duration countdown continues
   - overtime reminder only interrupts if the target app is foreground at the moment the countdown ends
6. Floating runtime is reclaimed by the system
   - persist active run state
   - attempt to restore on return to the target app
7. Same app repeatedly re-enters foreground
   - dedupe by active run and package name
   - do not reopen the workflow from step one

## Testing Plan

### Frontend Tests

- workflow template normalization
- step validation
- active-run state transitions
- expected-duration and extension logic
- app-awareness binding conflict rule with app-tag rules

### Android Integration Tests

- foreground app detection triggers the correct workflow
- floating window expands from ball to card
- `text_question`, `single_choice`, `cooldown_wait`, `expected_duration`, and `start_record` execute in order
- overtime reminder appears only while the target app remains foreground

### Regression Checks

- existing `应用关联标签规则` still works for apps that are not bound to app awareness
- existing floating timer behavior still works
- existing status notification session sync still works
- manual start and stop of normal activity sessions still works

### Key Manual Scenarios

1. Open `小红书`, wait 30 seconds in a cooldown step, then start recording.
2. Choose `预计 30 分钟`, let it expire, and end immediately.
3. Choose `预计 30 分钟`, let it expire, continue for `15 分钟`, and confirm one merged record is produced.
4. Leave the app mid-workflow, return, and resume from the last unfinished step.
5. Configure both app-awareness and app-tag rules for the same app and confirm app-awareness suppresses tag-rule behavior for that app.

## Implementation Notes

Recommended implementation order:

1. add shared types and local-storage services for templates, bindings, runs, and metadata
2. add settings pages for templates and bindings
3. add web runtime state management for app-awareness runs
4. extend Android floating runtime modes and bridge events
5. wire foreground detection to app-awareness bindings
6. integrate expected-duration countdown and overtime extension handling
7. add metadata to session/log persistence and finish regression coverage

This sequencing keeps product design, persistence, runtime state, native overlay, and session integration moving in a stable order.
