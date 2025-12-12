# 构建发布版 APK
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "开始构建 LumosTime 发布版 APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 步骤 1: 构建 Web 应用
Write-Host "`n[1/3] 构建 Web 应用..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Web 构建失败!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Web 构建完成" -ForegroundColor Green

# 步骤 2: 同步到 Android
Write-Host "`n[2/3] 同步到 Android 项目..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 同步失败!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 同步完成" -ForegroundColor Green

# 步骤 3: 构建发布版 APK
Write-Host "`n[3/3] 构建发布版 APK..." -ForegroundColor Yellow
Set-Location android
.\gradlew.bat assembleRelease --warning-mode all
$buildResult = $LASTEXITCODE
Set-Location ..

if ($buildResult -ne 0) {
    Write-Host "❌ APK 构建失败!" -ForegroundColor Red
    Write-Host "`n建议使用 Android Studio:" -ForegroundColor Yellow
    Write-Host "  1. 运行: npx cap open android" -ForegroundColor White
    Write-Host "  2. 在 Android Studio 中: Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor White
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ 构建成功!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# 查找生成的 APK
$apkPath = "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "`n📦 APK 位置: $apkPath" -ForegroundColor Green
    Write-Host "📏 APK 大小: $([Math]::Round($apkSize, 2)) MB" -ForegroundColor Green
    
    # 显示 APK 信息
    Write-Host "`n🔐 签名信息:" -ForegroundColor Cyan
    Write-Host "  密钥库: lumostime-release-key.jks" -ForegroundColor White
    Write-Host "  别名: lumostime" -ForegroundColor White
    Write-Host "  密码: lumostime2025" -ForegroundColor White
    
    Write-Host "`n⚠️  重要提醒:" -ForegroundColor Yellow
    Write-Host "  1. 妥善保管 lumostime-release-key.jks 文件和密码" -ForegroundColor White
    Write-Host "  2. 更新应用时必须使用同一个密钥签名" -ForegroundColor White
    Write-Host "  3. 不要将密钥提交到 Git 仓库" -ForegroundColor White
    
    Write-Host "`n📱 安装方式:" -ForegroundColor Cyan
    Write-Host "  方式1: adb install $apkPath" -ForegroundColor White
    Write-Host "  方式2: 将APK文件传输到手机后直接安装" -ForegroundColor White
} else {
    Write-Host "⚠️  未找到 APK 文件" -ForegroundColor Yellow
}
