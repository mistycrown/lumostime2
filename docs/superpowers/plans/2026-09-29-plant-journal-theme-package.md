# 植物手帐主题包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将模板副本转换为可导入的「植物手帐」主题包，并仅应用用户指定且被现有素材支持的设置。

**Architecture:** 主题包只包含 `theme.json` 与 `assets/`。资源文件按用途改为 ASCII、稳定的 WebP 路径；`theme.json` 用资源 ID 关联随包资源，内置设置直接使用应用支持的 ID。

**Tech Stack:** JSON、Node.js、项目现有主题包解析器、PNG-to-WebP 转换工具。
**Spec:** `docs/plans/2026-09-29-plant-journal-theme-package-design.md`

## Global Constraints

- 文件和 JSON 均使用 UTF-8；资源路径使用 `/`。
- 保留所有现有图片，并将全部 PNG 转换为 WebP。
- 无字体或时间小友资源时，不写相应 `resources` 或 `apply` 字段。
- 主题展示名为“植物手帐”，包 ID 为 `plant-journal`。

## Review Focus

- 任何 JSON 资源路径均必须指向主题包内存在的 WebP 文件。
- 两组贴纸均必须保留 16 张且按其所属组登记。
- 内置样式 ID 必须来自当前应用的实际定义，不能根据编号猜测。
- `pencil` 图标必须配置为内置主题，不能错误登记为缺失的自定义图标。
- 空目录及 `.gitkeep` 不得被登记为资源。

---

### Task 1: 规范化并转换素材

**Files:**
- Modify: `docs/plans/theme-package-template - 副本/assets/**`

**Interfaces:**
- Consumes: 原始 PNG 资源及其用途目录。
- Produces: 全部 WebP 格式、规范化的 `assets/` 资源树。

- [ ] **Step 1: 核对素材分类与数量**

确认 1 张整体背景、1 张导航背景、1 张 Memoir 背景、6 张卡片背景、1 张悬浮按钮背景及两组各 16 张贴纸。

- [ ] **Step 2: 转换并按稳定用途路径命名**

将每个 PNG 转为同目录内的 WebP，并分别命名为 `background/main.webp`、`navigation/main.webp`、`memoir-calendar/main.webp`、`card-backgrounds/01.webp` 至 `06.webp`、`floating-button-backgrounds/main.webp`、`stickers/postage/01.webp` 至 `16.webp`、`stickers/postage-cropped/01.webp` 至 `16.webp`。

- [ ] **Step 3: 删除已确认转换的原 PNG**

仅删除存在对应 WebP 且解码成功的 PNG 原文件。

- [ ] **Step 4: 验证资源树**

Run: `Get-ChildItem -Recurse -File ... | ...`
Expected: 没有 PNG；所有 42 张图片均为可读取 WebP。

### Task 2: 写入并校验主题清单

**Files:**
- Modify: `docs/plans/theme-package-template - 副本/theme.json`

**Interfaces:**
- Consumes: Task 1 输出的 WebP 路径和项目定义的内置设置 ID。
- Produces: 可由主题包导入器解析的 schema v2 清单。

- [ ] **Step 1: 从服务定义确定内置 ID**

读取颜色、字体、成就瓶图标包、成就瓶样式与时间线样式的顺序和 ID；仅在“鼎烈宋体”存在内置 ID 时写入字体设置。

- [ ] **Step 2: 写入资源与应用配置**

用 `plant-journal` 包 ID 和“植物手帐”展示名登记实际资源；应用背景 0.92、`morandi-green`、内置 `pencil`、导航纵向拉伸 115%、Memoir 0.90、指定成就瓶与时间线 ID，并省略无资源类型。

- [ ] **Step 3: 解析 JSON 并验证资源引用**

Run: `node -e "JSON.parse(require('fs').readFileSync(...))"`
Expected: JSON 解析成功；清单内每条本地资源路径均存在。

- [ ] **Step 4: 运行主题包解析测试**

Run: `npx vitest run src/services/themePackageService.test.ts`
Expected: PASS。
