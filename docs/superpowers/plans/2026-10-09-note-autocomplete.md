# Note Autocomplete Implementation Plan

**Execution:** Native，按用户仓库指令由当前 agent 直接实施。
**Goal:** 记录备注支持单个灰字建议和 Tab/点击接受。
**Architecture:** 缓存本地备注词库，共享 textarea 叠加灰字显示层，保留原生输入与草稿提交。
**Tech Stack:** React、TypeScript、Segmentit、Vitest。
**Spec:** `docs/plans/2026-10-09-note-autocomplete-design.md`

## Constraints and review focus

UTF-8，保留文件注释头，无新增依赖。检查 IME 事件顺序、长行换行/滚动、正文中间插入、失焦保存、原生 Tab 焦点导航。保留工作区已有改动。

## Tasks

- [x] 创建 `src/utils/noteAutocomplete.ts`：历史词索引、记录去重、前缀匹配、单个候选排序；添加 `noteAutocomplete.test.ts` 验证上述边界。
- [x] 创建 `src/components/NoteAutocompleteTextarea.tsx`：兼容 textarea/ref，灰字显示、IME、Tab/Esc、手机补全按钮；添加浏览器 harness 验证交互和布局。
- [x] 在 `AddLogModal.tsx`、`FocusDetailView.tsx` 接入历史和活动信息，保留已有节点/模板和草稿行为；补齐备用 `ModalManager.tsx` 的计时历史传参。
- [x] 更新目录说明，运行相关 Vitest 和 `npm run build`，通过浏览器检查后检查 diff，仅提交本任务改动。

## Verification

- 相关 Vitest：5 个文件、57 个测试通过。
- `node scripts/check-note-autocomplete-smoke.mjs`：8 组浏览器检查通过，覆盖真实 Tab/触摸操作、IME、Esc、换行、滚动及记录/计时保存；桌面和手机截图已人工检查，使用已验证的 `msyh.ttc`。
- 全仓库 `tsc --noEmit` 报告其他模块已有错误；本次新增和修改的源码及 harness 没有类型诊断。
- 最终 `npm run build` 通过，未编译 Android 应用。
