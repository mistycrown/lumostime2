# Vercel 部署快速开始

# 1. 检查构建是否正常
Write-Host "正在检查构建..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败,请检查错误信息!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 构建成功!" -ForegroundColor Green

# 2. 提示用户安装 Vercel CLI (如果未安装)
Write-Host "`n检查 Vercel CLI..." -ForegroundColor Cyan

$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "未检测到 Vercel CLI,正在安装..." -ForegroundColor Yellow
    npm install -g vercel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Vercel CLI 安装失败!" -ForegroundColor Red
        Write-Host "请手动运行: npm install -g vercel" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✓ Vercel CLI 已就绪!" -ForegroundColor Green

# 3. 询问部署类型
Write-Host "`n选择部署方式:" -ForegroundColor Cyan
Write-Host "1. 预览部署 (Preview)"
Write-Host "2. 生产部署 (Production)"
$choice = Read-Host "请输入选项 (1/2)"

# 4. 执行部署
Write-Host "`n开始部署到 Vercel..." -ForegroundColor Cyan

if ($choice -eq "2") {
    vercel --prod
} else {
    vercel
}

Write-Host "`n✓ 部署完成!" -ForegroundColor Green
Write-Host "请查看上方输出的 URL 访问你的应用" -ForegroundColor Cyan
