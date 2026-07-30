# 脉络时间块 Tailwind 颜色透明度设计

## 问题

时间轴时间块使用 `toCssColor(color, 'background', alpha)`。十六进制颜色会生成 `rgba`，但 Tailwind 类名会直接返回浅色十六进制并忽略 `alpha`，使活动色块保持不透明。

## 方案

- 不修改共享 `colorUtils`，避免改变其他页面对 Tailwind 浅色背景的既有依赖。
- 时间轴新增局部背景颜色解析：先从原活动色得到实色十六进制，再把该十六进制转换为指定 alpha 的 `rgba`。
- 普通记录使用 0.14，虚拟计划使用 0.06；边框继续使用原活动实色。

## 验证

- 增加 Tailwind 活动色和十六进制活动色都能产生 alpha 背景的单元测试。
- 运行相关 Vitest 和生产构建。
