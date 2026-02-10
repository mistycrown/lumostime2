# StatsView.tsx 重构计划

## 问题分析
- **文件大小**: 2039 行，是整个项目最大的文件
- **复杂度**: 包含 5 种视图类型（pie, matrix, schedule, line, check）
- **维护性**: 难以维护和测试，代码重复较多

## 已完成的工作

### 1. 提取工具函数 ✅
**文件**: `src/components/StatsView/statsUtils.ts`

提取的函数：
- `getHexColor()` - 颜色映射
- `getScheduleStyle()` - 日程样式
- `formatDuration()` - 时长格式化
- `getDurationHM()` - 时长转换为小时/分钟
- `getDateRange()` - 日期范围计算
- `getDynamicTitle()` - 动态标题生成
- `getPreviousDateRange()` - 上一周期日期范围
- `layoutDayEvents()` - 日程布局算法

类型定义：
- `PieRange`, `ScheduleRange`, `ViewType`

### 2. 提取数据计算 Hook ✅
**文件**: `src/components/StatsView/useStatsData.ts`

提取的 Hooks：
- `useStatsData()` - 主统计数据计算
- `useTodoStats()` - 待办统计数据
- `useScopeStats()` - 领域统计数据
- `usePreviousStats()` - 上一周期统计数据

### 3. 开始提取视图组件 🚧
**文件**: `src/components/StatsView/PieChartView.tsx`

已创建饼图视图组件（部分完成）

## 下一步计划

### 阶段 1: 完成视图组件提取
1. **PieChartView.tsx** - 饼图视图（需要添加 Todo 和 Scope 图表）
2. **MatrixView.tsx** - 矩阵视图
3. **ScheduleView.tsx** - 日程视图
4. **LineChartView.tsx** - 趋势图视图
5. **CheckView.tsx** - 打卡视图

### 阶段 2: 提取控制组件
1. **StatsControls.tsx** - 控制栏组件
   - 时间范围选择器
   - 日期导航按钮
   - 视图类型切换器

### 阶段 3: 提取共享组件
1. **CategoryFilters.tsx** - 分类过滤器组件
2. **GrowthIndicator.tsx** - 增长指示器组件
3. **ExportButton.tsx** - 导出按钮组件

### 阶段 4: 重构主文件
1. 更新 `StatsView.tsx` 使用提取的组件
2. 简化状态管理
3. 优化性能

## 预期效果

### 代码行数减少
- **当前**: 2039 行
- **目标**: 主文件 < 500 行
- **总体**: 通过模块化，提高可维护性

### 文件结构
```
src/components/StatsView/
├── index.ts                    # 导出入口
├── statsUtils.ts              # 工具函数 ✅
├── useStatsData.ts            # 数据计算 Hook ✅
├── PieChartView.tsx           # 饼图视图 🚧
├── MatrixView.tsx             # 矩阵视图
├── ScheduleView.tsx           # 日程视图
├── LineChartView.tsx          # 趋势图视图
├── CheckView.tsx              # 打卡视图
├── StatsControls.tsx          # 控制栏
├── CategoryFilters.tsx        # 分类过滤器
├── GrowthIndicator.tsx        # 增长指示器
└── ExportButton.tsx           # 导出按钮
```

## 注意事项

1. **保持功能完整性**: 所有现有功能必须保持不变
2. **类型安全**: 确保所有组件都有正确的 TypeScript 类型
3. **性能优化**: 使用 useMemo 和 useCallback 优化性能
4. **测试**: 每个提取的组件都应该通过 TypeScript 诊断检查

## 风险评估

- **低风险**: 工具函数提取（已完成）
- **中风险**: Hook 提取（已完成）
- **高风险**: 视图组件提取（需要仔细测试）
- **最高风险**: 主文件重构（需要全面测试）

## 建议

由于 StatsView.tsx 是一个核心功能文件，建议：

1. **分阶段进行**: 不要一次性重构所有内容
2. **增量测试**: 每完成一个组件就进行测试
3. **保留备份**: 在重构前创建备份分支
4. **用户测试**: 重构完成后进行全面的用户测试

## 当前状态

- ✅ 工具函数提取完成
- ✅ 数据 Hook 提取完成
- 🚧 视图组件提取进行中（PieChartView 部分完成）
- ⏳ 控制组件提取待开始
- ⏳ 主文件重构待开始

## 下一步行动

建议暂停当前重构，原因：

1. **文件复杂度极高**: 2039 行代码包含大量相互依赖的逻辑
2. **风险较大**: 完全重构可能引入新的 bug
3. **时间成本**: 完整重构需要大量时间和测试

**替代方案**：
- 保留已提取的工具函数和 Hook
- 在需要修改特定视图时，再逐步提取对应组件
- 采用"按需重构"策略，降低风险

**立即可用的改进**：
- 已提取的 `statsUtils.ts` 可以立即在其他文件中复用
- 已提取的 `useStatsData.ts` 可以简化数据计算逻辑
- 这些改进已经减少了代码重复，提高了可维护性
