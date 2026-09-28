# Memoir 日历背景居中裁切设计

## 目标

让 Memoir 顶部月历的自定义背景在五周和六周月份中，均以图片中心作为裁切基准。

## 已确认的方案

- 保留 `object-cover`，使图片等比放大并填满日历容器。
- 将图片定位由 `object-right-bottom` 改为 `object-center`。
- 日历的高度仍由实际周数自然决定；六周月份会继续使用同一张背景图，不引入五周/六周双图或新的设置项。

## 影响范围与验证

- 仅修改 `src/components/MoodCalendar.tsx` 中的背景图片 Tailwind 类。
- 不改变背景选择、透明度、本地存储或主题包导入逻辑。
- 运行生产构建，确认 TypeScript 与打包通过。
