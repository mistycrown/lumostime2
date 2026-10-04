# 飞书日历授权与手动导入

入口：**设置 → 数据与同步 → 飞书日历**。

2026-10-03 起采用**用户专属应用**。点击“连接飞书”，在飞书网页中登录并确认创建自己的应用；返回 LumosTime，点击“授权飞书日历”，在飞书同意日历授权后返回。看到“已连接”后先测试，再输入开始/结束日期并点击“导入到飞书日历”。日期填写八位数字，如 `20261003`，支持“本周、本月、上周、上月”。无需复制 App ID、App Secret、令牌或填写回调地址，飞书密码只在飞书网页中输入。

### 桌面版：本机直接连接

Electron 主进程直接执行官方应用注册和设备授权，不需要维护者创建公共应用、部署服务或配置 `VITE_FEISHU_SERVICE_URL`。应用密钥、用户令牌和查重账本保存在 `userData/feishu/personal.sqlite` 的 AES-GCM 加密字段中；数据库密钥由 Electron `safeStorage` 使用操作系统安全存储加密，保存在 `key.enc`。安全存储不可用时拒绝保存，不退回明文。此目录不加入普通同步或备份，开发版沿用独立的 Dev userData。

应用注册和用户授权分别由用户在飞书网页中确认。界面显示“等待创建专属应用”或“等待日历授权”，提供重新打开确认页的按钮；轮询按照飞书返回的间隔，取消后晚到的响应不能恢复连接。完成授权前不创建日历或日程。重新连接已有会话时复用自己的应用；主动断开删除本机连接凭证，但不自动删除飞书侧应用或已导入日程。

采用[官方应用注册流程](https://github.com/larksuite/cli/blob/main/internal/auth/app_registration.go)和[设备授权流程](https://github.com/larksuite/cli/blob/main/internal/auth/device_flow.go)，请求 `calendar:calendar calendar:calendar:readonly offline_access`。查询主日历需要独立的读取权限，只有更新权限时即使用户已授权也会失败；已有连接点击“重新连接飞书”补充授权，复用自己的应用，无需手动配置权限。企业管理员的应用政策仍可能要求审批；应用名称与创建步骤由飞书官方确认页面提供，不伪造后台自动完成。

### Web / Android：专属应用连接服务

这两个平台当前仍通过连接执行服务运行同一专属应用流程。维护者只部署服务，不注册公共飞书应用。普通用户不填写服务地址。开发运行 `npm run dev` 会自动启动本地服务并在忽略目录生成固定开发加密密钥，无需飞书凭证。

正式服务设置下列环境变量，使用下方容器部署文件：

```dotenv
FEISHU_CONNECTION_MODE=personal
FEISHU_TOKEN_ENCRYPTION_KEY=固定的32字节随机密钥Base64
FEISHU_DATABASE_PATH=/persistent/feishu/oauth.sqlite
FEISHU_PUBLIC_ORIGIN=https://真实连接域名
FEISHU_ALLOWED_ORIGINS=https://真实网页应用域名
```

Compose 部署还设置 `FEISHU_SERVICE_DOMAIN=真实连接域名`。客户端构建统一填写 `VITE_FEISHU_SERVICE_URL=https://真实连接域名`。不需要 `FEISHU_APP_ID`、`FEISHU_APP_SECRET` 或 `FEISHU_REDIRECT_URI`。每个会话的专属应用凭证独立加密保存，不向前端返回。Web 最好同源代理，Android 沿用原生 HTTP Cookie 会话。手机不能访问电脑的 localhost；没有正式服务地址的 Android 版本仍不能完成连接，不能把桌面本机直连当作手机也已免服务器。

下面“维护者一次性配置”是**历史公共应用模式的兼容说明**，专属应用模式不执行其中的应用注册、商店发布或回调登记步骤。专属应用以用户拥有的主日历 ID 识别账号，避免不同应用得到不同 `open_id` 而重复创建分类日历。跨设备仍先读取飞书侧分类标记和日程来源标记；不会把不同应用的 `open_id` 直接当作不同用户。

每个活动分类自动对应一个 `LumosTime · 分类名` 日历，按稳定分类 ID 复用；仅为测试或本次导入实际需要的分类创建日历，不按标签创建。首次创建使用分类颜色，飞书会映射到最接近的支持色；后续分类改名或用户修改飞书日历时复用原日历，不覆盖名称/颜色。导入的日程设置 `color: -1` 跟随日历颜色。字段规则见[飞书官方 SDK](https://pkg.go.dev/github.com/larksuite/oapi-sdk-go/v3@v3.12.0/service/calendar/v4)。

授权后可选择“测试分类”，点击“测试导入一个日程”，在对应分类日历创建“LumosTime 连通性测试”：约 5 分钟后开始，持续 15 分钟，私密、空闲、无提醒，不发送通知。无活动分类时测试使用主日历。成功显示目标日历、时间和日程编号；可以在飞书中手动删除。授权回调、读取状态和更改日期范围本身不创建日程。

## 维护者一次性配置（历史公共应用模式）

### 尚无应用和服务器时，从这里开始

这些操作由 LumosTime 维护者完成一次，普通用户不执行。当前仅有接入代码，不代表飞书应用已经注册或线上服务已经可用。

1. 打开[飞书开发者后台](https://open.feishu.cn/app)，使用维护者账号登录。先为你自己的账号联调：创建企业自建应用，名称填写 `LumosTime 日历（测试）`；该账号需具备所在企业创建应用的权限。
2. 在应用的权限管理中申请用户身份的 `calendar:calendar`、`offline_access`。在安全设置中登记 `http://localhost:3002/api/feishu/callback`；如后台要求 HTTPS，则改用已登记的 HTTPS 开发域名和代理。
3. 创建版本并发布到测试范围，让你自己的账号拥有应用使用权限。在“凭证与基础信息”取得 App ID / App Secret，仅保存在本机未提交的 `.env.local`；按下方服务配置填写回调并生成加密密钥。不要把凭证发到聊天或放入客户端。
4. 运行 `npm run dev`，本地 API 现会自动启动。打开设置 → 数据与同步 → 飞书日历，点击连接，在真实飞书授权页同意后返回应用，先测试一个日程，再导入少量记录并重复导入确认新增为零。
5. 正式对外提供服务时，部署下方的 Node 服务到具有持久化磁盘的单实例 HTTPS 环境，运行 `npm run feishu:start`，在飞书后台登记真实回调地址，并将公开服务地址统一写入客户端构建配置。

**面向不同企业的发布前提：** 企业自建应用只供同一企业内使用。商店应用需要 ISV 认证与上架审核；企业租户需由管理员审核/开通，成员还需具备应用使用权限。个人版用户是否可用也以应用发布范围为准，不能承诺任意飞书账号只点同意就能绑定。详见[应用类型](https://open.feishu.cn/document/home/app-types-introduction/overview)、[商店应用上架流程](https://open.feishu.cn/document/uMzNwEjLzcDMx4yM3ATM/ugzNwEjL4cDMx4CO3ATM)及[ISV 入驻标准](https://open.feishu.cn/document/uMzNwEjLzcDMx4yM3ATM/uUzNwEjL1cDMx4SN3ATM)。先完成个人测试，再评估对外发布资格；不让每位用户自行创建应用。

### 飞书应用

1. 在[飞书开发者后台](https://open.feishu.cn/app)配置 LumosTime 应用，启用网页应用/用户授权能力。企业自建应用用于所属企业内联调；对外统一服务需要使用覆盖目标用户的应用类型及发布范围，并完成相应审核或企业开通流程。不能默认一个企业内的自建应用允许所有外部账号授权。
2. 申请并发布用户身份权限：`calendar:calendar`、`calendar:calendar:readonly` 和 `offline_access`，与代码默认请求一致。需要覆盖日历创建、订阅、读取以及日程读取/创建，不能只开通日程创建权限。接口权限清单见[飞书官方 CLI 日历目录](https://raw.githubusercontent.com/larksuite/cli/main/internal/registry/catalog/services/calendar.json)及[创建日历](https://open.feishu.cn/document/server-docs/calendar-v4/calendar/create)。如维护者通过 `FEISHU_OAUTH_SCOPES` 改用细分权限，应验证全部上述操作；新增权限后重新授权。`offline_access` 用于获取和刷新用户授权。
3. 将固定回调 **`https://connect.your-domain.example/api/feishu/callback`** 加到应用的 OAuth 重定向 URL 白名单。示例域名必须替换为真实服务域名，回调需与服务端配置完全一致。
4. 获取 App ID / App Secret，只放在服务端。OAuth 发起时显式请求授权确认，使用当前 v3 [授权码换令牌](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/authentication-management/access-token/get-user-access-token-v3)和[刷新用户令牌](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/authentication-management/access-token/refresh-user-access-token-v3)；账号显示通过用户信息接口取得。

### 统一服务

使用 Node.js **22.12 或更高版本**，安装本仓库依赖，运行独立 Node 服务。当前实现使用原生 SQLite，启动命令已包含 Node 22.12 所需的实验开关。

在未提交的 `.env.local` 或服务管理器的环境变量中设置：

```dotenv
FEISHU_APP_ID=真实AppID
FEISHU_APP_SECRET=真实AppSecret
FEISHU_REDIRECT_URI=https://connect.your-domain.example/api/feishu/callback
FEISHU_TOKEN_ENCRYPTION_KEY=32字节随机密钥的Base64值
FEISHU_DATABASE_PATH=/persistent/lumostime/feishu/oauth.sqlite
FEISHU_ALLOWED_ORIGINS=https://app.your-domain.example
FEISHU_HOST=127.0.0.1
FEISHU_PORT=3003
```

Windows 本地数据库路径可用 `D:/lumostime-data/feishu/oauth.sqlite`；不配置时默认为仓库内 `.feishu-data/oauth.sqlite`，已加入 Git 忽略。加密密钥可在维护者终端生成，然后保存到服务的私密配置：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

这个密钥必须跨重启保留，不能每次启动重新生成。已有数据库应连同密钥独立备份；更换密钥需要迁移数据或清空连接并让用户重新授权。不要提交 `.env.local`、数据库、备份或密钥，也不要加 `VITE_` 前缀。

启动服务：

```powershell
npm run feishu:dev
```

生产环境运行 `npm run feishu:start`（强制 `NODE_ENV=production`），缺少必要配置会拒绝启动。服务使用 Node 原生模块，生产运行无需安装前端依赖；可直接执行 `node --experimental-sqlite --experimental-strip-types scripts/run-feishu-server.mjs --production`。配置文件按 `.env.production.local`、`.env.production`、`.env.local`、`.env` 的优先级读取，仅加载 `FEISHU_` 变量；进程环境优先。填写完整字面值，不使用 `${其他变量}` 插值。启动命令支持平台 `PORT`，默认监听 `0.0.0.0`。自行反向代理的部署可明确设置 `FEISHU_HOST=127.0.0.1`。将真实域名的 `/api/feishu/` 全部通过 HTTPS 反向代理到服务；代理需要保留 Cookie 和 Set-Cookie，允许授权回调完成所需的响应时间。配置标准入口限流，避免公开授权发起接口被滥用。当前应用层对来源 IP 的授权发起上限是每分钟 100 次；经过同一个代理时这是该代理下的总上限。

### 已有服务器时的容器部署

仓库提供 `deploy/feishu/Dockerfile`、`compose.yaml` 和 `Caddyfile`。镜像只包含服务源码，不包含前端、凭证、数据库或测试文件，也不安装 npm 依赖。Compose 只运行一个 API 实例，并使用命名卷保存 SQLite 和 HTTPS 证书。

1. 将真实域名解析到服务器，开放 80/443 端口，安装 Docker Compose。自动 HTTPS 的要求见 [Caddy 官方文档](https://caddyserver.com/docs/automatic-https)。
2. 在服务器的 `deploy/feishu/.env.local` 保存前述服务配置，并增加 `FEISHU_SERVICE_DOMAIN=你的真实服务域名`（仅域名，不带 `https://`）。回调应为 `https://该域名/api/feishu/callback`；不要配置文件中的占位文字。
3. 在仓库根目录执行 `docker compose --env-file deploy/feishu/.env.local -f deploy/feishu/compose.yaml up -d --build`。Compose 固定容器内端口为 3003，API 不向宿主机公开端口，HTTPS 代理等待 API 健康检查通过后启动。飞书凭证只提供给 API，HTTPS 代理只接收域名。
4. 访问 `https://该域名/api/feishu/status`，应返回 `configured: true`、`status: disconnected`。这只证明服务配置已加载；仍须实际连接、授权和写入测试日程，才能验收飞书接入。
5. 为客户端统一配置 `VITE_FEISHU_SERVICE_URL`，构建并完成真实导入及重复导入验收。保留服务加密密钥和 `feishu-data` 卷；不要使用 `docker compose down -v` 删除用户连接与导入账本。

本任务没有购买域名、服务器或创建飞书应用。容器文件不会自动取得应用资格；普通用户仍只走授权流程。

上方示例中的 `FEISHU_HOST=127.0.0.1` 用于自行反向代理；部署到托管平台时移除此项或改为 `0.0.0.0`。例如使用 Render 时可用平台提供的 HTTPS 服务域名，但当前 SQLite 方案需付费服务的持久化磁盘，不能使用临时磁盘冒充正式部署；详见 [Render 持久化磁盘说明](https://render.com/docs/disks)。部署平台和费用需由维护者选择，本任务没有创建付费资源。

**部署为单实例、有持久化磁盘的服务**。SQLite 与单进程刷新锁不能直接部署为临时磁盘的 Serverless 函数，也不能由多个实例同时刷新同一用户令牌。扩容时先换共享数据库并实现跨进程刷新锁。不要沿用先前固定测试令牌的 Vercel 函数配置。

### 客户端发布

维护者配置唯一的公开变量，再构建客户端：

```dotenv
VITE_FEISHU_SERVICE_URL=https://connect.your-domain.example
```

该变量仅包含服务根地址，不包含任何凭证。Web 最好将 `/api/feishu` 代理到同源服务：同源时可不配置这个变量，避免第三方 Cookie 限制。独立 Web 域名必须加入 `FEISHU_ALLOWED_ORIGINS`，允许 Cookie 的跨域请求；禁止 `*`、`null` 和任意来源。

Electron 构建会将公开服务地址同时写入主进程配置，通过受限 IPC 和主进程 Cookie 会话调用，系统浏览器用于完成授权。Android 使用 Capacitor 原生 HTTP 的 Cookie 会话，点击连接后打开外部浏览器。回调通过服务端更新原应用的会话，用户返回应用即可读取结果，不需要自定义 URL Scheme。手机的 `localhost` 不能访问电脑服务，应使用实际 HTTPS 服务。

没有正式服务域名时不应把示例地址打包发布。未配置的本地服务会返回“尚未开通”；未配置服务地址的桌面和 Android 也会明确显示服务未开通，不要求普通用户配置。

## 本地联调

在飞书控制台登记本地回调 `http://localhost:3002/api/feishu/callback`（如当前应用类型不允许本地 HTTP，则使用已登记的 HTTPS 开发域名和反向代理）。服务端 `FEISHU_REDIRECT_URI` 使用同一个回调，`FEISHU_ALLOWED_ORIGINS` 包含 `http://localhost:3002`。本地 Web 的 `VITE_FEISHU_SERVICE_URL` 留空，由 Vite 代理到 3003。

本地开发只需运行（会自动准备飞书 API；已单独启动的 API 会被复用）：

```powershell
npm run dev
```

用应用可用范围内的测试账号点击连接并授权；回调页面提示返回 LumosTime。连接成功后点击测试导入，到对应分类日历确认测试日程。再填写八位数字日期、导入少量真实记录，重复导入确认新增为零。开发环境不再使用 `FEISHU_USER_ACCESS_TOKEN`、`FEISHU_TEST_KEY` 或固定测试账号。

## 状态与问题处理

| 状态/现象 | 处理 |
| --- | --- |
| 服务尚未开通 | 维护者配置并部署统一服务，客户端包含真实服务地址 |
| 空白/HTML/代理错误响应 | 显示服务暂不可用，不再归为用户网络问题；维护者检查 API 服务与代理 |
| 飞书拒绝授权或应用不可用 | 检查应用发布范围、账号所属企业和权限审批，用户重新连接 |
| 当前账号尚未开通 LumosTime | 企业管理员审核开通商店应用并赋予成员使用范围，用户再授权；无需用户填写凭证 |
| 无法保存 Cookie 会话 | Web 使用同源代理，或允许应用站点所需 Cookie；不要继续无法绑定的授权 |
| 等待授权 | 在飞书确认后返回应用；可取消或等待 10 分钟超时再重连 |
| 没有可写日历 | 检查用户日历权限和已发布的用户身份权限 |
| 授权失效 | 用户重新连接；令牌临近过期时，手动操作会先在服务端刷新 |
| 测试导入结果未知 | 先查看所选飞书日历，再用原请求重试；不会自动重新创建 |

断开连接删除本服务保存的授权令牌和会话，不删除已导入的日历/日程。为重连和跨设备查重，保留加密的分类日历映射及导入账本，账本包含原始提交的标题、备注、时间和结果；不进入普通云同步或客户端备份。需要撤销飞书侧应用授权时，在飞书授权管理中操作。本服务不会把本地断开描述为飞书侧撤销。

Cookie 为 HttpOnly；飞书访问/刷新令牌加密存在服务端，不进入前端、普通云同步、导出备份或日志。不同设备各自授权连接，目前不会共享设备连接状态。

## 范围与验证

已实现 OAuth、单个测试导入和正式 Log 批量导入。按设备本地时间筛选范围内开始的实际记录，结束日期包含全天，跨午夜记录保留完整起止时间；排除计划记录、无效时间、重复本地 ID、缺失分类和演示/回退数据。标题截取到 200 字符；日程描述按“备注、属性、状态、关联、记录来源”分段，包含原始备注、属性名称/值/单位、专注度与情绪度（五分制）、关联待办/领域名称及 ID、本次进度、分类/标签名称和 Log ID。未填写的段落省略，已归档选项仍解析其名称，已删除的关联/定义保留 ID 作为线索。描述超过应用的 12000 字符上限时明确报错，不静默截断；图片和评论不上传。测试日程不使用历史日期范围。

点击“同步到飞书日历”后，先读取当前账号所选范围内的已同步记录，再与完整且已加载的本地 Log 列表核对，每批处理 5 条。新增创建；标题、备注、属性、专注度、情绪度、关联和时间变化更新原日程；本地已删除的 Log 删除对应日程；分类变化先删除旧分类日程，再在新分类日历创建。显示新增、更新、迁移、删除、跳过、失败数。日期范围按记录的开始时间判断；原已同步开始时间在范围内时，时间移出范围的修改仍会处理。范围内本地记录为零时也可以同步删除。

修改和删除前核对 `[LumosTime:log:记录ID]` 来源标记，来源不符时停止该条记录。迁移每一步落盘；旧日程已删除而新建失败时，再次同步从未完成步骤继续。普通重复同步跳过未变内容；飞书侧单独改动不回写 LumosTime，也不主动扫描修复。测试日程不参与正式 Log 同步。

分类日历按账号和分类 ID 绑定，不会把 `life` 翻译成“生活”。下次手动同步涉及该分类时，名称对齐为 `LumosTime · 当前分类名称`；分类改名更新同一日历，已有备注名也同步，编辑者权限只更新本人备注名。本地分类颜色变化时更新日历颜色，否则保留飞书中自行选定的颜色。分类映射由同步自动维护，名称在 LumosTime 分类设置中修改。

飞书分类日历确认已删除或不存在后，清理旧远端日程引用，自动重新创建和订阅，再恢复本次同步范围内的本地记录。范围外记录和本地数据保留；不会一次重建全部历史记录。仅处理本地删除时不创建空日历。权限不足和网络失败保留原映射，不尝试新建；新建结果未知仍核查来源标记，避免重复创建。

开始/结束日期下方可多选“忽略分类”，选择保存在本机，下次进入页面仍保留；预览数量仅统计未忽略的分类。忽略的分类本次不新增、更新、删除或迁移，已有飞书日程保留；分类改入或改出被忽略分类时也先跳过，取消勾选后按正常规则同步。归档分类和已登记但本地已移除的分类仍可选择。普通测试日程使用独立的“测试分类”，不受正式导入过滤影响。

删除/迁移依赖当前连接执行端保留的账号同步账本，旧版账本会自动升级。断开重连保留账本；换到独立设备或清空执行端数据库后，不会自动推断其他设备导入后已删除的 Log，也不会全量扫描历史分类日历。迁移服务器时保留数据库及加密密钥。

无成功账本记录时先按原始时间范围读取飞书日程，核查 `[LumosTime:log:记录ID]` 来源标记；读取失败时不创建。网络超时/进程中断后的未知写入先核查远端，仍未确认时停止该记录，避免盲目重建；未知日历创建同样处理，可能需要维护者排查。明确被飞书拒绝的请求可在问题解决后重试。HTTP 429 停止当前批次，稍后再次导入将核查并继续。

测试失败的请求编号、时间、时区和账号/分类目标保存在当前应用会话中，不保存凭证；重试使用同一个 Feishu `idempotency_key`。成功后再次点击会创建新的测试日程。超过一天的未知请求应先检查飞书后再发起新测试；测试与正式 Log 的持久化账本独立。

```powershell
npm run feishu:test
npm run build
```

自动化验证使用模拟飞书响应，涵盖 OAuth 状态校验、拒绝/取消/回放、账号隔离、Cookie/CORS、加密持久化、令牌轮换、失效授权、分类日历颜色/订阅/复用、正式导入查重、未知写入恢复及八位数字日期。2026-10-03 用户已确认真实授权和导入成功；新增描述排版仍需在飞书中检查显示。完整验收还需拒绝授权、正式/重复/跨设备导入、网络失败后重试、断开重连，以及 Web、Electron、Android 的页面和 Cookie 持久化检查。

2026-10-03 分类名称与日历恢复验证：173 项相关测试、局部 TypeScript 和最终 Web/Electron 构建通过，已同步 Android 资源，未编译 Android。新增 30 项双核心回归覆盖旧名称与备注名对齐、同 ID 改名、编辑者备注名、本地/飞书颜色保留策略、更新失败后重试、跨设备来源标记复用、日历不存在或已删除后重建、账号与范围隔离、未知旧日程清理、删除请求不创建空日历、新建超时后复用、旧日历重新出现与中断标记恢复；另有原生执行回归验证 HTTP 403 日历删除码、重建前持久化清理及重启查重。模拟执行通过不等同于真实飞书验收；当前控制工具清单为 `apps: []`、`browsers: []`，页面/实机冒烟未完成，按仓库要求暂缓剩余修复提交。

2026-10-03 手动同步验证：121 项相关测试、局部 TypeScript 和 Web/Electron 构建通过，已同步 Android 资源，未编译 Android。新增回归覆盖旧账本升级、内容/时间修改、明确删除、账号/日期范围隔离、来源不符停止、迁移先删后建、删除超时、创建失败及恢复同一 Log ID。当前无可用应用/浏览器窗口，页面手动冒烟和真实飞书删除/迁移尚未验收，因此按仓库要求暂缓当前同步代码提交。

2026-10-03 分类过滤验证：127 项相关测试通过，局部 TypeScript 与 Web/Electron 构建通过。新增回归覆盖多选偏好与预览、忽略分类删除保护、迁移双方与未完成迁移保护、取消忽略恢复、缺失分类清单拒绝及执行端二次校验。已同步 Android 资源，未编译 Android；页面控制环境仍无可用窗口，实际多选交互验收未完成，按仓库要求继续暂缓提交。

2026-10-03：专属应用注册 begin 已在无公共凭证条件下实际返回飞书官方确认 URL；这只验证入口可用，没有替用户确认创建或授权。新增测试覆盖专属应用阶段、凭证隔离、个人应用刷新、复用、限流轮询、取消后的晚到响应，以及授权码已交换后网络失败的恢复。Electron 内置 Node 已确认支持 `node:sqlite`。仍需实际用户在飞书确认创建、授权，再验收分类测试及正式重复导入；未将模拟响应视作真实日历写入成功。

最新本地验证：103 项相关自动化测试通过，新增回归覆盖主日历权限拒绝后复用已有应用补充读取授权。专属应用执行端/桌面桥接/客户端局部 TypeScript 检查及 Web/Electron 生产构建已通过；已完成 Android 资源同步，未编译 Android。真实飞书接口的 HTTP 连通检查返回创建阶段、官方确认页地址和 HttpOnly 会话，响应不包含凭证。桌面持久化回归使用安全存储 API 夹具验证加密落盘、重启恢复和不安全存储拒绝，不等同于真实系统/页面验收。实际浏览器清单仍为空，故真实确认、日历写入和页面冒烟尚未完成，暂缓 Git 提交。

2026-10-02：87 项相关自动化测试、服务端/桥接/客户端/纯工具/连接面板的局部 TypeScript 检查及 Web/Electron 生产构建通过。完整设置页类型检查会引入仓库现有其他模块错误，不以本次局部检查代替全仓库检查。页面静态渲染回归确认连接入口可见、两个日期框均为八位数字文本输入。真实本地启动检查确认开发帮助器能启动 API，未配置时状态返回 `configured: false`，连接返回 503；生产命令缺少配置时拒绝启动。新增独立运行检查只复制服务文件到无 `node_modules` 的临时目录，以测试凭证启动生产 API，确认真实 HTTP 状态和待授权 Cookie 会话；未调用飞书 API。Docker 引擎未运行，容器构建及 HTTPS 部署尚未实测。最新构建已执行 `npx cap sync android`，未编译 Android。维护者已确认没有注册飞书应用、没有部署服务，当前不能真实绑定；没有把模拟测试成功作为上线验收。
