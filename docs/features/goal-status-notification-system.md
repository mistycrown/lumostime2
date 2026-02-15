# 目标完成状态提醒系统 - 产品设计文档

## 一、背景与问题

### 当前问题
用户反馈现在的目标系统只显示一个进度条，当目标达成或截止时间到达后，没有任何提醒。具体表现为：

1. **缺乏状态感知**：用户不知道目标何时完成、何时过期
2. **缺乏后续引导**：完成后没有庆祝或下一步行动提示
3. **缺乏灵活性**：截止日期到了但未完成，没有延期选项

### 设计目标
- 让用户明确感知目标的完成状态
- 提供流畅的交互体验
- 目标完成后引导用户创建下一个目标
- 目标未完成时提供延期选项

## 二、目标类型分析

### 2.1 正向目标（追求达成）

以下目标类型属于正向目标，用户希望达到或超过目标值：

- `duration_raw` - 原始时长
- `duration_weighted` - 有效时长
- `frequency_days` - 活跃天数
- `task_count` - 完成任务数

**特点**：进度越高越好，达到 100% 即为完成

### 2.2 负向目标（控制上限）

以下目标类型属于负向目标，用户希望不超过设定的上限：

- `duration_limit` - 时长上限

**特点**：进度越低越好，在截止日期前保持在 100% 以下即为完成

## 三、状态定义（简化版 - 方案C）

系统采用**混合方案**：
- **视觉反馈**：进度达到目标时，图标立即变化（✓ 或 ✗）
- **提示触发**：只在截止日期到达时才弹出提示框

这样既给了及时的视觉反馈，又不会过早打断用户。

### 3.1 正向目标

| 进度 | 是否过期 | 状态 | 图标 | 是否提示 |
|------|---------|------|------|---------|
| ≥ 100% | 否 | `in_progress` | ✓ CheckCircle2 | ❌ 否 |
| ≥ 100% | 是 | `completed` | ✓ CheckCircle2 | ✅ 是 |
| < 100% | 否 | `in_progress` | ○ Target | ❌ 否 |
| < 100% | 是 | `failed` | ✗ XCircle | ✅ 是 |

### 3.2 负向目标

| 进度 | 是否过期 | 状态 | 图标 | 是否提示 |
|------|---------|------|------|---------|
| < 100% | 否 | `in_progress` | ○ Target | ❌ 否 |
| < 100% | 是 | `completed` | ✓ CheckCircle2 | ✅ 是 |
| ≥ 100% | 否 | `in_progress` | ✗ XCircle | ❌ 否 |
| ≥ 100% | 是 | `failed` | ✗ XCircle | ✅ 是 |

### 3.3 核心逻辑

```typescript
// 统一的判断逻辑
if (!isExpired) {
  status = 'in_progress';  // 未到截止日期，都是进行中
} else {
  // 已到截止日期，根据进度判定
  if (isLimitGoal) {
    status = percentage < 100 ? 'completed' : 'failed';
  } else {
    status = percentage >= 100 ? 'completed' : 'failed';
  }
}

// 图标逻辑（提供视觉反馈）
if (isLimitGoal) {
  if (percentage >= 100) return XCircle;      // 超标
  if (isExpired) return CheckCircle2;         // 成功控制
  return Target;                              // 进行中
} else {
  if (percentage >= 100) return CheckCircle2; // 达成目标
  if (isExpired) return XCircle;              // 过期未完成
  return Target;                              // 进行中
}
```

## 四、视觉设计

### 4.1 状态图标（简化版）

在目标卡片上，通过改变图标来表示不同状态。图标颜色保持与主题色一致（`var(--accent-color)`），只改变图标形状。

#### 正向目标图标（Lucide Icons）

| 状态 | 图标组件 | 说明 |
|------|---------|------|
| **进行中** | `Target` | 默认的目标圆圈图标 |
| **已完成** | `CheckCircle2` | 圆圈内带勾 |
| **已失败** | `XCircle` | 圆圈内带叉 |

#### 负向目标图标（Lucide Icons）

| 状态 | 图标组件 | 说明 |
|------|---------|------|
| **进行中** | `Target` | 默认的目标圆圈图标 |
| **成功控制** | `CheckCircle2` | 圆圈内带勾 |
| **超标失败** | `XCircle` | 圆圈内带叉 |

#### 图标使用示例

```tsx
import { Target, CheckCircle2, XCircle } from 'lucide-react';

// 根据状态选择图标（简化版）
const getGoalIcon = (percentage: number, isExpired: boolean, isLimitGoal: boolean) => {
  if (isLimitGoal) {
    // 负向目标
    if (percentage >= 100) return XCircle;      // 超标失败
    if (isExpired) return CheckCircle2;         // 成功控制
    return Target;                              // 进行中
  } else {
    // 正向目标
    if (percentage >= 100) return CheckCircle2; // 完成
    if (isExpired) return XCircle;              // 失败
    return Target;                              // 进行中
  }
};

// 使用
const IconComponent = getGoalIcon(percentage, isExpired, isLimitGoal);
<IconComponent size={12} style={{ color: 'var(--accent-color)' }} />
```

### 4.2 交互式状态卡片（简化版）

只有"完成"和"失败"两种状态会显示提示卡片。

#### 场景A：目标完成（正向/负向通用）

**第一步：显示完成提示**

```
┌─────────────────────────────────────────┐
│ 🎉 恭喜！你完成了目标「文献阅读百篇」    │
│                                         │
│ 实际完成：105篇 / 目标：100篇           │
│ 完成率：105%                            │
│                                         │
│ [归档此目标]                    [取消]  │
└─────────────────────────────────────────┘
```

**操作选项：**
- **归档此目标**：将状态改为 `archived`，进入第二步
- **取消**：关闭提示，目标保持完成状态（未归档）

**第二步：归档后引导创建新目标**

点击"归档此目标"后，卡片内容变化：

```
┌─────────────────────────────────────────┐
│ ✅ 目标已归档                            │
│                                         │
│ 想要继续挑战吗？                        │
│                                         │
│ [创建下一个目标]                [关闭]  │
└─────────────────────────────────────────┘
```

**操作选项：**
- **创建下一个目标**：打开目标创建表单，自动填充相关领域，卡片自动关闭
- **关闭**：关闭提示卡片

#### 场景B：目标失败

**正向目标失败：**

```
┌─────────────────────────────────────────┐
│ ⏰ 目标「专业输入」已过期 3 天           │
│                                         │
│ 当前进度：65h / 100h (65%)              │
│ 还差：35小时                            │
│                                         │
│ [延长 10 天]            [重新再来]      │
└─────────────────────────────────────────┘
```

**负向目标失败：**

```
┌─────────────────────────────────────────┐
│ ⚠️ 注意！「刷手机时间」已超过上限        │
│                                         │
│ 当前用时：35h / 上限：30h (117%)        │
│ 超出：5小时                             │
│                                         │
│ [重新再来]                              │
└─────────────────────────────────────────┘
```

**操作选项：**
- **延长 X 天**（仅正向目标）：智能计算延长天数（至少延长到今天之后），自动修改 `endDate`，卡片自动关闭
- **重新再来**：归档当前失败的目标，并自动打开目标创建表单（自动填充相关领域），卡片自动关闭

## 五、显示逻辑

### 5.1 状态卡片显示位置

- **ScopeView**：在对应领域卡片内部，目标列表上方
- **ScopeDetailView**：在"目标"标签页顶部

### 5.2 显示优先级（简化版）

当一个领域有多个目标处于不同状态时，按以下优先级显示：

1. **已完成目标**（最高优先级，鼓励正反馈）
2. **已失败目标**

每个领域最多同时显示 1 个状态卡片。

### 5.3 自动隐藏规则

- 用户点击"×"后，该提示卡片在当前会话中隐藏
- 使用 `localStorage` 记录已关闭的提示
  - Key: `dismissed_goal_alerts`
  - Value: `{ goalId: timestamp }`
- 如果用户执行了操作（归档/延期/创建新目标），自动隐藏
- 24小时后重新显示（如果状态未改变）

## 六、数据结构

### 6.1 Goal 类型扩展

```typescript
interface Goal {
  // ... 现有字段
  
  // 新增字段
  actualCompletedDate?: string;  // 实际完成日期（进度首次达到100%的日期）
  extendedCount?: number;        // 延期次数
  dismissedAlerts?: string[];    // 已关闭的提醒类型
}
```

### 6.2 状态计算函数（简化版）

```typescript
type GoalStatus = 
  | 'completed'      // 完成
  | 'failed'         // 失败
  | 'in_progress';   // 进行中

const calculateGoalStatus = (
  goal: Goal, 
  progress: number
): GoalStatus => {
  const now = Date.now();
  const endTime = new Date(goal.endDate).setHours(23, 59, 59, 999);
  const isExpired = now > endTime;
  const isLimitGoal = goal.metric === 'duration_limit';
  
  // 负向目标（时长上限）
  if (isLimitGoal) {
    if (percentage >= 100) return 'failed';      // 超标失败
    if (isExpired) return 'completed';           // 成功控制
    return 'in_progress';
  }
  
  // 正向目标
  if (percentage >= 100) return 'completed';     // 完成
  if (isExpired) return 'failed';                // 失败
  return 'in_progress';
};
```

## 七、技术实现

### 7.1 组件结构

```
src/components/
├── GoalStatusAlert.tsx          # 状态提示卡片组件（主组件）
│   ├── CompletedAlert           # 完成庆祝卡片
│   ├── OverdueAlert             # 过期提醒卡片
│   ├── DeadlineWarningAlert     # 临近截止预警卡片
│   ├── ControlledAlert          # 负向目标成功控制卡片
│   ├── ExceededAlert            # 负向目标超标卡片
│   └── LimitWarningAlert        # 负向目标接近上限预警
├── GoalStatusBadge.tsx          # 状态徽章组件
└── GoalCard.tsx                 # 目标卡片（增加状态徽章显示）

src/hooks/
└── useGoalStatus.ts             # 自定义 Hook：计算目标状态

src/utils/
└── goalStatusUtils.ts           # 状态计算和格式化工具函数
```

### 7.2 核心 Hook

```typescript
// src/hooks/useGoalStatus.ts
export const useGoalStatus = (goal: Goal, logs: Log[], todos: TodoItem[]) => {
  const { current, target, percentage } = calculateGoalProgress(goal, logs, todos);
  const status = calculateGoalStatus(goal, percentage);
  
  return {
    status,
    progress: {
      current,
      target,
      percentage
    },
    isCompleted: status === 'completed_on_time' || 
                 status === 'completed_overdue' || 
                 status === 'completed_controlled',
    isFailed: status === 'overdue_incomplete' || 
              status === 'failed_exceeded',
    needsAttention: status === 'near_deadline' || 
                    status === 'warning_near_limit' ||
                    status === 'overdue_incomplete' ||
                    status === 'failed_exceeded'
  };
};
```

### 7.3 LocalStorage 管理

```typescript
// src/utils/goalAlertStorage.ts
interface DismissedAlert {
  goalId: string;
  alertType: GoalStatus;
  dismissedAt: number;
}

export const dismissAlert = (goalId: string, alertType: GoalStatus) => {
  const key = 'dismissed_goal_alerts';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push({
    goalId,
    alertType,
    dismissedAt: Date.now()
  });
  localStorage.setItem(key, JSON.stringify(existing));
};

export const isAlertDismissed = (goalId: string, alertType: GoalStatus): boolean => {
  const key = 'dismissed_goal_alerts';
  const dismissed: DismissedAlert[] = JSON.parse(localStorage.getItem(key) || '[]');
  
  const alert = dismissed.find(d => d.goalId === goalId && d.alertType === alertType);
  if (!alert) return false;
  
  // 24小时后重新显示
  const hoursSinceDismissed = (Date.now() - alert.dismissedAt) / (1000 * 60 * 60);
  return hoursSinceDismissed < 24;
};
```

## 八、用户体验优化

### 8.1 正向激励

- 完成目标时显示 confetti 庆祝动画
- 使用积极的文案和图标（🎉、✅）
- 突出显示超额完成的部分

### 8.2 智能建议

- 根据历史数据建议下一个目标的合理数值
- 显示"按当前速度预计完成日期"
- 提供常用的延期选项（7天/30天）

### 8.3 数据保留

- 失败/延期的目标不删除，保留在归档中供复盘
- 记录延期次数，帮助用户了解目标设定是否合理

## 九、实现优先级

### P0（核心功能）
- [ ] 目标状态自动检测（`useGoalStatus` Hook）
- [ ] 状态徽章显示（`GoalStatusBadge` 组件）
- [ ] 完成状态提示卡片（正向目标）
- [ ] 过期状态提示卡片（正向目标）
- [ ] 延期功能
- [ ] 负向目标完成/失败检测

### P1（体验优化）
- [ ] 临近截止预警（正向目标）
- [ ] 接近上限预警（负向目标）
- [ ] 完成庆祝动画
- [ ] 创建下一个目标的快捷入口
- [ ] LocalStorage 提示管理

### P2（高级功能）
- [ ] 进度预测（按当前速度预计完成日期）
- [ ] 智能目标建议
- [ ] 目标复盘统计
- [ ] 延期历史记录

## 十、关键差异总结

| 维度 | 正向目标 | 负向目标 |
|------|---------|---------|
| **完成条件** | 进度 ≥ 100% | 进度 < 100% 且已过期 |
| **失败条件** | 已过期且进度 < 100% | 进度 ≥ 100% |
| **预警条件** | 进度 < 80% 且临近截止 | 进度 > 80% 且临近截止 |
| **完成文案** | "恭喜完成" | "成功控制" |
| **失败文案** | "未完成" | "已超标" |
| **进度条颜色** | 绿色（好）→ 黄色（警告）→ 灰色（失败） | 绿色（好）→ 黄色（警告）→ 红色（超标） |
| **完成后操作** | 归档 / 创建下一个目标 | 仅归档 |
| **失败后操作** | 延期 / 标记为失败 | 仅归档 |

## 十一、设计原则

1. **及时反馈**：状态变化时立即通知用户
2. **正向激励**：优先显示完成状态，给予正反馈
3. **操作便捷**：提供一键操作，减少用户思考成本
4. **尊重选择**：允许用户关闭提示，不强制打扰
5. **区分对待**：正向目标和负向目标使用不同的交互逻辑

---

**文档版本**：v1.0  
**创建日期**：2026-02-15  
**最后更新**：2026-02-15
