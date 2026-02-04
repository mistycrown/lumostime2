@echo off
echo 正在恢复应用启动入口...
adb shell pm enable com.mistycrown.lumostime/.MainActivity
adb shell pm disable com.mistycrown.lumostime/.MainActivityNeon
adb shell pm disable com.mistycrown.lumostime/.MainActivityPaper
adb shell pm disable com.mistycrown.lumostime/.MainActivityPixel
adb shell pm disable com.mistycrown.lumostime/.MainActivitySketch
echo 完成！应用图标应该已恢复到桌面
pause
