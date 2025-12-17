# ⚡ 更新功能快速配置清单

完成以下步骤以启用 LumosTime 的更新检测功能：

## ✅ 必做配置（5分钟）

### 1️⃣ 修改 `services/updateService.ts`

打开文件，找到第 **13** 行，替换 `YOUR_USERNAME` 为你的 GitHub 用户名：

```typescript
// 修改前：
private static UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/lumostime/main/version.json';

// 修改后（示例）：
private static UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/mistycrown/lumostime/main/version.json';
```

### 2️⃣ 修改 `version.json`

打开文件，替换 `YOUR_USERNAME` 为你的 GitHub 用户名：

```json
{
  "version": "1.0.2",
  "versionCode": 2,
  "updateUrl": "https://github.com/mistycrown/lumostime/releases/latest",
  "releaseNotes": "示例更新说明",
  "forceUpdate": false
}
```

### 3️⃣ 提交到 GitHub

```bash
git add .
git commit -m "添加应用更新检测功能"
git push origin main
```

**重要**: 确保 `version.json` 在 `main` 分支上（或修改 updateService.ts 中的分支名）

---

## 📝 发布新版本流程

### 步骤 1: 更新版本号

**在两个地方修改版本号**：

1. `package.json` 第 4 行：
```json
"version": "1.0.2"
```

2. `services/updateService.ts` 第 17 行：
```typescript
private static CURRENT_VERSION = '1.0.2';
```

### 步骤 2: 构建 APK

```bash
npm run build
npx cap sync android
```

然后在 Android Studio 中生成发布版 APK。

### 步骤 3: 创建 GitHub Release

1. 访问: `https://github.com/你的用户名/lumostime/releases/new`
2. 填写：
   - Tag: `v1.0.2`
   - Title: `v1.0.2 - 功能更新`
   - 描述: 更新说明
3. 上传 APK 文件
4. 点击 "Publish release"

### 步骤 4: 更新 version.json

```json
{
  "version": "1.0.2",
  "versionCode": 2,
  "updateUrl": "https://github.com/你的用户名/lumostime/releases/latest",
  "releaseNotes": "📱 新功能\n• 添加的新功能\n\n🐛 问题修复\n• 修复的问题",
  "forceUpdate": false
}
```

### 步骤 5: 推送更新

```bash
git add version.json
git commit -m "Release v1.0.2"
git push origin main
```

🎉 完成！用户现在可以检查到新版本了。

---

## 🧪 测试更新功能

### 方法 1: 模拟新版本

临时修改 `version.json` 中的版本号为 `1.0.9`，推送到 GitHub，然后在应用中点击"检查更新"。

### 方法 2: 直接访问 URL

在浏览器中访问：
```
https://raw.githubusercontent.com/你的用户名/lumostime/main/version.json
```

确认能够正常访问且返回正确的 JSON 数据。

---

## ⚠️ 常见问题

### Q: 检查更新总是失败？

**检查清单**：
- [ ] GitHub 用户名配置是否正确
- [ ] version.json 是否已推送到 main 分支
- [ ] 在浏览器中能否访问 raw.githubusercontent.com URL
- [ ] version.json 的 JSON 格式是否正确

### Q: 显示"已是最新版本"但实际不是？

检查 `services/updateService.ts` 中的 `CURRENT_VERSION` 是否与 `package.json` 一致。

---

**配置完成后，请参考 [UPDATE_GUIDE.md](./UPDATE_GUIDE.md) 了解详细信息。**
