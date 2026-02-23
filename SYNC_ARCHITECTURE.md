# LumosTime 同步架构完整文档

> 最后更新：2024年（基于最新代码实现）

## 目录

1. [系统概览](#系统概览)
2. [核心架构](#核心架构)
3. [数据流转](#数据流转)
4. [平台差异化处理](#平台差异化处理)
5. [同步模式](#同步模式)
6. [时间戳管理](#时间戳管理)
7. [错误处理与容错](#错误处理与容错)
8. [性能优化](#性能优化)

---

## 系统概览

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         LumosTime 应用                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ DataContext  │  │SettingsContext│  │CategoryScope │         │
│  │              │  │              │  │   Context    │         │
│  │ • logs       │  │ • syncConfig │  │ • categories │         │
│  │ • todos      │  │ • timestamps │  │ • scopes     │         │
│  │ • categories │  │ • syncMode   │  │ • goals      │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         └─────────────────┼─────────────────┘                  │
│                           │                                     │
│                  ┌────────▼────────┐                           │
│                  │ useSyncManager  │                           │
│                  │                 │                           │
│                  │ • performSync   │                           │
│                  │ • handleUpload  │                           │
│                  │ • handleDownload│                           │
│                  └────────┬────────┘                           │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                 │
│         │                 │                 │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐          │
│  │ syncUtils   │  │ syncService │  │imageService │          │
│  │             │  │             │  │             │          │
│  │ • upload    │  │ • uploadImg │  │ • readImage │          │
│  │ • download  │  │ • downloadImg│  │ • writeImage│          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                 │                 │                 │
└─────────┼─────────────────┼─────────────────┼─────────────────┘
          │                 │                 │
          │                 │                 │
     ┌────▼─────┐      ┌────▼─────┐          │
     │ WebDAV   │      │   S3     │          │
     │ Service  │      │ Service  │          │
     └────┬─────┘      └────┬─────┘          │
          │                 │                 │
          └────────┬────────┘                 │
                   │                          │
            ┌──────▼──────┐          ┌───────▼────────┐
            │   云端存储   │          │  本地文件系统   │
            │             │          │                │
            │ • JSON 数据 │          │ • localStorage │
            │ • 图片文件  │          │ • IndexedDB    │
            │ • 图片列表  │          │ • Filesystem   │
            └─────────────┘          └────────────────┘
```



## 核心架构

### 三层架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      应用层 (Application Layer)              │
│                                                              │
│  • useSyncManager Hook - 同步协调器                         │
│  • React Contexts - 状态管理                                │
│  • UI Components - 用户界面                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    业务逻辑层 (Business Logic Layer)         │
│                                                              │
│  • syncUtils.ts - 统一上传/下载逻辑                         │
│  • syncService.ts - 图片同步服务                            │
│  • imageService.ts - 图片文件管理                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    存储层 (Storage Layer)                    │
│                                                              │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │  云端存储服务     │              │   本地存储服务    │    │
│  │                  │              │                  │    │
│  │ • webdavService  │              │ • localStorage   │    │
│  │ • s3Service      │              │ • IndexedDB      │    │
│  │                  │              │ • Filesystem API │    │
│  └──────────────────┘              └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件职责

#### 1. useSyncManager (同步管理器)

**职责**：
- 协调所有同步操作
- 管理同步状态和锁
- 处理不同同步模式（启动/恢复/手动/自动）
- 时间戳比较和冲突检测

**关键方法**：
```typescript
performSync(mode: 'startup' | 'resume' | 'manual' | 'auto')
handleManualUpload()
handleManualDownload()
handleSyncDataUpdate(data: any)
```

#### 2. syncUtils (统一同步工具)

**职责**：
- 提供统一的上传/下载接口
- 处理主数据 JSON 和图片列表 JSON
- 协调图片文件的同步
- 生成同步结果消息

**关键方法**：
```typescript
uploadDataToCloud(service, data, onProgress)
downloadWithBackup(service, localData, onProgress, confirmFn)
```

#### 3. syncService (图片同步服务)

**职责**：
- 管理图片文件的上传/下载
- 处理图片引用列表
- 实现并行上传/下载（3个并发）
- 处理删除操作同步

**关键方法**：
```typescript
uploadImages(onProgress, localImages, cloudImages)
downloadImages(onProgress, cloudImages)
getActiveStorageService()
```



## 数据流转

### 1. 本地数据持久化流程

```
┌─────────────────────────────────────────────────────────────┐
│                    用户操作 (User Action)                    │
│                                                              │
│  添加日志 / 修改任务 / 删除分类 / 上传图片 ...              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              React State 更新 (State Update)                 │
│                                                              │
│  setLogs() / setTodos() / setCategories() ...               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           DataContext useEffect 触发 (Effect Trigger)        │
│                                                              │
│  监听 logs, todos, todoCategories 变化                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
┌──────────────────────┐  ┌──────────────────────┐
│  保存到 localStorage  │  │  更新本地时间戳       │
│                      │  │                      │
│  lumostime_logs      │  │  lumostime_local_    │
│  lumostime_todos     │  │  timestamp           │
│  lumostime_categories│  │                      │
└──────────────────────┘  └──────────────────────┘
                │                     │
                └──────────┬──────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              触发自动同步 (Auto Sync Trigger)                │
│                                                              │
│  2秒防抖后调用 performSync('auto')                          │
└─────────────────────────────────────────────────────────────┘
```

### 2. 云端同步完整流程

```
┌─────────────────────────────────────────────────────────────┐
│                  同步触发 (Sync Trigger)                     │
│                                                              │
│  启动同步 / 恢复同步 / 手动同步 / 自动同步                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 1: 检查连接状态 (Check Connection)         │
│                                                              │
│  • 验证 WebDAV/S3 配置                                      │
│  • 检查手动断开标志                                         │
│  • 测试网络连接                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 2: 获取时间戳 (Get Timestamps)                  │
│                                                              │
│  本地时间戳：localStorage.getItem('lumostime_local_timestamp')│
│  云端时间戳：statFile() 或 downloadData().timestamp         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 3: 比较时间戳 (Compare Timestamps)              │
│                                                              │
│  容错阈值：8000ms (8秒)                                     │
│                                                              │
│  if (云端 > 本地 + 8000ms) → 下载                          │
│  else if (本地 > 云端 + 8000ms) → 上传                     │
│  else → 数据一致，无需同步                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
┌──────────────────────┐  ┌──────────────────────┐
│   下载流程 (Download) │  │   上传流程 (Upload)   │
│                      │  │                      │
│  见下方详细流程图     │  │  见下方详细流程图     │
└──────────────────────┘  └──────────────────────┘
                │                     │
                └──────────┬──────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Step 6: 更新时间戳 (Update Timestamp)                │
│                                                              │
│  上传：更新为当前时间                                        │
│  下载：已在数据更新后立即更新                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              同步完成 (Sync Complete)                        │
│                                                              │
│  • 显示结果提示                                             │
│  • 刷新 UI                                                  │
│  • 释放同步锁                                               │
└─────────────────────────────────────────────────────────────┘
```



### 3. 下载流程详解

```
┌─────────────────────────────────────────────────────────────┐
│              开始下载 (Start Download)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 1: 下载主数据 JSON (Download Main Data)           │
│                                                              │
│  文件：lumostime_backup.json                                │
│  内容：logs, todos, categories, scopes, goals, reviews...   │
│                                                              │
│  桌面端：webdav.getFileContents() + 缓存控制                │
│  移动端：Filesystem.downloadFile() → 临时文件 → 读取        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 2: 下载图片列表 JSON (Download Image List)        │
│                                                              │
│  文件：lumostime_images.json                                │
│  内容：{ images: [...], timestamp: ... }                    │
│                                                              │
│  桌面端：webdav.getFileContents() + 缓存控制                │
│  移动端：Filesystem.downloadFile() → 临时文件 → 读取        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 3: 更新应用数据 (Update App Data)                 │
│                                                              │
│  handleSyncDataUpdate(data):                                │
│  • 设置 isRestoring = true                                  │
│  • 设置 disableTimestampUpdate = true                       │
│  • 更新所有 React state (setLogs, setTodos, ...)          │
│  • DataContext useEffect 触发，保存到 localStorage         │
│  • 等待 500ms 确保所有 effect 完成                         │
│  • 解锁时间戳更新                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│   Step 4: 立即更新 localStorage 时间戳 (Critical!)          │
│                                                              │
│  const now = Date.now();                                    │
│  localStorage.setItem('lumostime_local_timestamp', now);    │
│                                                              │
│  ⚠️ 必须在这里立即更新，确保数据和时间戳同步！              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 5: 下载图片文件 (Download Images)                 │
│                                                              │
│  并行下载（3个并发）：                                       │
│  • 比较本地和云端图片列表                                   │
│  • 下载缺失的图片                                           │
│                                                              │
│  桌面端：webdav.downloadImage() → ArrayBuffer → writeImage │
│  移动端：Filesystem.downloadFile() → 直接保存到文件系统    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              下载完成 (Download Complete)                    │
│                                                              │
│  • 同步 React state 时间戳                                  │
│  • 显示成功消息                                             │
│  • 刷新 UI                                                  │
└─────────────────────────────────────────────────────────────┘
```

### 4. 上传流程详解

```
┌─────────────────────────────────────────────────────────────┐
│              开始上传 (Start Upload)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 1: 收集本地数据 (Collect Local Data)              │
│                                                              │
│  getFullLocalData():                                        │
│  • logs, todos, categories, scopes, goals                   │
│  • reviews, templates, filters                              │
│  • version, timestamp                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 2: 上传主数据 JSON (Upload Main Data)             │
│                                                              │
│  文件：lumostime_backup.json                                │
│  方法：service.uploadData(data, filename)                   │
│                                                              │
│  桌面端：webdav.putFileContents()                           │
│  移动端：HTTP.sendRequest(PUT) + raw serializer            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 3: 收集图片引用 (Collect Image References)        │
│                                                              │
│  extractImageReferences(data):                              │
│  • 从 logs 中提取图片文件名                                 │
│  • 从 reviews 中提取图片文件名                              │
│  • 去重并排序                                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 4: 上传图片列表 JSON (Upload Image List)          │
│                                                              │
│  文件：lumostime_images.json                                │
│  内容：{ images: [...], timestamp: Date.now() }             │
│                                                              │
│  桌面端：webdav.putFileContents()                           │
│  移动端：HTTP.sendRequest(PUT) + raw serializer            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 5: 上传图片文件 (Upload Images)                   │
│                                                              │
│  并行上传（3个并发）：                                       │
│  • 比较本地和云端图片列表                                   │
│  • 上传新增的图片                                           │
│  • 同步删除操作                                             │
│                                                              │
│  桌面端：webdav.uploadImage(filename, buffer)               │
│  移动端：HTTP.sendRequest(PUT) + raw serializer            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│      Step 6: 更新本地时间戳 (Update Local Timestamp)        │
│                                                              │
│  const now = Date.now();                                    │
│  localStorage.setItem('lumostime_local_timestamp', now);    │
│  setLocalDataTimestamp(now);                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              上传完成 (Upload Complete)                      │
│                                                              │
│  • 显示成功消息                                             │
│  • 刷新 UI                                                  │
└─────────────────────────────────────────────────────────────┘
```



## 平台差异化处理

### 1. 平台检测

```typescript
// 平台检测逻辑
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();  // iOS/Android
const isElectron = typeof window !== 'undefined' && window.ipcRenderer;
const isWeb = !isNative && !isElectron;  // Browser
```

### 2. 主数据 JSON 处理差异

#### 桌面端（Browser/Electron）

```typescript
// 下载
const cacheBuster = `?_=${Date.now()}`;
const content = await client.getFileContents(`/${filename}${cacheBuster}`, { 
    format: 'text',
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
});
return JSON.parse(content);

// 上传
await client.putFileContents(`/${filename}`, content, { overwrite: true });
```

**特点**：
- 使用 `webdav` 客户端库
- 添加缓存控制头防止浏览器缓存
- 添加缓存破坏参数（时间戳）
- 数据通过 JavaScript 处理

#### 移动端（iOS/Android）

```typescript
// 下载
await Filesystem.downloadFile({
    path: `temp/${filename}`,
    url: url,
    directory: Directory.Data,
    headers: { 'Authorization': `Basic ${auth}` }
});

const result = await Filesystem.readFile({
    path: `temp/${filename}`,
    directory: Directory.Data,
    encoding: Encoding.UTF8
});

await Filesystem.deleteFile({ path: `temp/${filename}`, ... });
return JSON.parse(result.data);

// 上传
const encoder = new TextEncoder();
const uint8Data = encoder.encode(content);

HTTP.setDataSerializer('raw');
await HTTP.sendRequest(url, {
    method: 'put',
    data: uint8Data.buffer,
    headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json; charset=utf-8'
    }
});
```

**特点**：
- 使用原生 Filesystem API
- 下载到临时文件，避免 WebView 桥传递大数据
- 使用 `cordova-plugin-advanced-http` 上传
- 性能提升约 10 倍

**性能对比**：

| 操作 | 桌面端 | 移动端（旧方案） | 移动端（新方案） | 提升 |
|------|--------|-----------------|-----------------|------|
| 下载 427KB JSON | ~1秒 | ~30秒 | ~2-3秒 | 10倍 |
| 上传 427KB JSON | ~1秒 | ~5秒 | ~2秒 | 2.5倍 |



### 3. 图片文件处理差异

#### 桌面端（Browser/Electron）

```typescript
// 下载图片
const cacheBuster = `?_=${Date.now()}`;
const buffer = await client.getFileContents(`/images/${filename}${cacheBuster}`, { 
    format: 'binary',
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
});

// 写入到 IndexedDB
await imageService.writeImage(filename, buffer);

// 上传图片
const buffer = await imageService.readImage(filename);
await client.putFileContents(`/images/${filename}`, buffer, { overwrite: true });
```

**存储位置**：
- Web: IndexedDB
- Electron: 本地文件系统（通过 IPC）

#### 移动端（iOS/Android）

```typescript
// 下载图片（直接保存到文件系统）
await Filesystem.downloadFile({
    path: `images/${filename}`,
    url: url,
    directory: Directory.Data,
    headers: { 'Authorization': `Basic ${auth}` }
});

// 返回空 ArrayBuffer 作为标志（文件已保存）
return new ArrayBuffer(0);

// 在 syncService 中检测并跳过写入
const buffer = await storageService.downloadImage(filename);
if (buffer.byteLength > 0) {
    // 桌面端：需要写入
    await imageService.writeImage(filename, buffer);
}
// 移动端：buffer 为空，跳过写入

// 上传图片
const uint8Data = await normalizeToUint8Array(buffer);
HTTP.setDataSerializer('raw');
await HTTP.sendRequest(url, {
    method: 'put',
    data: uint8Data.buffer,
    headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'image/jpeg'
    }
});
```

**存储位置**：
- iOS: `Library/NoCloud/images/`
- Android: `files/images/`

**性能对比**：

| 操作 | 桌面端 | 移动端（旧方案） | 移动端（新方案） | 提升 |
|------|--------|-----------------|-----------------|------|
| 下载单张图片 (2MB) | ~1秒 | ~3-8秒 | ~1-3秒 | 3倍 |
| 下载 10 张图片 | ~10秒 | ~50秒 | ~6秒 | 8倍 |
| 上传单张图片 (2MB) | ~1秒 | ~3-5秒 | ~1-2秒 | 2.5倍 |

### 4. 并行处理策略

```typescript
// 并行上传/下载（所有平台）
const CONCURRENT_OPERATIONS = 3;  // 同时处理 3 个文件
const promises: Promise<void>[] = [];

for (let i = 0; i < files.length; i++) {
    const task = async () => {
        // 上传或下载操作
        await processFile(files[i]);
    };
    
    promises.push(task());
    
    // 每 3 个任务等待一次
    if (promises.length >= CONCURRENT_OPERATIONS) {
        await Promise.all(promises);
        promises.length = 0;
    }
}

// 等待剩余任务
if (promises.length > 0) {
    await Promise.all(promises);
}
```

**并发数量选择**：
- 3 个并发：平衡性能和稳定性
- 太少：速度慢
- 太多：网络拥塞、服务器压力大



### 5. 存储服务差异（WebDAV vs S3）

#### WebDAV 服务

```typescript
// 特点
- 标准 WebDAV 协议
- 支持坚果云、Nextcloud、ownCloud 等
- 文件路径：/lumostime_backup.json, /images/xxx.jpg

// 桌面端实现
- 使用 webdav 客户端库
- 底层使用 fetch API
- 需要处理 CORS（开发环境使用代理）

// 移动端实现
- 使用 cordova-plugin-advanced-http
- 使用 Capacitor Filesystem API
- 直接访问，无 CORS 问题

// 目录结构
/
├── lumostime_backup.json       # 主数据
├── lumostime_images.json       # 图片列表
└── images/                     # 图片目录
    ├── image1.jpg
    ├── image2.jpg
    └── ...
```

#### S3/COS 服务

```typescript
// 特点
- AWS S3 兼容协议
- 支持腾讯云 COS、阿里云 OSS 等
- 对象存储，使用 Key 而非路径

// 实现
- 使用 aws-sdk (browser/node)
- 统一的 API（所有平台）
- 无需处理 CORS（配置在服务端）

// 对象 Key 结构
bucket/
├── lumostime_backup.json       # 主数据
├── lumostime_images.json       # 图片列表
└── images/                     # 图片前缀
    ├── image1.jpg
    ├── image2.jpg
    └── ...
```

#### 服务选择逻辑

```typescript
getActiveStorageService(): StorageService | null {
    const webdavConfig = webdavService.getConfig();
    const s3Config = s3Service.getConfig();
    
    // 检查手动断开标志
    const webdavDisconnected = localStorage.getItem('lumos_webdav_manual_disconnect') === 'true';
    const s3Disconnected = localStorage.getItem('lumos_s3_manual_disconnect') === 'true';
    
    // 过滤已断开的服务
    const hasWebdav = webdavConfig && !webdavDisconnected;
    const hasS3 = s3Config && !s3Disconnected;
    
    // S3 优先
    if (hasS3) return s3Service;
    if (hasWebdav) return webdavService;
    
    return null;
}
```

**优先级**：S3 > WebDAV

**原因**：
- S3 性能更好
- S3 更稳定（无 CORS 问题）
- S3 API 更统一（跨平台）



## 同步模式

### 1. 自动同步模式（默认）

```
┌─────────────────────────────────────────────────────────────┐
│                    自动同步触发时机                          │
└─────────────────────────────────────────────────────────────┘

1. 启动同步 (Startup Sync)
   ├─ 触发时机：应用启动时
   ├─ 行为：检查云端是否有更新
   ├─ 提示：仅在下载时显示 toast
   └─ 代码：performSync('startup')

2. 恢复同步 (Resume Sync)
   ├─ 触发时机：应用从后台恢复 / 标签页重新可见
   ├─ 行为：检查云端是否有更新
   ├─ 提示：数据变化时显示 toast
   └─ 代码：performSync('resume')

3. 数据变化同步 (Auto Sync)
   ├─ 触发时机：用户修改数据后 2 秒
   ├─ 行为：自动上传到云端
   ├─ 提示：静默同步，无 toast
   ├─ 防抖：2 秒内多次修改只触发一次
   └─ 代码：performSync('auto')

4. 图片列表变化同步
   ├─ 触发时机：图片上传/删除后 2 秒
   ├─ 行为：自动同步图片列表和文件
   ├─ 提示：静默同步，无 toast
   └─ 事件：window.dispatchEvent('imageListChanged')

5. 手动同步 (Manual Sync)
   ├─ 触发时机：用户点击同步按钮
   ├─ 行为：自动检测上传/下载
   ├─ 提示：显示详细的同步结果
   └─ 代码：performSync('manual')
```

### 2. 手动同步模式

```
┌─────────────────────────────────────────────────────────────┐
│                    手动同步模式特点                          │
└─────────────────────────────────────────────────────────────┘

启用方式：
  在设置中开启"手动同步模式"

禁用的自动同步：
  ✗ 启动同步
  ✗ 恢复同步
  ✗ 数据变化自动同步
  ✗ 图片列表变化自动同步

保留的功能：
  ✓ 手动点击同步按钮
  ✓ 选择上传或下载方向
  ✓ 设置页的手动上传/下载

使用场景：
  • 网络流量有限
  • 需要精确控制同步时机
  • 多设备协作，避免冲突
```

### 3. 同步方向选择

```
┌─────────────────────────────────────────────────────────────┐
│              手动同步模式 - 方向选择流程                     │
└─────────────────────────────────────────────────────────────┘

用户点击同步按钮
        │
        ▼
┌───────────────────┐
│ 检查同步模式       │
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
自动模式    手动模式
    │         │
    │         ▼
    │    ┌─────────────────┐
    │    │ 弹出方向选择框   │
    │    └────────┬────────┘
    │             │
    │        ┌────┴────┐
    │        │         │
    │        ▼         ▼
    │    上传到云端  从云端下载
    │        │         │
    │        ▼         ▼
    │   handleManual  handleManual
    │   Upload()      Download()
    │        │         │
    └────────┴─────────┘
             │
             ▼
    执行完整同步流程
    (主数据 + 图片列表 + 图片文件)
```



## 时间戳管理

### 1. 时间戳系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      时间戳存储位置                          │
└─────────────────────────────────────────────────────────────┘

本地时间戳：
  ├─ localStorage: 'lumostime_local_timestamp'  (主要)
  └─ React State: localDataTimestamp            (UI 同步)

云端时间戳：
  ├─ 文件修改时间: statFile() → lastmod        (优先)
  └─ 文件内部时间戳: data.timestamp             (备用)

图片列表时间戳：
  └─ lumostime_images.json: { timestamp: ... }
```

### 2. 时间戳更新时机

```
┌─────────────────────────────────────────────────────────────┐
│                  时间戳更新流程图                            │
└─────────────────────────────────────────────────────────────┘

数据变化
    │
    ▼
DataContext useEffect 触发
    │
    ├─ 保存数据到 localStorage
    │  (lumostime_logs, lumostime_todos, ...)
    │
    └─ 更新时间戳
       │
       ├─ 检查 disableTimestampUpdateRef
       │  │
       │  ├─ true → 跳过更新（正在恢复数据）
       │  └─ false → 执行更新
       │
       └─ 更新时间戳
          ├─ localStorage.setItem('lumostime_local_timestamp', now)
          └─ setLocalDataTimestamp(now)

同步完成
    │
    ├─ 上传成功
    │  └─ 更新为当前时间
    │
    └─ 下载成功
       └─ 在 handleSyncDataUpdate 后立即更新
          (确保数据和时间戳同步)
```

### 3. 关键时序问题修复

#### 问题场景

```
旧的实现（有问题）：

1. handleSyncDataUpdate 开始
   disableTimestampUpdateRef = true

2. 更新 React state
   setLogs(data.logs)
   setTodos(data.todos)

3. DataContext useEffect 触发
   localStorage.setItem('lumostime_logs', ...)  ← 数据已更新
   localStorage.setItem('lumostime_todos', ...)

4. 等待 500ms
   await new Promise(resolve => setTimeout(resolve, 500))

5. 解锁时间戳更新
   disableTimestampUpdateRef = false

6. 在调用者中更新时间戳
   localStorage.setItem('lumostime_local_timestamp', now)  ← 时间戳才更新

问题：步骤 3 和步骤 6 之间，数据是新的但时间戳是旧的！
```

#### 修复方案

```
新的实现（已修复）：

1. handleSyncDataUpdate 开始
   disableTimestampUpdateRef = true

2. 更新 React state
   setLogs(data.logs)
   setTodos(data.todos)

3. DataContext useEffect 触发
   localStorage.setItem('lumostime_logs', ...)  ← 数据已更新

4. 等待 500ms
   await new Promise(resolve => setTimeout(resolve, 500))

5. 解锁时间戳更新
   disableTimestampUpdateRef = false

6. 立即更新 localStorage 时间戳（关键！）
   localStorage.setItem('lumostime_local_timestamp', now)  ← 立即更新
   
7. 然后更新 React state
   setLocalDataTimestamp(now)

优势：确保 localStorage 中的数据和时间戳始终同步！
```

### 4. 时间戳比较逻辑

```typescript
// 容错阈值：8 秒
const SYNC_TOLERANCE_MS = 8000;

// 获取时间戳
const localTimestamp = parseInt(localStorage.getItem('lumostime_local_timestamp') || '0');
const cloudTimestamp = await getCloudTimestamp();

// 计算时间差
const timeDiff = localTimestamp - cloudTimestamp;

// 比较逻辑
if (cloudTimestamp > localTimestamp + SYNC_TOLERANCE_MS) {
    // 云端明显较新 → 下载
    console.log('云端比本地新', (cloudTimestamp - localTimestamp) / 1000, '秒');
    await downloadFromCloud();
    
} else if (localTimestamp > cloudTimestamp + SYNC_TOLERANCE_MS) {
    // 本地明显较新 → 上传
    console.log('本地比云端新', (localTimestamp - cloudTimestamp) / 1000, '秒');
    await uploadToCloud();
    
} else {
    // 时间差在容错范围内 → 一致
    console.log('数据一致，时间差', Math.abs(timeDiff), 'ms');
}
```

**容错阈值的作用**：
- 处理网络延迟
- 处理上传延迟（文件修改时间可能晚于上传开始时间）
- 避免频繁的不必要同步



## 错误处理与容错

### 1. 同步锁机制

```typescript
// 防止并发同步
const syncLock = useRef(false);

const performSync = async (mode) => {
    // 检查锁
    if (syncLock.current || isSyncing) {
        console.log(`Skipped ${mode} sync: Already syncing.`);
        return;
    }
    
    // 获取锁
    syncLock.current = true;
    setIsSyncing(true);
    
    try {
        // 执行同步操作
        await doSync();
    } finally {
        // 释放锁
        setIsSyncing(false);
        syncLock.current = false;
    }
};
```

### 2. 待处理同步标志

```typescript
// 处理同步期间的数据变化
const pendingAutoSyncRef = useRef(false);

// 数据变化时设置标志
useEffect(() => {
    if (isRestoring.current || isSyncing) return;
    
    pendingAutoSyncRef.current = true;  // 标记有待处理的同步
    
    const timer = setTimeout(async () => {
        if (!isSyncing && !isRestoring.current) {
            await performSync('auto');
            pendingAutoSyncRef.current = false;
        }
    }, 2000);
    
    return () => clearTimeout(timer);
}, [logs, todos, categories, ...]);

// 同步完成后检查是否有待处理的同步
finally {
    setIsSyncing(false);
    syncLock.current = false;
    
    // 如果有待处理的同步，延迟 1 秒后重试
    if (pendingAutoSyncRef.current) {
        console.log('Pending auto-sync detected. Retrying...');
        setTimeout(() => performSync('auto'), 1000);
    }
}
```

### 3. 连接检查

```typescript
// 同步前检查连接
if (activeService.checkConnection) {
    const result = await activeService.checkConnection();
    const isConnected = (typeof result === 'object') ? result.success : !!result;
    
    if (!isConnected) {
        console.warn('Connection check failed. Aborting sync.');
        if (mode === 'manual') {
            const msg = result.message || '连接测试失败，请检查网络或配置';
            addToast('error', msg);
        }
        return;  // 中止同步
    }
}
```

### 4. 错误分类处理

```typescript
// 网络错误
catch (error) {
    if (error.status === 401) {
        // 认证失败
        addToast('error', '认证失败，请检查用户名和密码');
    } else if (error.status === 404) {
        // 文件不存在
        console.log('Cloud file not found, will upload local data');
    } else if (error.status === 409) {
        // 冲突（目录已存在等）
        console.log('Conflict, but continuing...');
    } else if (error.message?.includes('Network')) {
        // 网络错误
        addToast('error', '网络错误，请检查网络连接');
    } else {
        // 其他错误
        addToast('error', `同步失败: ${error.message}`);
    }
}
```

### 5. 图片同步容错

```typescript
// 单张图片失败不影响其他图片
for (const filename of toDownload) {
    try {
        const buffer = await storageService.downloadImage(filename);
        if (buffer.byteLength > 0) {
            await imageService.writeImage(filename, buffer);
        }
        result.downloaded++;
    } catch (err) {
        console.error(`Download failed: ${filename}`, err);
        result.errors.push(`Download failed: ${filename} - ${err.message}`);
        // 继续下载其他图片
    }
}
```

### 6. 备份机制

```typescript
// 下载前自动备份本地数据
const backupLocalData = async (service, prefix = 'auto_backup') => {
    try {
        const localData = getFullLocalData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `backups/${prefix}_${timestamp}.json`;
        await service.uploadData(localData, backupFilename);
        return true;
    } catch (error) {
        console.error('Backup failed:', error);
        return false;
    }
};

// 下载时使用备份
const result = await downloadWithBackup(
    activeService,
    localData,
    onProgress,
    async (message) => window.confirm(message)  // 用户确认
);
```



## 性能优化

### 1. 移动端性能优化总结

#### 优化前后对比

| 操作 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 下载主数据 (427KB) | 30秒 | 2-3秒 | 10倍 |
| 下载单张图片 (2MB) | 3-8秒 | 1-3秒 | 3倍 |
| 下载 10 张图片 | 50秒 | 6秒 | 8倍 |
| 完整同步 | 80秒 | 9秒 | 9倍 |

#### 核心优化策略

```
1. 避免 WebView 桥传递大数据
   ├─ 问题：数据需要序列化/反序列化
   ├─ 解决：使用原生 Filesystem API
   └─ 效果：性能提升 10 倍

2. 使用原生下载 API
   ├─ Filesystem.downloadFile()
   ├─ 直接保存到文件系统
   └─ 无需 JavaScript 处理

3. 并行处理
   ├─ 同时处理 3 个文件
   ├─ 减少总时间
   └─ 平衡性能和稳定性

4. 智能跳过写入
   ├─ 检测空 ArrayBuffer
   ├─ 跳过已保存的文件
   └─ 避免重复操作
```

### 2. 桌面端缓存控制

```typescript
// 问题：浏览器缓存导致获取旧数据
// 解决：添加缓存控制头 + 缓存破坏参数

// 1. 缓存控制头
headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
}

// 2. 缓存破坏参数
const cacheBuster = `?_=${Date.now()}`;
const url = `/path/to/file${cacheBuster}`;

// 效果：确保每次都获取最新数据
```

### 3. 并行处理优化

```typescript
// 串行处理（慢）
for (const file of files) {
    await processFile(file);  // 一个接一个
}
// 总时间 = 单个时间 × 文件数量

// 并行处理（快）
const CONCURRENT = 3;
const promises = [];

for (let i = 0; i < files.length; i++) {
    promises.push(processFile(files[i]));
    
    if (promises.length >= CONCURRENT) {
        await Promise.all(promises);
        promises.length = 0;
    }
}

if (promises.length > 0) {
    await Promise.all(promises);
}
// 总时间 ≈ 单个时间 × (文件数量 / 并发数)
```

### 4. 防抖优化

```typescript
// 数据变化频繁时，避免频繁同步
useEffect(() => {
    const timer = setTimeout(async () => {
        await performSync('auto');
    }, 2000);  // 2 秒防抖
    
    return () => clearTimeout(timer);
}, [logs, todos, categories, ...]);

// 效果：2 秒内多次修改只触发一次同步
```

### 5. 内存优化

```typescript
// 移动端：避免大数据在内存中停留
// 1. 下载到临时文件
await Filesystem.downloadFile({ path: 'temp/data.json', ... });

// 2. 读取文件
const result = await Filesystem.readFile({ path: 'temp/data.json', ... });

// 3. 立即删除临时文件
await Filesystem.deleteFile({ path: 'temp/data.json', ... });

// 效果：减少内存占用，避免 OOM
```



## 文件结构与职责

### 核心文件清单

```
src/
├── hooks/
│   └── useSyncManager.ts          # 同步管理器（协调层）
│       ├── performSync()          # 核心同步逻辑
│       ├── handleManualUpload()   # 手动上传
│       ├── handleManualDownload() # 手动下载
│       └── handleSyncDataUpdate() # 数据更新
│
├── utils/
│   └── syncUtils.ts               # 统一同步工具（业务逻辑层）
│       ├── uploadDataToCloud()    # 统一上传接口
│       ├── downloadWithBackup()   # 统一下载接口（含备份）
│       └── extractImageReferences() # 提取图片引用
│
├── services/
│   ├── syncService.ts             # 图片同步服务
│   │   ├── uploadImages()         # 并行上传图片
│   │   ├── downloadImages()       # 并行下载图片
│   │   └── getActiveStorageService() # 获取活跃存储服务
│   │
│   ├── webdavService.ts           # WebDAV 存储服务
│   │   ├── uploadData()           # 上传主数据
│   │   ├── downloadData()         # 下载主数据
│   │   ├── uploadImage()          # 上传图片
│   │   ├── downloadImage()        # 下载图片
│   │   ├── uploadImageList()      # 上传图片列表
│   │   ├── downloadImageList()    # 下载图片列表
│   │   └── statFile()             # 获取文件状态
│   │
│   ├── s3Service.ts               # S3/COS 存储服务
│   │   └── (类似 webdavService 的接口)
│   │
│   └── imageService.ts            # 图片文件管理
│       ├── readImage()            # 读取图片
│       ├── writeImage()           # 写入图片
│       ├── listImages()           # 列出图片
│       ├── deleteImage()          # 删除图片
│       ├── getDeletedImages()     # 获取删除记录
│       └── clearDeletedImages()   # 清除删除记录
│
└── contexts/
    ├── DataContext.tsx            # 数据状态管理
    │   ├── logs, todos, categories
    │   ├── localDataTimestamp
    │   └── disableTimestampUpdateRef
    │
    └── SettingsContext.tsx        # 设置状态管理
        ├── syncConfig
        ├── lastSyncTime
        ├── isSyncing
        └── manualSyncMode
```

### 数据流向图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户操作                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Contexts                            │
│  DataContext / SettingsContext / CategoryScopeContext       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   useSyncManager                             │
│  (协调同步流程，管理状态和锁)                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
┌──────────────────────┐  ┌──────────────────────┐
│    syncUtils         │  │   syncService        │
│  (主数据同步)        │  │  (图片同步)          │
└──────────┬───────────┘  └──────────┬───────────┘
           │                         │
           ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐
│  webdavService /     │  │   imageService       │
│  s3Service           │  │  (图片文件管理)      │
└──────────┬───────────┘  └──────────┬───────────┘
           │                         │
           └──────────┬──────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    存储层                                    │
│  云端存储 (WebDAV/S3) + 本地存储 (localStorage/Filesystem)  │
└─────────────────────────────────────────────────────────────┘
```



## 常见问题与解决方案

### 1. 时间戳不一致问题

**问题**：下载云端数据后，下次启动仍然读取到旧数据

**原因**：localStorage 中的数据和时间戳更新不同步

**解决**：在 `handleSyncDataUpdate` 完成后立即更新 localStorage 时间戳

```typescript
// ✓ 正确做法
await handleSyncDataUpdate(result.data);
// 立即更新 localStorage 时间戳
localStorage.setItem('lumostime_local_timestamp', Date.now().toString());
// 然后更新 React state
setLocalDataTimestamp(Date.now());

// ✗ 错误做法
await handleSyncDataUpdate(result.data);
// 等待一段时间后才更新时间戳
setTimeout(() => {
    localStorage.setItem('lumostime_local_timestamp', Date.now().toString());
}, 500);
```

### 2. 浏览器缓存问题

**问题**：桌面端下载的是旧数据，即使云端已更新

**原因**：浏览器缓存了 HTTP 响应

**解决**：添加缓存控制头 + 缓存破坏参数

```typescript
// 添加缓存控制
const cacheBuster = `?_=${Date.now()}`;
const content = await client.getFileContents(`/${filename}${cacheBuster}`, {
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
});
```

### 3. 移动端同步慢

**问题**：手机上同步特别慢，下载 427KB 需要 30 秒

**原因**：数据通过 WebView 桥传递，性能差

**解决**：使用原生 Filesystem API

```typescript
// ✓ 快速方案（原生下载）
await Filesystem.downloadFile({
    path: `temp/${filename}`,
    url: url,
    directory: Directory.Data
});
const result = await Filesystem.readFile({
    path: `temp/${filename}`,
    directory: Directory.Data
});

// ✗ 慢速方案（WebView 桥）
const response = await HTTP.sendRequest(url, { method: 'get' });
const content = response.data;  // 需要通过 WebView 桥传递
```

### 4. 并发同步冲突

**问题**：多个同步操作同时执行，导致数据混乱

**原因**：没有同步锁

**解决**：使用 syncLock 和 isSyncing 标志

```typescript
const syncLock = useRef(false);

const performSync = async (mode) => {
    if (syncLock.current || isSyncing) {
        console.log('Already syncing, skipped');
        return;
    }
    
    syncLock.current = true;
    setIsSyncing(true);
    
    try {
        await doSync();
    } finally {
        setIsSyncing(false);
        syncLock.current = false;
    }
};
```

### 5. 图片同步失败

**问题**：图片上传失败，提示 409 错误

**原因**：云端缺少 `/images` 目录

**解决**：
- WebDAV: 手动在云端创建 `images` 文件夹
- S3: 自动创建（对象存储无需目录）

### 6. 启动时跳过云端恢复

**问题**：启动同步时，用户刚做了修改，但被云端数据覆盖

**原因**：没有检测待处理的自动同步

**解决**：检查 `pendingAutoSyncRef`

```typescript
if (mode === 'startup' && hadPendingAutoSync) {
    console.log('跳过云端恢复：检测到待处理的自动同步');
    dataSyncStatus = 'equal';
    dataSyncMsg = '检测到本地变更，跳过云端恢复';
}
```



## 测试指南

### 1. 基础同步测试

#### 测试场景 1：首次上传

```
步骤：
1. 清空云端数据
2. 在本地创建一些日志和任务
3. 点击同步按钮
4. 验证云端是否有以下文件：
   - lumostime_backup.json
   - lumostime_images.json
   - images/*.jpg (如果有图片)

预期结果：
✓ 上传成功
✓ 显示 "已上传主数据 + X 张图片"
✓ 云端文件存在且内容正确
```

#### 测试场景 2：首次下载

```
步骤：
1. 清空本地数据（localStorage.clear()）
2. 确保云端有数据
3. 刷新页面（触发启动同步）
4. 验证本地是否恢复数据

预期结果：
✓ 下载成功
✓ 显示 "启动同步：已下载云端数据"
✓ 本地数据与云端一致
```

#### 测试场景 3：双向同步

```
步骤：
1. 在设备 A 修改数据并上传
2. 在设备 B 下载数据
3. 验证设备 B 的数据与设备 A 一致
4. 在设备 B 修改数据并上传
5. 在设备 A 下载数据
6. 验证设备 A 的数据与设备 B 一致

预期结果：
✓ 双向同步成功
✓ 数据保持一致
✓ 时间戳正确更新
```

### 2. 时间戳测试

#### 测试场景 4：时间戳一致性

```
步骤：
1. 修改本地数据
2. 等待自动同步完成
3. 在浏览器控制台检查：
   const timestamp = localStorage.getItem('lumostime_local_timestamp');
   const logs = JSON.parse(localStorage.getItem('lumostime_logs'));
   console.log('Timestamp:', new Date(parseInt(timestamp)));
   console.log('Logs count:', logs.length);
4. 刷新页面
5. 再次检查时间戳和数据

预期结果：
✓ 时间戳和数据保持一致
✓ 刷新后不会触发不必要的同步
```

#### 测试场景 5：容错阈值

```
步骤：
1. 在设备 A 上传数据（时间戳 T1）
2. 立即在设备 B 下载（时间戳 T2）
3. T2 - T1 应该小于 8 秒
4. 验证设备 B 不会再次上传

预期结果：
✓ 识别为数据一致
✓ 不触发额外同步
✓ 显示 "数据已是一致"
```

### 3. 平台差异测试

#### 测试场景 6：移动端性能

```
步骤：
1. 在手机上创建 10 条日志，每条包含 1 张图片
2. 点击上传，记录时间
3. 清空本地数据
4. 点击下载，记录时间

预期结果：
✓ 上传时间 < 15 秒
✓ 下载时间 < 15 秒
✓ 显示进度信息
```

#### 测试场景 7：桌面端缓存

```
步骤：
1. 在手机上修改数据并上传
2. 在电脑上点击下载
3. 验证下载的是最新数据
4. 不清除浏览器缓存
5. 再次点击下载
6. 验证仍然是最新数据

预期结果：
✓ 每次都下载最新数据
✓ 不受浏览器缓存影响
```

### 4. 错误处理测试

#### 测试场景 8：网络中断

```
步骤：
1. 开始上传
2. 中途断开网络
3. 观察错误提示
4. 恢复网络
5. 重新上传

预期结果：
✓ 显示网络错误提示
✓ 本地数据未损坏
✓ 恢复后可以正常同步
```

#### 测试场景 9：并发同步

```
步骤：
1. 快速连续点击同步按钮 5 次
2. 观察同步行为

预期结果：
✓ 只执行一次同步
✓ 其他请求被跳过
✓ 显示 "Already syncing, skipped"
```

### 5. 手动同步模式测试

#### 测试场景 10：手动模式

```
步骤：
1. 开启手动同步模式
2. 修改本地数据
3. 等待 5 秒
4. 验证没有自动同步
5. 点击同步按钮
6. 选择上传方向
7. 验证上传成功

预期结果：
✓ 不触发自动同步
✓ 手动同步正常工作
✓ 方向选择正确
```



## 最佳实践

### 1. 开发建议

#### 修改同步逻辑时

```
✓ DO:
- 先理解整体流程再修改
- 保持时间戳和数据的同步更新
- 使用同步锁防止并发
- 添加详细的日志输出
- 测试所有平台（Web/Electron/iOS/Android）

✗ DON'T:
- 不要在多个地方更新时间戳
- 不要跳过连接检查
- 不要忽略错误处理
- 不要在同步期间修改数据
```

#### 添加新数据类型时

```
步骤：
1. 在 DataContext 中添加 state
2. 在 getFullLocalData() 中包含新数据
3. 在 handleSyncDataUpdate() 中处理新数据
4. 在 DataContext useEffect 中监听变化
5. 测试上传和下载

示例：
// 1. 添加 state
const [newData, setNewData] = useState([]);

// 2. 包含在同步数据中
const getFullLocalData = () => ({
    logs, todos, newData,  // 添加这里
    version: '1.0.0',
    timestamp: localDataTimestamp
});

// 3. 处理下载
if (data.newData) setNewData(data.newData);

// 4. 监听变化
useEffect(() => {
    // 更新时间戳
}, [logs, todos, newData]);  // 添加依赖
```

### 2. 用户使用建议

#### 选择存储服务

```
WebDAV:
✓ 适合：自建服务器、坚果云用户
✓ 优点：开源、标准协议、隐私性好
✗ 缺点：需要手动创建目录、速度较慢

S3/COS:
✓ 适合：云服务用户、追求性能
✓ 优点：速度快、稳定、自动创建目录
✗ 缺点：需要付费、依赖云服务商
```

#### 同步模式选择

```
自动同步模式：
✓ 适合：单人使用、网络稳定
✓ 优点：无需手动操作、实时同步
✗ 缺点：消耗流量、可能有冲突

手动同步模式：
✓ 适合：多人协作、网络不稳定
✓ 优点：精确控制、避免冲突
✗ 缺点：需要手动操作、可能忘记同步
```

#### 多设备使用建议

```
推荐工作流：
1. 在设备 A 完成工作后，手动上传
2. 切换到设备 B 前，先下载最新数据
3. 在设备 B 完成工作后，手动上传
4. 避免同时在多个设备上修改

避免冲突：
- 使用手动同步模式
- 养成"先下载，后修改，再上传"的习惯
- 定期检查同步状态
```

### 3. 故障排查

#### 问题：同步失败

```
检查清单：
□ 网络连接是否正常
□ 云端配置是否正确（URL、用户名、密码）
□ 云端是否有足够的存储空间
□ WebDAV 是否创建了 images 目录
□ 浏览器控制台是否有错误信息
□ 是否有其他设备正在同步
```

#### 问题：数据不一致

```
解决步骤：
1. 检查时间戳：
   localStorage.getItem('lumostime_local_timestamp')
   
2. 检查云端时间戳：
   在设置页查看"最后同步时间"
   
3. 手动触发同步：
   点击同步按钮，选择正确的方向
   
4. 如果仍然不一致：
   - 导出本地数据备份
   - 清空 localStorage
   - 重新下载云端数据
```

#### 问题：图片丢失

```
检查清单：
□ 云端是否有 lumostime_images.json
□ 图片列表中是否包含该图片
□ 云端 images/ 目录是否有该图片文件
□ 本地是否有删除记录

解决方法：
1. 检查图片引用：
   const imageList = JSON.parse(localStorage.getItem('lumostime_image_list'));
   
2. 重新上传图片：
   在有图片的设备上手动上传
   
3. 清除删除记录：
   localStorage.removeItem('lumostime_deleted_images');
```



## 版本历史与演进

### v1.0 - 初始版本
- 基础同步功能
- 仅支持 WebDAV
- 串行图片同步

### v2.0 - 性能优化
- 添加 S3/COS 支持
- 并行图片同步（3 个并发）
- 移动端原生下载优化

### v3.0 - 时间戳修复
- 修复时间戳不一致问题
- 添加容错阈值（8 秒）
- 优化时间戳更新时机

### v4.0 - 缓存控制
- 桌面端添加缓存控制头
- 添加缓存破坏参数
- 解决浏览器缓存问题

### v5.0 - 手动同步模式（当前版本）
- 添加手动同步模式
- 支持方向选择（上传/下载）
- 优化同步锁机制
- 添加待处理同步标志

## 未来规划

### 短期计划

1. **增量同步**
   - 只同步变化的数据
   - 减少网络流量
   - 提升同步速度

2. **冲突解决**
   - 检测同步冲突
   - 提供合并选项
   - 保留冲突版本

3. **同步历史**
   - 记录同步历史
   - 支持回滚到历史版本
   - 查看同步日志

### 长期计划

1. **实时同步**
   - WebSocket 连接
   - 实时推送更新
   - 多设备实时协作

2. **端到端加密**
   - 本地加密数据
   - 云端存储密文
   - 保护用户隐私

3. **更多存储服务**
   - Google Drive
   - Dropbox
   - OneDrive
   - iCloud

## 参考资料

### 相关文档

- [IMAGE_SYNC_OPTIMIZATION.md](./IMAGE_SYNC_OPTIMIZATION.md) - 图片同步性能优化
- [WEBDAV_CACHE_FIX.md](./WEBDAV_CACHE_FIX.md) - WebDAV 缓存问题修复
- [SYNC_CLEANUP_SUMMARY.md](./SYNC_CLEANUP_SUMMARY.md) - 同步逻辑清理总结
- [TIMESTAMP_SYNC_FIX.md](./TIMESTAMP_SYNC_FIX.md) - 时间戳同步问题修复

### 技术栈

- **React** - UI 框架
- **TypeScript** - 类型安全
- **Capacitor** - 跨平台支持
- **webdav** - WebDAV 客户端
- **aws-sdk** - S3 客户端
- **cordova-plugin-advanced-http** - 移动端 HTTP
- **@capacitor/filesystem** - 文件系统 API

### 外部链接

- [Capacitor Filesystem API](https://capacitorjs.com/docs/apis/filesystem)
- [WebDAV Protocol](https://tools.ietf.org/html/rfc4918)
- [AWS S3 API](https://docs.aws.amazon.com/AmazonS3/latest/API/)
- [Capacitor File Handling Guide](https://capawesome.io/blog/the-file-handling-guide-for-capacitor/)

---

## 总结

LumosTime 的同步系统是一个复杂但设计良好的架构，它：

1. **统一接口** - 通过 syncUtils 提供统一的上传/下载接口
2. **平台适配** - 针对不同平台优化性能
3. **多存储支持** - 支持 WebDAV 和 S3/COS
4. **性能优化** - 并行处理、原生 API、缓存控制
5. **容错机制** - 同步锁、错误处理、备份机制
6. **灵活模式** - 自动同步和手动同步两种模式

通过这些设计，系统能够在各种场景下稳定、高效地同步数据，为用户提供无缝的多设备体验。

---

**文档维护者**：开发团队  
**最后更新**：2024年  
**文档版本**：5.0
