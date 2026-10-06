# 详情统计扩展 Implementation Plan

**Execution:** Native，由当前代理直接实现；用户已批准设计并要求执行，无子代理或额外确认。
**Goal:** 开放适合图表的全部范围，给筛选器与领域增加时长及备注统计，并准确分摊小时热力图。
**Architecture:** 共用卡片来源、时间范围能力和小时拆分工具；详情页只适配实体配置与有效记录集。
**Tech Stack:** React、TypeScript、Vitest、Vite。
**Spec:** docs/plans/2026-10-06-detail-statistics-design.md

## Global Constraints

UTF-8；保留源码头注释；仅提交本任务文件；不编译 Android；不增加额外数据来源或界面说明文字。

## Review Focus

跨午夜和周界限的记录按经过时间统计；暂停时长按比例分配；全部范围保存后不回退；编辑表达式保留卡片；删除全部卡片后不自动重建。

## Task 1: 共用统计能力

Files: src/types.ts、src/utils/activityStatisticCardUtils.ts 及其测试、src/utils/hourlyDurationUtils.ts 及其测试、src/components/stats/PetalTimelineChart.tsx、src/components/ActivityAttributeStatistics.tsx。

- [x] 新增 recordDuration 来源及实体配置字段。
- [x] 定义 getStatisticRangesForCard(chartType) 并覆盖支持/不支持全部的配置迁移。
- [x] 实现 forEachHourlyDurationSegment(logs, bounds, visit)，测试跨小时、午夜、周界限、比例分配。
- [x] 复用小时拆分到时序与星期热力图，开放适合图表的全部选项。

## Task 2: 详情页接入

Files: src/components/RecordStatistics.tsx、src/views/FilterDetailView.tsx、src/views/settings/FiltersSettingsView.tsx、src/views/ScopeDetailView.tsx。

- [x] 共享只开放记录时长、备注的适配组件，持久化独立卡片和配色。
- [x] 增加统计页签，使用完整有效记录；编辑筛选器保留新增字段。
- [x] 验证来源限制、全部范围、切换页面和删除全部卡片后的保存行为。

## Task 3: 验证及交付

- [x] 更新相关 README 和头注释。
- [x] 运行相关 Vitest、npm run build，进行界面 smoke test。
- [x] 检查 git status/diff，暂存本任务文件并创建聚焦中文提交。

## 验证结果

- 6 个 Vitest 文件、57 项测试通过；生产 Web 与 Electron 入口构建通过。
- 隔离 Electron renderer 的 6 组交互验证通过：筛选来源限制、历史时长/词云、卡片与配色保存、表达式编辑、清空与恢复、领域跨午夜热力图与退出保存、分类默认卡片回归。桌面及 390px 窄屏截图已检查中文显示。
- 额外全仓 `tsc --noEmit` 未通过，存在 `electron/main.ts`、`App.tsx`、`AchievementBottle.tsx` 等既有类型错误；检查输出未发现本次修改涉及文件的诊断。
- 分类页适配保留 undefined 与 [] 的区别：首次进入生成原有默认卡片，主动清空后保持为空。
