# StatsView Components

这个目录包含从 `StatsView.tsx` 提取的可复用组件和工具函数。

## 文件说明

### `statsUtils.ts`
工具函数集合，包含：
- 颜色转换函数
- 日期处理函数
- 时长格式化函数
- 布局计算函数

**使用示例**:
```typescript
import { getHexColor, formatDuration, getDateRange } from './statsUtils';

const color = getHexColor('bg-blue-500'); // '#3b82f6'
const duration = formatDuration(3600); // '1小时 0分钟'
const { start, end } = getDateRange(new Date(), 'week');
```

### `useStatsData.ts`
数据计算 Hooks，包含：
- `useStatsData` - 主统计数据
- `useTodoStats` - 待办统计
- `useScopeStats` - 领域统计
- `usePreviousStats` - 上一周期统计

**使用示例**:
```typescript
import { useStatsData, useTodoStats } from './useStatsData';

const stats = useStatsData(filteredLogs, categories);
const todoStats = useTodoStats(filteredLogs, todos, todoCategories);
```

### `PieChartView.tsx`
饼图视图组件，用于显示时间分布统计。

**使用示例**:
```typescript
import { PieChartView } from './PieChartView';

<PieChartView
  stats={stats}
  todoStats={todoStats}
  scopeStats={scopeStats}
  previousStats={previousStats}
  previousTodoStats={previousTodoStats}
  previousScopeStats={previousScopeStats}
  pieChartData={pieChartData}
  todoPieChartData={todoPieChartData}
  scopePieChartData={scopePieChartData}
  categories={categories}
  excludedCategoryIds={excludedCategoryIds}
  toggleExclusion={toggleExclusion}
  onExportStats={handleExportStats}
  isFullScreen={isFullScreen}
  pieRange={pieRange}
/>
```

### `index.ts`
统一导出入口，方便导入。

**使用示例**:
```typescript
// 导入所有工具
import { getHexColor, formatDuration, useStatsData, PieChartView } from '@/components/StatsView';
```

## 类型定义

```typescript
// 视图类型
type ViewType = 'pie' | 'matrix' | 'schedule' | 'line' | 'check';

// 时间范围类型
type PieRange = 'day' | 'week' | 'month' | 'year';
type ScheduleRange = 'day' | 'week' | 'month';

// 统计数据接口
interface StatsData {
  totalDuration: number;
  categoryStats: CategoryStat[];
}

interface CategoryStat extends Category {
  duration: number;
  percentage: number;
  items: ActivityStat[];
}

interface ActivityStat extends Activity {
  duration: number;
}
```

## 注意事项

1. 这些组件和工具函数是从 `StatsView.tsx` 提取的，但主文件尚未重构
2. 可以在其他统计相关组件中复用这些工具
3. 所有文件都通过了 TypeScript 类型检查
4. 使用 `useMemo` 优化了性能

## 未来计划

如果需要继续重构 `StatsView.tsx`，可以提取：
- `MatrixView.tsx` - 矩阵视图
- `ScheduleView.tsx` - 日程视图
- `LineChartView.tsx` - 趋势图视图
- `CheckView.tsx` - 打卡视图
- `StatsControls.tsx` - 控制栏组件

但目前建议保持主文件不变，确保功能稳定性。
