# AI 统一记忆改造执行计划

> **执行方式：** 按仓库 AGENTS.md 使用 native 方式，由当前 agent 按任务顺序执行，不创建 subagent。本次只编写计划，所有实现步骤保持未完成。

**Goal:** 合并长期记忆与 Dream 为一个文件夹式记忆库，拆开提醒，完成分层读取、对话增删改和自动整理。

**Architecture:** 一份正式记忆库负责文件夹、条目、删除记录和变更版本；短期状态与提醒分别独立保存。聊天、后台助理、来信、手动编辑和 Dream 共用记忆操作入口，请求端只接收按预算挑选的记忆。Dream 是后台整理流程，其运行记录、向量索引和调度状态不冒充用户事实。

**Tech Stack:** React 19、TypeScript、现有 Tailwind/theme、Capacitor、localStorage（正式记录）、IndexedDB（可重建向量缓存）、Vitest、现有 Electron renderer smoke harness。优先复用当前请求/备份/调度设施，不引入外部记忆平台或图数据库。

**Spec:** [本轮确认的需求](../specs/2026-10-29-unified-ai-memory-design.md)。[研究背景](../../research/2026-10-29-ai-memory-dream-research.md)仅作参考；范围与冲突处理以 Spec 和本计划为准。

## 📋 范围与固定规则

- 全部文件 UTF-8；源码沿用两空格、单引号、分号，更新文件头和对应目录 README。
- 不在此工作区编译 Android，也不运行会触发 Android 编译的 Gradle 命令。改动共享 Web 资产后执行 `npx cap sync android`，由用户手动编译及真机验收。
- 实现前先完成本计划任务 1 的 UI 布局设计；以设计为依据实施，不新增冗长解释文案。
- 页面位置为 AI 聊天内的“AI 设置”，不是应用总设置页。
- 内置 folder ID 固定为 `about-me`、`ongoing`、`past`、`patterns`；名称分别为“关于我”“正在做的事”“过往经历”“发现的规律”。内置 ID 不因重命名变化。
- 文件夹可新增、重命名；删除文件夹必须先选择迁入其他文件夹，不连带清空条目。内置文件夹保留，不提供删除。
- 保存数量不设 24 条或其他静默截断。单条初始校验上限 8,000 字符，超过时阻止保存并显示错误，不裁剪原文；迁移的超长旧文本原样保留，编辑时允许无损保存原文。
- 正式存储仍用可版本化 JSON；容量不足或写入失败时保持原数据，显示失败，不假报成功。向量缓存不写进正式记录。
- 记忆开关迁移原 `longTermMemoryEnabled`；关闭时不召回、不自动提取、不运行 Dream，不删除已有内容，提醒正常。
- 自动整理为设备本地配置；已有记忆开启时初始启用每日检查，首次安排在迁移完成 24 小时后，不在迁移时立即发起模型调用。可选频率为每天、每三天、每周，对应 24/72/168 小时。
- 向量模型为可选能力：先支持独立配置的 OpenAI-compatible embedding 接口；不默认将聊天模型当 embedding 模型。无配置或失败降级本地搜索。
- 本轮不实现应用被系统终止后的独立 Android Dream 模型执行器，不承诺手机被杀进程后仍准点运行。已有原生后台聊天/提醒的兼容性必须覆盖。
- 执行前检查 Git 状态，保留用户改动；每个可验证代码批次完成后只提交本任务文件。仅文档阶段不提交。

## 🔍 容易漏掉的五类情况

1. 恢复旧备份、切换会话、旧聊天重试不能让已删除记忆复活：任务 3、5、11。
2. 关闭记忆、关闭后台助理、关闭 AI 面板彼此独立：提醒继续工作，记忆自动整理仅由自己的开关和应用生命周期控制：任务 4、7、10。
3. 自动整理等待模型返回时，用户编辑、删除或导入了数据：旧结果必须被版本校验拦住：任务 2、9、11。
4. 没配向量、模型切换/维度变化、离线或 embedding 服务异常：聊天可以继续，旧向量不误用：任务 6。
5. 数据量超过一批、旧日期与新日期混合、同一来源在多个摘要出现：不漏掉后续材料，不虚增证据，不把旧情况当现状：任务 3、8、9。

## 📚 文件职责

| 文件 | 职责 |
| --- | --- |
| `src/types/assistantMemory.ts`（新） | v2 文件夹、条目、来源、操作、检索和整理契约 |
| `src/constants/assistantMemoryDefaults.ts`（新） | 默认文件夹及可调读取、调度默认值 |
| `src/services/assistantMemoryService.ts`（改） | 唯一正式记忆仓储及受版本保护的增删改 |
| `src/utils/assistantMemoryMigration.ts`（新） | 纯函数旧数据转换、稳定 ID、迁移报告 |
| `src/services/assistantMemoryMigrationService.ts`（新） | 原始快照、幂等迁移和导入协调 |
| `src/services/assistantRuntimeStateService.ts`（新） | 本机短期状态，默认最长 6 小时且不超过明确失效时间 |
| `src/services/assistantMemoryEmbeddingService.ts`（新） | embedding 配置与请求、IndexedDB 向量缓存 |
| `src/services/assistantMemoryRetrievalService.ts`（新） | 本地/向量组合召回、来源展开和请求投影 |
| `src/services/assistantMemoryEvidenceService.ts`（新） | 跨会话及业务数据的增量证据收集 |
| `src/services/dreamService.ts`（改） | 统一记忆整理函数；不再单独持久化 Dream entries |
| `src/services/assistantMemoryDreamScheduler.ts`（新） | 到期判断、锁、失败重试、恢复补跑 |
| `src/hooks/useAssistantMemoryMaintenance.ts`（新） | 应用级整理生命周期，不依赖面板显示 |
| `src/components/ai-chat/AIBackfillChatMemorySettingsSection.tsx`（新） | 文件夹主页、记忆开关和整理设置 |
| `src/components/ai-chat/AIBackfillChatMemoryFolderView.tsx`（新） | 文件夹内列表、排序和条目入口 |
| `src/components/ai-chat/AIBackfillChatMemoryEntryEditor.tsx`（新） | 新建、编辑、移动、删除条目 |
| `src/components/ai-chat/AIBackfillChatReminderOverlay.tsx`（新） | 从旧记忆页拆出的独立提醒管理 |
| `src/components/ai-chat/AIBackfillChatMemoryDreamHistory.tsx`（新） | 整理记录与安全撤回 |

现有集成文件按下列任务逐项修改；主 modal 只负责传入依赖与导航，不继续堆入检索、迁移和定时器实现。

## ✍️ 任务 1：先定界面与测试入口

**Files:** 新建 `docs/superpowers/designs/2026-10-29-ai-memory-ui.md`、`vitest.assistant.config.ts`；参考 `AIBackfillChatSettingsOverlay.tsx`、`AIBackfillChatTheme.ts`、旧 memory/dream overlays、`scripts/test-ai-chat-viewport-renderer.mjs`。

**Interfaces:** 本任务产出页面布局、交互状态与后续测试命令；不改变业务存储。

- [ ] 画出 AI 设置三 tab、文件夹主页、文件夹内列表、条目编辑、独立提醒页、整理设置/历史六种状态。沿用已有主题变量、字体和下划线 tab；移动端单列，宽屏可两列文件夹，条目保持平面列表。
- [ ] 写清空列表、新建、编辑未保存、删除/移动、返回上一层、键盘打开时的行为；标注“记忆开关”和“自动整理开关”分别作用范围。
- [ ] 创建不加载 Vite Electron 启动插件的 Vitest node 配置，include 明确覆盖本计划新增测试与现有 assistant、aiService、聊天重试测试；不要把无关测试塞入 `vitest.todo.config.ts`。
- [ ] 运行 `npx vitest run --config vitest.assistant.config.ts` 建立现状基线，记录已有失败及原因；后续不把原先失败误算为新功能通过。
- [ ] 检查布局方案与 Spec 对齐；随下一个实际代码批次提交本任务文件，不为单独设计文档自动提交。

## ✍️ 任务 2：统一条目与唯一写入入口

**Files:** 新建 `src/types/assistantMemory.ts`、`src/constants/assistantMemoryDefaults.ts`；修改 `src/types/assistant.ts`、`src/services/assistantMemoryService.ts`、`src/services/assistantMemoryService.test.ts`；新建 `src/utils/assistantMemoryOperations.ts` 及其测试。

**Interfaces:**

- `MemoryFolder`: `{ id, name, builtIn, sortOrder, updatedAt, revision }`。
- `MemoryEntry`: `{ id, folderId, content, source, sourceRefs, pinned, userProtected, status: 'active'|'archived', createdAt, updatedAt, lastEvidenceAt?, validFrom?, validTo?, revision, deletedAt? }`；`source` 为 `user | assistant | legacy`。时间使用 ISO 字符串；来源 `MemorySourceRef` 包含 `{ kind, id, version?, sessionId? }`。
- `MemoryLibrary`: `{ version: 2, epoch, revision, updatedAt, folders, entries, rejectedEvidenceRefs: MemorySourceRef[], changeSets, migration }`；epoch 为整库清空/替换时更换的 UUID，删除采用墓碑条目，不直接丢失删除语义。`migration` 保存版本及已导入来源指纹，不保存猜测出来的用户事实。
- `MemoryOperation`: `create | update | move | delete | restore`；所有操作包含唯一 `operationId` 与 `libraryEpoch`，同 ID 重试保持幂等；非 create 操作必须包含 `entryId`、`expectedRevision`；restore 另含 `restoreOf` 删除操作 ID，仅用于用户显式恢复。
- `assistantMemoryService.getLibrary(): MemoryLibrary`；`applyOperations(operations, { actor, runId?, sourceBatchId? }): MemoryApplyResult`；结果包含逐项成功/冲突及 `MemoryChangeSet`，禁止凭模型原文声称已成功。
- `createFolder(name)`、`renameFolder(id, name)`、`moveAndDeleteFolder(id, destinationId)`、`subscribe(listener)`；`clearLibrary()` 保留删除语义和迁移标记，不能清除 reminder。
- 后续任务复用 `MemoryChangeSet { id, libraryEpoch, baseRevision, committedRevision, changes, createdAt }`；每个 change 保存条目 before/after 和操作 ID，提供受版本保护的撤回。`MemoryApplyResult` 为 `{ changeSet?, appliedOperationIds, conflicts: { operationId, reason }[] }`。

- [ ] 先写行为测试：保存 25/100 条不丢失；空白文本被拒；8,001 字符新建被拒且不截断；移动不变 ID；未知 folder/entry 被拒；同 revision 的删除优先；失效 revision 不覆盖用户修改。
- [ ] 运行 `npx vitest run --config vitest.assistant.config.ts src/services/assistantMemoryService.test.ts src/utils/assistantMemoryOperations.test.ts`，确认新增断言先失败。
- [ ] 实现上述类型、默认值、纯操作校验及仓储；只在整个新状态序列化保存成功后发出备份/订阅事件。无意义读取不刷新 updatedAt，保存失败保留旧原文。
- [ ] 测试手动条目默认 `userProtected=true`；assistant/dream 不得修改或删除受保护条目；用户操作允许。新增模型推断使用 `source=assistant`，不得伪装用户原话。
- [ ] 运行针对测试，预期 PASS；更新头注释与目录说明；检查差异后提交 `统一AI记忆条目与写入`。集成切换前保留旧接口适配层，不让现有调用立即断裂。

## ✍️ 任务 3：旧数据迁移与不复活规则

**Files:** 新建 `src/utils/assistantMemoryMigration.ts`、`src/services/assistantMemoryMigrationService.ts` 及各自测试；修改 memory service 初始化路径、`assistantReminderQueueService.ts` 的一次性队列恢复入口。

**Interfaces:** `migrateLegacyMemory(input: { memory: unknown; dream: unknown }, now: string): { library: MemoryLibrary; topicConfig: MemoryDreamTopic[]; report: MemoryMigrationReport }` 为纯函数；`ensureMemoryLibrary(): MemoryLibrary` 负责快照及提交。`MemoryDreamTopic` 保留旧 `{ id, title, note, enabled }`；旧系统 topics 与文件夹各自独立。`MemoryMigrationReport` 记录各来源导入数、跳过数及错误；缺失时间不得补成当前事实时间。

- [ ] 写迁移测试：画像/偏好 → about-me；工作摘要 → ongoing；Dream → patterns，保留原主题、观测时间和 archived 状态；`lastKnownState`、`recentDecisions` 不进入活动记忆；超长旧文本无损。
- [ ] 为旧条目使用来源 ID 或规范化文本生成稳定 ID。写测试证明同一旧备份再次导入不重复，已删除 ID/已排除来源不重建；旧 archived 条目迁移后仍不参与召回。旧画像/偏好/工作摘要无法可靠区分人工与 AI 时默认保护，旧 Dream 条目标记 legacy 且保留来源，后续整理不得伪称用户确认过。
- [ ] 迁移前写一次原始快照，包含原始 JSON、迁移版本和时间；成功保存 v2 后才写完成标记。中途失败可重试，旧键保留但之后不再作为活动数据读取。
- [ ] 提醒队列键不存在时，合并旧 memory 的有效 pending 提醒；若队列键已存在（即使为空）则不恢复旧提醒。保留 ID/待办/定时任务关联，不推翻已完成或已取消状态。
- [ ] `lastEvidenceAt` 只从可验证旧来源时间产生，不把导入时间当作最近进展；旧工作摘要有 legacy 标记，不自动宣称今天刚发生。
- [ ] 跑本任务两个测试文件与 reminder queue 回归，预期 PASS；提交 `迁移旧记忆与Dream数据`。

## ✍️ 任务 4：彻底拆开提醒、短期状态和决策日志

**Files:** 修改 `src/services/assistantReminderQueueService.ts` 及测试、`assistantOrchestratorService.ts` 及测试、`assistantLetterOrchestratorService.ts`、`assistantTurnService.ts` 及测试、`src/components/ai-chat/useAIBackfillChatResultHandlers.ts`；新建 `assistantRuntimeStateService.ts` 及测试、`src/prompts/assistant/reminder-rules.md`；修改 `assistantPromptService.ts` 及其测试。

**Interfaces:** `AssistantUnifiedTurnOutput` 分别提供 `memoryOperations?: MemoryOperation[]`、`reminders`、`reminderActions`、`runtimeStatePatch?: { text: string; observedAt: string; expiresAt?: string }`。`RuntimeState` 为 `{ text, observedAt, expiresAt }`；`assistantRuntimeStateService.getActive(now): RuntimeState | undefined`、`setState(patch, now)`、`clear()`；默认最长 6 小时，用户明确更短期限则取更早时间。独立 `reminderActions` 支持原有 remove 与带精确 reminderId 的 update（可更新 text/dueAt/type），禁止通过 memoryOperations 修改提醒。

- [ ] 先写测试：memory 关闭时 reminder 创建/取消仍执行；清空库不改提醒队列；提醒变化不改记忆 revision；过期状态不入 prompt；旧状态迁移不重新激活。
- [ ] 移除 `syncRemindersToMemory`、`replaceActiveReminders` 的运行依赖，`activeReminders` 不再属于 v2。模型看提醒时读取独立 `Reminder Context`，取消操作仍使用精确 reminder ID。
- [ ] 停止向正式记忆写 `appendDecisionSummary`。保留调用历史中的 `decisionSummary`/原因，历史 UI 仍能查看；普通 turn 只注入有效短期状态，不携带一份永久当前状态。
- [ ] 将 reminder schema、用法和 few-shot 从 `memory-rules.md` 拆到独立文件；memory 关闭时仍加载所需提醒规则。前台/后台/来信分别保留各自的提醒权限，不扩大原有自动提醒权限。
- [ ] 覆盖同轮两种操作：分别执行、分别展示、分别计入结果；其中一个失败不撤销另一个已成功操作，也不错误地承诺成功。
- [ ] 跑 queue、orchestrator、turn、prompt 和 runtime-state 测试，预期 PASS；提交 `拆分AI提醒与记忆状态`。

## ✍️ 任务 5：对话操作、后台结果与聊天重试同步改造

**Files:** 修改 `src/services/aiService.ts` 及测试、`src/types/assistant.ts`、`src/prompts/assistant/{memory-rules,foreground-mode,background-mode,assistant-letter-mode}.md`、`AIBackfillChatForegroundTurn.ts`、`useAIBackfillChatResultHandlers.ts`、`AIBackfillChatHelpers.ts`、`AIBackfillChatShared.tsx`、`AIBackfillChatInitialization.ts`、`useAIBackfillChatRetry.ts`、`assistantOrchestratorService.ts`、`assistantLetterOrchestratorService.ts`。

**Interfaces:** `applyOperations` 是所有来源唯一正式写入口。聊天持久化新增 `memoryChangeSet?: MemoryChangeSet`，保留旧 `memoryBefore` 的只读解码兼容；`revertChangeSet(changeSetId): MemoryApplyResult` 仅撤销目标条目且必须匹配该次操作后 revision。

- [ ] 写请求解析测试：合法增删改/移动通过；缺少目标 revision 的改删被拒；legacy `memoryPatch` 仅由受控兼容器转译已知字段，不再接受其中的 reminder/decision 写入。
- [ ] 前台、后台、来信统一调用正式操作，记忆更新 UI 从成功 changeSet 生成；保留旧聊天卡片可读，避免清洗历史消息时丢失正文。
- [ ] 新版 prompt 明确 create 用 folder ID，改删用检索/上下文里的精确 entry ID 和 revision。用户纠正已有内容优先 update，不追加相反条目。
- [ ] 重试由“恢复整个 memoryBefore”改为“仅撤销本轮确实写入且之后未变化的条目”；用户后来删除/编辑的条目不被重试覆盖。旧消息重试不应用旧全库快照。
- [ ] Native diagnostics hydration 的新 memoryOperations 采用相同验证；原生 executor 仍保存原始结果，不另建一套无版本校验的记忆写入逻辑。
- [ ] 增加 `useAIBackfillChatRetry.test.ts`，覆盖用户删除后重试、Dream 后重试、同轮 reminder 与 memory 分别撤回；跑本任务及既有 foreground/background recovery 测试，预期 PASS；提交 `统一对话记忆操作与安全重试`。

## ✍️ 任务 6：分层召回与可选向量索引

**Files:** 新建 `assistantMemoryEmbeddingService.ts`、`assistantMemoryRetrievalService.ts` 及各自测试、`src/utils/assistantMemoryRanking.ts` 及测试；修改 `src/services/assistantAgentConfigService.ts` 或独立记忆配置文件（以本任务定义的 `assistantMemoryConfigService.ts` 为统一入口），不得把 embedding 密钥加入公开备份。

**Interfaces:**

- 新建 `assistantMemoryConfigService.ts`：`getConfig()`、`saveConfig(patch)`；`MemoryConfig { enabled, autoDreamEnabled, dreamIntervalHours: 24|72|168, embedding: { enabled, baseUrl, model, apiKey } }`。enabled 迁移旧记忆开关；自动执行开关、计时、凭据设备本地保存，备份仅导出允许的无密钥设置。
- `embedTexts(texts: string[], signal?: AbortSignal): Promise<number[][]>`；`invalidateEntries(ids)`；缓存 key 包含 entry ID、内容 hash、provider/model 和维度，不缓存过时正文。
- `searchMemory({ query, folderIds?, from?, to?, limit?, now, signal? }): Promise<MemorySearchHit[]>`；`readMemoryEntry(id, now)`；`buildMemoryContext({ query, now, mode, tokenBudget? }): Promise<MemoryContextPack>`。
- `MemorySearchHit` 为 `{ entryId, revision, score, matchedBy, snippet, sourceRefs }`；`MemoryContextPack` 包含 `libraryEpoch`、选中的条目 ID/revision、分层文本、用量估算、omitted IDs 和命中原因，不包含全库；默认记忆预算 1,600 estimated tokens，核心约 400、ongoing 约 400、检索约 800，属于可调初值。

- [ ] 测试 expired/deleted/archived 不召回；about-me pinned 优先，超预算明确返回 omitted IDs 不无声裁剪；用户关闭记忆返回空包；ongoing 按话题与 `lastEvidenceAt`，普通 Dream 编辑不抢最近进展排序。
- [ ] 实现 Unicode 中文短语/词匹配、项目和日期过滤、去重，再融合可用语义分数；普通无关问答允许零命中，不为凑条数带入最近六条。
- [ ] 向量请求使用明确的 embedding 配置，实施时核对所选接口官方文档并复用可用 HTTP transport；不在计划阶段调用外部模型。批量上限 16 个文本、单批失败不影响关键词检索，2 秒内未完成的实时语义查询降级，索引构建后台继续。
- [ ] IndexedDB 保存可重建向量，不进云备份。内容改变失效、删除立即排除、model/维度变化重建；重建去重并中断已废弃任务。
- [ ] 测试无配置/401/超时/网络失败/维度不匹配/乱序响应；embedding 测试 stub 请求，正常聊天无额外的“决定检索什么”的 LLM 调用。
- [ ] 跑本任务测试，预期 PASS；提交 `增加分层记忆与语义检索`。

## ✍️ 任务 7：所有请求改用精简记忆包

**Files:** 修改 `assistantTurnService.ts`、`assistantContextBuilder.ts`、`assistantLocalSearchService.ts` 及测试、`assistantOrchestratorService.ts`、`assistantLetterOrchestratorService.ts`、`AIBackfillChatForegroundTurn.ts`、`useAIBackfillChatBackgroundDispatch.ts`、`useAIBackfillChatBackgroundEffects.ts`、`src/types/assistant.ts`；补 `AIBackfillChatBackgroundRequest.test.ts`。

**Interfaces:** turn input 使用 `memoryContext?: MemoryContextPack`、独立 `reminderContext`、有效 runtimeState；`localQueryRequest` 增加 `memories` 和 `conversationHistory` target 及 entry/source 展开参数，沿用已有查询回合上限。来源展开只允许受当前权限和删除规则允许的记录。

- [ ] 测试完整库有 100 条但普通请求只含选中条目；memory 关闭仍能传 reminderContext；最近消息不在 recentTurns 和 summary 重复出现；未选中原文不藏在 debug/helper 字段里被重复序列化。
- [ ] 移除 `Memory Snapshot` 与独立 `Dream Context` 全库/双通道注入，统一用 Memory Context；近期消息只出现一次，早期摘要有明确覆盖范围，不改造为新一轮长期事实。
- [ ] 前台需要历史细节时搜索/展开，再运行同一 query loop；每轮工具结果也有预算，切话题或压缩时不无限保留检索片段。
- [ ] 原生后台 snapshot 同样由预算化 pack 生成，带同步时间与有效期。记忆删除/关闭/整库替换立即触发原生记忆快照失效或重建，不能继续使用已删条目；需要同步失败时先清除旧 memory 部分，保留 reminder 运行能力。Native prompt builder 在执行时剔除已过期 runtimeState；无法运行实时检索时使用最近同步的有限上下文，不退回全库。
- [ ] debug 增加 memory 条目数、估算长度和各层来源，provider usage 另列；不同 provider 估算不伪装精确计费结果。
- [ ] 跑 turn/context/search/orchestrator/background 测试；更新 `AssistantNativePromptBuilderTest.java` 的过期状态用例，交给用户原生构建时执行；提交 `精简AI请求记忆上下文`。

## ✍️ 任务 8：收集跨会话增量证据

**Files:** 新建 `assistantMemoryEvidenceService.ts` 及测试；修改 Dream 调用数据提供路径 `useAIBackfillChatTemplateOpeningHandlers.ts`、`AIBackfillChatDreamFlow.ts`、`AIBackfillChatModal.tsx`。

**Interfaces:** `collectMemoryEvidence({ cursor, asOf, maxItems: 200 }): MemoryEvidenceBatch`；`MemoryEvidenceBatch { id, items, nextCursor, hasMore, sourceVersions, asOf }`；每条证据有稳定来源 ID、来源修改版本、发生时间和内容。`MemoryEvidenceCursor` 保存各来源最后处理的修改版本/时间与同时间稳定 ID，并记录已处理 batch ID；`validateEvidenceRefs(refs): { validRefs, missingRefs, changedRefs }` 用于提交前复查。

- [ ] 测试跨多个 session 按绝对时间采集；同一事件在聊天/日报引用时保留关联不算三个独立事件；修改旧记录也能再次进入候选；删除和明确排除的来源不进入候选。
- [ ] 游标使用来源修改版本及稳定 ID，不只保存“最大事件日期”，避免漏掉晚补的旧日志。对话只提取原始用户/实际工具结果，AI 回答和 Dream 整理记录不成为用户事实的唯一证据。
- [ ] 按日分片和稳定排序，200 条只是一批上限而非总量截断；新数据在 asOf 以后到达留给下次，失败不提前推进成功游标。
- [ ] 保存最小必要来源引用，按需展开原文；读取时重新检查来源仍存在及最新版本。
- [ ] 跑本任务测试，预期 PASS；提交 `增加跨会话记忆整理材料`。

## ✍️ 任务 9：新版 Dream 统一整理与安全撤回

**Files:** 修改 `dreamService.ts`、`src/constants/dreamModePrompt.ts`、`src/constants/dreamTopicPresets.ts`、`AIBackfillChatDreamFlow.ts`、`useAIBackfillChatDreamManager.ts`、`useAIBackfillChatDreamSelection.ts`；新建 `dreamService.test.ts`。旧 Dream month UI 最终移除，历史消息继续可读。

**Interfaces:** `dreamService.organizeMemory({ reason: 'manual'|'scheduled', signal?: AbortSignal, maxBatches?: number }): Promise<MemoryDreamRun>`；`MemoryDreamRun { id, status, startedAt, completedAt?, sourceBatchIds, changeSetIds, conflicts, usage?, error? }`；`listRuns()`、`revertRun(runId): MemoryApplyResult`。本服务持有设备本地 `MemoryDreamCheckpoint { cursor: MemoryEvidenceCursor, completedBatchIds, lease?: { owner, expiresAt } }`，手动和自动入口共用同一检查点与租约。

- [ ] 写测试：新增、合并、改写、移动、删除 AI 条目；拒绝改删 userProtected；目标不存在/版本改变/来源删除时不提交；模型 JSON 不合法时保留旧库。
- [ ] 模型只返回 `MemoryOperation[]` 和候选观察，写入必须经正式入口验证；现有 dreamCards 不再反向合成持久化条目。
- [ ] 一次最多处理 3 批，每批最多一次结构化请求；未完成部分保留游标，下次继续。材料为空不调模型；重复批次不产生重复记忆。
- [ ] 提交前重查 entry revision、库 reset epoch 和来源版本；用户期间修改/删除的条目跳过并记录冲突，不覆盖。继承 sourceRefs，观察与明确事实区分。
- [ ] “删除”采用软删除，后续检索和整理立即排除。恢复/撤回只作用于本次变更且之后未再次修改的条目；若用户之后明确删除或来源已失效，不因撤回恢复。
- [ ] 整理记录由成功提交结果生成；保留空整理/失败状态，运行用量有记录。旧 `dream` 命令改为立即整理，不再要求月份。
- [ ] 跑 Dream 与证据/操作测试，预期 PASS；提交 `重写Dream记忆整理流程`。

## ✍️ 任务 10：独立自动整理开关与应用级调度

**Files:** 新建 `assistantMemoryDreamScheduler.ts`、`src/hooks/useAssistantMemoryMaintenance.ts` 及测试；修改 `src/contexts/AIChatWindowContext.tsx`（或其外层已常驻 provider 的挂载点）、memory config；不把定时器放进只在记忆 tab 展示时挂载的组件。

**Interfaces:** `getNextDreamAt(config, runtime)`、`runDueDream({ now, reason: 'timer'|'resume'|'startup' }): Promise<DueDreamResult>`；`MemoryDreamRuntime { nextDueAt, lastCheckedAt?, lastSuccessAt?, retryAt?, failedAttemptsToday }` 设备本地持久化；`DueDreamResult` 为 `{ status: 'disabled'|'not_due'|'no_evidence'|'busy'|'completed'|'failed', runId? }`。scheduler 调用任务 9 的同一个 organizeMemory；证据游标和锁继续归该服务，不再各存一份。

- [ ] 用 fake timers 测试 24/72/168 小时、迁移后首个 24 小时无请求、关 auto/关 memory 不运行、关后台助理不影响整理、未打开 AI 面板仍运行。
- [ ] 应用 active 时每分钟检查到期，不轮询模型；监听 visibilitychange/Capacitor resume，启动数据就绪后补跑一次。无新证据记录检查结果并安排下一次，不产生 AI 请求。
- [ ] 验证 organizeMemory 的共同持久租约能去重手动/自动/多个窗口并发，scheduler 不另建一把互不识别的锁；覆盖续租和失效恢复，用户停止/关开关时 AbortController 中断，已校验完成的提交保持一致。
- [ ] 失败首次 30 分钟后重试，同一天自动失败最多 3 次，再等正常下一次检查；无配置/离线不紧循环，不丢证据游标。手动重试不改变 reminder 调度。
- [ ] 原生后台提醒仍由现有机制执行；本轮不启动新 Android Dream service。把“被终止后下次打开补跑”的验收边界写进项目说明。
- [ ] 跑调度与生命周期测试，预期 PASS；提交 `接入自动记忆整理`。

## ✍️ 任务 11：备份、同步、重置与旧客户端数据

**Files:** 修改 `assistantBackupService.ts` 及测试、`src/hooks/useSyncManager.ts`、`src/App.tsx` 相关导入/清空路径、`src/utils/aiBackupChange.ts`；补 `syncBackupStability.test.ts`；修改聊天 restore 事件消费路径。

**Interfaces:** AI backup 新增 `memoryLibrary`、允许同步的 `memorySettings`、整理关注主题与必要变更记录；不再把活跃 Dream state 当第二份库导出。`applyBackupPayload(value, { mode: 'merge'|'replace' })`；云下载明确用 merge，用户明确整库恢复用 replace 并创建新 reset epoch。

- [ ] 写 round-trip 测试：四文件夹/自定义文件夹/条目/墓碑/保护标记/来源完整；reminder 独立；不导出 embedding 密钥、向量缓存、短期状态、计时器或跨设备锁。
- [ ] 无 memoryLibrary 字段的备份不清空现有库；旧 backup 仅走任务 3 的幂等兼容导入；同 ID 普通编辑冲突按更新时间处理，存在删除标记时，普通编辑即使时间更晚也不能恢复条目，只有明确引用该次删除的用户 restore 可以恢复。保留来源排除标记，不能用旧 legacy 字符串换 ID 重新创建。
- [ ] 正式清空/整库替换更新 reset epoch，迟到的 Dream/native/chat 操作无权写入旧 epoch；手动整库恢复为显式行为，不混同自动同步合并。
- [ ] mounted UI 收到恢复事件后重读新库；旧 snapshot effect 不得覆盖刚恢复的数据；向量索引按新内容 hash 失效重建。
- [ ] 多次 buildBackupPayload 的无变化读取不刷新时间，保留现有稳定性要求；同步完成后删除墓碑仍存在，不能提前清掉。
- [ ] 跑 backup、sync stability 和迁移测试，预期 PASS；提交 `兼容统一记忆备份同步`。

## ✍️ 任务 12：落实记忆 tab、文件夹编辑与独立提醒页

**Files:** 新建职责表中的 5 个 memory UI 组件、`AIBackfillChatReminderOverlay.tsx`、`useAIBackfillChatMemoryManager.ts`；修改 `AIBackfillChatSettingsOverlay.tsx`、`AIBackfillChatAssistantSettingsSection.tsx`、`AIBackfillChatSessionOverlays.tsx`、`AIBackfillChatOverlays.tsx`、`AIBackfillChatShared.tsx`、`useAIBackfillChatInternalBack.ts`、`AIBackfillChatModal.tsx`；移除废弃旧页挂载。

**Interfaces:** `AISettingsMainTab = 'persona' | 'call' | 'memory'`；UI 只调用 memory service、config、Dream service 的正式方法。新 manager 统一订阅和草稿状态，不直接写 localStorage。

- [ ] 按任务 1 布局实现第三 tab，记忆主页显示文件夹图标/名称/条目数；打开文件夹呈现可编辑文字列表。添加/编辑/移动/删除后即时更新数量，重开仍一致。
- [ ] 拆出提醒独立入口和原有 reminder 编辑功能；后台助理设置中移除旧长期记忆开关及两个旧入口。记忆开关、向量配置、自动整理及主题设置归入 memory tab。
- [ ] embedding 配置显示启用、服务地址、模型、密钥、连接测试；未配置时其他记忆功能正常。密钥输入和 debug 均不明文展示/回显。
- [ ] 用户编辑或新建条目自动 `userProtected=true`；“始终记住”可设置但超出预算时在用量详情显示，不静默丢失；无效日期/时间按数字输入规范校验。
- [ ] 整理记录展示实际增改删、冲突/失败和撤回结果；无新增时显示简短状态。关闭记忆不清空，清空记忆不清提醒。
- [ ] 补 `AIBackfillChatMemorySettingsSection.test.tsx` 的行为测试；纯视觉变化用 renderer smoke 验证，不写只匹配源码样式的测试；提交 `增加文件夹式记忆设置页`。

## ✅ 任务 13：整体回归、真实布局检查与交付

**Files:** 新建 `scripts/test-ai-memory-renderer.mjs`、`src/components/__tests__/aiMemoryRendererHarness.tsx`；更新相关 `README.md`、本计划执行结果。Android 改动仅限共享协议确实需要的 prompt builder 与 JVM 用例，实施时据实际 diff 列明。

- [ ] 使用隔离的临时 browser/Electron profile 和合成数据运行 smoke：四文件夹、25+ 条、长文本、空状态、自定义文件夹、新增/编辑/移动/删除、提醒独立、手动 Dream、自动补跑、缺少向量配置、重启恢复。
- [ ] 在 390px 与桌面宽度检查深浅主题、长中文名称、键盘弹出、返回层级、横向溢出、Android safe area；截图保存在 `node_modules/.cache/ai-memory-smoke/`，不提交生成图。若生成含中文的图片，使用已验证中文字体。
- [ ] 运行 `npx vitest run --config vitest.assistant.config.ts`，预期全部本轮相关测试 PASS。
- [ ] 运行 `npx vitest run --config vitest.todo.config.ts src/services/assistantContextBuilder.test.ts`，确认待办相关上下文无回归。
- [ ] 运行 `node scripts/test-ai-memory-renderer.mjs` 和 `node scripts/test-ai-chat-viewport-renderer.mjs`，预期退出码 0。
- [ ] 运行 `npm run build`，预期成功；随后 `npx cap sync android` 同步共享 Web 资产。禁止在这里编译 Android，列出用户后续真机验证项目：通知、后台原生请求、resume 补跑、返回键和键盘。
- [ ] 用相同合成问题保存改造前后请求明细：普通问答不全库携带，论文问题能找到正确进展，历史问题可展开来源。记录实际 usage/估算差异，不预设节省百分比。
- [ ] 自己检查需求覆盖、类型、迁移、删除、权限与并发；运行 `git diff --check`，检查 `git status`，仅 stage 当前任务文件。验证通过后提交 `完成统一记忆回归验证`；未执行的真机检查如实列出，不宣称已通过。

## 📍 执行检查点

| 检查点 | 已交付能力 | 后续依赖 |
| --- | --- | --- |
| 任务 1–3 | UI 方案、正式仓储、无损迁移 | 旧调用通过适配继续运行 |
| 任务 4–7 | 提醒独立、对话增删改、分层/语义召回、精简请求 | 所有读写统一后才切换旧入口 |
| 任务 8–11 | 跨会话整理、自动运行、版本保护、同步兼容 | 记忆页消费稳定服务 |
| 任务 12–13 | 一个记忆入口及完整验收 | 删除废弃适配，交付可运行功能 |

最终检查：默认四文件夹、条目 CRUD、超过 24 条、旧数据迁移、reminder 拆分、短期状态、决策日志、分层读取、可选向量、对话操作、Dream 增改删、自动开关、独立调度、重试/备份不复活，都必须能对应到上面的测试或 smoke 步骤。
