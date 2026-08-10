# 日课周统计 4x3 紧凑小组件设计

## 目标

保留现有 4x4 日课周统计小组件，新增一个独立的 4x3 紧凑版本。

## 方案

- 4x3 使用独立 provider、layout、provider XML 和 XML 预览资源。
- 顶部仅显示周日期范围与浅灰刷新按钮，不显示“日课周统计”标题。
- 内容区使用 `ListView + RemoteViewsService`，每条日课为固定紧凑行高的位图行。
- 当日课数量超过可视区域时可垂直滚动，`ListView` 禁用滚动条与渐变边缘。
- 行位图显示图标、日课名称、七个紧凑圆点；右侧留出稳定内边距。
- 4x3 与 4x4 复用同一份周数据 payload；日课行没有点击动作，只有刷新按钮可操作。

## 验证

- 测试 provider、服务、4x3 尺寸、无滚动条属性和刷新路由的源码接线。
- 解析新增 Android XML 文件。
- 运行 Web 构建与 Capacitor Android 同步，不执行 Android Gradle 编译。
