# AI Check-in 定点唤醒设计

## 背景

当前随机 Check-in 同时存在两组时间配置：

- `minCheckinMinutes` / `maxCheckinMinutes` 用于随机生成明确的下一次触发时间。
- `basePollMinutes` 用于让 Android 前台服务周期性扫描这个时间是否已经到达。

因此，已经生成的 Check-in 时间并不会直接触发任务，而是要等待下一次扫描。实际调用时间最多会比计划时间多延迟一个检查周期。Reminder 和 AI 来信后来已经迁移到 `AlarmManager` 定点唤醒，Check-in 仍保留了最初版本的轮询实现。

## 目标

- Check-in 在随机选定的时间通过 Android 系统 Alarm 直接唤醒。
- 删除用户可见的“检查频率”，只保留最低和最高随机间隔。
- 到点时若被免打扰或最低打扰保护拦截，放弃本轮并随机生成下一轮，不在保护结束后补发。
- AI 回复、沉默或请求失败后都进入下一次随机周期，不重复消费同一个 Check-in。
- 状态栏展示稳定的下一次触发时刻，不依赖周期轮询刷新倒计时。

## 非目标

- 不把随机 Check-in 写入 Assistant Reminder 业务队列。
- 不改变 AI 对 `reply` 和 `silent` 的决策规则。
- 不改变 Reminder 和 AI 来信已有的触发语义。
- 不保证所有 Android 设备都能精确到分钟；系统未授权精确闹钟时仍接受平台调度延迟。

## 方案选择

采用独立 Check-in Alarm 方案。

不复用 Reminder 队列，因为 Reminder 是用户或 AI 明确创建、需要保留处理状态的任务；Check-in 只是一次可被保护条件丢弃的随机唤醒机会。也不使用单次 Handler 延迟，因为应用进程被系统回收或设备进入休眠后无法提供可靠唤醒。

## 调度架构

新增与现有 Reminder Alarm、AI Letter Alarm 对称的原生组件：

- `AssistantCheckinAlarmScheduler`：注册或取消下一次 Check-in Alarm。
- `AssistantCheckinAlarmReceiver`：收到 Alarm 后启动 `AssistantAgentService`。
- `AssistantAgentService.ACTION_TRIGGER_CHECKIN_TIMER`：处理一次已经到点的随机 Check-in。

正常数据流：

1. 后台助理启动或随机 Check-in 配置发生变化。
2. 服务在最低和最高间隔之间随机选取分钟数。
3. 保存 `nextRandomCheckinAtMs`，并为该时刻注册 Alarm。
4. Alarm 到点后 Receiver 唤醒服务。
5. 服务立即消费当前时刻，避免同一个 Alarm 重复执行。
6. 若免打扰或最低打扰保护生效，记录 `checkin_skipped`，不调用 AI。
7. 否则派发一次 `checkin` AI 请求并记录 `checkin_dispatched`。
8. 无论第 6 步还是第 7 步，均从当前时间重新随机并注册下一次 Alarm。

AI 请求失败不对同一个 Check-in 做紧迫重试。失败仍保留在后台调用诊断中，下一次尝试由新的随机周期承担。

## 配置与迁移

- 从设置界面删除“检查频率（分钟）”输入框及其校验、草稿状态。
- 从 `AssistantAgentConfig` 和原生插件配置参数中删除 `basePollMinutes`。
- 已安装版本本地存储里遗留的 `basePollMinutes` 字段由配置规范化过程自然忽略，不需要数据迁移任务。
- 修改最低间隔、最高间隔、随机 Check-in 开关或后台助理开关时，先取消旧 Alarm，再按最新配置决定是否生成新时间。
- 仅同步 Prompt 快照、Reminder 或 AI 来信计划时，不重置当前 Check-in 时间。

## 生命周期

- 关闭随机 Check-in：取消 Check-in Alarm，并清空下一次时间。
- 关闭后台助理：同时取消 Check-in、Reminder 和 AI Letter Alarm。
- 服务重新创建：按现有启用状态重新建立下一次 Check-in；若无法恢复旧随机时刻，则从重建时刻开始新周期，避免立即补发陈旧 Check-in。
- Alarm 广播到达但后台助理已经关闭：Receiver 只取消陈旧 Alarm，不启动调用。
- 系统允许精确闹钟时使用 `setExactAndAllowWhileIdle`；否则降级为 `setAndAllowWhileIdle` 或平台对应实现。

## 状态栏与诊断

- 正常启用时显示固定时间，例如“下次随机检查：14:30”，不显示会过时的“还有 N 分钟”。
- 随机 Check-in 关闭时显示后台助理待命状态，不再提及检查频率。
- 保留 `checkin_dispatched`、`checkin_skipped` 和跳过原因。
- 诊断上下文保留 `nextRandomCheckinAtMs`、最低/最高间隔和保护条件状态，移除 `basePollMinutes`。
- 周期性的 `poll_tick` 不再是正常 Check-in 链路的一部分。

## 错误处理

- AlarmManager 不可用：记录原生诊断错误，但不恢复用户可配置轮询。
- Receiver 重复到达：通过消费当前计划时间并立即生成下一次时间，防止重复调用。
- 原生 AI 不可用：沿用现有 Web fallback 派发路径，然后进入下一随机周期。
- AI 请求失败：保留失败记录，不补发本轮。

## 验证

- 原生源码契约测试覆盖 Check-in Alarm 的注册、取消、Receiver 唤醒和 Manifest 声明。
- 服务测试或源码契约测试覆盖到点允许、免打扰跳过、最低保护跳过以及每条分支重新调度。
- 前端测试覆盖 `basePollMinutes` 从配置类型、规范化、设置草稿和校验中移除。
- 验证 Reminder、AI 来信同步不会重置 Check-in Alarm。
- 运行相关 Vitest、`npm run build` 和 `npx cap sync android`。
- Android APK 由用户重新构建安装后，使用状态栏和后台诊断进行真机验证。

