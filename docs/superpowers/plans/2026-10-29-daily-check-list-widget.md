# Android 日课清单小组件实施计划

> 执行方式：遵循 AGENTS.md，当前会话 native 执行，不使用子代理。

**Goal:** 落地已选中的 A 版日课清单 4×3，直接在 Android 桌面勾选或累计次数。

**Architecture:** 新增独立 AppWidgetProvider 和 RemoteViews 列表，复用每日 payload、原生进度缓存、待回写队列与刷新协调器。元数据补充 manual/auto 类型，自动项只读；列表保持模板顺序，次数达标后不循环清零。

**Tech Stack:** Kotlin / Java、Android RemoteViews XML、Capacitor、Vitest、JUnit。

**Spec:** `static/design/daily-check-widget/concept-a.png`，用户回复「1」确认。

## Global Constraints

- 所有源文件 UTF-8，维护修改头注释。
- 不编译 Android 应用；在本机独立运行纯 Java 规则测试，执行 Web build 和相关 Vitest。
- 不提交用户预先存在或并行产生的其他修改。
- 采用浅纸色、细分隔线、绿色完成圆点，按钮不附加说明文字。

## Review Focus

- 旧缓存缺少类型时不能把自动项误当成手动日课。
- 跨天旧触区不能写到错误日期；刷新后展示新一天的进度。
- 次数已达标后再次点击不得清零。
- 连续点击和离线操作沿用现有队列，回到应用后准确回写。
- 已完成日课保持模板顺序；空数据与长名称仍能显示。

### Task 1: 元数据和手动动作规则

**Files:** `src/plugins/WidgetBridgePlugin.ts`、`src/services/widgetService.ts`、`WidgetModels.kt`、`WidgetStores.kt`、`WidgetBridgePlugin.kt`、`WidgetTimerController.kt`，新增 `WidgetDailyCheckListRules.java` 与 JUnit 测试。

**Interfaces:** payload item 增加 `type?: 'manual' | 'auto'`；`WidgetDailyCheckListRules.actionMode(type, manualMode, currentCount, targetCount, renderedDate, todayDate)` 返回 toggle / increment / null；`WidgetTimerController.handleDailyListItemTap(context, widgetId, itemId, renderedDate)` 执行已有原生写入和排队。

- [x] 新增行为测试：自动/未知项、跨天、二值取消、次数上限及不合法目标。
- [x] 传递并持久化类型；旧缓存类型缺失按只读处理。
- [x] 扩展公共打卡入口，复用现有 mutation 流程，为新列表禁用次数循环。
- [x] 验证 payload 类型和 queued toggle / increment 的 Web 回写结果。

### Task 2: 4×3 原生清单与刷新接入

**Files:** 新增 `QuickLogWidgetDailyCheckList4x3.kt`、`WidgetDailyCheckListRemoteViewsService.kt`，配套 layout / drawable / widget_info XML；修改 Manifest、strings、`WidgetRefreshCoordinator.kt`。

**Interfaces:** provider 提供 `refreshAllAsync(context)`、`refreshWidget(context, widgetId)`；service 从共享 daily payload 获取今天的行，使用实例、日期与布局版本区分 RemoteViews 缓存；点击项携带稳定 item ID 和渲染日期。

- [x] 实现独立接收器、日期/完成数标题、滚动列表、空状态和 picker 预览。
- [x] 行内保留名称与图标，右侧圆形勾选 / 次数 +；自动项只读，完成项不重排。
- [x] 注册 provider/service，并接入全部、daily payload 及单实例刷新。
- [x] 验证 XML 资源引用、注册、缓存 URI、动作模板与日期切换。

### Task 3: 验证与提交

- [x] 独立运行纯 Java JUnit 规则测试，不触发 Android Gradle 编译。
- [x] 执行相关 Vitest 与 `npm run build`，检查 XML 和 diff。
- [x] 执行 `npx cap sync android` 同步产物；仅暂存本次代码与必要文档。
- [x] 创建中文 Git commit；说明 Android 真机验收仍需用户手动编译后进行。

## 验证记录

- `node node_modules/vitest/vitest.mjs run --config vitest.widget.config.ts`：4 个文件，59 项通过。
- 独立 `javac -encoding UTF-8` + JUnitCore：`WidgetDailyCheckListRulesTest` 的 5 项通过，未编译 Android 应用。
- 已解析 9 个新资源 XML，并检查 native R 引用、Manifest 接收器和 RemoteViews 服务权限。
- 最终 `npm run build` 通过；`npx cap sync android` 完成，未执行 Android Gradle 编译或设备运行。
- 旧缓存缺少 type 时只读；新版本应用启动同步后恢复正确的手动/自动类型。
- Android 12+ 使用稳定 ID 的 RemoteCollectionItems；较早系统复用按实例/日期区分的 RemoteViewsService，日常刷新只通知数据变化。
- 真机验收待用户手动编译安装：添加「日课清单 4x3」，确认勾选/取消、次数达标、自动项只读、重开应用回写、跨天与滚动状态。
