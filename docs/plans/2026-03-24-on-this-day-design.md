# On This Day 页面设计
## 背景

当前项目已经有三套接近的数据与界面能力：

- `DailyReviewView`：适合承载沉浸式、分 tab 的日维度内容阅读与编辑。
- `TimelineView / TimelineItem`：已经具备成熟的单日时间线展示能力。
- `StatsView / ScheduleView`：已经具备单日、周维度的日程图可视化能力。

本次需求希望新增一个类似“五年日记”的 `On This Day` 页面，用于在某个具体月日上，集中回看不同年份的同一天记录。页面不承担编辑今日 review 的职责，定位为纯回看页。

用户已确认以下约束：

- 页面视觉样式尽量与 `DailyReviewView` 保持一致。
- 页面标题栏写 `On This Day`。
- 页面大标题写 `∀on MM-DD`。
- 页面内容采用 tab 展示。
- 仅展示 `daily review + 当日 logs`，不展示 weekly/monthly review。
- 新增“笺注”数据类型，需要本地保存、纳入 JSON 导出、参与云同步。
- `02-29` 仅在闰年的 `02-29` 打开，不映射到其他日期。

## 目标

- 新增一个独立的 `On This Day` 回看页面，视觉骨架复用 `DailyReviewView`。
- 提供四个 tab：
  - `时间线`
  - `日程图`
  - `回顾`
  - `笺注`
- 以“月-日”为维度聚合同一天跨年份的数据。
- 支持在“笺注”中长期积累同一月日的评论流，并跨年份复用。
- 将新数据纳入本地持久化、JSON 导入导出、云同步。

## 非目标

- 不在该页面内编辑 `DailyReview` 内容。
- 不在该页面中展示 weekly/monthly review。
- 不首版支持 `02-29` 的日期映射策略。
- 不首版支持笺注附件、图片、表情、置顶、提及等扩展能力。
- 不改变现有 `DailyReviewView` 的编辑逻辑与交互模式。

## 方案对比

### 方案 A：独立页面，复用 DailyReviewView 视觉骨架

特点：

- 新增一个独立 `OnThisDayView`
- Header、标题区、tab 样式、内容留白全面对齐 `DailyReviewView`
- 四个 tab 内部分别复用现有时间线、日程图、review 只读样式

优点：

- 职责清晰，回看页与编辑页边界明确
- 视觉统一，但不会污染 `DailyReviewView` 的行为复杂度
- 便于单独加入“笺注”能力和跨年份聚合逻辑

缺点：

- 需要新增一个独立 view、路由入口和数据聚合层

### 方案 B：在 DailyReviewView 中增加 On This Day 模式切换

特点：

- 继续使用 `DailyReviewView`
- 增加只读模式或新的 tab 组合

优点：

- 视觉复用最彻底

缺点：

- `DailyReviewView` 当前职责已偏重，继续叠加跨年份聚合会让数据流和状态流变得更混乱
- “当天编辑”与“跨年回看”是两种心智，不适合强行塞进一个页面

### 方案 C：挂在 ReviewHub / JournalView 内作为子模式

特点：

- 在 `ReviewHubView` 或 `JournalView` 中增加入口和内嵌区块

优点：

- 入口自然，贴近现有档案系统

缺点：

- 这两个页面都不是 `DailyReviewView` 那种 tab 骨架
- 内嵌后会削弱这个功能的独立性和记忆点

### 结论

采用方案 A：新增独立 `OnThisDayView`，视觉语言对齐 `DailyReviewView`，但保持独立职责与数据聚合层。

## 页面结构

### 1. 顶部标题栏

延续 `DailyReviewView` 风格的顶部栏：

- 标题：`On This Day`
- 返回按钮行为与现有 review 类页面一致
- 不放 AI、删除、编辑等操作按钮

### 2. 标题区

标题栏下方的大标题区域使用与 `DailyReviewView` 相近的排版节奏：

- 主标题：`∀on 12-15`
- 副标题：`12 月 15 日 · 过去 N 年的今日记录`

设计原则：

- 主标题承担识别性
- 副标题承担解释性
- 避免页面一上来出现过多统计数据，优先保持阅读感

### 3. Tab 结构

内容分为四个 tab：

- `时间线`
- `日程图`
- `回顾`
- `笺注`

Tab 样式、切换反馈、激活状态与 `DailyReviewView` 保持一致，降低学习成本。

## 各 Tab 设计

### Tab 1：时间线

目标：复用现有时间线样式，以“年份”为分块展示该月日的所有历史 logs。

#### 排布

- 内容区按年份倒序排列，例如：
  - `2026`
  - `2025`
  - `2024`
- 每个年份作为一个分块
- 分块头部展示轻量统计信息：
  - 记录条数
  - 总时长
  - 是否存在 daily review
- 分块内部复用现有时间线 item 卡片样式展示当天 logs

#### 交互

- 右侧悬浮切换栏复用 `DetailTimelineCard` / `TagDetailView` / `ScopeDetailView` 的悬浮导航思路
- 悬浮栏内容改为年份列表
- 点击年份时滚动到对应年份分块
- 当前滚动区域对应的年份在悬浮栏中高亮

#### 说明

- 该 tab 不显示无记录年份，避免页面被大量空块撑长
- 如果某年份当天没有 log，但有 daily review，不单独在时间线 tab 中展示空 timeline；该年份的信息放到“回顾”tab 中展示即可

### Tab 2：日程图

目标：复用现有 `ScheduleView` 的周视图视觉语言，改造为“跨年份同日单日图拼接”。

#### 排布

- 竖轴：小时，固定 `0-24`
- 横轴：年份列，如 `2026 / 2025 / 2024`
- 每列仅绘制该年份该月日的 log 时间块
- 无 log 年份保留空白网格列和年份标签

#### 交互

- 支持沿用现有日程图的缩放行为
- 横向列过多时允许横向滚动
- 保持小时轴固定，年份列区域横向滚动

#### 说明

- 本质上是把现有“周视图”的“7 天列”替换为“年份列”
- 用户能够快速对比同一天在不同年份的作息差异，这会是该页面最有识别度的视觉模块

### Tab 3：回顾

目标：集中回看过往 `daily review` 中的“一句话总结”和“回顾问答”。

#### 排布

- 按年份倒序展示 review 卡片
- 每张卡片结构固定为：
  - 年份标题
  - 一句话总结 `summary`
  - 回顾问答 `answers`

#### UI 风格

- 保持 `DailyReviewView` 的纸张感与留白
- 问题用轻标签/小标题样式
- 答案用正文块样式
- 全部为只读模式，不出现输入框和编辑控件

#### 数据展示规则

- 有 `summary` 时显示
- 有 `answers` 时显示
- `summary` 和 `answers` 任一存在都展示该年份卡片
- 两者都不存在则不显示该年份卡片

### Tab 4：笺注

目标：为某个固定 `MM-DD` 建立跨年份延续的评论流。

#### 交互模型

- `12-15` 对应一条 `On This Day` 条目
- 用户在任意年份打开 `12-15` 时，看到的是同一组笺注
- 可以继续添加新笺注

#### 排布

- 顶部为笺注列表，按创建时间倒序显示
- 底部为新增入口
- 每条笺注展示：
  - 内容
  - 时间戳

#### 风格

- 与 `DailyReviewView` 一致的卡片边框、背景和间距
- 允许视觉上略偏“纸条/批注感”，但不引入新的设计体系

## 数据模型设计

新增独立数据类型，不塞入 `DailyReview`，因为它属于“月-日聚合”的跨年对象，而非某一年的 daily review。

```ts
export interface OnThisDayNote {
  id: string;
  content: string;
  createdAt: number;
}

export interface OnThisDayEntry {
  id: string;
  monthDay: string; // MM-DD
  notes: OnThisDayNote[];
  createdAt: number;
  updatedAt: number;
}
```

选择独立类型的原因：

- 语义清晰：`DailyReview` 仍然代表某一天，`OnThisDayEntry` 代表某个固定月日
- 避免把“跨年共享笺注”错误地绑定到某一个具体年份
- 导出、导入、同步时可以作为独立资源处理
- 后续可扩展为收藏、置顶、标签等能力

## 数据聚合规则

对于页面目标日期 `MM-DD`：

1. 从 `logs` 中筛选所有日期后缀匹配该 `MM-DD` 的记录
2. 按年份分组并按年份倒序排序
3. 从 `dailyReviews` 中筛选所有 `date` 后缀匹配该 `MM-DD` 的 review
4. 将 logs 和 reviews 按年份聚合，形成页面展示模型
5. 从 `onThisDayEntries` 中读取对应 `monthDay` 的笺注流

额外规则：

- `02-29` 仅在闰年的 `02-29` 可打开，不映射到 `02-28` 或 `03-01`
- 时间线 tab 与回顾 tab 各自根据自身数据过滤展示，不强制每年都出现在所有 tab 中
- 日程图 tab 可以保留无 log 年份的空白列，但应以前端可读性为限，避免列数失控

## 组件与架构设计

### 页面层

新增独立 view：

- `src/views/OnThisDayView.tsx`

职责：

- 接收 `logs`、`dailyReviews`、`categories` 等原始数据
- 根据当前日期计算目标 `MM-DD`
- 聚合四个 tab 所需数据
- 管理 tab 切换、年份悬浮导航、笺注新增

### 复用组件

- Header / tab 样式：参考 `DailyReviewView`
- 时间线渲染：复用 `TimelineItem`、现有时间线风格配置
- 年份悬浮切换栏：参考 `DetailTimelineCard` 的日期侧栏实现
- 日程图：基于 `ScheduleView` 周视图布局抽取或新增一个轻改版组件
- 回顾只读块：复用 `ReviewView` 的视觉语言，但去除编辑态

### 新增组件建议

- `OnThisDayTimelineTab`
- `OnThisDayScheduleTab`
- `OnThisDayReviewTab`
- `OnThisDayNotesTab`
- `OnThisDayYearSidebar`

这样可以将数据聚合与 UI 渲染分离，避免 `OnThisDayView` 过重。

## 持久化与同步设计

### 本地保存

新增 `onThisDayEntries` 状态集合，建议挂入 review 体系附近统一管理。

候选落点：

- 优先：扩展 `ReviewContext`
- 备选：新增独立 context

推荐扩展 `ReviewContext`，原因：

- 该数据与 `dailyReviews / weeklyReviews / monthlyReviews` 同属“回顾档案类数据”
- 便于统一管理持久化和同步相关时间戳

### JSON 导出

在 `App.tsx` 的总导出数据包中新增：

- `onThisDayEntries`

### JSON 导入

在导入校验与恢复流程中支持：

- 识别 `onThisDayEntries`
- 缺失时回退为空数组
- 类型异常时走修正/兜底逻辑

### 云同步

在现有 `useSyncManager` 的同步总包中纳入：

- `onThisDayEntries`

并同步更新：

- 本地恢复逻辑
- 云端覆盖逻辑
- 时间戳更新逻辑

## 错误处理

### 页面空态

- 某月日没有任何历史 log 和 review：页面正常显示，四个 tab 根据数据为空态展示
- `笺注` tab 可在无历史记录时独立可用

### 数据缺失

- 某年份只有 log 没有 review：只在“时间线/日程图”中展示
- 某年份只有 review 没有 log：只在“回顾”中展示
- 对应 `monthDay` 没有 `OnThisDayEntry`：以空笺注列表渲染

### 异常兜底

- 新增笺注失败时提示 toast，不影响页面其他 tab
- 导入旧版本 JSON 时，若没有 `onThisDayEntries`，按空数组处理

## 验收标准

- 新页面可从指定入口打开，顶部标题栏显示 `On This Day`
- 大标题正确显示 `∀on MM-DD`
- 页面使用与 `DailyReviewView` 一致的视觉骨架与 tab 风格
- `时间线` tab 能按年份分块展示同一月日的 logs
- `时间线` tab 右侧年份悬浮栏可正确定位与高亮
- `日程图` tab 能以“年份为横轴，小时为纵轴”渲染同日跨年日程图
- `回顾` tab 能按年份只读展示 `summary + answers`
- `笺注` tab 可新增并持久保存笺注
- 同一 `MM-DD` 的笺注在次年打开时仍可见
- `onThisDayEntries` 被正确纳入 JSON 导出与导入
- `onThisDayEntries` 被正确纳入云同步
- `02-29` 仅在闰年的 `02-29` 可打开

## 测试建议

### 单元测试

- `MM-DD` 数据聚合逻辑
- 年份排序逻辑
- 仅 log / 仅 review / log+review 的分流逻辑
- `OnThisDayEntry` 新增与更新逻辑
- 导入旧 JSON 缺失 `onThisDayEntries` 时的兜底逻辑

### 手动验证

1. 打开一个有多年数据的日期，检查四个 tab 是否正确展示
2. 在“时间线”tab 验证右侧年份悬浮栏跳转与高亮
3. 在“日程图”tab 验证年份列是否正确对应日志时间块
4. 在“回顾”tab 验证 summary 与问答只读排版
5. 新增一条笺注，刷新后确认仍存在
6. 切换到下一年相同 `MM-DD`，确认笺注仍可见
7. 导出 JSON，确认包含 `onThisDayEntries`
8. 清空后导入 JSON，确认笺注恢复
9. 执行云同步，确认跨端恢复正常

## 后续实现拆分建议

建议按以下顺序实现：

1. 新增类型、状态与持久化链路
2. 实现 `OnThisDayView` 基础骨架与 tab
3. 接入“时间线”tab
4. 接入“日程图”tab
5. 接入“回顾”tab
6. 接入“笺注”tab
7. 补充导入导出与同步
8. 补充测试并执行构建验证
