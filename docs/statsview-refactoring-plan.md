# StatsView.tsx 重构计划

**创建日期**: 2026-02-10  
**优先级**: 🔴 P0 - 极高优先级  
**当前状态**: 规划中

---

## 📊 现状分析

### 文件规模
- **当前行数**: 2039 行
- **问题严重性**: 整个项目最大的文件
- **维护难度**: 极高

### 包含的视图类型
1. **Pie Chart View** (环形图) - 活动/待办/领域分布
2. **Matrix View** (矩阵图) - 活动一致性打卡
3. **Schedule View** (时间表) - 日/周/月日程
4. **Line Chart View** (折线图) - 活动/待办/领域趋势
5. **Check View** (日课统计) - 习惯打卡热力图

### 核心问题
1. **代码重复**: 统计计算逻辑在多个 useMemo 中重复（300+ 行）
2. **职责过多**: 5 种视图混在一个文件中（1500+ 行视图代码）
3. **复杂计算**: SVG 路径计算、图表渲染逻辑复杂（200+ 行）
4. **难以测试**: 所有逻辑耦合在一起
5. **性能问题**: 大量 useMemo 计算，重渲染成本高

---

## 🎯 重构目标

### 预期成果
- **减少代码量**: 从 2039 行减少到 200-300 行（主文件）
- **提高复用性**: 创建可复用的统计计算 Hooks 和图表组件
- **改善性能**: 优化计算逻辑，减少不必要的重渲染
- **便于维护**: 每个视图独立文件，职责清晰
- **易于测试**: 独立的工具函数和 Hooks 可单独测试

---

## 📋 重构步骤

### 第一步: 提取统计计算 Hooks（减少 300+ 行重复）

#### 1.1 创建 `src/hooks/useStatsCalculation.ts`

**功能**: 统一的活动统计计算逻辑

**输入**:
- `logs: Log[]` - 日志数据
- `categories: Category[]` - 分类数据
- `dateRange: { start: Date; end: Date }` - 日期范围
- `excludedCategoryIds: string[]` - 排除的分类

**输出**:
```typescript
{
  totalDuration: number;
  categoryStats: CategoryStat[];
  previousStats: { catDurations: Map<string, number>; actDurations: Map<string, number> };
}
```

**预计减少**: 约 100 行重复代码

#### 1.2 创建 `src/hooks/useTodoStats.ts`

**功能**: 待办专注时间统计

**输入**:
- `logs: Log[]`
- `todos: TodoItem[]`
- `todoCategories: TodoCategory[]`
- `dateRange: { start: Date; end: Date }`

**输出**:
```typescript
{
  totalDuration: number;
  categoryStats: TodoCategoryStat[];
  previousStats: { categoryDurations: Map<string, number>; todoDurations: Map<string, number> };
}
```

**预计减少**: 约 100 行重复代码

#### 1.3 创建 `src/hooks/useScopeStats.ts`

**功能**: 领域专注时间统计（支持多领域分割）

**输入**:
- `logs: Log[]`
- `scopes: Scope[]`
- `categories: Category[]`
- `dateRange: { start: Date; end: Date }`

**输出**:
```typescript
{
  totalDuration: number;
  categoryStats: ScopeStat[];
  previousStats: { scopeDurations: Map<string, number> };
}
```

**预计减少**: 约 100 行重复代码

---

### 第二步: 提取图表工具函数（提高复用性）

#### 2.1 创建 `src/utils/chartUtils.ts`

**包含函数**:
1. `calculatePieChartPath()` - 计算饼图 SVG 路径
2. `getChartColor()` - 获取图表颜色
3. `formatChartDuration()` - 格式化时长显示
4. `generateLineChartPath()` - 生成折线图路径
5. `calculateYAxisTicks()` - 计算 Y 轴刻度

**预计减少**: 约 150 行重复代码

---

### 第三步: 拆分视图组件（减少 1500+ 行）

#### 3.1 创建 `src/components/stats/PieChartView.tsx` (约 300 行)

**功能**: 环形图视图（活动/待办/领域分布）

**Props**:
```typescript
interface PieChartViewProps {
  stats: StatsData;
  todoStats: TodoStatsData;
  scopeStats: ScopeStatsData;
  previousStats: PreviousStatsData;
  onExport: () => void;
  pieRange: PieRange;
}
```

#### 3.2 创建 `src/components/stats/MatrixView.tsx` (约 200 行)

**功能**: 矩阵图视图（活动一致性）

**Props**:
```typescript
interface MatrixViewProps {
  logs: Log[];
  categories: Category[];
  dateRange: { start: Date; end: Date };
  excludedCategoryIds: string[];
}
```

#### 3.3 创建 `src/components/stats/ScheduleView.tsx` (约 300 行)

**功能**: 日程视图（日/周/月）

**Props**:
```typescript
interface ScheduleViewProps {
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  scopes: Scope[];
  currentDate: Date;
  scheduleRange: ScheduleRange;
  isFullScreen: boolean;
}
```

#### 3.4 创建 `src/components/stats/LineChartView.tsx` (约 200 行)

**功能**: 折线图视图（趋势分析）

**Props**:
```typescript
interface LineChartViewProps {
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  scopes: Scope[];
  dateRange: { start: Date; end: Date };
  lineRange: 'week' | 'month';
  excludedCategoryIds: string[];
}
```

#### 3.5 创建 `src/components/stats/CheckView.tsx` (约 200 行)

**功能**: 日课打卡视图（习惯追踪）

**Props**:
```typescript
interface CheckViewProps {
  dailyReviews: DailyReview[];
  dateRange: { start: Date; end: Date };
  pieRange: PieRange;
}
```

---

### 第四步: 重构主文件 StatsView.tsx（减少到 200-300 行）

**保留功能**:
- 视图类型切换逻辑
- 时间范围选择
- 日期导航
- 触摸手势处理
- 全屏模式控制
- 分类过滤状态管理

**新结构**:
```typescript
export const StatsView: React.FC<StatsViewProps> = ({ ... }) => {
  // 1. 状态管理 (50 行)
  const [viewType, setViewType] = useState<ViewType>('pie');
  const [pieRange, setPieRange] = useState<PieRange>('day');
  // ...

  // 2. 使用新的 Hooks (30 行)
  const stats = useStatsCalculation(logs, categories, effectiveRange, excludedCategoryIds);
  const todoStats = useTodoStats(logs, todos, todoCategories, effectiveRange);
  const scopeStats = useScopeStats(logs, scopes, categories, effectiveRange);

  // 3. 导航和手势处理 (50 行)
  const handleNavigateDate = (direction: 'prev' | 'next') => { ... };
  const onTouchStart = (e: React.TouchEvent) => { ... };
  // ...

  // 4. 视图渲染 (100 行)
  return (
    <div>
      {/* 控制栏 */}
      {!hideControls && <ControlBar />}

      {/* 视图内容 */}
      {viewType === 'pie' && <PieChartView {...pieProps} />}
      {viewType === 'matrix' && <MatrixView {...matrixProps} />}
      {viewType === 'schedule' && <ScheduleView {...scheduleProps} />}
      {viewType === 'line' && <LineChartView {...lineProps} />}
      {viewType === 'check' && <CheckView {...checkProps} />}
    </div>
  );
};
```

---

## ⚠️ 风险评估

### 高风险点
1. **Props 传递**: 确保所有必要的数据都正确传递给子组件
2. **状态同步**: 分类过滤、日期范围等状态需要正确同步
3. **性能影响**: 拆分后可能增加 Props 传递开销
4. **类型安全**: 需要定义清晰的接口类型

### 降低风险策略
1. **渐进式重构**: 一次只重构一个视图
2. **保留原文件**: 重构完成前不删除原文件
3. **充分测试**: 每个步骤完成后进行功能测试
4. **TypeScript 检查**: 确保所有类型错误都被修复

---

## 📅 执行计划

### 阶段 1: 准备工作（1 小时）
- [x] 完整读取 StatsView.tsx
- [x] 创建重构计划文档
- [ ] 备份原文件

### 阶段 2: 提取 Hooks（2 小时）
- [ ] 创建 useStatsCalculation.ts
- [ ] 创建 useTodoStats.ts
- [ ] 创建 useScopeStats.ts
- [ ] 运行 TypeScript 诊断

### 阶段 3: 提取工具函数（1 小时）
- [ ] 创建 chartUtils.ts
- [ ] 测试工具函数

### 阶段 4: 拆分视图组件（4 小时）
- [ ] 创建 PieChartView.tsx
- [ ] 创建 MatrixView.tsx
- [ ] 创建 ScheduleView.tsx
- [ ] 创建 LineChartView.tsx
- [ ] 创建 CheckView.tsx

### 阶段 5: 重构主文件（2 小时）
- [ ] 更新 StatsView.tsx 使用新组件
- [ ] 删除旧代码
- [ ] 运行 TypeScript 诊断

### 阶段 6: 测试和优化（1 小时）
- [ ] 功能测试（所有视图）
- [ ] 性能测试
- [ ] 修复发现的问题

**预计总时间**: 11 小时

---

## 📈 预期收益

### 代码质量
- **可维护性**: ⭐⭐⭐⭐⭐ (从 ⭐⭐ 提升)
- **可测试性**: ⭐⭐⭐⭐⭐ (从 ⭐ 提升)
- **可复用性**: ⭐⭐⭐⭐⭐ (从 ⭐⭐ 提升)

### 代码量
- **主文件**: 2039 行 → 200-300 行 (-85%)
- **总代码量**: 2039 行 → 约 1800 行 (-12%)
- **重复代码**: 300+ 行 → 0 行 (-100%)

### 性能
- **初始渲染**: 预计提升 10-20%
- **视图切换**: 预计提升 30-40%
- **内存占用**: 预计减少 15-25%

---

## 🔄 后续优化

### 短期（1-2 周）
1. 为新 Hooks 添加单元测试
2. 优化图表渲染性能
3. 添加错误边界处理

### 中期（1 个月）
1. 提取通用的图表组件库
2. 支持自定义图表配置
3. 添加数据导出功能增强

### 长期（3 个月）
1. 支持更多图表类型
2. 添加交互式图表功能
3. 支持图表动画效果

---

## 📝 注意事项

1. **不影响现有功能**: 所有重构必须保持功能一致
2. **TypeScript 类型安全**: 所有新代码必须有完整的类型定义
3. **文档注释**: 遵循统一的注释格式（@file, @input, @output, @pos, @description）
4. **性能监控**: 重构后需要对比性能指标
5. **用户体验**: 确保视图切换流畅，无明显延迟

---

**状态**: ✅ 计划完成，等待执行
