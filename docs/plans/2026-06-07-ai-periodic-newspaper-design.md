# AI 周报/月报小报设计

## 背景

当前 `AI 小报` 只支持日报：

- 入口位于 `ReviewNarrativeTab` 的 `AI 小报` 行
- 数据写回到 `DailyReview.aiNewspaper`
- 点击后打开独立全屏小报页 `DailyNewspaperView`
- 页面正文以“真实时间线 + AI 批注”为核心

周报和月报目前只有 `AI 叙事`，没有 `AI 小报`。时间线页里已经预留了周报/月报入口，周报和月报也已有完整 Review 页面与 AI 写回基础设施，因此本次不需要新造一套入口体系，而是在现有 Review 体系上补齐周报/月报版本的小报。

## 目标

- 为周报和月报新增 `AI 小报`
- 保持与日报一致的交互骨架：
  - 叙事页中的一行入口
  - 独立全屏小报页
  - AI 聊天生成与写回
  - 删除与覆盖确认
- 周报不重复日报中已有的原始时间线数据
- 月报不重复周报或时间线原始流水
- 小报结构既要有总体评价，也要有分周期的深度点评
- 小报末尾增加下一周期的计划与展望

## 非目标

- 本次不改日报小报现有结构
- 本次不把周报/月报小报塞回 `AI 叙事` 正文中
- 本次不做“统计图嵌入式小报”
- 本次不做导出排版升级
- 本次不改周报/月报原有 `summary`、`narrative`、`answers` 的语义

## 已确认方向

采用“编辑部栏目型”方案：

- 保留日报那种独立小报页体验
- 但周报/月报正文不再复用时间线节点流
- 改成“总览 + 分周期栏目 + 展望”的专栏结构

这个方向比“日报时间线放大版”更适合周/月尺度，也符合“不要重复已有时间线数据”的要求。

## 方案对比

### 方案 A：日报放大版

做法：

- 周报按天继续渲染长时间线
- 月报按周继续渲染更长时间线

优点：

- 与日报实现最接近
- 复用度高

缺点：

- 会重复已有时间线信息
- 页面会过长
- 周/月尺度下更像流水账而不是小报

### 方案 B：编辑部栏目型

做法：

- 周报/月报保留独立小报页
- 正文采用栏目结构，而非逐条日志结构

优点：

- 最符合当前需求
- 与日报在视觉和交互上仍然是一家人
- 更适合 AI 做“提炼”和“判断”

缺点：

- 需要新定义周报/月报小报数据结构

### 方案 C：栏目型 + 证据摘要

做法：

- 在方案 B 基础上，为每个日点评/周点评附一小段证据摘要

优点：

- 论据更扎实

缺点：

- 容易重新长成统计页
- 首版实现复杂度更高

### 结论

采用方案 B。

如后续需要增强解释力，可在第二阶段向方案 C 演进。

## 信息结构

### 周报小报

周报小报建议由 4 个主栏目组成：

1. `整体总览`
2. `每日点评`
3. `本周收束`
4. `下周计划与展望`

#### 1. 整体总览

内容：

- 标题
- 一段总评导语
- 2-3 条本周关键判断

要求：

- 不做简单统计播报
- 强调节奏、推进、停滞、情绪、专注分布、结构性变化
- 文风服从当前 AI persona

#### 2. 每日点评

按周一到周日输出每日栏目。每一天包含：

- `dayLabel`
- `dailySummary`
- `keyPoints[]`

其中：

- `dailySummary` 是当天综合评价
- `keyPoints` 是 2-3 个关键点
- 关键点要像编辑批注，不只是“今天工作 3 小时”

如果某天几乎没有数据：

- 仍保留该天条目
- 但允许 AI 用“低活动 / 调整 / 空档”这类方式简短处理

#### 3. 本周收束

内容：

- 一段收束评论

作用：

- 把分散的日点评重新收拢成一周主线
- 回答“这一周真正留下了什么”

#### 4. 下周计划与展望

内容：

- 2-4 条计划建议

要求：

- 更偏策略与节奏
- 不写成纯待办清单
- 可以包含“守住什么、推进什么、减少什么”

### 月报小报

月报小报建议由 4 个主栏目组成：

1. `月度总评`
2. `每周评价`
3. `本月主题`
4. `下月计划与展望`

#### 1. 月度总评

内容：

- 标题
- 一段宏观评价
- 2-3 条月度判断

评价尺度：

- 关注整月节奏、阶段推进、结构变化、长期状态

#### 2. 每周评价

按该月覆盖到的周块输出。每周包含：

- `weekLabel`
- `weeklySummary`
- `highlights[]`
- `riskPoint`

要求：

- `weeklySummary` 给出该周一句判断
- `highlights` 抓 1-2 个高光时刻
- `riskPoint` 点出一个停滞点、摩擦点或风险

#### 3. 本月主题

内容：

- 一段主题提炼

作用：

- 给整个月一个更像“刊首主旨”的线索
- 让月报不只是周块拼接

#### 4. 下月计划与展望

内容：

- 2-4 条下月策略建议

要求：

- 比周报更偏方向判断
- 少写细任务，多写重心和节奏

## UI 设计

## 总体原则

- 尽量保持日报小报的视觉语言
- 保持当前米白背景、报纸式标题、纵向阅读、衬线正文
- 不引入统计图、卡片宫格或复杂容器嵌套

## 入口层

沿用 `ReviewNarrativeTab` 的 `AI 小报` 一行：

- 已有小报：显示标题，点击打开
- 无小报：显示“暂无小报，点击生成”
- 有小报时展示删除按钮

周报和月报都按日报同样方式接入，不新增独立按钮样式。

## 独立页面层

### 周报页

建议版式：

1. 页头
2. 总评导语
3. 关键判断列表
4. 每日栏目列表
5. 本周收束
6. 下周计划与展望

视觉上保留日报的：

- 大标题
- 导语段
- 竖向阅读节奏

但正文不使用“时间轴圆点 + 日志节点”，改为：

- 每天一个清晰栏目块
- 栏目标题较醒目
- 关键点使用轻量列表或引文式短段

### 月报页

建议版式：

1. 页头
2. 月度总评
3. 月度判断列表
4. 本月主题
5. 每周栏目列表
6. 下月计划与展望

视觉风格与周报页保持一致，只是粒度从“天”切换为“周”。

## 数据模型

日报当前依赖 `annotations[].logId`，不适合直接扩展到周报/月报。

本次建议为周报和月报新增独立数据结构。

### 周报小报数据结构

```ts
interface WeeklyNewspaperDaySection {
  date: string;              // YYYY-MM-DD
  dayLabel: string;          // 周一 / 周二 ...
  dailySummary: string;
  keyPoints: string[];
}

interface WeeklyNewspaper {
  version: 1;
  weekStartDate: string;
  weekEndDate: string;
  title: string;
  assistantReply: string;
  overallComment: string;
  keyInsights: string[];
  daySections: WeeklyNewspaperDaySection[];
  closingComment: string;
  nextPeriodPlan: string[];
  updatedAt: number;
}
```

### 月报小报数据结构

```ts
interface MonthlyNewspaperWeekSection {
  weekStartDate: string;
  weekEndDate: string;
  weekLabel: string;         // 第 1 周 / 5.1 - 5.7
  weeklySummary: string;
  highlights: string[];
  riskPoint: string;
}

interface MonthlyNewspaper {
  version: 1;
  monthStartDate: string;
  monthEndDate: string;
  title: string;
  assistantReply: string;
  overallComment: string;
  keyInsights: string[];
  monthlyTheme: string;
  weekSections: MonthlyNewspaperWeekSection[];
  nextPeriodPlan: string[];
  updatedAt: number;
}
```

### Review 挂载方式

建议新增：

```ts
interface WeeklyReview {
  ...
  aiNewspaper?: WeeklyNewspaper;
}

interface MonthlyReview {
  ...
  aiNewspaper?: MonthlyNewspaper;
}
```

理由：

- 保持与 `DailyReview.aiNewspaper` 的心智一致
- 不污染原有 `narrative`
- 便于小报独立删除、搜索、打开和导出

## 数据来源

### 周报小报输入

AI 生成周报小报时应汇总以下信息：

- 目标周内全部日志的摘要
- 每日的总时长、重点分类、重点 scope、重点 todo 投入
- 该周内每日 `DailyReview.summary`
- 该周内每日 `DailyReview.narrative` 摘要
- 该周已完成待办与重要未完成待办
- 当前 `WeeklyReview` 的已有 `summary`、`narrative`、`answers`
- 当前 persona、记忆、Dream、会话摘要

注意：

- 传给 AI 的是“日级摘要”，不是完整时间线正文
- 页面最终也不展示原始时间线

### 月报小报输入

AI 生成月报小报时应汇总以下信息：

- 目标月内全部日志的周级摘要
- 每周总时长、重点分类、重点 scope、重点 todo 投入
- 每周可提炼的高光事件和停滞段
- 该月覆盖的 `WeeklyReview.summary` / `narrative` 摘要
- 该月内 `DailyReview.summary` 的稀疏摘要
- 当前 `MonthlyReview` 的已有 `summary`、`narrative`、`answers`
- persona、记忆、Dream、会话摘要

注意：

- 月报应优先消费“周级聚合后的材料”
- 避免直接把日级碎片平铺给 AI，导致输出松散

## AI 写回流程

## 周报

建议新增周报小报命令：

- `周报小报`
- 或更贴近日报命名方式的 `周小报`

为保持一致性，建议最终采用短口令：

- `小报` 继续默认日报
- `周小报`
- `月小报`

周报流程：

1. 用户触发 `周小报`
2. 程序定位目标周 `WeeklyReview`
3. 如不存在则先创建 `WeeklyReview`
4. 若 `aiNewspaper` 已存在，则本地确认覆盖
5. 构建周级摘要数据包
6. 调用结构化 JSON 输出
7. 写回 `WeeklyReview.aiNewspaper`
8. 聊天中渲染结果卡片
9. 点击结果卡片打开周报小报页

## 月报

月报流程与周报对称：

1. 用户触发 `月小报`
2. 程序定位目标月 `MonthlyReview`
3. 如不存在则先创建 `MonthlyReview`
4. 若 `aiNewspaper` 已存在，则本地确认覆盖
5. 构建月级摘要数据包
6. 调用结构化 JSON 输出
7. 写回 `MonthlyReview.aiNewspaper`
8. 聊天中渲染结果卡片
9. 点击结果卡片打开月报小报页

## Prompt 策略

周报/月报小报的 prompt 不建议直接复制日报。

### 共通约束

- 用中文输出
- 必须返回严格 JSON
- 文风服从 persona
- 不复述原始流水
- 不堆统计数字
- 要体现判断、提炼和取舍

### 周报小报 prompt 核心要求

- 输出本周总体判断
- 为每天输出综合评价
- 为每天挖掘 2-3 个关键点
- 输出一段本周收束
- 输出下周计划与展望

### 月报小报 prompt 核心要求

- 输出整月总体判断
- 为每周输出一句判断
- 提炼每周高光与风险
- 输出一个本月主题
- 输出下月计划与展望

## 组件与服务改动面

### 1. `src/types.ts`

新增：

- `WeeklyNewspaper`
- `MonthlyNewspaper`
- 对应 section 类型
- `WeeklyReview.aiNewspaper`
- `MonthlyReview.aiNewspaper`

### 2. `src/components/ReviewView/ReviewNarrativeTab.tsx`

改为支持可配置的小报标签与标题，而不是只隐含服务于日报。

建议新增可选参数：

- `newspaperLabel?: string`
- `newspaperEmptyText?: string`

默认仍兼容日报。

### 3. `src/views/WeeklyReviewView.tsx`

新增：

- 小报入口
- 打开小报
- 生成小报
- 删除小报

### 4. `src/views/MonthlyReviewView.tsx`

新增：

- 小报入口
- 打开小报
- 生成小报
- 删除小报

### 5. 新增小报页面

建议新增：

- `WeeklyNewspaperView.tsx`
- `MonthlyNewspaperView.tsx`

原则：

- 样式复用日报小报语言
- 结构改为栏目式正文

### 6. 新增服务

建议新增：

- `weeklyNewspaperService.ts`
- `monthlyNewspaperService.ts`

职责：

- 定位/创建 review
- 构建 AI 输入数据包
- 构建严格 JSON prompt
- 解析 AI 写回结果
- 构建本地 newspaper 对象
- 更新 review

### 7. AI 写回链路

扩展：

- `AIBackfillChatReviewCommands.ts`
- `AIBackfillChatReviewWriteback.ts`
- `AIBackfillChatConversationPane.tsx`
- 相关 shared types / initialization helpers

让周报/月报小报与日报小报一样拥有：

- 覆盖确认
- 结果卡片
- 打开目标页面
- reasoning 展示

## 错误处理

- 目标周/月无效：提示并中止
- review 不存在：自动创建
- 已有小报：先确认覆盖
- AI 返回 JSON 非法：报错，不写入
- AI 返回关键字段为空：报错，不写入
- 某天或某周数据过少：允许输出简短栏目，不算错误
- 用户取消覆盖：保留原小报，不做写入

## 测试与验证

至少覆盖：

1. 周报叙事页能显示 `AI 小报` 入口
2. 月报叙事页能显示 `AI 小报` 入口
3. 无小报时可一键触发 AI 生成
4. 已有小报时可打开独立页面
5. 删除小报后入口恢复为空态
6. 周报小报写回能正确保存 `overallComment`、`daySections`、`nextPeriodPlan`
7. 月报小报写回能正确保存 `overallComment`、`weekSections`、`monthlyTheme`
8. 覆盖确认分支可正常工作
9. 会话结果卡片能打开目标小报页
10. 页面在数据不完整时仍能稳健渲染

## 实施顺序

1. 扩展 `types.ts` 和 review 数据挂载字段
2. 抽象 `ReviewNarrativeTab` 的小报入口文案
3. 新增周报/月报小报 service
4. 接入 AI 聊天写回链路
5. 实现 `WeeklyNewspaperView`
6. 实现 `MonthlyNewspaperView`
7. 接入周报/月报 review 页入口
8. 补充测试与手工验证

## 风险与控制

### 风险 1：周报内容重新长成“统计页”

控制：

- prompt 中明确禁止数字堆砌
- 页面中不展示复杂统计块

### 风险 2：月报内容松散，像周报拼接

控制：

- 强制加入 `monthlyTheme`
- 输入材料优先按周聚合

### 风险 3：共享叙事组件被日报假设绑死

控制：

- 只抽象小报入口文案和行为
- 不大动 `AI 叙事` 区域其他逻辑

### 风险 4：用户分不清叙事和小报

控制：

- 保持入口位置一致
- 小报始终走独立页面
- 文案继续叫 `AI 小报`

## 最终结论

本次周报/月报小报采用“与日报一致的交互骨架 + 与日报不同的栏目型正文”。

其中：

- 周报聚焦“整体总览 + 每日点评 + 本周收束 + 下周展望”
- 月报聚焦“月度总评 + 每周评价 + 本月主题 + 下月展望”

这样既延续了日报小报的产品心智，也避免把周报/月报做成重复时间线的放大版。
