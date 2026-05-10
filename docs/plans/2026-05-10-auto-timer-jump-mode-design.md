# Auto Timer Jump Mode Design

## Scope

Replace the current boolean "开始计时后自动跳转" preference with a three-option mode selector:

- 不跳转
- 跳转到“正在计时”页面
- 跳转到“沉浸式计时”页面

This applies to the global post-start timer behavior used by normal timer starts and todo focus starts.

This does not replace the existing scene-card level immersive shortcut behavior. Scene cards keep their own per-card immersive entry flow.

## Chosen Approach

Upgrade the setting from a boolean flag to an enum-like string mode stored in settings context and local storage.

Reason:

- the new behavior is no longer binary
- string modes are clearer than combining multiple booleans
- future jump targets can be added without reshaping the API again

## Data Model

- Add a dedicated jump mode type with three values:
  - `none`
  - `focus-detail`
  - `immersive-timer`
- Read legacy `lumostime_auto_open_focus_detail` values for backward compatibility.
- Migrate legacy meaning as:
  - `true` -> `focus-detail`
  - `false` -> `none`

## UI Behavior

- Replace the current toggle row in `PreferencesSettingsView.tsx` with a dropdown styled like the existing “启动默认页” selector.
- Show the current mode label on the trigger button.
- Selecting an option closes the dropdown immediately.

## Runtime Behavior

- `none`: starting a timer keeps the user on the current page.
- `focus-detail`: starting a timer opens `FocusDetailView` without immersive mode.
- `immersive-timer`: starting a timer opens `FocusDetailView` and immediately enters immersive mode through the existing `autoEnterImmersive` prop.

## Verification

- Confirm legacy stored boolean values still map to the correct new mode.
- Confirm each of the three modes triggers the expected start behavior.
- Confirm the preference UI shows and updates the selected mode correctly.
- Confirm the app still builds successfully.
