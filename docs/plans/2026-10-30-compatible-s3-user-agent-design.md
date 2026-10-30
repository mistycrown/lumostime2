<!--
@file 2026-10-30-compatible-s3-user-agent-design.md
@input Compatible S3 configuration and Electron/Capacitor transport constraints
@output Approved design for configurable User-Agent support
@updated 2026-10-30: Initial design for desktop object-storage client identification.
-->

# 兼容 S3 的可配置 User-Agent

## 背景

中国科技云数据胶囊会根据 `User-Agent` 校验 AccessKey 绑定的客户端类型。当前 Android 使用原生 HTTP 传输，桌面端使用 AWS SDK 默认请求，桌面请求因此收到 HTTP 401 并显示为 `UnknownError`。其他 S3 服务不应被强制改成数据胶囊专用的标识。

## 方案

在 `CompatibleS3Config` 中增加可选的 `userAgent` 字段。设置页增加普通文本输入框，默认空值；Endpoint 指向数据胶囊时提示用户填写 `S3Drive`，但不自动覆盖用户输入。保存配置时清理前后空白、限制为单行短文本，并兼容旧配置缺失字段。

桌面端在用户填写 `userAgent` 时通过 Electron 主进程的受限 IPC 请求发送 S3 HTTP 请求，由主进程设置标准 `User-Agent`。未填写时继续使用 AWS SDK 默认请求。Android 继续使用现有原生 Request Handler，并将该字段加入请求头；Web 端不承诺修改浏览器保留的标准 `User-Agent`，仍保留默认行为。

IPC 只接受 S3 SDK 已生成的 URL、方法、请求头和二进制请求体，返回状态、响应头和二进制响应体；不暴露任意主进程执行能力。请求头会过滤连接、代理和 Cookie 等不应由渲染进程控制的字段，`userAgent` 只允许作为一个显式字段传入。

## 数据流

1. 设置页读取并保存兼容 S3 配置，旧用户的 `userAgent` 默认为空。
2. `CompatibleS3Service` 初始化客户端时根据运行平台选择默认浏览器、Electron 主进程或 Android 原生 Handler。
3. Electron Handler 使用 SDK 的签名结果构建 HTTP 请求；若配置存在 `userAgent`，主进程写入标准 `User-Agent`。
4. 主进程把响应还原为 Smithy `HttpResponse`，现有 S3 服务继续负责错误解析、JSON 缓存和同步验证。

## 错误处理

保留现有状态码和响应体，让 401 能被 S3 服务识别。错误消息补充“请求被对象存储拒绝”以及配置 User-Agent 的提示，避免继续只显示 `UnknownError`。空 User-Agent 不触发额外 Header，也不影响其他服务。

## 验证

- 配置测试：旧配置、空值、保存/重新加载和单行校验。
- 请求测试：Electron Handler 在有值时发送标准 `User-Agent`，无值时不添加；Android Handler 保持现有行为。
- 服务测试：S3 命令仍使用相同签名输入，响应解析和条件读取不回归。
- 运行 `npm run build` 及相关 Vitest 测试。
