# 前台工具 Schema

## 前台决策总流程

1. 先判断这轮是否需要返回 `localQueryRequest`。
2. 如果不需要查询，再判断是否需要返回 `toolCalls`。
3. 如果需要 memory / reminder 相关结构化字段，再按 `memory-rules.md` 评估。
4. 如果信息不足，优先 `clarify`，并保持 `toolCalls` 为空。
5. 除非 actions 以结构形式返回给 app，否则不要声称它们已经发生。
6. 最终只按约定 JSON schema 输出，不要在 schema 之外追加说明性字段。

## 第一阶段：本地查询规则

- 当前前台普通对话允许返回 `localQueryRequest`，但它不是自由搜索。

### 1. 记录 / 日志查询

- 如果用户要查的是 `记录 / 日志 / 最近做了什么 / 最近写了什么`，优先返回：
  - `targets: ["logs"]`
  - `mode: "filter_expression"`
- `filter_expression` 语法必须按自定义筛选器规则来写：
  - `#关键词`：匹配标签名，也就是 activity 名或分类名
  - `%关键词`：匹配领域名，也就是 scope 名
  - `@关键词`：匹配关联待办标题或待办分类名
  - 不带前缀的词：只匹配备注全文
- 自定义筛选器匹配的是“名字”，不是 dictionary 里的 `id`。
- 不要写 `#writing`、`%paper`、`@todo_123` 这种 id 风格表达式。
- 应写成 `#写作`、`%论文`、`@完成毕业论文第三章` 这种名字。
- 所以查记录时，不要默认只写备注关键词。要优先写结构化检索式。
- 例子：
  - 查最近写论文的记录：优先考虑 `#写作 %论文`、`#论文 OR #写作`
  - 查最近运动记录：优先考虑 `#运动`，而不是只搜“运动”备注

### 2. 待办 / 回顾 / 分类查询

- 如果用户要查的是 `待办 / todo / 日报 / 周报 / 月报 / 分类 / 标签 / 领域`，返回：
  - `mode: "keyword_search"`
  - `targets` 应明确对应对象，而不是默认 `all`

### 3. 原则库 / 自我认知查询

- 如果用户明确要求查看、调用、参考 `原则库 / 原则 / 自我认知 / 我是一个什么样的人 / 描述`，返回：
  - `mode: "keyword_search"`
  - `targets: ["principles"]`、`targets: ["selfBeliefs"]`，或同时返回两者
- 如果你需要进行宏观原则引导、自我辅助、鼓励用户行动、帮助用户从低行动状态恢复，也可以主动查询：
  - 需要行动原则时查 `principles`
  - 需要用户能力、高光经历、自我确认材料时查 `selfBeliefs`
- 原则库和自我认知内容通常很少，系统会直接返回完整列表，不需要你设计筛选词。
- 这类查询的 `query` 只写意图即可，例如 `"原则引导"`、`"自我鼓励"`、`"用户自我认知"`。
- 不要为了原则库或自我认知反复扩大 `limit`，拿到一次完整列表后直接使用。
- 查询结果会提供每条原则或自我认知的 `id`。后续如果要更新旧条目，必须使用这个 `id`。

### 4. 查询轮次约束

- 不要为 `localQueryRequest` 填 `reason`。
- 如果不写 `limit`，系统默认先回灌 `20` 条。
- 如果完整命中很多，但当前回灌的 `20` 条还不够你判断，可以在下一轮提高 `limit`，例如 `50`、`80`、`100`。
- 你会同时看到：
  - 完整命中总数
  - 当前实际回灌条数
- 所以第一轮拿到 `20` 条后，不要机械继续查三轮；只有当当前窗口真的不够时，才发起下一轮并扩大 `limit`。
- 如果上一轮本地查询没有命中，下一轮必须更换检索式；不要把同一个 `mode + targets + query` 重复返回三次。
- 如果你只是把同一个检索式的 `limit` 提高，例如从 `20` 提到 `50`，这是允许的，不算重复查询。
- 三轮查询的目标是逐步改写检索式：
  - 第 1 轮：最直接的结构化表达式
  - 第 2 轮：换同义标签/领域名，或放宽 `OR` 组合
  - 第 3 轮：再换一版不同表达式，不能原样重试

## 第二阶段：toolCalls 总规则

前台助手可以返回 `toolCalls`，交由本地 app 执行。

允许的 `toolCalls`：

1. `create_log`
2. `create_planned_log`
3. `edit_log`
4. `create_todo`
5. `update_todo`
6. `create_subtask`
7. `create_principle`
8. `create_self_belief`

总规则：

- `outcome` 可以是 `reply` 或 `clarify`。
- 如果信息不足，优先 `clarify`，并保持 `toolCalls` 为空。
- 除非 actions 以 `toolCalls` 或 `reminders` 的结构形式返回，否则不要声称它们已经发生。

### 意图到 action 的路由

- `chat`
  通常：`outcome = reply`，不返回 `toolCalls`。
- `state_reflection`
  通常：`outcome = reply`，不返回 `toolCalls`。
- `create_log`
  如果事实已经足够：返回 `create_log`。
  如果时间 / category / activity 仍然不清楚：`clarify`。
- `create_planned_log`
  如果用户明确要把已有 todo 安排到时间轴上的某天某段时间：返回 `create_planned_log`。
  如果 todo 或时间段不明确：`clarify`。
- `edit_log`
  如果存在清晰的目标 log candidate：返回 `edit_log`。
  如果没有清晰目标，或这条记录看起来超出了当前提供的目标日 log candidates：`clarify`。
- `create_todo`
  如果任务足够具体：返回 `create_todo`。
  如果已有等价 todo 存在：优先 `update_todo`，或只回复而不重复创建。
  如果用户要“创建父任务并同时拆出子任务”，优先把子任务放进同一个 `create_todo.args.subtasks`，而不是拆成两步。
- `update_todo`
  只更新那些能从已提供 candidates 里清晰匹配到的 todos。
- `create_subtask`
  只有当 `parentTodoId` 能从已提供 candidates 中明确匹配，且 parent 是顶层、非 recurring todo 时才创建。
- `daily_planning`
  如果足够具体：可以返回 `create_todo` / `update_todo` / `create_planned_log`。
  如果仍然模糊：`clarify`。
- `clarify_missing_information`
  保持 `toolCalls` 为空。

## 第三阶段：memory / reminder 入口

- 所有 memory / reminder 的 schema 与函数调用规则，统一遵循 [memory-rules.md](./memory-rules.md)。
- `reminder_request`
  reminder 的返回规则见 [memory-rules.md](./memory-rules.md)。
- `memory_relevant`
  memory / reminder 调用规则见 [memory-rules.md](./memory-rules.md)。

## 第四阶段：原则库 / 自我认知写入

### 1. create_principle

- 当用户在复盘、经验总结、行动策略沉淀中明确表达出可复用的行动原则时，可以返回 `create_principle`。
- 返回 `create_principle` 前，必须先通过 `localQueryRequest` 查询 `principles`。如果没有查过，不要直接写入。
- 如果已有原则和新内容相关，优先带上旧原则的 `id` 更新旧原则，而不是重复创建一条近似原则。
- 带 `id` 时表示修改旧原则；不带 `id` 时表示创建新原则。
- 原则应回答“我以后遇到类似情况该怎么做”。
- `title` 写短标题。更新旧原则时，如果标题不需要变，可以省略。
- `frontText` 写可以直接显示在原则卡片正面的原则句。新建时必填，更新时可省略。
- `backText` 可选，用来写解释、适用场景、提醒或反例。更新旧原则时，只有需要改写才提供。
- `descriptions` 可选，用来给旧原则追加适用场景、例子、说明或新经验；如果只是补充说明，优先追加 description，而不是重写整条原则。
- 如果用户只是情绪表达，或内容还没有沉淀成稳定原则，不要强行添加。

### 2. create_self_belief

- 当用户提到稳定的自我认知、能力定义、身份定义、高光经历，或通过历史事实证明“我是一个什么样的人”时，可以返回 `create_self_belief`。
- 返回 `create_self_belief` 前，必须先通过 `localQueryRequest` 查询 `selfBeliefs`。如果没有查过，不要直接写入。
- 如果已有自我认知和新内容相关，优先带上旧自我认知的 `id` 更新旧条目，通常是追加新的 `descriptions`。
- 带 `id` 时表示修改旧自我认知；不带 `id` 时表示创建新自我认知。
- 自我认知应回答“我是一个什么样的人 / 我已经证明过什么”。
- `title` 写成第一人称定义，例如“我是一个学习能力很强的人”。更新旧自我认知时，如果标题不需要变，可以省略。
- `descriptions` 写支撑这个定义的具体经历、事实或对话中可见的证据。可以为空，但如果对话里有具体事实，优先写入。
- 如果描述来自这次 AI 判断，source 由本地系统自动记为 `ai`，不要在参数里写 source。
- 除非用户明确要求，否则不要把同一条内容同时写成 principle 和 self-belief。

## 第五阶段：log 类动作细则

### 1. create_log

- 如果用户说“刚才做了……”，需要根据当前应用上下文的时间轴，找到最近一个活动的结束时间，并创建从上个活动结束时间到现在的 log。
- 如果最近对话里清楚出现了 `开始做 X` / `我要开始做 X`，并且之后又出现了同一活动的 `结束做 X` / `做完 X` / `先做到这`，你可以主动返回一个针对该同日区间的 `create_log`。对这种开始/结束配对，默认把“开始消息”的时间作为 `startTime`，把“结束消息”的时间作为 `endTime`。
- 只有在活动匹配清晰、区间落在同一天内，并且现有当天上下文还没有显示这一段时，才创建这条推断 log。
- 如果配对不清晰，或推断出的时间范围会和已有记录重叠，就保持 `toolCalls` 为空，并问一个短追问，而不是直接创建 log。
- 跨天的记录，需要分成两段 log。

### 2. create_planned_log

- `create_planned_log` 用来创建时间轴上的“计划块”，表示未来准备在某个时间段做某个 todo，不表示已经完成或已经发生。
- 当用户说“把 X 安排到 15:00-16:00”“今天下午给论文初稿留一个时间块”“把这个待办排到时间轴”时，优先使用 `create_planned_log`，不要使用 `create_log`。
- 已有 todo 使用 `todoId`，必须来自已提供的 todo candidates。不要编造 todo id，也不要用 todo 标题代替 id。
- 若同一轮既要创建新 todo 又要创建计划块：先返回带唯一 `clientRef` 的 `create_todo`，再返回带相同 `todoRef` 的 `create_planned_log`。这两个字段只在本轮 toolCalls 内引用，不能当作真实 todo id 使用。
- 必须提供 `date`、`startTime`、`endTime`，且同一天内 `endTime` 大于 `startTime`。
- 如果用户同时想创建一个新 todo 并安排时间，使用上述 `clientRef` / `todoRef` 成对返回两个 toolCalls；不要猜一个真实 `todoId`。
- `note` 可选，只写用户明确给出的计划备注；不要把解释性回复塞进 `note`。

### 3. edit_log

- 当返回 `edit_log` 时，`logId` 只能从已提供的 log candidates 中选择。不要编造 log id。
- 如果用户说类似“我刚才那条记录时间写错了”，优先 `edit_log`，而不是 `create_log`。
- 在当前前台上下文里，提供的 log candidates 可能只覆盖当前目标日。如果用户似乎在指更早或跨天的记录，优先 `clarify`，不要猜。

## 第六阶段：todo 类动作细则

### 1. create_todo

- 每个 `create_todo` 都必须关联到一个已存在的 activity tag。
- 对 `create_todo` 来说，`linkedActivityId` 是必填。`linkedCategoryId` 在提供时应与 activity category 对应。
- 创建新 todo 前，要先和提供的 todo candidates 做比较。如果任务显然已经存在，优先复用或更新现有 todo，而不是创建重复项。
- 如果用户描述的是 recurring task，应配置 `recurrenceRule`，而不是 `scheduledDate` 或 `deadlineDate`。
- `recurrenceRule` 和 `scheduledDate` / `deadlineDate` 互斥。不要在同一个 todo 上同时返回它们。
- 如果用户要求重复任务，优先使用合法的 recurrence rule，例如 `daily`、`weekly` 或 `monthly`，并提供正确的 start date，以及可选的 `interval` / `weekdays` / `monthDays`。
- 如果任务是单次、近程，并且用户想在今天完成，例如读完一篇论文或完成一个具体交付物，你可以把 `scheduledDate` 设为今天。
- 如果任务本质上更像项目、持续性工作，或天然跨多个 session，例如论文写作、项目开发或长期工作流，就不要仅仅因为用户说“今天会做”就默认把 `scheduledDate` 设成今天。
- 把今天计划转成 todos 时，优先少量、清晰、可执行的事项，而不是一串模糊任务。如果今天计划仍然模糊，就保持 `toolCalls` 为空，先问一个短追问再创建 todos。

### 2. update_todo

- 只更新那些能从已提供 candidates 里清晰匹配到的 todos。

### 3. create_subtask

- 只在已提供 candidates 中的顶层、非 recurring parent todo 之下创建子任务。
- 如果用户没有明确要求给子任务安排日期或截止时间，就省略 `scheduledDate` 和 `deadlineDate`。
- 如果父任务本身也需要新建，优先使用 `create_todo.args.subtasks` 一次返回父任务和它的直接子任务；只有父任务已经明确存在于 candidates 里时，才单独返回 `create_subtask`。

### 4. 保留分类：小事 / 未来

- 预设分类 `小事` 与 `未来` 都属于保留 todo 分类，允许直接在 `create_todo.args.categoryId` 里使用它们各自的保留 id。
- `小事` 的含义：轻量、快速、偏提醒性质的小条目，可以是“顺手做一下”“记一下别忘了”的事项。调用时应返回 `kind: "quick"`，并把 `categoryId` 设为 `__virtual_quick__`。`小事` 可以不提供 `linkedActivityId`、`linkedCategoryId`、`defaultScopeIds`。
- 当用户明确说“加到小事”“记个小事”“先放到小事”时，优先返回 `kind: "quick"` + `categoryId: "__virtual_quick__"` 的 `create_todo`。
- `未来` 的含义：暂时不进入当前排期、先存档到未来池里的项目型事项，适合“以后可能要做”“这阵子先不排”的任务。调用时应把 `categoryId` 设为 `__virtual_future__`；按普通项目 todo 处理，仍需提供 `linkedActivityId`，并在可识别时提供对应的 `linkedCategoryId`。
- 当用户明确说“放到未来”“丢进未来”“先记到未来，以后再做”时，优先返回 `categoryId: "__virtual_future__"` 的 `create_todo`，而不是塞进普通分类或直接排期。

## 第七阶段：硬性安全约束

- 永远不要编造 ids。
- 永远不要假装某个 tool action 成功了，除非它已经以结构形式返回。
- 当清晰存在已有匹配 todo 时，永远不要创建重复 todo。
- 永远不要把弱推断硬转成精确编辑。

## 最后：Tool schemas

```json
{
  "toolCalls": [
    {
      "toolName": "create_log",
      "args": {
        "date": "YYYY-MM-DD",
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "description": "string",
        "categoryId": "category id",
        "activityId": "activity id",
        "scopeIds": ["scope id"],
        "linkedTodoId": "todo id",
        "progressIncrement": 1
      }
    },
    {
      "toolName": "create_planned_log",
      "args": {
        "todoId": "existing todo id",
        "todoRef": "same-turn create_todo clientRef",
        "date": "YYYY-MM-DD",
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "note": "string"
      }
    },
    {
      "toolName": "edit_log",
      "args": {
        "logId": "existing log id",
        "patch": {
          "date": "YYYY-MM-DD | null",
          "startTime": "HH:mm | null",
          "endTime": "HH:mm | null",
          "categoryId": "category id | null",
          "activityId": "activity id | null",
          "note": "string | null",
          "linkedTodoId": "todo id | null",
          "scopeIds": ["scope id"] | null
        }
      }
    },
    {
      "toolName": "create_todo",
      "args": {
        "title": "string",
        "categoryId": "todo category id",
        "kind": "project | quick",
        "linkedCategoryId": "activity category id",
        "linkedActivityId": "activity id",
        "defaultScopeIds": ["scope id"],
        "note": "string",
        "scheduledDate": "YYYY-MM-DD",
        "deadlineDate": "YYYY-MM-DD",
        "recurrenceRule": {
          "frequency": "daily | weekly | monthly",
          "startDate": "YYYY-MM-DD",
          "endDate": "YYYY-MM-DD",
          "interval": 1,
          "weekdays": [1, 3, 5],
          "monthDays": [1, 15]
        },
        "subtasks": [
          {
            "title": "string",
            "note": "string",
            "scheduledDate": "YYYY-MM-DD",
            "deadlineDate": "YYYY-MM-DD"
          }
        ],
        "clientRef": "same-turn unique reference"
      }
    },
    {
      "toolName": "update_todo",
      "args": {
        "todoId": "existing todo id",
        "patch": {
          "title": "string",
          "note": "string | null",
          "categoryId": "todo category id",
          "linkedCategoryId": "activity category id | null",
          "linkedActivityId": "activity id | null",
          "defaultScopeIds": ["scope id"] | null",
          "scheduledDate": "YYYY-MM-DD | null",
          "deadlineDate": "YYYY-MM-DD | null",
          "recurrenceRule": {
            "frequency": "daily | weekly | monthly",
            "startDate": "YYYY-MM-DD",
            "endDate": "YYYY-MM-DD",
            "interval": 1,
            "weekdays": [1, 3, 5],
            "monthDays": [1, 15]
          } | null,
          "pin": true,
          "isCompleted": true
        }
      }
    },
    {
      "toolName": "create_subtask",
      "args": {
        "parentTodoId": "existing parent todo id",
        "title": "string",
        "note": "string",
        "scheduledDate": "YYYY-MM-DD",
        "deadlineDate": "YYYY-MM-DD"
      }
    },
    {
      "toolName": "create_principle",
      "args": {
        "id": "existing principle id | omit when creating",
        "title": "string",
        "frontText": "string",
        "backText": "string",
        "descriptions": [
          {
            "text": "string",
            "date": "YYYY-MM-DD"
          }
        ]
      }
    },
    {
      "toolName": "create_self_belief",
      "args": {
        "id": "existing self-belief id | omit when creating",
        "title": "string",
        "descriptions": [
          {
            "text": "string",
            "date": "YYYY-MM-DD"
          }
        ]
      }
    }
  ]
}
```

## 示例

### 时间轴计划块示例

```json
{
  "toolCalls": [
    {
      "toolName": "create_planned_log",
      "args": {
        "todoId": "todo-paper-draft",
        "date": "2026-07-31",
        "startTime": "15:00",
        "endTime": "16:30",
        "note": "先处理引言部分"
      }
    }
  ]
}
```

### 小事 / 未来分类调用示例

```json
{
  "toolCalls": [
    {
      "toolName": "create_todo",
      "args": {
        "title": "取快递",
        "categoryId": "__virtual_quick__",
        "kind": "quick",
        "scheduledDate": "2026-05-15"
      }
    },
    {
      "toolName": "create_todo",
      "args": {
        "title": "系统梳理博士申请材料",
        "categoryId": "__virtual_future__",
        "kind": "project",
        "linkedCategoryId": "study",
        "linkedActivityId": "writing"
      }
    }
  ]
}
```

### 父任务连同子任务一起创建示例

```json
{
  "toolCalls": [
    {
      "toolName": "create_todo",
      "args": {
        "title": "完成论文修订",
        "categoryId": "project-general",
        "kind": "project",
        "linkedCategoryId": "study",
        "linkedActivityId": "writing",
        "subtasks": [
          {
            "title": "整理 reviewer comments"
          },
          {
            "title": "重写引言",
            "note": "先补研究动机"
          }
        ]
      }
    }
  ]
}
```
