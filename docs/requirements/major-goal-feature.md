# 大目标功能需求文档

## 一、功能概述

### 1.1 背景
当前系统中的目标（Goal）是平级的，缺乏延续性和层级组织能力。用户在设定长期目标时，需要将其拆分为多个时间段的小目标，但这些小目标之间缺少关联，难以统一管理和查看整体进度。

### 1.2 目标
引入"大目标"（MajorGoal）功能，作为同类型目标的时间序列分组，帮助用户：
- 将长期目标拆分为多个连续的时间段
- 统一管理和查看总体进度
- 保持目标类型和筛选条件的一致性
- 提升目标管理的延续性和结构化程度

### 1.3 核心概念
**大目标（MajorGoal）** = 同一类型（metric）的多个小目标（Goal）的时间序列分组

**关键特征：**
- 所有子目标必须是同一类型（duration_raw、task_count 等）
- 子目标按时间顺序排列（建议时间段不重叠）
- 大目标显示所有子目标的总计进度
- 大目标的筛选器自动继承给所有子目标

## 二、数据结构设计

### 2.1 MajorGoal 类型定义

```typescript
interface MajorGoal {
  // 基础信息
  id: string;
  title: string;              // 大目标名称，如 "Q1 广韵文献攻坚"
  scopeId: string;            // 所属领域
  
  // 核心：指定统一的目标类型
  metric: Goal['metric'];     // 所有子目标必须是这个类型
                              // 'duration_raw' | 'task_count' | 'duration_weighted' 
                              // | 'frequency_days' | 'duration_limit'
  
  // 时间范围（自动计算）
  startDate: string;          // 自动计算：最早的子目标开始时间
  endDate: string;            // 自动计算：最晚的子目标结束时间
  
  // 描述与动机
  description?: string;       // 详细描述
  motivation?: string;        // 设立这个大目标的原因
  
  // 筛选器（继承给所有子目标）
  filterActivityIds?: string[];           // 限定标签 ID 列表
  filterTodoCategories?: string[];        // 限定待办清单 ID 列表
  filterTodoCategorySource?: string[];    // 限定关联的待办清单来源
  
  // 状态
  status: 'active' | 'completed' | 'archived';
  
  // 元数据
  createdAt: string;
  updatedAt: string;
  order?: number;             // 在领域内的排序
}
```

### 2.2 Goal 类型更新

```typescript
interface Goal {
  // ... 现有所有字段保持不变
  
  // 新增字段
  majorGoalId?: string;       // 关联的大目标 ID（如果为空，则是独立目标）
  order?: number;             // 在大目标中的排序（按时间自动排序）
}
```

### 2.3 数据约束规则

1. **类型一致性**：大目标下的所有子目标的 `metric` 必须与大目标的 `metric` 相同
2. **时间顺序**：子目标按 `startDate` 自动排序
3. **时间建议**：子目标的时间段建议不重叠（非强制，但给出警告）
4. **筛选器继承**：子目标自动继承大目标的筛选器设置
5. **时间范围自动计算**：大目标的 `startDate` 和 `endDate` 根据子目标自动计算


## 三、功能需求

### 3.1 进度计算逻辑

#### 3.1.1 大目标总进度
```typescript
majorGoalProgress = {
  current: sum(childGoals.map(g => calculateGoalProgress(g).current)),
  target: sum(childGoals.map(g => g.targetValue)),
  percentage: (current / target) * 100
}
```

#### 3.1.2 子目标进度
- 每个子目标独立计算进度（使用现有的 `calculateGoalProgress` 函数）
- 子目标的进度计算基于其自身的时间范围和筛选条件

#### 3.1.3 状态判断
- **进行中**：当前时间在大目标时间范围内，且进度 < 100%
- **已完成**：进度 >= 100%（对于正向目标）或进度 < 100%（对于 duration_limit）
- **已归档**：用户手动归档

### 3.2 创建大目标

#### 3.2.1 创建方式一：从零创建
1. 用户点击"创建大目标"按钮
2. 填写大目标基本信息：
   - 名称（必填）
   - 目标类型（必填，从 5 种类型中选择）
   - 描述（可选）
   - 动机（可选）
   - 筛选条件（可选）
3. 添加至少一个阶段目标：
   - 阶段名称（必填）
   - 时间范围（必填）
   - 目标值（必填）
4. 系统自动计算大目标的时间范围和总目标值
5. 保存后创建大目标和所有子目标

#### 3.2.2 创建方式二：组合现有目标
1. 用户选择多个相同类型的独立目标
2. 点击"组合为大目标"按钮
3. 填写大目标名称和描述
4. 系统自动：
   - 检查目标类型是否一致
   - 按时间排序子目标
   - 计算时间范围和总目标值
   - 合并筛选条件（如果一致）
5. 保存后将选中的目标关联到新创建的大目标


### 3.3 编辑大目标

#### 3.3.1 可编辑字段
- 名称
- 描述
- 动机
- 筛选条件（会影响所有子目标）
- 状态（active/completed/archived）

#### 3.3.2 不可编辑字段
- 目标类型（metric）- 创建后不可更改
- 时间范围（startDate/endDate）- 自动计算

#### 3.3.3 编辑子目标
- 可以添加新的阶段目标
- 可以编辑现有阶段目标的名称、时间、目标值
- 可以删除阶段目标
- 可以调整阶段目标的顺序（按时间自动排序）

### 3.4 删除大目标

#### 3.4.1 删除选项
用户删除大目标时，提供两个选项：
1. **删除大目标，保留子目标**：子目标变为独立目标
2. **删除大目标和所有子目标**：彻底删除

#### 3.4.2 确认提示
- 显示将要删除的大目标名称
- 显示包含的子目标数量
- 显示当前总进度
- 要求用户确认操作

### 3.5 归档大目标

#### 3.5.1 归档逻辑
- 归档大目标时，所有子目标也会被归档
- 归档后的大目标和子目标不再显示在主列表中
- 可以在"已归档"区域查看

#### 3.5.2 恢复归档
- 恢复大目标时，所有子目标也会被恢复
- 恢复后的状态根据当前时间和进度自动判断

### 3.6 添加阶段目标

#### 3.6.1 添加流程
1. 在大目标卡片中点击"添加阶段目标"
2. 填写阶段信息：
   - 阶段名称（必填）
   - 时间范围（必填）
   - 目标值（必填）
3. 系统自动：
   - 继承大目标的类型和筛选器
   - 检查时间是否重叠（给出警告）
   - 更新大目标的时间范围
4. 保存后创建新的子目标并关联到大目标

#### 3.6.2 时间重叠检查
- 如果新阶段的时间与现有阶段重叠，给出警告
- 允许用户继续创建（非强制约束）
- 建议用户调整时间范围


### 3.7 独立目标管理

#### 3.7.1 独立目标定义
- `majorGoalId` 为空的目标称为"独立目标"
- 独立目标可以随时关联到大目标
- 独立目标可以与大目标并存

#### 3.7.2 关联到大目标
1. 在独立目标卡片中点击"关联到大目标"
2. 选择目标大目标（只显示类型匹配的大目标）
3. 系统检查类型是否一致
4. 确认后将目标关联到大目标

#### 3.7.3 从大目标中移除
1. 在子目标卡片中点击"移出大目标"
2. 确认后将目标变为独立目标
3. 大目标的时间范围和总进度自动更新

## 四、UI 设计

### 4.1 页面结构

#### 4.1.1 目标 Tab 整体布局
```
ScopeDetailView > 目标 Tab
├─ 大目标列表
│  ├─ MajorGoalCard 1
│  ├─ MajorGoalCard 2
│  └─ [+ 创建大目标]
├─ 独立目标列表
│  ├─ GoalCard 1
│  ├─ GoalCard 2
│  └─ [+ 创建独立目标]
└─ 已归档区域（折叠）
   ├─ 已归档的大目标
   └─ 已归档的独立目标
```

### 4.2 大目标卡片（MajorGoalCard）

#### 4.2.1 卡片结构
```
┌───────────────────────────────────────────────┐
│ 🎯 Q1 广韵文献攻坚              [编辑] [归档] │
│ 📊 duration_raw (原始时长)                    │
│ 📅 2024-01-01 ~ 2024-03-31  ⏱ 剩余 45 天     │
│                                                │
│ 总进度: ████████░░░░░░░░ 44% (145/330小时)   │
│                                                │
│ ▼ 包含 3 个阶段目标                           │
│                                                │
│   ✓ 第一阶段学习                              │
│      2024-01-01 ~ 2024-01-31                  │
│      ████████████████████ 100% (100/100h)    │
│                                                │
│   ⏳ 第二阶段学习                             │
│      2024-02-01 ~ 2024-02-28                  │
│      ██████░░░░░░░░░░░░░░ 30% (45/150h)      │
│                                                │
│   ⏹ 第三阶段学习                              │
│      2024-03-01 ~ 2024-03-31                  │
│      ░░░░░░░░░░░░░░░░░░░░ 0% (0/80h)         │
│                                                │
│   [+ 添加阶段目标]                            │
└───────────────────────────────────────────────┘
```

#### 4.2.2 卡片元素说明
1. **头部区域**
   - 大目标图标和名称
   - 编辑、归档按钮
   
2. **信息区域**
   - 目标类型标签（带图标）
   - 时间范围和剩余天数
   
3. **进度区域**
   - 总进度条（使用主题色）
   - 百分比和数值显示
   
4. **子目标列表**
   - 可折叠/展开
   - 按时间顺序排列
   - 每个子目标显示：
     - 状态图标（✓ 已完成 / ⏳ 进行中 / ⏹ 未开始）
     - 名称
     - 时间范围
     - 进度条和百分比
   
5. **操作区域**
   - 添加阶段目标按钮


### 4.3 创建大目标对话框

#### 4.3.1 对话框结构
```
┌─────────────────────────────────────────┐
│ 创建大目标                    [×]        │
├─────────────────────────────────────────┤
│                                         │
│ 大目标名称 *                            │
│ ┌─────────────────────────────────────┐ │
│ │ Q1 广韵文献攻坚                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 目标类型 *                              │
│ ┌─────────────────────────────────────┐ │
│ │ [原始时长 ▼]                        │ │
│ │   原始时长 (duration_raw)           │ │
│ │   待办数量 (task_count)             │ │
│ │   有效时长 (duration_weighted)      │ │
│ │   活跃天数 (frequency_days)         │ │
│ │   时长上限 (duration_limit)         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 描述（可选）                            │
│ ┌─────────────────────────────────────┐ │
│ │ 系统性学习广韵音韵体系，建立完整的  │ │
│ │ 知识框架...                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 动机（可选）                            │
│ ┌─────────────────────────────────────┐ │
│ │ 为深入研究古汉语打下坚实基础...     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 筛选条件（可选，继承给所有阶段目标）    │
│ ☐ 限定标签                             │
│   [选择标签 ▼]                         │
│ ☐ 限定待办清单                         │
│   [选择清单 ▼]                         │
│                                         │
│ 阶段目标（至少添加一个）*               │
│ ┌─────────────────────────────────────┐ │
│ │ 1. 第一阶段学习          [编辑] [×] │ │
│ │    2024-01-01 ~ 2024-01-31         │ │
│ │    目标：100 小时                   │ │
│ │                                     │ │
│ │ 2. 第二阶段学习          [编辑] [×] │ │
│ │    2024-02-01 ~ 2024-02-28         │ │
│ │    目标：150 小时                   │ │
│ │                                     │ │
│ │ [+ 添加阶段目标]                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 💡 大目标时间范围：2024-01-01 ~ 2024-02-28 │
│    总目标值：250 小时                   │
│                                         │
│          [取消]           [创建]        │
└─────────────────────────────────────────┘
```

#### 4.3.2 表单验证
- 大目标名称：必填，不能为空
- 目标类型：必填，必须选择一个
- 阶段目标：至少添加一个
- 阶段时间：不能为空，建议不重叠

### 4.4 添加阶段目标对话框

#### 4.4.1 对话框结构
```
┌─────────────────────────────────────────┐
│ 添加阶段目标                  [×]        │
│ 大目标：Q1 广韵文献攻坚                 │
│ 类型：duration_raw (原始时长)          │
├─────────────────────────────────────────┤
│                                         │
│ 阶段名称 *                              │
│ ┌─────────────────────────────────────┐ │
│ │ 第三阶段学习                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 时间范围 *                              │
│ ┌──────────────┐  ~  ┌──────────────┐  │
│ │ 2024-03-01   │     │ 2024-03-31   │  │
│ └──────────────┘     └──────────────┘  │
│                                         │
│ ⚠️ 警告：时间与"第二阶段"部分重叠       │
│                                         │
│ 目标值 *                                │
│ ┌─────────────────────────────────────┐ │
│ │ 80                           小时    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 💡 筛选条件将自动继承大目标设置：       │
│    标签：广韵学习                       │
│                                         │
│          [取消]           [添加]        │
└─────────────────────────────────────────┘
```

#### 4.4.2 时间重叠检查
- 实时检查新阶段时间是否与现有阶段重叠
- 如果重叠，显示警告信息
- 允许用户继续创建（非强制）


### 4.5 编辑大目标对话框

#### 4.5.1 对话框结构
```
┌─────────────────────────────────────────┐
│ 编辑大目标                    [×]        │
├─────────────────────────────────────────┤
│                                         │
│ 大目标名称 *                            │
│ ┌─────────────────────────────────────┐ │
│ │ Q1 广韵文献攻坚                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 目标类型（不可更改）                    │
│ ┌─────────────────────────────────────┐ │
│ │ 原始时长 (duration_raw)      [锁定] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 描述                                    │
│ ┌─────────────────────────────────────┐ │
│ │ 系统性学习广韵音韵体系...           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 动机                                    │
│ ┌─────────────────────────────────────┐ │
│ │ 为深入研究古汉语打下坚实基础...     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 筛选条件                                │
│ ☑ 限定标签                             │
│   [广韵学习] [×]  [+ 添加]             │
│ ☐ 限定待办清单                         │
│   [选择清单 ▼]                         │
│                                         │
│ 状态                                    │
│ ┌─────────────────────────────────────┐ │
│ │ ● 进行中 (active)                   │ │
│ │ ○ 已完成 (completed)                │ │
│ │ ○ 已归档 (archived)                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 阶段目标管理                            │
│ ┌─────────────────────────────────────┐ │
│ │ 共 3 个阶段目标                     │ │
│ │ [管理阶段目标]                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│          [取消]           [保存]        │
└─────────────────────────────────────────┘
```

#### 4.5.2 管理阶段目标对话框
```
┌─────────────────────────────────────────┐
│ 管理阶段目标                  [×]        │
│ 大目标：Q1 广韵文献攻坚                 │
├─────────────────────────────────────────┤
│                                         │
│ 阶段目标列表（按时间排序）              │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ 第一阶段学习      [编辑] [删除]   │ │
│ │   2024-01-01 ~ 2024-01-31          │ │
│ │   目标：100小时 | 进度：100%        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⏳ 第二阶段学习     [编辑] [删除]   │ │
│ │   2024-02-01 ~ 2024-02-28          │ │
│ │   目标：150小时 | 进度：30%         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⏹ 第三阶段学习     [编辑] [删除]   │ │
│ │   2024-03-01 ~ 2024-03-31          │ │
│ │   目标：80小时 | 进度：0%           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ 添加阶段目标]                        │
│                                         │
│ 💡 大目标时间范围：2024-01-01 ~ 2024-03-31 │
│    总目标值：330 小时                   │
│                                         │
│          [关闭]                         │
└─────────────────────────────────────────┘
```

### 4.6 删除确认对话框

```
┌─────────────────────────────────────────┐
│ 删除大目标                    [×]        │
├─────────────────────────────────────────┤
│                                         │
│ ⚠️ 确认删除大目标？                     │
│                                         │
│ 大目标：Q1 广韵文献攻坚                 │
│ 包含：3 个阶段目标                      │
│ 当前进度：44% (145/330小时)             │
│                                         │
│ 请选择删除方式：                        │
│                                         │
│ ○ 仅删除大目标，保留阶段目标            │
│   （阶段目标将变为独立目标）            │
│                                         │
│ ● 删除大目标和所有阶段目标              │
│   （此操作不可恢复）                    │
│                                         │
│          [取消]           [确认删除]    │
└─────────────────────────────────────────┘
```


### 4.7 独立目标卡片增强

#### 4.7.1 新增操作按钮
在现有的 GoalCard 组件中，为独立目标增加"关联到大目标"按钮：

```
┌───────────────────────────────────────────────┐
│ 🎯 每日阅读30分钟                             │
│ 📊 duration_raw | 2024-01-01 ~ 2024-12-31    │
│ ████████████████░░░░ 75% (270/360h)          │
│                                               │
│ [编辑] [归档] [关联到大目标]                 │
└───────────────────────────────────────────────┘
```

#### 4.7.2 关联到大目标对话框
```
┌─────────────────────────────────────────┐
│ 关联到大目标                  [×]        │
├─────────────────────────────────────────┤
│                                         │
│ 当前目标：每日阅读30分钟                │
│ 类型：duration_raw (原始时长)          │
│                                         │
│ 选择大目标 *                            │
│ ┌─────────────────────────────────────┐ │
│ │ [选择大目标 ▼]                      │ │
│ │   Q1 广韵文献攻坚 (duration_raw)    │ │
│ │   年度阅读计划 (duration_raw)       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 💡 只显示类型匹配的大目标               │
│                                         │
│          [取消]           [关联]        │
└─────────────────────────────────────────┘
```

### 4.8 子目标卡片增强

#### 4.8.1 显示所属大目标
在子目标卡片中显示所属的大目标信息：

```
┌───────────────────────────────────────────────┐
│ 🎯 第一阶段学习                               │
│ 📊 duration_raw | 2024-01-01 ~ 2024-01-31    │
│ ████████████████████ 100% (100/100h)         │
│                                               │
│ 📁 所属大目标：Q1 广韵文献攻坚                │
│                                               │
│ [编辑] [归档] [移出大目标]                   │
└───────────────────────────────────────────────┘
```

### 4.9 归档区域

#### 4.9.1 归档区域结构
```
┌─────────────────────────────────────────────────────────┐
│ 📦 已归档 (2个大目标, 1个独立目标)  [展开 ▼]           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 大目标                                                  │
│ ┌───────────────────────────────────────────────┐      │
│ │ ✓ 2023 Q4 学习计划                            │      │
│ │   成功完成 | 105% (315/300h)                  │      │
│ │   [恢复] [删除]                               │      │
│ └───────────────────────────────────────────────┘      │
│                                                         │
│ ┌───────────────────────────────────────────────┐      │
│ │ ✗ 2023 Q3 练习计划                            │      │
│ │   未完成 | 65% (130/200个)                    │      │
│ │   [恢复] [删除]                               │      │
│ └───────────────────────────────────────────────┘      │
│                                                         │
│ 独立目标                                                │
│ ┌───────────────────────────────────────────────┐      │
│ │ ✓ 每周运动3次                                 │      │
│ │   成功完成 | 100% (52/52天)                   │      │
│ │   [恢复] [删除]                               │      │
│ └───────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

#### 4.9.2 归档状态标识
- ✓ 成功完成：进度 >= 100%（正向目标）或 < 100%（duration_limit）
- ✗ 未完成：进度 < 100%（正向目标）或 >= 100%（duration_limit）


## 五、技术实现

### 5.1 文件结构

#### 5.1.1 新增文件
```
src/
├── types.ts                          # 更新：添加 MajorGoal 类型
├── components/
│   ├── MajorGoalCard.tsx            # 新增：大目标卡片组件
│   ├── GoalCard.tsx                 # 更新：支持显示所属大目标
│   └── MajorGoalDialog.tsx          # 新增：创建/编辑大目标对话框
├── views/
│   └── ScopeDetailView.tsx          # 更新：整合大目标和独立目标
├── utils/
│   ├── goalUtils.ts                 # 更新：添加大目标进度计算
│   └── majorGoalUtils.ts            # 新增：大目标相关工具函数
├── hooks/
│   └── useMajorGoal.ts              # 新增：大目标管理 Hook
└── contexts/
    └── DataContext.tsx              # 更新：添加 majorGoals 状态管理
```

### 5.2 数据存储

#### 5.2.1 AppData 结构更新
```typescript
interface AppData {
  // ... 现有字段
  majorGoals: MajorGoal[];  // 新增：大目标列表
}
```

#### 5.2.2 数据迁移
- 现有数据无需迁移（向后兼容）
- 新增 `majorGoals` 数组，默认为空数组
- 现有的 Goal 数据保持不变，`majorGoalId` 默认为 undefined

### 5.3 核心工具函数

#### 5.3.1 majorGoalUtils.ts
```typescript
/**
 * 计算大目标的总进度
 */
export const calculateMajorGoalProgress = (
  majorGoal: MajorGoal,
  goals: Goal[],
  logs: Log[],
  todos: TodoItem[]
): { current: number; target: number; percentage: number } => {
  const childGoals = goals.filter(g => g.majorGoalId === majorGoal.id);
  
  let totalCurrent = 0;
  let totalTarget = 0;
  
  childGoals.forEach(goal => {
    const { current, target } = calculateGoalProgress(goal, logs, todos);
    totalCurrent += current;
    totalTarget += target;
  });
  
  const percentage = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  
  return { current: totalCurrent, target: totalTarget, percentage };
};

/**
 * 自动计算大目标的时间范围
 */
export const calculateMajorGoalTimeRange = (
  goals: Goal[]
): { startDate: string; endDate: string } => {
  if (goals.length === 0) {
    return { startDate: '', endDate: '' };
  }
  
  const sortedGoals = [...goals].sort((a, b) => 
    a.startDate.localeCompare(b.startDate)
  );
  
  return {
    startDate: sortedGoals[0].startDate,
    endDate: sortedGoals[sortedGoals.length - 1].endDate
  };
};

/**
 * 检查时间范围是否重叠
 */
export const checkTimeOverlap = (
  newGoal: { startDate: string; endDate: string },
  existingGoals: Goal[]
): { hasOverlap: boolean; overlappingGoals: Goal[] } => {
  const newStart = new Date(newGoal.startDate).getTime();
  const newEnd = new Date(newGoal.endDate).getTime();
  
  const overlappingGoals = existingGoals.filter(goal => {
    const goalStart = new Date(goal.startDate).getTime();
    const goalEnd = new Date(goal.endDate).getTime();
    
    return (newStart <= goalEnd && newEnd >= goalStart);
  });
  
  return {
    hasOverlap: overlappingGoals.length > 0,
    overlappingGoals
  };
};

/**
 * 验证目标类型是否一致
 */
export const validateGoalMetric = (
  majorGoal: MajorGoal,
  goal: Goal
): boolean => {
  return majorGoal.metric === goal.metric;
};

/**
 * 获取大目标的子目标列表（按时间排序）
 */
export const getMajorGoalChildren = (
  majorGoalId: string,
  goals: Goal[]
): Goal[] => {
  return goals
    .filter(g => g.majorGoalId === majorGoalId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
};
```


### 5.4 组件实现

#### 5.4.1 MajorGoalCard 组件
```typescript
interface MajorGoalCardProps {
  majorGoal: MajorGoal;
  goals: Goal[];
  logs: Log[];
  todos: TodoItem[];
  onEdit?: (majorGoal: MajorGoal) => void;
  onDelete?: (majorGoalId: string) => void;
  onArchive?: (majorGoalId: string) => void;
  onAddChildGoal?: (majorGoalId: string) => void;
  onEditChildGoal?: (goal: Goal) => void;
}

export const MajorGoalCard: React.FC<MajorGoalCardProps> = ({
  majorGoal,
  goals,
  logs,
  todos,
  onEdit,
  onDelete,
  onArchive,
  onAddChildGoal,
  onEditChildGoal
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // 获取子目标列表（按时间排序）
  const childGoals = getMajorGoalChildren(majorGoal.id, goals);
  
  // 计算总进度
  const { current, target, percentage } = calculateMajorGoalProgress(
    majorGoal,
    goals,
    logs,
    todos
  );
  
  // 计算剩余天数
  const daysRemaining = Math.ceil(
    (new Date(majorGoal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  return (
    <div className="rounded-xl p-4 bg-white border border-stone-100 shadow-sm">
      {/* 头部：名称、类型、操作按钮 */}
      {/* 进度条 */}
      {/* 子目标列表（可折叠） */}
      {/* 添加阶段目标按钮 */}
    </div>
  );
};
```

#### 5.4.2 MajorGoalDialog 组件
```typescript
interface MajorGoalDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  majorGoal?: MajorGoal;
  scopeId: string;
  onClose: () => void;
  onSave: (majorGoal: MajorGoal, childGoals: Goal[]) => void;
}

export const MajorGoalDialog: React.FC<MajorGoalDialogProps> = ({
  isOpen,
  mode,
  majorGoal,
  scopeId,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<MajorGoal>>({});
  const [childGoals, setChildGoals] = useState<Partial<Goal>[]>([]);
  
  // 表单验证
  const validate = () => {
    if (!formData.title) return false;
    if (!formData.metric) return false;
    if (childGoals.length === 0) return false;
    return true;
  };
  
  // 保存处理
  const handleSave = () => {
    if (!validate()) return;
    
    // 计算时间范围
    const { startDate, endDate } = calculateMajorGoalTimeRange(childGoals as Goal[]);
    
    const newMajorGoal: MajorGoal = {
      id: majorGoal?.id || generateId(),
      ...formData,
      scopeId,
      startDate,
      endDate,
      status: 'active',
      createdAt: majorGoal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as MajorGoal;
    
    onSave(newMajorGoal, childGoals as Goal[]);
  };
  
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      {/* 表单内容 */}
    </Dialog>
  );
};
```

### 5.5 状态管理

#### 5.5.1 DataContext 更新
```typescript
interface DataContextType {
  // ... 现有字段
  majorGoals: MajorGoal[];
  addMajorGoal: (majorGoal: MajorGoal, childGoals: Goal[]) => void;
  updateMajorGoal: (majorGoal: MajorGoal) => void;
  deleteMajorGoal: (majorGoalId: string, deleteChildren: boolean) => void;
  archiveMajorGoal: (majorGoalId: string) => void;
}

// 添加大目标
const addMajorGoal = (majorGoal: MajorGoal, childGoals: Goal[]) => {
  setData(prev => ({
    ...prev,
    majorGoals: [...prev.majorGoals, majorGoal],
    goals: [...prev.goals, ...childGoals]
  }));
};

// 删除大目标
const deleteMajorGoal = (majorGoalId: string, deleteChildren: boolean) => {
  setData(prev => {
    const newMajorGoals = prev.majorGoals.filter(mg => mg.id !== majorGoalId);
    
    let newGoals = prev.goals;
    if (deleteChildren) {
      // 删除所有子目标
      newGoals = prev.goals.filter(g => g.majorGoalId !== majorGoalId);
    } else {
      // 保留子目标，将其变为独立目标
      newGoals = prev.goals.map(g =>
        g.majorGoalId === majorGoalId
          ? { ...g, majorGoalId: undefined }
          : g
      );
    }
    
    return {
      ...prev,
      majorGoals: newMajorGoals,
      goals: newGoals
    };
  });
};

// 归档大目标
const archiveMajorGoal = (majorGoalId: string) => {
  setData(prev => ({
    ...prev,
    majorGoals: prev.majorGoals.map(mg =>
      mg.id === majorGoalId
        ? { ...mg, status: 'archived' }
        : mg
    ),
    goals: prev.goals.map(g =>
      g.majorGoalId === majorGoalId
        ? { ...g, status: 'archived' }
        : g
    )
  }));
};
```


### 5.6 ScopeDetailView 更新

#### 5.6.1 目标 Tab 重构
```typescript
case '目标':
  // 获取当前领域的大目标和独立目标
  const scopeMajorGoals = majorGoals.filter(
    mg => mg.scopeId === scope.id && mg.status !== 'archived'
  );
  const scopeIndependentGoals = goals.filter(
    g => g.scopeId === scope.id && 
         !g.majorGoalId && 
         g.status !== 'archived'
  );
  
  // 归档的大目标和独立目标
  const archivedMajorGoals = majorGoals.filter(
    mg => mg.scopeId === scope.id && mg.status === 'archived'
  );
  const archivedIndependentGoals = goals.filter(
    g => g.scopeId === scope.id && 
         !g.majorGoalId && 
         g.status === 'archived'
  );
  
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 大目标列表 */}
      {scopeMajorGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-600 px-2">
            大目标
          </h3>
          {scopeMajorGoals.map(majorGoal => (
            <MajorGoalCard
              key={majorGoal.id}
              majorGoal={majorGoal}
              goals={goals}
              logs={logs}
              todos={todos}
              onEdit={handleEditMajorGoal}
              onDelete={handleDeleteMajorGoal}
              onArchive={handleArchiveMajorGoal}
              onAddChildGoal={handleAddChildGoal}
              onEditChildGoal={onEditGoal}
            />
          ))}
        </div>
      )}
      
      {/* 创建大目标按钮 */}
      <button
        onClick={() => setShowMajorGoalDialog(true)}
        className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-colors text-sm font-medium"
      >
        + 创建大目标
      </button>
      
      {/* 独立目标列表 */}
      {scopeIndependentGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-600 px-2">
            独立目标
          </h3>
          {scopeIndependentGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              logs={logs}
              todos={todos}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
              onArchive={handleArchiveGoal}
              showLinkToMajorGoal={true}
              onLinkToMajorGoal={handleLinkToMajorGoal}
            />
          ))}
        </div>
      )}
      
      {/* 创建独立目标按钮 */}
      <button
        onClick={onAddGoal}
        className="w-full py-2.5 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-colors text-sm font-medium"
      >
        + 创建独立目标
      </button>
      
      {/* 归档区域 */}
      {(archivedMajorGoals.length > 0 || archivedIndependentGoals.length > 0) && (
        <div className="mt-8">
          <div className="flex items-center justify-between px-2 py-3 bg-stone-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Archive size={16} className="text-stone-400" />
              <span className="text-sm font-medium text-stone-600">
                已归档
              </span>
              <span className="text-xs text-stone-400">
                ({archivedMajorGoals.length}个大目标, {archivedIndependentGoals.length}个独立目标)
              </span>
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                showArchived ? 'bg-stone-900' : 'bg-stone-200'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                  showArchived ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
          
          {showArchived && (
            <div className="mt-4 space-y-4">
              {/* 归档的大目标 */}
              {archivedMajorGoals.map(majorGoal => (
                <MajorGoalCard
                  key={majorGoal.id}
                  majorGoal={majorGoal}
                  goals={goals}
                  logs={logs}
                  todos={todos}
                  onEdit={handleEditMajorGoal}
                  onDelete={handleDeleteMajorGoal}
                  onArchive={handleArchiveMajorGoal}
                />
              ))}
              
              {/* 归档的独立目标 */}
              {archivedIndependentGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  logs={logs}
                  todos={todos}
                  onEdit={onEditGoal}
                  onDelete={onDeleteGoal}
                  onArchive={handleArchiveGoal}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
```


## 六、用户交互流程

### 6.1 创建大目标流程

```
用户操作                          系统响应
───────────────────────────────────────────────────────
1. 点击"创建大目标"              → 打开创建对话框
2. 填写大目标名称                → 实时验证
3. 选择目标类型                  → 更新单位显示
4. 填写描述和动机（可选）        → 
5. 设置筛选条件（可选）          → 
6. 点击"添加阶段目标"            → 打开阶段目标表单
7. 填写阶段信息                  → 实时验证
   - 阶段名称
   - 时间范围
   - 目标值
8. 保存阶段目标                  → 添加到列表
                                 → 检查时间重叠
                                 → 自动计算总时间范围
9. 重复步骤 6-8 添加更多阶段     →
10. 点击"创建"                   → 验证表单
                                 → 创建大目标
                                 → 创建所有子目标
                                 → 关闭对话框
                                 → 显示成功提示
```

### 6.2 添加阶段目标流程

```
用户操作                          系统响应
───────────────────────────────────────────────────────
1. 在大目标卡片中点击             → 打开添加阶段对话框
   "添加阶段目标"                → 显示大目标信息
                                 → 自动继承类型和筛选器
2. 填写阶段名称                  → 实时验证
3. 选择时间范围                  → 检查时间重叠
                                 → 显示警告（如果重叠）
4. 填写目标值                    → 实时验证
5. 点击"添加"                    → 验证表单
                                 → 创建新的子目标
                                 → 更新大目标时间范围
                                 → 关闭对话框
                                 → 刷新大目标卡片
```

### 6.3 关联独立目标到大目标流程

```
用户操作                          系统响应
───────────────────────────────────────────────────────
1. 在独立目标卡片中点击           → 打开关联对话框
   "关联到大目标"                → 显示当前目标信息
2. 选择大目标                    → 过滤类型匹配的大目标
                                 → 显示大目标列表
3. 点击"关联"                    → 验证类型一致性
                                 → 更新目标的 majorGoalId
                                 → 更新大目标时间范围
                                 → 关闭对话框
                                 → 刷新视图
```

### 6.4 删除大目标流程

```
用户操作                          系统响应
───────────────────────────────────────────────────────
1. 点击大目标的"删除"按钮        → 打开删除确认对话框
                                 → 显示大目标信息
                                 → 显示子目标数量
                                 → 显示当前进度
2. 选择删除方式                  → 更新选项状态
   ○ 仅删除大目标
   ● 删除大目标和所有子目标
3. 点击"确认删除"                → 根据选择执行删除
                                 → 如果仅删除大目标：
                                   - 删除大目标
                                   - 子目标变为独立目标
                                 → 如果删除所有：
                                   - 删除大目标
                                   - 删除所有子目标
                                 → 关闭对话框
                                 → 显示成功提示
```

### 6.5 归档大目标流程

```
用户操作                          系统响应
───────────────────────────────────────────────────────
1. 点击大目标的"归档"按钮        → 确认归档操作
2. 确认归档                      → 更新大目标状态为 archived
                                 → 更新所有子目标状态为 archived
                                 → 从主列表移除
                                 → 添加到归档区域
                                 → 显示成功提示
```


## 七、边界情况处理

### 7.1 数据一致性

#### 7.1.1 子目标类型不一致
- **场景**：用户尝试将不同类型的目标关联到大目标
- **处理**：
  - 在关联时检查类型
  - 如果类型不匹配，显示错误提示
  - 不允许关联

#### 7.1.2 时间范围异常
- **场景**：子目标的时间范围超出大目标的时间范围
- **处理**：
  - 大目标的时间范围自动扩展以包含所有子目标
  - 实时更新大目标的 startDate 和 endDate

#### 7.1.3 删除子目标
- **场景**：用户删除大目标下的某个子目标
- **处理**：
  - 允许删除
  - 自动更新大目标的时间范围
  - 如果删除后没有子目标，提示用户删除大目标

#### 7.1.4 编辑子目标类型
- **场景**：用户尝试修改子目标的类型
- **处理**：
  - 检查新类型是否与大目标一致
  - 如果不一致，显示警告
  - 提供两个选项：
    1. 取消修改
    2. 从大目标中移除该目标

### 7.2 空状态处理

#### 7.2.1 没有大目标
- 显示空状态提示
- 提供"创建大目标"按钮
- 显示功能说明

#### 7.2.2 没有独立目标
- 不显示独立目标区域
- 只显示"创建独立目标"按钮

#### 7.2.3 大目标没有子目标
- **场景**：创建大目标后删除了所有子目标
- **处理**：
  - 显示警告提示
  - 提供"添加阶段目标"按钮
  - 提供"删除大目标"选项

### 7.3 时间重叠处理

#### 7.3.1 检测重叠
```typescript
// 检查新阶段是否与现有阶段重叠
const checkOverlap = (newGoal, existingGoals) => {
  const overlapping = existingGoals.filter(goal => {
    return (
      newGoal.startDate <= goal.endDate &&
      newGoal.endDate >= goal.startDate
    );
  });
  return overlapping;
};
```

#### 7.3.2 重叠提示
- 显示警告图标和文字
- 列出重叠的阶段名称
- 允许用户继续创建（非强制）
- 建议调整时间范围

### 7.4 筛选器冲突

#### 7.4.1 子目标已有筛选器
- **场景**：将已有筛选器的独立目标关联到大目标
- **处理**：
  - 显示警告：子目标的筛选器将被大目标覆盖
  - 提供选项：
    1. 继续关联（使用大目标筛选器）
    2. 取消关联

#### 7.4.2 修改大目标筛选器
- **场景**：修改大目标的筛选器
- **处理**：
  - 显示警告：将影响所有子目标
  - 列出受影响的子目标数量
  - 要求确认

### 7.5 归档和恢复

#### 7.5.1 归档大目标
- 所有子目标自动归档
- 归档后不再计入统计
- 可以在归档区域查看

#### 7.5.2 恢复大目标
- 所有子目标自动恢复
- 恢复后的状态根据当前时间判断：
  - 如果在时间范围内且未完成：active
  - 如果已完成：completed
  - 如果已过期：根据进度判断 completed 或 failed

#### 7.5.3 单独归档子目标
- **场景**：用户尝试单独归档某个子目标
- **处理**：
  - 允许归档
  - 该子目标不再计入大目标进度
  - 大目标时间范围不变


## 八、实现计划

### 8.1 第一阶段：基础功能（MVP）

#### 8.1.1 数据层
- [ ] 在 `types.ts` 中添加 `MajorGoal` 类型定义
- [ ] 在 `Goal` 类型中添加 `majorGoalId` 和 `order` 字段
- [ ] 在 `AppData` 中添加 `majorGoals` 数组
- [ ] 更新数据验证逻辑（`dataValidation.ts`）

#### 8.1.2 工具函数
- [ ] 创建 `majorGoalUtils.ts`
  - [ ] `calculateMajorGoalProgress` - 计算大目标进度
  - [ ] `calculateMajorGoalTimeRange` - 计算时间范围
  - [ ] `checkTimeOverlap` - 检查时间重叠
  - [ ] `validateGoalMetric` - 验证类型一致性
  - [ ] `getMajorGoalChildren` - 获取子目标列表

#### 8.1.3 状态管理
- [ ] 在 `DataContext` 中添加 `majorGoals` 状态
- [ ] 实现 `addMajorGoal` 方法
- [ ] 实现 `updateMajorGoal` 方法
- [ ] 实现 `deleteMajorGoal` 方法
- [ ] 实现 `archiveMajorGoal` 方法

#### 8.1.4 UI 组件
- [ ] 创建 `MajorGoalCard` 组件
  - [ ] 基本信息展示
  - [ ] 进度条
  - [ ] 子目标列表（可折叠）
  - [ ] 操作按钮
- [ ] 创建 `MajorGoalDialog` 组件
  - [ ] 创建模式
  - [ ] 编辑模式
  - [ ] 阶段目标管理
- [ ] 更新 `GoalCard` 组件
  - [ ] 显示所属大目标
  - [ ] 添加"关联到大目标"按钮
  - [ ] 添加"移出大目标"按钮

#### 8.1.5 视图更新
- [ ] 更新 `ScopeDetailView` 的目标 Tab
  - [ ] 大目标列表区域
  - [ ] 独立目标列表区域
  - [ ] 归档区域
  - [ ] 创建按钮

### 8.2 第二阶段：增强功能

#### 8.2.1 高级操作
- [ ] 实现"组合现有目标为大目标"功能
- [ ] 实现批量操作（批量归档、批量删除）
- [ ] 实现拖拽排序（调整子目标顺序）

#### 8.2.2 用户体验优化
- [ ] 添加加载状态
- [ ] 添加操作确认提示
- [ ] 添加成功/错误提示
- [ ] 添加键盘快捷键支持

#### 8.2.3 数据展示优化
- [ ] 添加大目标统计卡片
- [ ] 添加进度趋势图
- [ ] 添加完成率统计

### 8.3 第三阶段：扩展功能

#### 8.3.1 模板系统
- [ ] 创建大目标模板
- [ ] 从模板创建大目标
- [ ] 模板管理界面

#### 8.3.2 导出功能
- [ ] 导出大目标数据（JSON）
- [ ] 导出大目标报告（Markdown）
- [ ] 导出进度图表（PNG）

#### 8.3.3 智能建议
- [ ] 根据历史数据建议目标值
- [ ] 根据进度建议调整计划
- [ ] 提醒即将到期的阶段

### 8.4 测试计划

#### 8.4.1 单元测试
- [ ] `majorGoalUtils.ts` 工具函数测试
- [ ] 数据验证逻辑测试
- [ ] 进度计算逻辑测试

#### 8.4.2 集成测试
- [ ] 创建大目标流程测试
- [ ] 编辑大目标流程测试
- [ ] 删除大目标流程测试
- [ ] 归档/恢复流程测试

#### 8.4.3 UI 测试
- [ ] 组件渲染测试
- [ ] 用户交互测试
- [ ] 响应式布局测试

#### 8.4.4 数据迁移测试
- [ ] 旧数据兼容性测试
- [ ] 数据导入/导出测试
- [ ] 跨版本升级测试


## 九、性能考虑

### 9.1 数据加载优化

#### 9.1.1 懒加载
- 大目标卡片默认折叠子目标列表
- 只在展开时计算子目标进度
- 归档区域默认折叠

#### 9.1.2 缓存策略
- 缓存大目标进度计算结果
- 只在相关数据变化时重新计算
- 使用 `useMemo` 优化组件渲染

#### 9.1.3 分页加载
- 如果大目标数量超过 20 个，实现分页
- 每页显示 10 个大目标
- 提供"加载更多"按钮

### 9.2 渲染优化

#### 9.2.1 虚拟滚动
- 如果子目标数量超过 50 个，使用虚拟滚动
- 只渲染可见区域的子目标

#### 9.2.2 防抖和节流
- 搜索功能使用防抖（300ms）
- 滚动事件使用节流（100ms）

## 十、安全性考虑

### 10.1 数据验证

#### 10.1.1 输入验证
- 所有用户输入必须经过验证
- 防止 XSS 攻击（转义特殊字符）
- 限制输入长度：
  - 名称：最多 100 字符
  - 描述：最多 500 字符
  - 动机：最多 500 字符

#### 10.1.2 数据完整性
- 确保 majorGoalId 引用的大目标存在
- 确保子目标的类型与大目标一致
- 定期检查数据一致性

### 10.2 权限控制

#### 10.2.1 操作权限
- 只能编辑/删除自己创建的大目标
- 归档操作需要二次确认
- 删除操作需要二次确认

## 十一、国际化支持

### 11.1 文本国际化

#### 11.1.1 UI 文本
- 所有 UI 文本使用 i18n 键
- 支持中文和英文
- 日期格式根据语言自动调整

#### 11.1.2 目标类型标签
```typescript
const metricLabels = {
  'zh-CN': {
    duration_raw: '原始时长',
    task_count: '待办数量',
    duration_weighted: '有效时长',
    frequency_days: '活跃天数',
    duration_limit: '时长上限'
  },
  'en-US': {
    duration_raw: 'Raw Duration',
    task_count: 'Task Count',
    duration_weighted: 'Weighted Duration',
    frequency_days: 'Active Days',
    duration_limit: 'Duration Limit'
  }
};
```

## 十二、可访问性（Accessibility）

### 12.1 键盘导航

- 所有交互元素支持键盘操作
- Tab 键顺序合理
- 支持快捷键：
  - `Ctrl/Cmd + N`：创建大目标
  - `Ctrl/Cmd + E`：编辑选中的大目标
  - `Ctrl/Cmd + D`：删除选中的大目标
  - `Space`：展开/折叠大目标

### 12.2 屏幕阅读器支持

- 所有图标添加 `aria-label`
- 进度条添加 `aria-valuenow`、`aria-valuemin`、`aria-valuemax`
- 对话框添加 `role="dialog"` 和 `aria-labelledby`

### 12.3 视觉辅助

- 进度条使用颜色和图案双重标识
- 状态图标使用图标和文字双重标识
- 支持高对比度模式

## 十三、错误处理

### 13.1 用户错误

#### 13.1.1 表单验证错误
- 实时显示验证错误
- 错误信息清晰明确
- 提供修正建议

#### 13.1.2 操作冲突
- 检测并提示时间重叠
- 检测并提示类型不匹配
- 提供解决方案

### 13.2 系统错误

#### 13.2.1 数据加载失败
- 显示友好的错误提示
- 提供重试按钮
- 记录错误日志

#### 13.2.2 保存失败
- 显示错误原因
- 保留用户输入
- 提供重试选项

## 十四、文档和帮助

### 14.1 用户文档

#### 14.1.1 功能说明
- 在 `docs/user-guide/` 中添加大目标功能说明
- 包含使用场景和最佳实践
- 提供截图和示例

#### 14.1.2 常见问题
- 如何创建大目标？
- 如何添加阶段目标？
- 如何查看总进度？
- 如何归档大目标？

### 14.2 开发文档

#### 14.2.1 API 文档
- 所有工具函数添加 JSDoc 注释
- 说明参数类型和返回值
- 提供使用示例

#### 14.2.2 组件文档
- 所有组件添加 Props 类型说明
- 说明组件用途和使用场景
- 提供使用示例

## 十五、未来扩展

### 15.1 协作功能

- 支持多人共享大目标
- 支持评论和讨论
- 支持权限管理

### 15.2 智能分析

- 基于历史数据预测完成时间
- 分析目标完成率趋势
- 提供优化建议

### 15.3 集成功能

- 与日历应用集成
- 与待办应用集成
- 导出到第三方工具

## 十六、验收标准

### 16.1 功能完整性

- [ ] 可以创建大目标
- [ ] 可以编辑大目标
- [ ] 可以删除大目标
- [ ] 可以归档大目标
- [ ] 可以添加阶段目标
- [ ] 可以编辑阶段目标
- [ ] 可以删除阶段目标
- [ ] 可以关联独立目标到大目标
- [ ] 可以从大目标中移除目标
- [ ] 进度计算正确
- [ ] 时间范围自动更新
- [ ] 筛选器正确继承

### 16.2 用户体验

- [ ] UI 美观，符合设计规范
- [ ] 操作流畅，无明显卡顿
- [ ] 错误提示清晰明确
- [ ] 支持键盘操作
- [ ] 支持移动端（响应式）

### 16.3 数据安全

- [ ] 数据验证完整
- [ ] 无数据丢失风险
- [ ] 支持数据备份
- [ ] 支持数据恢复

### 16.4 性能指标

- [ ] 页面加载时间 < 1s
- [ ] 操作响应时间 < 200ms
- [ ] 支持 100+ 大目标
- [ ] 支持 1000+ 子目标

## 十七、发布计划

### 17.1 版本规划

#### v1.0.0 - MVP 版本
- 基础的创建、编辑、删除功能
- 进度计算和展示
- 归档功能

#### v1.1.0 - 增强版本
- 组合现有目标功能
- 批量操作
- 拖拽排序

#### v1.2.0 - 扩展版本
- 模板系统
- 导出功能
- 智能建议

### 17.2 发布检查清单

- [ ] 所有功能测试通过
- [ ] 无已知严重 Bug
- [ ] 文档完整
- [ ] 性能达标
- [ ] 数据迁移脚本就绪
- [ ] 用户通知准备完成

---

## 附录

### A. 术语表

- **大目标（MajorGoal）**：同一类型的多个小目标的时间序列分组
- **小目标（Goal）**：具体的、可量化的目标
- **阶段目标**：大目标下的子目标，按时间顺序排列
- **独立目标**：不属于任何大目标的目标
- **筛选器**：用于限定目标统计范围的条件

### B. 参考资料

- [现有 Goal 类型定义](../../src/types.ts)
- [现有 GoalCard 组件](../../src/components/GoalCard.tsx)
- [现有 ScopeDetailView](../../src/views/ScopeDetailView.tsx)
- [现有 goalUtils 工具函数](../../src/utils/goalUtils.ts)

### C. 更新日志

- 2024-03-05：初始版本，完成需求文档编写

---

**文档版本**：v1.0  
**最后更新**：2024-03-05  
**作者**：Kiro AI Assistant  
**审核状态**：待审核


---

## 附录 D：GoalEditor 组件复用设计

### D.1 设计目标

将现有的 `GoalEditor` 组件改造为可复用的模态框，支持三种编辑模式：
1. **独立目标模式**：完整功能，所有字段可编辑
2. **阶段目标模式**：部分字段禁用（继承自大目标）
3. **大目标编辑模式**：增加大目标特有字段

### D.2 Props 接口设计

```typescript
interface GoalEditorProps {
  // 现有 props
  goal?: Goal;
  scopeId: string;
  categories: Category[];
  todoCategories: TodoCategory[];
  onSave: (goal: Goal) => void;
  onClose: () => void;
  
  // 新增 props
  mode?: 'independent' | 'phase' | 'majorGoal';  // 编辑模式
  majorGoal?: MajorGoal;                         // 所属大目标（phase 模式必需）
  majorGoals?: MajorGoal[];                      // 可选的大目标列表（independent 模式）
  onLinkToMajorGoal?: (goalId: string, majorGoalId: string) => void;  // 关联到大目标
}
```

### D.3 三种模式的字段状态

#### D.3.1 独立目标模式（mode: 'independent'）
```typescript
{
  title: '可编辑',
  metric: '可编辑',
  targetValue: '可编辑',
  startDate: '可编辑',
  endDate: '可编辑',
  filterActivityIds: '可编辑',
  filterTodoCategories: '可编辑',
  motivation: '可编辑',
  majorGoalId: '可选择'  // 新增：关联到大目标
}
```

**UI 变化：**
- 在"激励/备注"之前增加"所属大目标"选择器
- 选择大目标后，相关字段变为只读

#### D.3.2 阶段目标模式（mode: 'phase'）
```typescript
{
  title: '可编辑',
  metric: '禁用（继承）',        // 从大目标继承
  targetValue: '可编辑',
  startDate: '可编辑',
  endDate: '可编辑',
  filterActivityIds: '禁用（继承）',     // 从大目标继承
  filterTodoCategories: '禁用（继承）',  // 从大目标继承
  motivation: '可编辑',
  majorGoalId: '自动设置'  // 自动关联到大目标
}
```

**UI 变化：**
- 显示"所属大目标"信息（只读）
- 目标类型显示为只读标签
- 筛选器显示为只读标签
- 添加提示文字："以下字段继承自大目标"

#### D.3.3 大目标编辑模式（mode: 'majorGoal'）
```typescript
{
  // 大目标特有字段
  title: '可编辑',
  description: '可编辑',  // 新增
  metric: '可编辑（创建后不可改）',
  startDate: '自动计算（只读）',  // 根据子目标计算
  endDate: '自动计算（只读）',    // 根据子目标计算
  filterActivityIds: '可编辑',
  filterTodoCategories: '可编辑',
  motivation: '可编辑',
  
  // 不显示的字段
  targetValue: '不显示'  // 大目标没有单独的目标值
}
```

**UI 变化：**
- 增加"描述"字段（多行文本）
- 时间范围显示为只读（自动计算）
- 不显示"目标阈值"字段
- 增加"管理阶段目标"按钮

### D.4 UI 实现方案

#### D.4.1 所属大目标选择器（独立目标模式）

```tsx
{/* 所属大目标（仅独立目标模式） */}
{mode === 'independent' && majorGoals && majorGoals.length > 0 && (
  <div>
    <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
      所属大目标
      <span className="text-stone-300 ml-1">（可选）</span>
    </label>
    
    <select
      value={selectedMajorGoalId || ''}
      onChange={(e) => {
        const newMajorGoalId = e.target.value || undefined;
        setSelectedMajorGoalId(newMajorGoalId);
        
        // 如果选择了大目标，自动继承其设置
        if (newMajorGoalId) {
          const selectedMG = majorGoals.find(mg => mg.id === newMajorGoalId);
          if (selectedMG) {
            setMetric(selectedMG.metric);
            setFilterActivityIds(selectedMG.filterActivityIds || []);
            setFilterTodoCategories(selectedMG.filterTodoCategories || []);
          }
        }
      }}
      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 font-medium outline-none focus:border-stone-400 transition-colors"
    >
      <option value="">无（独立目标）</option>
      {majorGoals
        .filter(mg => mg.scopeId === scopeId && mg.status !== 'archived')
        .map(mg => (
          <option key={mg.id} value={mg.id}>
            {mg.title} ({getGoalMetricLabel(mg.metric)})
          </option>
        ))}
    </select>
    
    {selectedMajorGoalId && (
      <p className="mt-2 text-xs text-stone-500">
        💡 目标类型和筛选条件将继承自大目标
      </p>
    )}
  </div>
)}
```

#### D.4.2 所属大目标信息（阶段目标模式）

```tsx
{/* 所属大目标信息（仅阶段目标模式） */}
{mode === 'phase' && majorGoal && (
  <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
        所属大目标
      </span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-stone-900">
        {majorGoal.title}
      </span>
      <span className="px-2 py-0.5 bg-stone-200 text-stone-600 text-[10px] font-bold rounded">
        {getGoalMetricLabel(majorGoal.metric)}
      </span>
    </div>
    <p className="mt-2 text-xs text-stone-500">
      💡 目标类型和筛选条件继承自大目标，不可修改
    </p>
  </div>
)}
```

#### D.4.3 字段禁用逻辑

```tsx
// 判断字段是否应该禁用
const isFieldDisabled = (fieldName: string): boolean => {
  // 阶段目标模式：禁用继承字段
  if (mode === 'phase') {
    return ['metric', 'filterActivityIds', 'filterTodoCategories'].includes(fieldName);
  }
  
  // 独立目标模式：选择了大目标后禁用继承字段
  if (mode === 'independent' && selectedMajorGoalId) {
    return ['metric', 'filterActivityIds', 'filterTodoCategories'].includes(fieldName);
  }
  
  // 大目标模式：禁用自动计算字段
  if (mode === 'majorGoal') {
    return ['startDate', 'endDate'].includes(fieldName);
  }
  
  return false;
};

// 目标类型选择器
<div>
  <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
    目标类型
    {isFieldDisabled('metric') && (
      <span className="text-stone-300 ml-1">（继承自大目标）</span>
    )}
  </label>
  
  {isFieldDisabled('metric') ? (
    // 只读显示
    <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg">
      <span className="text-sm font-bold text-stone-600">
        {metricOptions.find(m => m.value === metric)?.label}
      </span>
    </div>
  ) : (
    // 可编辑
    <div className="flex flex-wrap gap-2">
      {metricOptions.map(option => (
        <button
          key={option.value}
          onClick={() => setMetric(option.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            metric === option.value
              ? 'text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
          style={metric === option.value ? { backgroundColor: 'var(--accent-color)' } : {}}
        >
          {option.label}
        </button>
      ))}
    </div>
  )}
</div>
```

#### D.4.4 大目标模式特有字段

```tsx
{/* 描述字段（仅大目标模式） */}
{mode === 'majorGoal' && (
  <div>
    <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
      大目标描述
      <span className="text-stone-300 ml-1">（可选）</span>
    </label>
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      placeholder="详细描述这个大目标的内容和期望..."
      rows={3}
      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 outline-none focus:border-stone-400 transition-colors resize-none"
    />
  </div>
)}

{/* 时间范围（大目标模式为只读） */}
{mode === 'majorGoal' ? (
  <div>
    <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
      时间范围
      <span className="text-stone-300 ml-1">（自动计算）</span>
    </label>
    <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg">
      <span className="text-sm font-mono text-stone-600">
        {startDateStr || '待添加阶段目标'} ~ {endDateStr || '待添加阶段目标'}
      </span>
    </div>
    <p className="mt-1.5 text-xs text-stone-400">
      时间范围根据阶段目标自动计算
    </p>
  </div>
) : (
  // 原有的时间范围输入
  <div>
    {/* ... 现有代码 ... */}
  </div>
)}

{/* 目标阈值（大目标模式不显示） */}
{mode !== 'majorGoal' && (
  <div>
    <label className="block text-xs font-medium text-stone-400 mb-2 uppercase tracking-wider">
      目标阈值
    </label>
    <input
      type="number"
      value={getDisplayValue()}
      onChange={(e) => handleValueChange(Number(e.target.value) || 0)}
      min="1"
      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 font-medium outline-none focus:border-stone-400 transition-colors text-center text-lg font-mono"
    />
  </div>
)}
```

### D.5 保存逻辑

```typescript
const handleSave = () => {
  // 基础验证
  if (!title.trim()) {
    alert('请填写目标标题');
    return;
  }
  
  // 根据模式进行不同的验证和保存
  if (mode === 'majorGoal') {
    // 大目标模式：不需要验证目标值和时间
    const newMajorGoal: MajorGoal = {
      id: goal?.id || crypto.randomUUID(),
      title: title.trim(),
      scopeId: scopeId,
      metric,
      description: description.trim() || undefined,
      motivation: motivation.trim() || undefined,
      filterActivityIds: metric !== 'task_count' && filterActivityIds.length > 0 
        ? filterActivityIds 
        : undefined,
      filterTodoCategories: metric === 'task_count' && filterTodoCategories.length > 0 
        ? filterTodoCategories 
        : undefined,
      startDate: '', // 将由子目标计算
      endDate: '',   // 将由子目标计算
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    onSave(newMajorGoal);
  } else {
    // 独立目标或阶段目标模式：需要完整验证
    if (!startDateStr || !endDateStr || targetValue <= 0) {
      alert('请填写完整信息');
      return;
    }
    
    // 验证日期格式
    if (startDateStr.length !== 8 || endDateStr.length !== 8) {
      alert('请输入8位日期格式（YYYYMMDD）');
      return;
    }
    
    // 转换为YYYY-MM-DD格式
    const startDate = `${startDateStr.slice(0, 4)}-${startDateStr.slice(4, 6)}-${startDateStr.slice(6, 8)}`;
    const endDate = `${endDateStr.slice(0, 4)}-${endDateStr.slice(4, 6)}-${endDateStr.slice(6, 8)}`;
    
    const newGoal: Goal = {
      id: goal?.id || crypto.randomUUID(),
      title: title.trim(),
      scopeId: scopeId,
      metric,
      targetValue: targetValue,
      startDate,
      endDate,
      status: goal?.status || 'active',
      motivation: motivation.trim() || undefined,
      majorGoalId: mode === 'phase' 
        ? majorGoal?.id 
        : selectedMajorGoalId,  // 独立目标模式可能选择了大目标
      filterTodoCategories: metric === 'task_count' && filterTodoCategories.length > 0 
        ? filterTodoCategories 
        : undefined,
      filterActivityIds: metric !== 'task_count' && filterActivityIds.length > 0 
        ? filterActivityIds 
        : undefined,
    };
    
    onSave(newGoal);
  }
};
```

### D.6 使用示例

#### D.6.1 创建独立目标
```tsx
<GoalEditor
  mode="independent"
  scopeId={scopeId}
  categories={categories}
  todoCategories={todoCategories}
  majorGoals={majorGoals}  // 提供大目标列表供选择
  onSave={handleSaveGoal}
  onClose={closeEditor}
/>
```

#### D.6.2 创建阶段目标
```tsx
<GoalEditor
  mode="phase"
  scopeId={scopeId}
  majorGoal={selectedMajorGoal}  // 必需：所属大目标
  categories={categories}
  todoCategories={todoCategories}
  onSave={handleSavePhaseGoal}
  onClose={closeEditor}
/>
```

#### D.6.3 编辑大目标
```tsx
<GoalEditor
  mode="majorGoal"
  goal={editingMajorGoal}
  scopeId={scopeId}
  categories={categories}
  todoCategories={todoCategories}
  onSave={handleSaveMajorGoal}
  onClose={closeEditor}
/>
```

### D.7 实现优先级

#### 阶段一：基础支持
- [ ] 添加 `mode` prop 和相关类型定义
- [ ] 实现字段禁用逻辑
- [ ] 添加"所属大目标"信息显示（阶段目标模式）

#### 阶段二：独立目标增强
- [ ] 添加"所属大目标"选择器
- [ ] 实现选择大目标后的字段继承逻辑
- [ ] 添加关联提示

#### 阶段三：大目标支持
- [ ] 添加描述字段
- [ ] 实现时间范围只读显示
- [ ] 隐藏目标阈值字段
- [ ] 调整保存逻辑

### D.8 注意事项

1. **向后兼容**：默认 `mode` 为 `'independent'`，保持现有行为
2. **类型安全**：使用 TypeScript 确保不同模式下的 props 正确性
3. **用户体验**：禁用字段应有明确的视觉提示和说明文字
4. **数据验证**：不同模式下的验证规则不同，需要分别处理
5. **错误处理**：提供清晰的错误提示，帮助用户理解限制原因
