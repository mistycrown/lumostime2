# 多事件并行记录与小组件同步设计

## 目标

让 Android 小组件可以同时记录多个事件，并保证主应用、原生小组件、悬浮球、系统通知和应用感知流程对并行会话保持一致。每个会话独立开始、停止、落库和关联待办进度，不因另一个会话启动或结束而被覆盖。

悬浮球采用栈式当前会话语义：新启动的会话成为当前显示对象；点击悬浮球只停止当前显示会话；停止后自动回退到最近仍在运行的旧会话。

## 当前问题

- React `SessionContext` 已使用 `activeSessions[]`，但 Android `WidgetStores` 只保存一个 `WidgetRuntimeState`。
- `WidgetTimerController` 启动新事件前会完成并覆盖已有 runtime，导致第二个事件无法并行。
- `useWidgetBridgeSync` 只读取一个 native runtime，并将它合并成一个 widget 来源会话。
- `WidgetSnapshotBuilder`、Scene 卡片和 Todo Pin 只按单 runtime 判断槽位是否 active。
- `useFloatingWindowSync` 只同步 `activeSessions` 的最后一项；`FloatingWindowService` 只保存一个计时图标、开始时间和 session ID。
- 小组件、悬浮球和系统通知的停止路径存在无 ID 兜底，多个会话时可能停止错误对象。

## 设计

### 1. 统一会话模型

- 将原生持久化 runtime 从单对象升级为带版本的 `runtime_states` 列表。
- 每个 runtime 保留稳定 `sessionId`（现有 `id`）、来源、活动/分类、待办、领域、模板/槽位及 Scene 元数据。
- 应用启动时兼容旧版单对象：读取旧字段后包装为单元素列表，并在下一次写入时迁移到新格式。
- Capacitor bridge 短期兼容旧 `runtimeState` 字段，同时增加 `runtimeStates` 列表字段；新代码只写列表。

### 2. 记录事件链路

- 小组件、主应用、NFC 和应用感知启动都向统一会话列表追加新会话。
- 同一小组件槽位再次点击时，只查找并停止该槽位对应的会话 ID；其它会话保持运行。
- 停止会话生成一条独立的 pending action，action ID 与 session ID 稳定关联。
- React 回放 pending actions 时按 ID 幂等创建/更新日志，成功落库后按已处理 ID 清理，不清空其它运行会话。
- React 与 native 会话列表按 ID 合并：保留双方独有会话，更新同 ID 会话，避免“最新会话写回覆盖其它会话”。

### 3. 小组件状态与刷新

- `WidgetSnapshotBuilder` 接收 runtime 列表，槽位 active 判断改为“列表中存在匹配会话”。
- 同一模板中的多个 timer 槽位、Scene timer 卡片和 Todo Pin timer 可同时显示 active。
- start、stop、外部停止、bridge 同步和 pending action 回放均通过统一刷新协调器刷新相关 Widget 家族。
- 停止一个会话时只移除对应 active 状态；剩余会话的计时和高亮继续保持。
- DAILY_RUNTIME、tracking calendar 等已基于 `activeSessions[]` 的 payload 保持列表语义，并补充并行会话覆盖测试。

### 4. 悬浮球与系统通知

- 原生悬浮球服务维护运行会话摘要列表和 `displayedSessionId`。
- 新会话启动时置顶显示；如果当前显示会话仍存在，则停止其它会话后回退到上一个仍运行的会话。
- 点击停止必须携带 `displayedSessionId`，原生停止路径按该 ID 完成并移除会话；无会话时进入 idle。
- React `useFloatingWindowSync` 同步完整会话列表以及当前显示 ID，不再只取数组最后一项。
- 计时文本、图标、通知内容和点击回调都绑定当前显示会话；系统通知展示并行数量及当前会话摘要。
- app-awareness 的 overtime/extension 流程继续通过 `linkedSessionId` 绑定目标会话，不因其它会话启动而重置。

### 5. 一致性与异常处理

- native 列表更新采用读-改-写的单入口，避免多个 Widget 点击并发时互相覆盖。
- start/stop 操作保持幂等：重复 start 返回已有相同槽位会话，重复 stop 不重复生成日志。
- WebView 重连时先读取 native 列表和 pending actions，再进行 React 写回；初始化期间不清除未回放的 widget 会话。
- 原生进程重启、应用退出、悬浮球停止、Widget 停止和主应用停止都使用同一会话 ID 语义。

## 验证范围

### Web/TypeScript

- runtime 列表 bridge 解析、旧单对象迁移和双向合并。
- 两个以上 widget 会话 hydration、停止其中一个、pending action 批量幂等回放。
- `useFloatingWindowSync` 的栈式显示/回退签名。
- app-awareness 目标会话不被其它会话影响。

### Android

- 两个槽位同时启动且均显示 active。
- 停止新会话后悬浮球回退旧会话，旧会话继续计时。
- 停止旧会话不影响新会话或当前显示会话。
- 旧单 runtime 数据迁移、原生进程重启恢复、重复点击和快速连续点击。
- Timer、Scene、Todo Pin、DAILY_RUNTIME 各 Widget 家族刷新覆盖。

按仓库约定执行 `npm run build` 与相关 Vitest；Android APK 编译由用户手工执行，不在本工作区编译 Android 工程。

## 非目标

- 不改变日志拆分、跨午夜规则、活动去重规则之外的历史数据模型。
- 不新增悬浮球多气泡 UI；并行会话通过当前会话回退语义处理。
- 不改变桌面 Electron 小组件的独立窗口模型，除非后续验证发现其复用同一运行态协议。
