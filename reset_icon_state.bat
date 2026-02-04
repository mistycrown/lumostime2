@echo off
echo 正在重置应用图标状态...

REM 卸载应用（如果存在）
echo 卸载旧版本应用...
adb uninstall com.mistycrown.lumostime

REM 清理 ADB 缓存
echo 清理 ADB 缓存...
adb kill-server
adb start-server

REM 重新编译和安装
echo 重新编译应用...
cd android
call gradlew clean
call gradlew assembleDebug

echo 安装新版本应用...
adb install app/build/outputs/apk/debug/app-debug.apk

echo 完成！应用已重新安装，图标状态已重置。
pause