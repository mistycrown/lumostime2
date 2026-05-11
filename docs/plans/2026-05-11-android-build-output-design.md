# Android Build Output Design

## Goal

Keep the repository itself inside OneDrive for source sync, but move Android build outputs outside the synced tree so Gradle can freely create and delete `build/intermediates` without OneDrive locking them.

## Chosen Approach

Store the external build root in `android/gradle.properties` as `lumostime.androidBuildDir`, defaulting to `E:/tmp/lumostime-android-build` for this machine.

In `android/build.gradle`, redirect:

- the root Android build directory to `${lumostime.androidBuildDir}/root`
- regular Android subprojects to `${rootBuildDir}/modules/<module-name>`
- plugin subprojects from `node_modules` to `${rootBuildDir}/plugin-build/<module-name>`

## Why This Approach

- Source files stay in OneDrive and keep syncing normally.
- Disposable Gradle outputs leave the synced path, which reduces Windows and OneDrive file-lock conflicts.
- The path stays configurable through one property if the temp drive changes later.

## Verification

Run `android\\gradlew.bat clean` or any Android build task and confirm generated build output appears under `E:\\tmp\\lumostime-android-build` rather than inside `android\\app\\build`.
