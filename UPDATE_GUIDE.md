# LumosTime 更新功能使用指南

## 功能说明

LumosTime 现在支持自动检测应用更新。用户可以在设置页面手动检查是否有新版本可用。

## 使用方法

### 对于用户

1. 打开应用，进入**设置**页面
2. 在"关于"部分，点击**检查更新**
3. 如果有新版本：
   - 会弹出更新提示窗口，显示版本信息和更新内容
   - 点击**立即下载**会在浏览器中打开 GitHub Releases 页面
   - 点击**稍后提醒**可以关闭提示框
4. 如果已是最新版本：
   - 会显示"当前已是最新版本"的提示

### 对于开发者

#### 1. 配置版本信息文件

在项目根目录已经创建了 `version.json` 文件，内容如下：

```json
{
  "version": "1.0.2",
  "versionCode": 2,
  "updateUrl": "https://github.com/YOUR_USERNAME/lumostime/releases/latest",
  "releaseNotes": "更新说明",
  "forceUpdate": false
}
```

**字段说明：**
- `version`: 最新版本号（字符串格式，例如 "1.0.2"）
- `versionCode`: 版本代码（整数，用于版本比较）
- `updateUrl`: 下载链接（通常指向 GitHub Releases）
- `releaseNotes`: 更新说明（支持换行，会在更新弹窗中显示）
- `forceUpdate`: 是否强制更新（当前未使用，预留字段）

#### 2. 修改配置文件

**修改 `services/updateService.ts`：**

找到第 13 行，将 `YOUR_USERNAME` 替换为你的 GitHub 用户名：

```typescript
private static UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/lumostime/main/version.json';
```

例如，如果你的 GitHub 用户名是 `johndoe`，则改为：

```typescript
private static UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/johndoe/lumostime/main/version.json';
```

**修改 `version.json`：**

将 `updateUrl` 中的 `YOUR_USERNAME` 也替换为你的 GitHub 用户名。

#### 3. 发布新版本流程

当你要发布新版本时，按以下步骤操作：

##### 步骤 1: 更新版本号

修改 `package.json` 中的版本号：

```json
{
  "version": "1.0.2"
}
```

同时更新 `services/updateService.ts` 中的版本号（第 17 行）：

```typescript
private static CURRENT_VERSION = '1.0.2';
```

##### 步骤 2: 构建 APK

运行构建命令：

```bash
npm run build
npx cap sync android
```

然后在 Android Studio 中构建发布版 APK。

##### 步骤 3: 创建 GitHub Release

1. 在 GitHub 仓库页面，点击 "Releases" → "Create a new release"
2. 填写版本标签（例如 `v1.0.2`）
3. 填写标题和说明
4. 上传构建好的 APK 文件
5. 发布 Release

##### 步骤 4: 更新 version.json

修改 `version.json` 文件：

```json
{
  "version": "1.0.2",
  "versionCode": 2,
  "updateUrl": "https://github.com/yourusername/lumostime/releases/latest",
  "releaseNotes": "• 新增功能 A\n• 修复了 Bug B\n• 优化了性能",
  "forceUpdate": false
}
```

##### 步骤 5: 提交并推送

```bash
git add version.json
git commit -m "Update version to 1.0.2"
git push origin main
```

**重要提示：** 确保 `version.json` 文件在 **main** 分支（或你配置的分支）上，因为应用会从 GitHub Raw URL 读取这个文件。

#### 4. 测试更新功能

1. 确保 `version.json` 中的版本号**高于** `updateService.ts` 中的当前版本号
2. 在应用中点击"检查更新"
3. 应该会看到更新提示弹窗

## 技术实现

### 核心文件

- **`services/updateService.ts`**: 更新检测服务
  - 从 GitHub Raw URL 获取版本信息
  - 比较版本号
  - 打开下载链接

- **`views/SettingsView.tsx`**: 设置页面
  - 添加了"检查更新"菜单项
  - 更新提示模态框
  - 版本号显示

### 版本号比较逻辑

使用简单的语义化版本比较：
- 格式：`major.minor.patch`（例如 `1.0.2`）
- 从左到右逐位比较数字
- 如果最新版本的任一位大于当前版本，则判定为有更新

### 网络请求

- 使用标准的 `fetch` API
- 设置 `cache: 'no-cache'` 确保每次获取最新数据
- 错误处理：网络失败时显示友好提示

## 常见问题

### Q: 为什么检查更新显示"检查失败"？

**A:** 可能的原因：
1. 网络连接问题
2. GitHub Raw URL 配置错误（检查用户名是否正确）
3. `version.json` 文件不存在或未推送到 GitHub
4. JSON 格式错误

**解决方法：**
- 在浏览器中直接访问 `https://raw.githubusercontent.com/YOUR_USERNAME/lumostime/main/version.json` 看是否能访问
- 检查 `version.json` 的 JSON 格式是否正确

### Q: 如何修改更新检测的 URL？

**A:** 修改 `services/updateService.ts` 中的 `UPDATE_CHECK_URL` 常量。你可以使用任何可访问的 URL，只要返回符合 `VersionInfo` 接口的 JSON 即可。

### Q: 能否添加自动更新功能？

**A:** 安卓应用由于安全限制，无法直接自动安装 APK。但你可以：
1. 在应用启动时自动检查更新（修改 `App.tsx`）
2. 下载 APK 到本地后提示用户安装（需要额外的 Capacitor 插件）

当前实现专注于简单性，仅提供手动检查和下载功能。

## 下一步改进

可选的增强功能：
- [ ] 应用启动时自动检查更新
- [ ] 后台静默检查，有更新时显示红点提示
- [ ] 支持更新日志的 Markdown 渲染
- [ ] 添加"忽略此版本"功能
- [ ] 集成应用内下载进度显示

---

**更新日期**: 2025-12-17  
**版本**: 1.0.0
