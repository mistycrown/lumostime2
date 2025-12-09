# WebDAV 同步功能开发文档

> **文档版本**: v1.0  
> **创建日期**: 2025-12-09  
> **适用项目**: LumosTime 及其他需要 WebDAV 同步的跨平台应用  
> **技术栈**: React + TypeScript + Vite + Capacitor + Electron

---

## 📋 目录

1. [功能概述](#功能概述)
2. [架构设计](#架构设计)
3. [核心代码模块](#核心代码模块)
4. [跨平台解决方案](#跨平台解决方案)
5. [集成步骤](#集成步骤)
6. [使用指南](#使用指南)
7. [常见问题](#常见问题)
8. [最佳实践](#最佳实践)

---

## 🎯 功能概述

### 核心功能

WebDAV 同步模块提供以下功能：

- ✅ **配置管理**: 保存和加载 WebDAV 服务器配置（URL、用户名、密码）
- ✅ **连接测试**: 验证 WebDAV 服务器连接状态
- ✅ **数据上传**: 将本地数据打包为 JSON 并上传到 WebDAV 服务器
- ✅ **数据下载**: 从 WebDAV 服务器下载数据并恢复到本地
- ✅ **文件元数据查询**: 获取云端文件的最后修改时间（用于智能同步）
- ✅ **跨平台支持**: Web、Android、iOS、Electron 全平台支持

### 支持的平台

| 平台 | 实现方式 | CORS 处理 |
|------|---------|-----------|
| **Web (开发)** | Vite Proxy | Vite 代理 `/uv/jianguoyun` |
| **Android/iOS** | Cordova HTTP Plugin | 原生请求，无 CORS 限制 |
| **Electron** | 标准 webdav 客户端 | `webSecurity: false` |

---

## 🏗️ 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                          前端应用                            │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ UI 组件层  │  │   业务逻辑    │  │  数据存储层   │        │
│  │ Settings   │→ │  App.tsx     │→ │ localStorage │        │
│  └────────────┘  └──────────────┘  └──────────────┘        │
│                         ↓                                    │
│                  ┌──────────────┐                           │
│                  │ webdavService│                           │
│                  └──────────────┘                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
    │ Web平台   │  │ 移动平台   │  │ Electron  │
    │ (CORS问题)│  │ (原生HTTP) │  │ (无CORS)  │
    └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
          │              │              │
    ┌─────▼─────┐        │              │
    │   代理层   │        │              │
    │ Dev: Vite │        │              │
    │ Prod:API  │        │              │
    └─────┬─────┘        │              │
          │              │              │
          └──────────────┴──────────────┘
                      │
              ┌───────▼────────┐
              │  WebDAV 服务器  │
              │ (坚果云/NextCloud)│
              └────────────────┘
```

### 数据流图

```
上传流程:
用户触发上传 → 收集应用数据 → JSON 序列化 → 根据平台选择传输方式
                                              ↓
                                    ┌─────────┴─────────┐
                                    │                   │
                            Web环境: 代理     移动/桌面: 直连
                                    │                   │
                                    └─────────┬─────────┘
                                              ↓
                                        WebDAV PUT
                                              ↓
                                        上传成功/失败

下载流程:
用户触发下载 → 根据平台选择传输方式 → WebDAV GET → JSON 解析
                                                          ↓
                                              应用数据状态更新
                                                          ↓
                                                  localStorage 保存
```

---

## 💻 核心代码模块

### 1. WebDAV 服务类 (`services/webdavService.ts`)

这是整个同步功能的核心模块。

#### 1.1 类型定义

```typescript
export interface WebDAVConfig {
    url: string;        // WebDAV 服务器地址
    username: string;   // 用户名
    password: string;   // 密码或应用令牌
}
```

#### 1.2 核心方法

| 方法名 | 功能 | 返回值 |
|--------|------|--------|
| `saveConfig(config)` | 保存配置到 localStorage 并初始化客户端 | void |
| `getConfig()` | 获取当前配置 | WebDAVConfig \| null |
| `clearConfig()` | 清除配置 | void |
| `checkConnection()` | 测试连接 | Promise\<boolean\> |
| `uploadData(data, filename)` | 上传数据 | Promise\<boolean\> |
| `downloadData(filename)` | 下载数据 | Promise\<any\> |
| `statFile(filename)` | 获取文件元数据 | Promise\<Date \| null\> |

#### 1.3 平台适配逻辑

```typescript
private getEffectiveUrl(url: string): string {
    const isElectron = typeof window !== 'undefined' && window.ipcRenderer;
    
    // 1. 原生平台或 Electron：直接使用原始 URL
    if (Capacitor.isNativePlatform() || isElectron) {
        return url;
    }
    
    // 2. Web 开发环境：使用 Vite 代理
    if (import.meta.env.DEV && url.includes('dav.jianguoyun.com')) {
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        return cleanUrl.replace('https://dav.jianguoyun.com/dav', '/uv/jianguoyun');
    }
    
    // 3. 其他情况：返回原始 URL
    return url;
}
```

#### 1.4 自定义请求处理（移动平台）

使用 Cordova Advanced HTTP 插件绕过 CORS 限制：

```typescript
// 在 saveConfig 方法中
if (Capacitor.isNativePlatform()) {
    options.customFetch = async (url: string, init: any) => {
        try {
            const method = (init.method || 'GET').toLowerCase();
            const headers = { ...(init.headers || {}) };
            
            // 添加 Basic Auth
            if (!headers['Authorization']) {
                const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
                headers['Authorization'] = `Basic ${auth}`;
            }
            
            // 发送原生 HTTP 请求
            const response = await HTTP.sendRequest(url, {
                method: method,
                data: init.body || "",
                headers: headers,
                serializer: 'utf8',
                timeout: 30000,
            });
            
            // 转换为标准 Response 对象
            return new Response(response.data, {
                status: response.status,
                statusText: 'OK',
                headers: new Headers(response.headers)
            });
        } catch (error: any) {
            // 错误处理
            throw error;
        }
    };
}
```

---

### 2. Vite 代理配置 (`vite.config.ts`)

本地开发环境的代理配置，处理坚果云等 WebDAV 服务的 CORS 问题。

```typescript
export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 3002,
      host: '0.0.0.0',
      proxy: {
        '/uv/jianguoyun': {
          target: 'https://dav.jianguoyun.com/dav/',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/uv\/jianguoyun/, ''),
        }
      },
    },
    // ...其他配置
  };
});
```

**工作原理**：
- 前端请求 `/uv/jianguoyun/lumostime_backup.json`
- Vite 拦截请求，转发到 `https://dav.jianguoyun.com/dav/lumostime_backup.json`
- 响应返回给前端，无 CORS 问题

---

### 3. UI 集成示例 (`views/SettingsView.tsx`)

#### 3.1 状态管理

```typescript
const [webdavConfig, setWebdavConfig] = useState<WebDAVConfig | null>(null);
const [isSyncing, setIsSyncing] = useState(false);
const [configForm, setConfigForm] = useState<WebDAVConfig>({
    url: '',
    username: '',
    password: ''
});

useEffect(() => {
    const config = webdavService.getConfig();
    if (config) {
        setWebdavConfig(config);
        setConfigForm(config);
    }
}, []);
```

#### 3.2 保存配置并测试连接

```typescript
const handleSaveConfig = async () => {
    if (!configForm.url) {
        onToast('error', 'Please enter a URL');
        return;
    }
    
    setIsSyncing(true);
    
    // 自动添加 https://
    const config = { ...configForm };
    if (!config.url.startsWith('http')) {
        config.url = 'https://' + config.url;
    }
    
    // 测试连接
    webdavService.saveConfig(config);
    const success = await webdavService.checkConnection();
    
    if (success) {
        setWebdavConfig(config);
        onToast('success', 'Connected to WebDAV server successfully!');
    } else {
        webdavService.clearConfig();
        onToast('error', 'Connection failed.');
    }
    
    setIsSyncing(false);
};
```

#### 3.3 上传数据

```typescript
const handleSyncUpload = async () => {
    if (!webdavConfig) return;
    
    setIsSyncing(true);
    try {
        const dataToSync = {
            ...syncData,  // 包含 logs, todos, categories, scopes, goals 等
            timestamp: Date.now(),
            version: '1.0.0'
        };
        
        await webdavService.uploadData(dataToSync);
        onToast('success', 'Data uploaded successfully!');
    } catch (error) {
        console.error(error);
        onToast('error', 'Failed to upload data.');
    } finally {
        setIsSyncing(false);
    }
};
```

#### 3.4 下载数据

```typescript
const handleSyncDownload = async () => {
    if (!webdavConfig) return;
    
    if (!window.confirm("This will overwrite your current local data. Are you sure?")) {
        return;
    }
    
    setIsSyncing(true);
    try {
        const data = await webdavService.downloadData();
        if (data) {
            onSyncUpdate(data);  // 更新应用状态
            onToast('success', 'Data restored from cloud successfully!');
        }
    } catch (error) {
        console.error(error);
        onToast('error', 'Failed to download data.');
    } finally {
        setIsSyncing(false);
    }
};
```

---

### 4. Electron 配置 (`electron/main.ts`)

Electron 环境需要禁用 Web Security 来避免 CORS 问题。

```typescript
win = new BrowserWindow({
    title: 'LumosTime',
    width: 600,
    height: 900,
    webPreferences: {
        preload,
        // 关键：禁用 Web Security 以绕过 CORS
        webSecurity: false,
    },
});
```

⚠️ **安全警告**：仅在桌面应用中禁用 `webSecurity`，不要在 Web 环境这样做。

---

### 5. Capacitor 配置 (`capacitor.config.ts`)

```typescript
const config: CapacitorConfig = {
  appId: 'com.mistycrown.lumostime',
  appName: 'LumosTime',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: false,  // 使用 Cordova HTTP 插件而非 Capacitor HTTP
    },
  },
};
```

---

## 🔧 跨平台解决方案对比

### CORS 问题处理策略

| 平台 | 问题 | 解决方案 | 优缺点 |
|------|------|---------|--------|
| **Web 开发** | 浏览器 CORS 限制 | Vite Proxy | ✅ 简单易配置<br>⚠️ 仅开发环境 |
| **移动原生** | 无 CORS 问题 | Cordova Advanced HTTP | ✅ 原生性能<br>✅ 完全绕过 CORS |
| **Electron** | 无 CORS 问题 | webSecurity: false | ✅ 标准 fetch API<br>⚠️ 需注意安全性 |

### 依赖包对比

```json
{
  "dependencies": {
    "webdav": "^5.8.0",                          // 核心 WebDAV 客户端
    "buffer": "^6.0.3",                          // Base64 编码支持
    "@awesome-cordova-plugins/http": "^8.1.0",   // Cordova HTTP 封装
    "cordova-plugin-advanced-http": "^3.3.1",    // 原生 HTTP 插件
    "@capacitor/core": "^7.4.4"                  // Capacitor 平台检测
  }
}
```

---

## 📦 集成步骤

### 步骤 1: 安装依赖

```bash
npm install webdav buffer @awesome-cordova-plugins/http
npm install cordova-plugin-advanced-http @capacitor/core
```

### 步骤 2: 复制核心文件

将以下文件复制到你的项目中：

```
your-project/
├── services/
│   └── webdavService.ts          # WebDAV 服务类
├── vite.config.ts                 # Vite 代理配置（开发环境）
├── electron/
│   └── main.ts                    # Electron 主进程配置
└── capacitor.config.ts            # Capacitor 配置（移动端）
```

### 步骤 3: 配置 Vite 代理

在 `vite.config.ts` 中添加：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/uv/jianguoyun': {
        target: 'https://dav.jianguoyun.com/dav/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/uv\/jianguoyun/, ''),
      }
    },
  },
});
```

### 步骤 4: 集成到 UI

```typescript
import { webdavService } from './services/webdavService';

// 保存配置
webdavService.saveConfig({
    url: 'https://dav.jianguoyun.com/dav/',
    username: 'your-email@example.com',
    password: 'your-password-or-token'
});

// 测试连接
const isConnected = await webdavService.checkConnection();

// 上传数据
await webdavService.uploadData({
    logs: [...],
    todos: [...],
    // ...其他数据
});

// 下载数据
const data = await webdavService.downloadData();
```

### 步骤 5: 配置 Electron

在 `electron/main.ts` 中：

```typescript
win = new BrowserWindow({
    webPreferences: {
        webSecurity: false,  // 禁用 CORS 检查
    },
});
```

### 步骤 6: 配置 Capacitor (移动端)

在 `capacitor.config.ts` 中：

```typescript
export default {
  plugins: {
    CapacitorHttp: {
      enabled: false,  // 使用 Cordova HTTP 插件
    },
  },
};
```

然后安装插件：

```bash
npx cap sync android
npx cap sync ios
```

---

## 📖 使用指南

### 配置 WebDAV 服务器

#### 坚果云

1. 登录坚果云网页版
2. 进入「账户信息」→「安全选项」→「第三方应用管理」
3. 创建应用密码
4. 使用配置：
   - URL: `https://dav.jianguoyun.com/dav/`
   - 用户名: 坚果云账号（邮箱）
   - 密码: 应用密码（非登录密码）

#### NextCloud

1. 登录 NextCloud
2. 进入「设置」→「安全」→「设备和会话」
3. 创建应用专用密码
4. 使用配置：
   - URL: `https://your-nextcloud.com/remote.php/dav/files/username/`
   - 用户名: NextCloud 用户名
   - 密码: 应用专用密码

### 智能同步逻辑（进阶）

可以基于文件修改时间实现智能同步：

```typescript
async function smartSync() {
    try {
        // 1. 获取云端文件的修改时间
        const cloudLastModified = await webdavService.statFile('lumostime_backup.json');
        
        // 2. 获取本地数据的修改时间
        const localLastModified = localStorage.getItem('dataLastModified');
        const localTimestamp = localLastModified ? parseInt(localLastModified) : 0;
        
        // 3. 比较时间戳
        if (cloudLastModified && cloudLastModified.getTime() > localTimestamp) {
            // 云端更新，下载
            const data = await webdavService.downloadData();
            // 更新本地数据和时间戳
            updateLocalData(data);
            localStorage.setItem('dataLastModified', cloudLastModified.getTime().toString());
            console.log('Downloaded from cloud');
        } else {
            // 本地更新或相同，上传
            await webdavService.uploadData({
                ...appData,
                timestamp: Date.now()
            });
            localStorage.setItem('dataLastModified', Date.now().toString());
            console.log('Uploaded to cloud');
        }
    } catch (error) {
        console.error('Smart sync failed:', error);
    }
}
```

---

## ❓ 常见问题

### Q1: 401 Unauthorized 错误

**原因**: 
- 密码错误（特别是使用了登录密码而非应用密码）
- Authorization 头未正确传递

**解决方案**:
1. 确认使用应用专用密码而非登录密码
2. 检查开发环境的 Vite 代理是否正确转发 Authorization 头：

```typescript
// vite.config.ts
proxy: {
  '/uv/jianguoyun': {
    target: 'https://dav.jianguoyun.com/dav/',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/uv\/jianguoyun/, ''),
    // ⚠️ 不要手动添加 Authorization，让 webdav 客户端处理
  }
}
```

### Q2: CORS 错误（Web 开发环境）

**错误信息**: 
```
Access to fetch at 'https://dav.example.com' from origin 'http://localhost:3002' has been blocked by CORS policy
```

**解决方案**:
- 确保 Vite 代理正确配置（参考步骤 3）
- 检查 WebDAV 服务器 URL 是否包含在代理配置中
- 重启开发服务器：`npm run dev`

### Q3: Android 上传失败

**原因**: Cordova HTTP 插件的序列化问题

**解决方案**:
```typescript
// 在 uploadData 方法中
if (Capacitor.isNativePlatform() && this.config) {
    HTTP.setDataSerializer('json');  // 设置为 JSON 序列化
    
    await HTTP.sendRequest(url, {
        method: 'put',
        data: JSON.parse(content),  // 解析后再传递
        // ...
    });
}
```

### Q4: Electron 连接失败

**原因**: 没有禁用 Web Security

**解决方案**:
```typescript
// electron/main.ts
win = new BrowserWindow({
    webPreferences: {
        webSecurity: false,  // 必须禁用
    },
});
```

### Q5: 部署到 Web 后同步失败

**原因**: Web 生产环境的 CORS 问题

**解决方案**:
- 当前版本不支持 Web 生产环境的直接部署
- 建议使用 Electron 桌面版或移动端 App 进行云同步
- 或使用浏览器扩展绕过 CORS（不推荐，安全风险）

### Q6: Buffer 未定义错误

**错误信息**: 
```
ReferenceError: Buffer is not defined
```

**解决方案**:
1. 安装 buffer 包：`npm install buffer`
2. 在服务文件中导入：
```typescript
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    window.Buffer = window.Buffer || Buffer;
}
```

---

## 🎯 最佳实践

### 1. 安全性

- ✅ **不要在代码中硬编码密码**
- ✅ 使用应用专用密码，而非账号登录密码
- ✅ 在生产环境使用 HTTPS
- ⚠️ 仅在 Electron 桌面应用中禁用 `webSecurity`

### 2. 用户体验

- ✅ 提供连接测试功能
- ✅ 显示同步进度和状态
- ✅ 下载前给予覆盖警告
- ✅ 提供错误详情（开发模式）

### 3. 数据管理

- ✅ 添加版本号和时间戳到备份文件
- ✅ 实现智能同步（基于时间戳）
- ✅ 支持自定义文件名
- ✅ 定期自动备份

### 4. 错误处理

```typescript
try {
    await webdavService.uploadData(data);
    showToast('success', '上传成功');
} catch (error: any) {
    console.error('Upload failed:', error);
    
    // 提供用户友好的错误提示
    if (error.status === 401) {
        showToast('error', '认证失败，请检查用户名和密码');
    } else if (error.status === 507) {
        showToast('error', '存储空间不足');
    } else if (error.message?.includes('timeout')) {
        showToast('error', '连接超时，请检查网络');
    } else {
        showToast('error', '上传失败，请稍后重试');
    }
}
```

### 5. 性能优化

- ✅ 使用防抖处理自动同步
- ✅ 压缩 JSON 数据（可选）
- ✅ 仅上传变更的数据（差异同步）
- ✅ 使用 Service Worker 处理后台同步（PWA）

---

## 📝 完整示例代码

### 创建带自动同步的 Hook

```typescript
// hooks/useWebDAVSync.ts
import { useEffect, useCallback, useRef } from 'react';
import { webdavService } from '../services/webdavService';

export function useWebDAVSync(data: any, interval: number = 300000) {
    const syncTimeoutRef = useRef<NodeJS.Timeout>();
    
    const syncToCloud = useCallback(async () => {
        const config = webdavService.getConfig();
        if (!config) return;
        
        try {
            await webdavService.uploadData({
                ...data,
                timestamp: Date.now(),
                version: '1.0.0'
            });
            console.log('Auto synced to cloud');
        } catch (error) {
            console.error('Auto sync failed:', error);
        }
    }, [data]);
    
    // 数据变化时防抖同步
    useEffect(() => {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }
        
        syncTimeoutRef.current = setTimeout(() => {
            syncToCloud();
        }, 5000); // 5 秒防抖
        
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [data, syncToCloud]);
    
    // 定期同步
    useEffect(() => {
        const intervalId = setInterval(syncToCloud, interval);
        return () => clearInterval(intervalId);
    }, [syncToCloud, interval]);
    
    return { syncToCloud };
}
```

使用方式：

```typescript
function App() {
    const [appData, setAppData] = useState({
        logs: [], todos: [], categories: []
    });
    
    // 启用自动同步
    const { syncToCloud } = useWebDAVSync(appData, 300000); // 5 分钟
    
    return <YourApp />;
}
```

---

## 📚 参考资料

- [WebDAV 客户端库文档](https://github.com/perry-mitchell/webdav-client)
- [Cordova Advanced HTTP 插件](https://github.com/silkimen/cordova-plugin-advanced-http)
- [Vercel Serverless 函数](https://vercel.com/docs/functions/serverless-functions)
- [Capacitor 文档](https://capacitorjs.com/docs)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)

---

## 🔄 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.0 | 2025-12-09 | 初始版本，包含跨平台支持和完整文档 |

---

## 📧 技术支持

如需帮助或有建议，请参考：
- 项目 README
- GitHub Issues
- 相关技术社区

---

**文档结束**

> 💡 提示：本文档基于 LumosTime 项目实践编写，适用于任何需要 WebDAV 同步功能的跨平台应用。建议根据实际需求调整和优化。
