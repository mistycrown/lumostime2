# Slot-Based Widget Design

## Goal

Unify Android widget templates into a single template system and move widget behavior selection from the template level down to each individual slot.

After this change:

- Widget templates are no longer classified as `timer`, `daily`, or `shortcut`.
- The widget list page only manages templates by size.
- Each slot chooses its own type first, then exposes the matching slot-specific configuration UI.
- Android widget instances bind templates by size only.
- Slot taps dispatch by slot type instead of template type.

## User Flow

The new slot editing flow is:

1. User opens a widget template.
2. User taps a slot.
3. The slot editor first asks for the slot type:
   - `timer`
   - `daily`
   - `shortcut`
4. After a slot type is selected, the matching configuration controls appear.
5. Saving writes the slot configuration back into the template.

The widget home page no longer shows template type tabs.

## Data Model

### Template

`WidgetTemplate` keeps:

- `id`
- `name`
- `size`
- `slots`
- `createdAt`
- `updatedAt`

`widgetType` is removed from the template object.

### Slot

Each slot becomes the source of truth for behavior. The slot model keeps the existing flat fields, but the type is interpreted per slot:

- `slotIndex`
- `slotType: 'timer' | 'daily' | 'shortcut' | null`
- `activityId`
- `categoryId`
- `icon`
- `customIcon`
- `uiIconAssetPath`
- `uiIconFallbackAssetPath`
- `label`
- `color`
- `linkedTodoId`
- `scopeIds`
- `checkTemplateId`
- `checkItemId`
- `checkManualMode`
- `checkTargetCount`
- `shortcutAction`

Empty slots use `slotType = null`.

### Slot Field Usage

- `timer`
  - uses `activityId`, `categoryId`, `linkedTodoId`, `scopeIds`, `customIcon`
- `daily`
  - uses `checkTemplateId`, `checkItemId`, `customIcon`, `color`
- `shortcut`
  - uses `shortcutAction`, `label`, `customIcon`, `color`

We keep the flat slot shape rather than introducing nested per-type payloads so the existing bridge contract and render code remain easier to adapt.

## React Settings UI

### Template List

- Remove the widget type tabs from the settings entry.
- Show one unified template list.
- Creating a template only asks for size implicitly by using the default size or by editing size later.
- The template summary line should describe configured slots regardless of type.

### Template Editor

- Keep the template name editor.
- Keep the size selector.
- Keep the preview grid.
- Preview rendering becomes per slot:
  - timer slot uses timer-like circular styling
  - daily slot uses daily styling
  - shortcut slot uses shortcut styling
  - empty slot uses neutral placeholder styling

### Slot Editor

Replace the current type-specific modal split with a unified slot modal:

- top preview
- slot type selector
- conditional configuration body

Conditional sections:

- `timer`
  - tag selection
  - todo association
  - scope association
  - emoji override
- `daily`
  - daily check item selection
  - emoji override
  - background color
- `shortcut`
  - shortcut action selection
  - emoji override
  - background color

Changing the slot type should reset unrelated fields so stale data from the previous type does not leak into rendering or native tap behavior.

## Shared Widget Service

`widgetService.ts` should be updated to:

- remove template-level widget type normalization
- add slot-level `slotType` normalization
- create empty slots with `slotType = null`
- rebuild each slot based on its own `slotType`
- consider a template configured if any slot is configured
- resize templates without depending on a template type
- build slot configs with explicit slot types

Helper functions should become slot-oriented rather than template-oriented.

## Bridge Contract

### TypeScript

`WidgetBridgeTemplate`:

- remove template `widgetType`

`WidgetBridgeSlot`:

- replace required slot `widgetType` with `slotType: WidgetType | null`

`WidgetBridgeInstanceBinding`:

- remove `widgetType`

### Android

Native models should mirror the same contract:

- template has no widget type
- binding has no widget type
- slot stores `slotType`

## Android Binding and Template Selection

Android widget providers remain size-based because app widgets are declared by size in the manifest and XML metadata.

However, binding and lookup rules change:

- bind widget instances to templates by size only
- cycle templates within the same size only
- do not filter templates by widget family
- shortcut-specific provider filtering is removed

The dedicated 4x1 shortcut family should be merged back into normal 4x1 behavior if its only reason for existing was template family separation.

## Android Snapshot Building

`WidgetSnapshotBuilder` should render each slot according to `slot.slotType`:

- `timer`
  - active state checks current runtime timer state
- `daily`
  - resolve mirrored daily progress and completion state
- `shortcut`
  - use shortcut label, emoji, and color fallback rules
- `null`
  - render placeholder state

The widget snapshot can keep widget-level size metadata, but slot behavior must be determined per slot.

## Android Tap Dispatch

`WidgetTimerController.handleSlotTap` and related helpers should:

1. load the tapped slot
2. read `slot.slotType`
3. dispatch by slot type

Dispatch rules:

- `timer`
  - existing timer start/stop behavior
- `daily`
  - existing daily check completion behavior
- `shortcut`
  - existing deep-link shortcut behavior
- `null`
  - no-op

Tap animation state should also be keyed from the slot type rather than the template type.

## Migration / Compatibility

No historical compatibility UI is required.

We do not need to preserve old type-based template tabs or old template type distinctions in the user experience.

At the data level, old stored templates may be treated as replaceable. A clean cut is acceptable for this change.

## Validation

We should verify:

- mixed slot types can coexist in one template
- template list works without type tabs
- slot editor shows type selector first
- each slot type saves and reloads correctly
- widget preview renders mixed slot types correctly
- Android title tap cycles templates by size
- Android slot taps dispatch correctly for timer, daily, and shortcut slots
- empty slots remain non-breaking and non-clickable
