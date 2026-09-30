# 植物手帐朱雀仿宋字体 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有「植物手帐」主题包的应用字体切换为内置“朱雀仿宋”，并发布为版本 `1.0.2`。

**Architecture:** 直接更新主题包清单，不改动主题素材、导入器或应用代码。通过现有字体服务使用内置 ID `zhuque-fangsong`，由主题包解析器在导入时应用。

**Tech Stack:** JSON、Node.js、Vitest、Git。
**Spec:** `docs/plans/2026-09-29-plant-journal-theme-package-design.md`

## Global Constraints

- 主题包 ID 保持 `plant-journal`，展示名保持“植物手帐”。
- `apply.font` 必须使用内置字体配置 `{ "source": "builtin", "fontId": "zhuque-fangsong" }`。
- 除字体配置与包版本号外，不修改主题包的素材引用和其他应用配置。
- 所有文件使用 UTF-8 编码；不改动当前工作区中与本任务无关的用户变更。

## Review Focus

- 字体 ID 必须与 `src/services/fontService.ts` 中的内置 ID 完全一致，避免导入后回退默认字体。
- 版本号必须从 `1.0.1` 升至 `1.0.2`，避免发布后仍显示旧版本。
- 主题包 JSON 必须可解析，且不能因为本次修改丢失或重写其他配置段。

### Task 1: 更新植物手帐主题包字体

**Files:**
- Modify: `docs/plans/植物手帐/theme.json`

**Interfaces:**
- Consumes: 现有 schema v2 主题包清单与内置字体 ID `zhuque-fangsong`。
- Produces: 版本 `1.0.2`、字体为朱雀仿宋的可导入主题包清单。

- [ ] **Step 1: 修改主题包清单中的版本与字体字段**

将 `package.version` 从 `1.0.1` 更新为 `1.0.2`，将 `apply.font.fontId` 从 `ding-lie-song` 更新为 `zhuque-fangsong`；保持 `apply.font.source` 为 `builtin`，其余 JSON 内容不变。

- [ ] **Step 2: 校验 JSON 与关键字段**

Run: `node -e "const fs=require('fs'); const p='docs/plans/植物手帐/theme.json'; const j=JSON.parse(fs.readFileSync(p,'utf8')); if(j.package.id!=='plant-journal'||j.package.version!=='1.0.2'||j.apply.font?.source!=='builtin'||j.apply.font?.fontId!=='zhuque-fangsong') process.exit(1); console.log('plant-journal theme manifest OK')"`

Expected: 输出 `plant-journal theme manifest OK`，进程退出码为 0。

- [ ] **Step 3: 运行主题包解析测试**

Run: `npx vitest run src/services/themePackageService.test.ts`

Expected: 测试通过，且没有因字体配置变更产生解析回归。

- [ ] **Step 4: 检查差异并提交本次变更**

Run: `git diff -- docs/plans/植物手帐/theme.json; git status --short`

Expected: 差异只包含该主题包 JSON 的版本号和字体 ID；提交时仅暂存 `docs/plans/植物手帐/theme.json`，提交信息使用 `更新植物手帐主题字体`。
