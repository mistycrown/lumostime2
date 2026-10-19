# 待办本地提醒实施计划

**Goal:** 待办选择安排或截止日期后，在对应日期旁显示提醒入口，弹窗设置日期与时刻，Android 在应用进程退出后仍可通过系统调度发出通知。

**Architecture:** `TodoItem.reminders` 保存按日期字段区分的相对天数与本地时刻。纯函数负责校验和投影；成功保存待办后向独立原生插件提交完整快照。原生存储、调度、通知均独立于 AI/WebView，支持重启、时间/时区变化和权限恢复后的重建。

**Tech Stack:** React / TypeScript / Capacitor 7 / Android AlarmManager、SharedPreferences、NotificationCompat。

**Execution:** 按用户和 AGENTS.md 要求，在当前会话 native 执行，不启用子代理，不重复请求方案批准。

## 约束

- 使用 UTF-8；源文件放在现有 src/、android/、scripts/ 结构，维护文件头。
- 沿用日期选择器的纸感表面、主题色、深色模式；不添加按钮下说明小字。
- 此版本覆盖安排日期与截止日期；无日期、完成、循环模式不调度；复制不继承提醒。
- 日期改变后保留相对天数与时刻；清除来源日期即移除其提醒。
- Android 通知与精确提醒权限分开检查；能力受限必须可见，不显示虚假的“已设置”。
- Android 打包由用户执行，本工作区不编译 Android 应用。

## Review Focus

- 快速连续编辑和删除：按落盘顺序同步，旧快照不能覆盖新快照。
- 已触发提醒：重新打开应用、重建调度不得重复通知。
- 时间与时区变化：按新的本地日期时刻重算，拒绝不存在的夏令时时刻。
- 过期时间、非法导入字段：保存前校验，不误调度到当前或错误日期。
- 用户修改未提交：TodoDetailModal 既有一行文案变更保留在工作区，不混入提交。

## Tasks

- [x] 1. 添加提醒类型、纯函数及日期移动/清除/复制/完成/非法输入测试。
  - Files: src/types.ts, src/utils/todoReminderUtils.ts, src/utils/todoReminderUtils.test.ts, src/utils/todoDuplicateUtils.ts。
  - Interface: `normalizeTodoReminders(todo)`, `buildTodoReminderSnapshot(todos)`, `getTodoReminderTimestamp(date, setting)`。
- [x] 2. 添加独立 Android 插件、持久化及系统调度和点击导航。
  - Files: android/app/src/main/java/com/mistycrown/lumostime/TodoReminder*.java, MainActivity.java, AndroidManifest.xml, src/plugins/TodoReminderPlugin.ts。
  - Interface: `sync({reminders})`, `getStatus()`, `requestNotifications()`, `openSettings({kind})`, `consumeNavigation()`。
  - Verify: 纯 Java 时间策略测试，原生接线静态检查；记录实机验收步骤。
- [x] 3. 接入成功落盘后的快照同步和应用恢复、通知点击。
  - Files: src/contexts/DataContext.tsx, src/services/todoReminderService.ts, src/hooks/useTodoReminderNavigation.ts, src/App.tsx。
  - Verify: mock 插件验证串行化、恢复、失败重试和取消。
- [x] 4. 实现日期旁提醒按钮和独立弹窗。
  - Files: src/components/TodoReminderModal.tsx, TodoReminderButton.tsx, TodoDetailModal.tsx。
  - Verify: 有日期才出现；弹窗校验未来时间；两个来源独立保存；深色/窄屏/返回键/清除联动。
- [x] 5. 运行针对性测试、生产构建、隔离 Electron 交互与截图冒烟，执行 cap sync，检查 diff，按验证结果决定提交。
  - Android 实机待验：锁屏、进程回收、重启、权限拒绝/恢复、改期/完成/删除、通知打开正确待办。

结果：34 项 Vitest、独立 Java 时间检查、13 模块定向类型检查及六组 Electron 交互通过；截图采用经过验证的微软雅黑。Android 编译按仓库要求交由用户进行，原生通知实机验证尚不可用，因此依据 AGENTS.md 暂缓自动提交；保留所有用户已有改动未暂存。详情见 `docs/todo-local-reminders.md`。
