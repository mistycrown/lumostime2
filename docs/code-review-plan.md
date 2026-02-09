# 代码全面审查计划

## 审查日期
开始：2026-02-09

## 审查目标

### 主要检查点
1. **冗余代码**：是否有重复、不必要的代码
2. **矛盾代码**：是否有逻辑冲突或不一致的地方
3. **废弃代码**：是否有未被使用但仍保留的代码
4. **使用情况**：每个组件在哪里被使用，修改会影响哪些地方

### 文档规范检查
1. **文件头注释**：
   - `@file` - 文件名
   - `@description` - 功能描述
   - `@input` - 输入参数
   - `@output` - 输出结果
   - `@pos` - 位置/类型

2. **README.md**：
   - 每个文件夹是否有 README
   - README 内容是否最新
   - 是否需要更新

---

## 审查范围

### 📁 src/components/ (52 个文件)
- [ ] ActivityItem.tsx
- [ ] AddActivityModal.tsx
- [ ] AddLogModal.tsx
- [ ] AIBatchModal.tsx
- [ ] AITodoConfirmModal.tsx
- [ ] AITodoInputModal.tsx
- [ ] AppRoutes.tsx
- [ ] BackgroundSelector.tsx
- [ ] BottomNavigation.tsx
- [ ] CalendarWidget.tsx
- [ ] ColorSchemeSelector.tsx
- [ ] CommentSection.tsx
- [ ] ConfirmModal.tsx
- [ ] CustomSelect.tsx
- [ ] DateRangeFilter.tsx
- [ ] DetailTimelineCard.tsx
- [ ] FloatingButton.tsx
- [ ] FocusCharts.tsx
- [ ] FocusScoreSelector.tsx
- [ ] GoalCard.tsx
- [ ] GoalEditor.tsx
- [ ] HeatmapCalendar.tsx
- [ ] IconPreview.tsx
- [ ] IconRenderer.tsx
- [ ] ImagePreviewModal.tsx
- [ ] InputModal.tsx
- [ ] MainLayout.tsx
- [ ] MatrixAnalysisChart.tsx
- [ ] ModalManager.tsx
- [ ] MonthHeatmap.tsx
- [ ] NarrativeStyleSelectionModal.tsx
- [ ] NavigationDecorationDebugger.tsx
- [ ] NavigationDecorationSelector.tsx
- [ ] PresetEditModal.tsx
- [ ] ReactionComponents.tsx
- [ ] ScopeAssociation.tsx
- [ ] TagAssociation.tsx
- [ ] TimelineImage.tsx
- [ ] TimelineItem.tsx
- [ ] TimePalCard.tsx
- [ ] TimePalDebugger.tsx
- [ ] TimePalSettings.tsx
- [ ] TimerFloating.tsx
- [ ] Toast.tsx
- [ ] TodoAssociation.tsx
- [ ] TodoDetailModal.tsx
- [ ] UIIcon.example.tsx
- [ ] UIIcon.tsx
- [ ] UIIconSelector.tsx
- [ ] UiThemeButton.tsx (新增)
- [ ] README.md (检查/创建)

### 📁 src/views/ (26 个文件)
- [ ] AutoLinkView.tsx
- [ ] AutoRecordSettingsView.tsx
- [ ] BatchFocusRecordManageView.tsx
- [ ] BatchManageView.tsx
- [ ] CategoryDetailView.tsx
- [ ] CheckTemplateManageView.tsx
- [ ] DailyReviewView.tsx
- [ ] FilterDetailView.tsx
- [ ] FocusDetailView.tsx
- [ ] JournalView.tsx
- [ ] MemoirSettingsView.tsx
- [ ] MonthlyReviewView.tsx
- [ ] ObsidianExportView.tsx
- [ ] RecordView.tsx
- [ ] ReviewHubView.tsx
- [ ] ReviewTemplateManageView.tsx
- [ ] ScopeDetailView.tsx
- [ ] ScopeManageView.tsx
- [ ] ScopeView.tsx
- [ ] SearchView.tsx
- [ ] SettingsView.tsx
- [ ] SponsorshipView.tsx
- [ ] StatsView.tsx
- [ ] TagDetailView.tsx
- [ ] TagsView.tsx
- [ ] TimelineView.tsx
- [ ] TodoBatchManageView.tsx
- [ ] TodoView.tsx
- [ ] WeeklyReviewView.tsx
- [ ] README.md (检查/创建)

### 📁 src/hooks/ (14 个文件)
- [ ] useAppDetection.ts
- [ ] useAppInitialization.ts
- [ ] useAppLifecycle.ts
- [ ] useCustomPresets.ts
- [ ] useDeepLink.ts
- [ ] useFloatingWindow.ts
- [ ] useGoalManager.ts
- [ ] useHardwareBackButton.ts
- [ ] useIconMigration.ts
- [ ] useLogManager.ts
- [ ] useReviewManager.ts
- [ ] useScrollTracker.ts
- [ ] useSearchManager.ts
- [ ] useSyncManager.ts
- [ ] useTimePalImage.ts (新增)
- [ ] useTodoManager.ts
- [ ] README.md (检查/创建)

### 📁 src/services/ (20 个文件)
- [ ] aiService.ts
- [ ] backgroundService.ts
- [ ] colorSchemeService.ts
- [ ] dataRepairService.ts
- [ ] dualIconMigrationService.ts
- [ ] emergencyIconRepair.ts
- [ ] excelExportService.ts
- [ ] geminiService.ts
- [ ] iconMigrationService.ts
- [ ] iconService.ts
- [ ] imageCleanupService.ts
- [ ] imageService.ts
- [ ] narrativeService.ts
- [ ] navigationDecorationService.ts
- [ ] NfcService.ts
- [ ] obsidianExportService.ts
- [ ] redemptionService.ts
- [ ] s3Service.ts
- [ ] syncService.ts
- [ ] themePresetService.ts (新增)
- [ ] uiIconService.ts
- [ ] updateService.ts
- [ ] webdavService.ts
- [ ] README.md (检查/创建)

### 📁 src/contexts/ (8 个文件)
- [ ] CategoryScopeContext.tsx
- [ ] DataContext.tsx
- [ ] NavigationContext.tsx
- [ ] PrivacyContext.tsx
- [ ] ReviewContext.tsx
- [ ] SessionContext.tsx
- [ ] SettingsContext.tsx
- [ ] ToastContext.tsx
- [ ] README.md (检查/创建)

### 📁 src/utils/ (5 个文件)
- [ ] crypto.ts
- [ ] filterUtils.ts
- [ ] goalUtils.ts
- [ ] iconUtils.ts
- [ ] logUtils.ts
- [ ] resetDataTool.ts
- [ ] README.md (检查/创建)

### 📁 src/constants/ (4 个文件)
- [ ] redemptionHashes.ts
- [ ] storageKeys.ts (新增)
- [ ] timePalConfig.ts
- [ ] timePalQuotes.ts
- [ ] README.md (检查/创建)

---

## 审查进度

### 已完成 (0/129)
无

### 进行中
无

### 待审查 (129)
- components: 52 个文件
- views: 26 个文件
- hooks: 14 个文件
- services: 20 个文件
- contexts: 8 个文件
- utils: 5 个文件
- constants: 4 个文件

---

## 审查流程

### 每个文件的审查步骤
1. **读取文件内容**
2. **检查使用情况**（搜索引用）
3. **分析代码质量**
   - 冗余代码
   - 矛盾逻辑
   - 废弃代码
4. **检查文件头注释**
5. **记录问题和建议**
6. **更新进度**

### 每个文件夹的审查步骤
1. **审查所有文件**
2. **检查 README.md**
3. **创建/更新 README.md**
4. **总结该文件夹的问题**

---

## 审查记录

### 问题分类
- 🔴 严重问题：需要立即修复
- 🟡 中等问题：建议修复
- 🟢 轻微问题：可选优化
- 📝 文档问题：需要更新文档

### 问题记录格式
```markdown
#### 文件名
- 🔴/🟡/🟢/📝 问题描述
- 使用位置：[列出引用位置]
- 建议：修复方案
```

---

## 预计时间

- **components**: ~3-4 小时（52 个文件）
- **views**: ~2-3 小时（26 个文件）
- **hooks**: ~1-2 小时（14 个文件）
- **services**: ~2-3 小时（20 个文件）
- **contexts**: ~1 小时（8 个文件）
- **utils**: ~30 分钟（5 个文件）
- **constants**: ~30 分钟（4 个文件）

**总计**: 约 10-15 小时

---

## 审查策略

### 分批审查
由于文件较多，采用分批审查策略：

**第一批：核心组件** (优先级最高)
- components/TimePalSettings.tsx
- components/UiThemeButton.tsx
- services/themePresetService.ts
- hooks/useTimePalImage.ts
- constants/storageKeys.ts

**第二批：投喂功能相关**
- views/SponsorshipView.tsx
- components/PresetEditModal.tsx
- components/BackgroundSelector.tsx
- components/NavigationDecorationSelector.tsx
- components/ColorSchemeSelector.tsx

**第三批：其他 components**
- 按字母顺序逐个审查

**第四批：views**
- 按字母顺序逐个审查

**第五批：hooks、services、contexts、utils、constants**
- 按文件夹顺序审查

---

## 输出文档

### 审查报告
- `code-review-progress.md` - 进度跟踪
- `code-review-issues.md` - 问题汇总
- `code-review-recommendations.md` - 优化建议

### README 文档
- `src/components/README.md`
- `src/views/README.md`
- `src/hooks/README.md`
- `src/services/README.md`
- `src/contexts/README.md`
- `src/utils/README.md`
- `src/constants/README.md`

---

## 开始审查

准备从第一批核心组件开始审查...
