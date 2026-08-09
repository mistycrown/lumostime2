# 日课周统计 Android 小组件设计

## 目标

新增一个初始尺寸为 4x4 的 Android 桌面小组件，直接平铺全部日课，展示当前周（周一至周日）的打卡状态。组件仅展示数据，不打开应用或修改打卡记录。

## 方案

- 沿用现有 Capacitor + 原生 AppWidget + Kotlin 位图渲染架构。
- React 侧将日课元数据与周一至周日七天的进度同步到原生 SharedPreferences。
- 原生 provider 使用位图绘制日期范围、刷新图标、日课名称和七列状态圆点。
- 刷新图标发送广播，provider 重新读取本地 payload 并刷新所有实例；不绑定打开应用的点击事件。
- 默认资源尺寸为 4x4，允许桌面纵向调整尺寸；渲染器按实际 widget bounds 缩放行高和圆点。

## 空数据与更新

- 没有日课时显示“暂无日课”。
- 应用内日课、模板或每日回顾变化时同步 payload。
- 日期、时间或时区变化时 provider 自动刷新，并由 React 下次同步更新周窗口。

## 验证

- TypeScript 单测覆盖七天 payload 的日期和值映射。
- `npm run build` 验证 Web 端类型和构建。
- Android 侧执行 Gradle 静态编译检查；不执行完整 Android 打包。
