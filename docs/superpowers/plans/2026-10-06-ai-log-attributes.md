# AI 补记属性实施清单

**Goal:** 普通聊天与快速补记在创建 log 时填写已有活动的自定义属性，并显示保存结果。

**Architecture:** 沿用 `Log.attributeValues`；词典提供精简的属性定义，AI 输出按 ID 引用的属性值，执行器按最终活动统一校验。当前会话以 native 方式完成，不增加依赖。

**Tech Stack:** React、TypeScript、Vitest。

**Spec:** 本次对话已确认的 create_log 接入方案；不扩展 edit_log。

## 约束与检查重点

- UTF-8；遵循现有 src 目录结构和文件头规范。
- 只填写用户明确提供的信息；属性和选项不得新建或引用已归档项。
- 校验四种类型、有限数字（含零）、跨活动 ID、重复值及条件属性。
- 普通聊天、快速补记必须完整保留有效属性；跨日拆分的整段数值总量仅保存到第一段，避免统计重复。旧调用不受影响。
- 结果卡使用现有属性组件，读取实时记录；撤销后保留快照。

## 实施步骤

- [x] 在 `src/utils/aiLogAttributeUtils.ts` 增加未知输入的形状归一化与按活动定义校验，添加对应测试。
- [x] 扩展 `src/types/assistant.ts` 和 `src/services/quickAddService.ts` 的 create_log 契约，更新词典、摘要、提示词与两条解析路径。
- [x] 更新快速补记适配器、跨日拆分和执行器，保存属性并记录快照，增加端到端的数据链测试。
- [x] 更新结果卡，复用 ActivityAttributeSummary，验证实时编辑和撤销快照。
- [x] 更新相关目录说明，运行针对性 Vitest、生产构建及隔离 Electron 渲染冒烟检查；提交前审查本任务文件。

## 验证结果

- 7 个 Vitest 文件，73 项测试通过；包括两条解析路径、快速补记 ID/名称匹配、条件校验和跨日数值总量。
- `npm run build` 通过，`npx cap sync android` 完成；未编译 Android。
- 隔离 Electron 渲染的 4 组检查通过，已目视核对桌面/手机宽度截图及中文显示。
- 全仓库 TypeScript 检查存在既有错误；对照 HEAD 检查本次未新增错误，工具调用归一化增加明确返回类型。
