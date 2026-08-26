# Routine 连续计时设计

## 目标

Routine 是记录页中的快速入口，用于把一组已有计时活动按固定顺序连续启动。每一步都写入普通活动 Log；Routine 不创建新的记录类型，也不负责汇总统计。后续统计直接复用时间线的活动、分类、标签和时间范围筛选。

## 入口与信息架构

不新增底部导航或独立主页面。记录页保留现有分类侧栏和活动网格，在活动网格下方增加 Routine 分栏。

当前选中的计时分类只显示归属于该分类的 Routine。Routine 项目采用紧凑列表（移动端两列）展示图标、名称和步骤数量，点击项目直接启动第一步。

设置页新增“记录”分组，位置在“显示与偏好”之后、“内容”之前。该分组包含：

- 标签关联领域规则（从“通用”移动）
- 场景设置（从“显示与偏好”移动）
- Routine 设置

## Routine 配置

Routine 必须归属于一个计时分类。每个步骤引用一个已有的分类与活动，不创建 Routine 专属活动。第一版创建流程默认优先展示所属分类下的活动，数据模型保留步骤分类 ID 以支持稳定引用。

```ts
interface Routine {
  id: string;
  name: string;
  icon?: string;
  categoryId: string;
  steps: Array<{
    id: string;
    activityId: string;
    categoryId: string;
    order: number;
  }>;
  createdAt: number;
  updatedAt: number;
}
```

Routine 设置支持新建、编辑名称/图标/所属分类、调整步骤顺序、添加或删除步骤以及删除 Routine。

## 运行流程

启动 Routine 后仍停留在记录页，页面顶部显示运行卡片，同时复用现有悬浮计时窗。应用内卡片负责显示流程控制，悬浮窗负责全局计时操作。

运行状态保存：

```ts
interface ActiveRoutineRun {
  routineId: string;
  currentStepIndex: number;
  routineStartedAt: number;
  currentSessionId: string;
}
```

卡片显示 Routine 名称、当前步骤、`当前步骤 / 总步骤`、实时耗时和退出按钮。主按钮统一使用流程按钮：非最后一步显示“下一步”，最后一步自动显示“完成”。

点击“下一步”时，结束当前活动 Log，立即启动下一步骤并更新 `currentStepIndex`。最后一步点击“完成”时，结束最后一个 Log 并清除运行状态。暂停、回退、跳过和预设时长自动推进不在第一版范围内。

## 悬浮窗同步与退出

运行状态通过 `currentSessionId` 与当前活动会话绑定。

- 卡片“退出”：结束当前步骤并清除整个 Routine 运行状态，不启动后续步骤。
- 悬浮窗取消当前计时：等价于卡片“退出”，Routine 立即结束，当前步骤不写入有效活动记录。
- 悬浮窗提交当前活动：等价于卡片“下一步”，当前步骤写入时间线并自动启动下一步骤；若已是最后一步，则直接完成 Routine。

Routine 控制器需要订阅现有活动会话的结束/提交结果，避免悬浮窗操作后卡片停留在过期步骤。

## 验收标准

1. 可在记录页当前分类的 Routine 分栏启动 Routine。
2. 启动后第一步立即产生普通活动计时和悬浮窗状态。
3. 每次“下一步”只结束当前步骤并启动下一步骤，时间线中形成独立 Log。
4. 最后一步按钮显示“完成”，点击后卡片消失且最后一条 Log 已提交。
5. 卡片退出和悬浮窗取消都会结束 Routine；悬浮窗提交会推进到下一步。
6. Routine 设置位于“设置 → 记录 → Routine 设置”，并强制要求所属计时分类。
7. 不影响现有单活动计时、场景启动和时间线筛选。

