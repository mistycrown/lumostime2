# Vercel 部署指南

## 概述

本项目现已配置为可部署到 Vercel,并通过 Serverless 函数解决 WebDAV 跨域请求问题。

## 前提条件

1. 拥有 [Vercel](https://vercel.com) 账号
2. 已安装 [Vercel CLI](https://vercel.com/cli) (可选,用于命令行部署)

## 部署方式

### 方式 1: 通过 Vercel Dashboard (推荐)

1. **连接 Git 仓库**
   - 登录 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 导入你的 Git 仓库 (GitHub/GitLab/Bitbucket)

2. **配置项目**
   - Framework Preset: 选择 "Other" 或 "Vite"
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **部署**
   - 点击 "Deploy"
   - 等待构建完成

### 方式 2: 通过 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   # 在项目根目录执行
   vercel
   
   # 或者直接部署到生产环境
   vercel --prod
   ```

4. **按照提示完成配置**
   - 选择项目设置
   - 确认配置

## 工作原理

### WebDAV 跨域解决方案

由于浏览器的 CORS 限制,直接从前端访问 WebDAV 服务器会遇到跨域问题。我们通过以下方式解决:

1. **开发环境** (`npm run dev`)
   - 使用 Vite 的代理功能 (已在 `vite.config.ts` 中配置)
   - 请求会通过 `/uv/jianguoyun` 代理到实际的 WebDAV 服务器

2. **生产环境** (Vercel)
   - 使用 Vercel Serverless 函数 (`/api/webdav-proxy.ts`)
   - 前端请求发送到 `/api/webdav-proxy?url=<webdav_url>`
   - Serverless 函数作为中间层,转发请求到实际的 WebDAV 服务器
   - 返回响应给前端,绕过 CORS 限制

3. **原生平台** (Android/iOS/Electron)
   - 直接使用原生 HTTP 客户端,无 CORS 限制

### 请求流程

```
前端 → /api/webdav-proxy?url=<target> → Serverless 函数 → WebDAV 服务器
                                                              ↓
前端 ← JSON 响应 ← Serverless 函数 ← WebDAV 响应
```

## 文件说明

- **`/api/webdav-proxy.ts`** - Vercel Serverless 函数,处理 WebDAV 代理请求
- **`vercel.json`** - Vercel 配置文件,定义构建设置和路由规则
- **`services/webdavService.ts`** - WebDAV 服务封装,根据环境自动选择请求方式

## 环境变量

如果你需要在 Vercel 中配置环境变量:

1. 进入 Vercel Dashboard → Project Settings → Environment Variables
2. 添加所需的环境变量 (如 API Keys)
3. 重新部署项目

## 常见问题

### 1. WebDAV 连接失败

**问题**: 部署后 WebDAV 同步不工作

**解决方案**:
- 确保 WebDAV 服务器支持外部访问
- 检查 WebDAV 服务器的 CORS 设置
- 在浏览器开发者工具中查看网络请求,检查是否有错误

### 2. 构建失败

**问题**: Vercel 构建过程中出错

**解决方案**:
- 检查 `package.json` 中的依赖是否完整
- 确保 `npm run build` 在本地可以成功运行
- 查看 Vercel 构建日志,根据错误信息调整

### 3. API 路由 404

**问题**: `/api/webdav-proxy` 返回 404

**解决方案**:
- 确保 `api/webdav-proxy.ts` 文件存在
- 检查 `vercel.json` 配置是否正确
- 重新部署项目

### 4. 函数超时

**问题**: Serverless 函数执行超时

**解决方案**:
- Vercel 免费版函数执行时间限制为 10 秒
- 升级到付费版可获得 60 秒执行时间
- 优化 WebDAV 请求,减少数据传输量

## 监控和日志

### 查看部署日志
- Vercel Dashboard → Deployments → 选择部署 → Build Logs

### 查看函数日志
- Vercel Dashboard → Project → Functions → 选择函数 → Logs

### 实时日志
```bash
vercel logs --follow
```

## 性能优化

1. **启用缓存**
   - Vercel 会自动缓存静态资源
   - API 响应可以通过 `Cache-Control` 头控制

2. **压缩资源**
   - Vite 构建时会自动压缩
   - Vercel 会自动启用 Gzip/Brotli 压缩

3. **CDN 加速**
   - Vercel 使用全球 CDN
   - 静态资源会自动分发到边缘节点

## 自定义域名

1. 进入 Vercel Dashboard → Project Settings → Domains
2. 添加你的自定义域名
3. 按照提示配置 DNS 记录
4. 等待 SSL 证书自动配置

## 回滚部署

如果新版本有问题,可以快速回滚:

1. Vercel Dashboard → Deployments
2. 找到之前的稳定版本
3. 点击右侧菜单 → "Promote to Production"

## 本地测试 Serverless 函数

可以使用 Vercel CLI 在本地测试:

```bash
vercel dev
```

这会启动一个本地开发服务器,模拟 Vercel 的运行环境。

## 相关链接

- [Vercel 文档](https://vercel.com/docs)
- [Vercel Serverless 函数](https://vercel.com/docs/functions/serverless-functions)
- [Vite 文档](https://vitejs.dev/)

## 技术支持

如遇到问题:
1. 查看 Vercel 构建日志
2. 检查浏览器开发者工具的网络和控制台
3. 查看本项目的 GitHub Issues
