# 批量管理目标（领域详情）设计稿

日期：2026-03-11

## 背景与目标

在「领域详情 → 目标」中，当前缺少快速调整顺序/改名/删除的入口。

本功能新增一个“批量管理”页面，用于：

- 仅管理**当前领域**下的：目标系列（MajorGoal）、阶段目标（Goal with `majorGoalId`）、独立目标（Goal without `majorGoalId`）
- **不显示归档**的目标系列/目标
- 支持：改名、上移/下移排序、删除（删除目标系列时连同其阶段目标一起删除）
- **只有点击保存才写入**数据；返回则放弃更改

## 入口与交互

入口位于：领域详情 →「目标」tab 底部按钮行。

按钮布局：

- 「批量管理」
- 「+ 添加目标系列」
- 「+ 添加独立目标」

点击「批量管理」后进入新页面 `GoalBatchManageView`。

## 页面结构（GoalBatchManageView）

整体风格参考 `TodoBatchManageView` / `BatchManageView`：

- 顶部 Header：返回（X）/ 标题「批量管理目标」/ 保存（✓）
- 内容分为两块：
  1) 目标系列（可展开其阶段目标）
  2) 独立目标

### 目标系列块

- 列表项：目标系列名称可编辑、上移/下移、删除、展开/收起
- 展开后：显示该系列的阶段目标列表（名称可编辑、上移/下移、删除）

### 独立目标块

- 列表项：目标名称可编辑、上移/下移、删除

## 数据范围与过滤

初始化仅加载：

- `MajorGoal.scopeId === scopeId && MajorGoal.status !== 'archived'`
- `Goal.scopeId === scopeId && Goal.status !== 'archived'`
  - 阶段目标：`majorGoalId` 属于上述 MajorGoal
  - 独立目标：`!majorGoalId`

保存时仅修改当前 scope 相关的非归档条目；其他 scope / 归档数据保持不变。

## 顺序字段（order）策略

保存时写回 `order`：

- MajorGoal：按当前列表顺序写 `order = 0..n-1`
- 阶段目标：在各自 majorGoal 内写 `order = 0..m-1`
- 独立目标：按当前列表顺序写 `order = 0..k-1`

展示侧也需要真正使用 `order`：

- `ScopeDetailView` 目标系列列表按 `order` 排序（无 order 置后并回退到 `createdAt`）
- `getMajorGoalChildren()` 阶段目标排序：优先 `order`，无 order 回退到 `startDate`

## 删除语义

- 删除目标系列：同时删除该系列下所有阶段目标（仅在本页面编辑态发生）
- 删除阶段目标/独立目标：删除该目标
- 仅点击保存后写回

## 涉及文件

- 新增：`src/views/GoalBatchManageView.tsx`
- 修改：`src/views/ScopeDetailView.tsx`
- 修改：`src/components/AppRoutes.tsx`（为 ScopeDetailView 补充批量更新回调）
- 修改：`src/utils/majorGoalUtils.ts`（阶段目标排序支持 order）

