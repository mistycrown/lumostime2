# 飞书日历自动同步 Implementation Plan

> 按仓库要求采用 native 执行，本轮已获用户对设计的确认，不使用子代理。

**Goal:** 应用打开时将新增、修改、明确删除及分类迁移自动同步到飞书，离线和中断后恢复。

**Architecture:** 统一记录持久化入口将记录与账号隔离的队列一起保存；全局调度器从已落盘数据构建最终内容，复用飞书同步执行器。任务合并为最终意图，成功只确认请求携带的版本。

**Tech Stack:** React / TypeScript、IndexedDB、Vitest、既有 Electron / Capacitor 飞书客户端。
**Spec:** 本轮已确认设计，首版仅在应用打开时执行，不增加后台服务。

## Global Constraints

- UTF-8；保留源码头注释；遵循现有 src/ 目录。
- 开启前历史记录不全量上传；开启后新增或修改的实际记录进入队列。
- 忽略分类保护迁移双方和删除；账号切换不得串写。
- 云下载、备份恢复和重置暂停并重建基线，不由缺失 ID 推断远端删除。
- 凭证继续只保存在执行端；同步元数据不进入用户导出。
- 不编译 Android；验证通过后同步 web 资源。

## Review Focus

- 本地数据与队列写入失败必须一起回滚。
- 创建结果未知后删除需要核查，不能取消已经发送的创建。
- 请求期间再次编辑必须保留更高版本。
- 手动和自动操作、多窗口必须共用锁。
- 忽略分类、授权失效、关闭开关、账号切换须阻止后续写入。

### Task 1: 持久化与变更收集

Files: src/repositories/storageRepository.ts、dataRepository.ts；src/utils/feishuAutoSyncState.ts；src/services/feishuAutoSyncStore.ts。

- [x] 扩展事务批量写；fallback 使用可恢复写入日志。
- [x] 建立纯状态转换与账号队列，覆盖初始基线、合并、明确删除、替换数据、版本确认。
- [x] 在统一持久化入口原子保存 logs 和队列；依赖数据保存后广播刷新。
- [x] 运行纯逻辑、持久化事务和崩溃恢复测试。

### Task 2: 执行器与全局调度

Files: src/services/feishuAutoSyncService.ts、feishuCalendarClient.ts；src/hooks/useFeishuAutoSync.ts；src/App.tsx、useSyncManager.ts。

- [x] 建立共享操作锁；重读账号状态；每批最多 5 条。
- [x] 从落盘数据构建内容，核对清单和原位置；处理防抖、限流、失效授权及未知结果。
- [x] 保存发送版本，响应只能确认同一版本，失败任务退避重试。
- [x] 接入启动、前台、网络恢复、设置变更；标记整批数据替换。
- [x] 运行模拟飞书的离线恢复、超时删除、再编辑、分类保护和账号隔离测试。

### Task 3: 设置与验收

Files: src/components/FeishuAutoSyncPanel.tsx、src/views/settings/FeishuCalendarSettingsView.tsx、相关 README / docs。

- [x] 增加开关、待同步数、最近成功时间和立即同步，保持界面简洁。
- [x] 与既有忽略分类共用偏好，与手动同步共用锁。
- [x] 运行 npm run feishu:test、相关 repository 测试、npm run build 和页面冒烟；同步 Android 资源。
- [x] 检查差异；仅提交本任务变更，既有工作区修改保留。

验证：202 项飞书测试、13 项存储/数据仓库测试、局部 TypeScript 检查和最终 Web/Electron 生产构建通过。隔离页面冒烟通过，包含真实 IndexedDB 回滚、离线落盘、刷新恢复及开关恢复；中文截图正常。已执行 cap sync android，未编译 Android。全仓库 tsc 仍有其他模块既有错误；局部检查不替代全仓库通过。真实飞书和 Android 实机尚未验收。
