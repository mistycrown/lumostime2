# 投喂小鱼干配色系列替换设计

## 范围

将“投喂小鱼干”中的 8 个内置多色配色系列替换为用户提供的八组颜色，同时保留“默认”和“主题单色”方案不变。该入口由 `ChartPaletteSequenceManager` 展示，配色定义集中在 `src/utils/chartPalette.ts`。

## 方案

只替换内置多色方案的颜色、名称和稳定 ID，并同步更新 `ActivityStatisticPaletteId` 联合类型及配色回归测试。已有用户保存的自定义序列、统计图选择值和备份数据结构保持兼容；新 ID 不复用旧 ID，避免旧配置静默指向不同颜色。

## 验证

运行配色单元测试和 `npm run build`，确认八组颜色均为有效且不重复的 HEX 值，并确保 TypeScript 构建通过。
