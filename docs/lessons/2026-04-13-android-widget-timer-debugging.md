# Android 小组件计时器排障记录

## 背景

这次问题的目标很明确：

- 桌面小组件点击活动后立刻开始计时
- 图标从默认态切换为停止按钮
- 再点一次结束活动并恢复默认图标
- 在组件选择器里能看到正常预览

实际排障过程中，问题被拆成了两类：

1. 点击后状态为什么不刷新
2. 为什么有时小组件直接提示“载入窗口小部件时出现问题了”

## 最终真正生效的修改

### 1. 把点击链路从 Glance 改成经典 `AppWidgetProvider + RemoteViews + PendingIntent`

这是这次最关键、也是真正解决“点击不切换状态”的修改。

之前的小组件点击链路基于 `GlanceAppWidgetReceiver` 和 `ActionCallback`。实际现象是：

- 小组件能读到“添加到桌面那一刻”的状态
- 但后续点击不会稳定触发桌面 UI 刷新
- 表现上像是组件只渲染了一次，后面一直卡住

改成经典方案后，桌面点击会走下面这条链路：

1. `RemoteViews` 给每个槽位绑定 `PendingIntent`
2. 点击后广播回到 `QuickLogWidget`
3. `QuickLogWidget` 调用 `WidgetTimerController.handleSlotTap`
4. 原生状态更新完成后，立刻调用 `AppWidgetManager.updateAppWidget`
5. 桌面宿主收到新的 `RemoteViews`，图标马上切换

这一步是本次修复的根因修复。

相关代码：

- `android/app/src/main/java/com/mistycrown/lumostime/QuickLogWidget.java`
- `android/app/src/main/res/layout/widget_layout.xml`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetBridgePlugin.kt`

### 2. 移除 `RemoteViews` 不支持的 `Space`

在切到 `RemoteViews` 之后，桌面一度报：

- “载入窗口小部件时出现问题了”

根因是布局里用了 `Space`。`Space` 在普通布局里没问题，但在 `AppWidget` 的 `RemoteViews` 里兼容性很差，容易直接导致宿主加载失败。

最后的修法是：

- 删除所有 `Space`
- 改用 `layout_marginTop` 和 `layout_marginEnd` 做间距

这一步解决的是“小组件加载失败”，不是“点击不刷新”，但它是切到 `RemoteViews` 后必须同步完成的兼容性修复。

## 这次看起来有帮助、但不是根因修复的修改

下面这些改动不是完全没价值，但不是本次问题的决定性修复：

### 1. 在 Glance 里追加 `updateAll()`

我们试过：

- 点击后调用 `update(glanceId)`
- 再改成 `updateAll(context)`

这些修改理论上符合官方建议，但在当前设备/桌面宿主上，仍然没有解决“组件只认首次添加时状态”的问题。

结论：

- 这类改动是合理尝试
- 但在这次问题里不是最终有效解

### 2. 调整 widget 运行态判断逻辑

我们试过把按钮高亮判断收敛到：

- `runtimeState`
- `slotIndex`
- 去掉多余的 `lastActiveSlotIndex`

这些调整让状态模型更干净，也减少了误判空间，但它们建立在“桌面宿主会重新请求 UI”这个前提上。

如果宿主根本没重新渲染，那么状态模型再正确，桌面上也还是看不到变化。

结论：

- 这是有益的清理
- 但不是这次点击不生效的根因修复

### 3. 把 `SharedPreferences.apply()` 改成 `commit()`

这个修改主要是为了解决“写入还没真正落盘就刷新”的竞态。

它是一个合理的稳态优化，当前方案里也值得保留，但从现象看，它并不是这次问题最核心的断点。

因为在 Glance 方案下，即便状态已经写进去了，桌面 UI 仍然可能不刷新。

### 4. 添加 `previewLayout` / `previewImage`

这一步解决的是“组件选择器预览”问题，不解决点击切换问题。

结论：

- 对用户体验是必要补充
- 但与点击状态切换无直接因果关系

## 这次删掉的无效残留

在确认经典 `RemoteViews` 方案稳定后，应该删掉以下残留，避免仓库里同时存在两套 widget 渲染路径：

- `LumosTimerWidget.kt`
- `androidx.glance:glance-appwidget`
- `androidx.glance:glance-material3`
- 仅为 Glance 打开的 Compose 构建配置
- 只给 Glance 用的快照字段

这样能避免后续维护者误以为项目仍然依赖 Glance。

## 为什么别人应用能预览，而我们之前不行

因为 Android 小组件选择器预览不是自动生成的，通常需要在 `appwidget-provider` 里显式提供：

- `previewLayout`
- `previewImage`

我们之前缺这部分配置，所以系统组件面板里可能没有稳定预览。

现在补上之后，组件选择器能更稳定地显示预览。

相关代码：

- `android/app/src/main/res/xml/widget_info.xml`

## 以后再遇到类似问题时的排查顺序

建议按下面顺序排查，不要一开始就在状态逻辑上打转：

1. 先确认桌面点击到底有没有进入原生接收器
2. 再确认原生状态有没有成功写入
3. 再确认宿主有没有收到新的 `RemoteViews`
4. 最后才检查按钮高亮、图标切换等状态映射逻辑

也就是说，优先判断是哪一层失效：

- 点击事件没到
- 状态写入没到
- 宿主刷新没到
- UI 映射错了

这四层不要混在一起看。

## 当前项目里应该记住的结论

- 对这种“桌面上点一下就要立即切换图标”的按钮型小组件，经典 `AppWidgetProvider + RemoteViews` 往往比 Glance 更稳
- `RemoteViews` 不是普通 View 树，布局组件支持范围更窄，像 `Space` 这种普通布局能用的控件，小组件里不一定能用
- 预览问题和点击问题是两条不同链路，不要混着排
- 如果小组件看起来“只认添加时的状态”，优先怀疑的是宿主刷新链路，而不是业务状态本身

## 相关代码位置

- `android/app/src/main/java/com/mistycrown/lumostime/QuickLogWidget.java`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetTimerController.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetBridgePlugin.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetSnapshotBuilder.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetStores.kt`
- `android/app/src/main/res/layout/widget_layout.xml`
- `android/app/src/main/res/xml/widget_info.xml`
