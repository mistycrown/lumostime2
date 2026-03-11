# 日程图样式设计

## 背景

统计视图中的日程图原本只有一套默认视觉。现在需要在投喂功能中提供样式切换入口，并让统计视图中的日视图、周视图按选择结果切换不同外观。

## 范围

- 在投喂功能页新增 `样式` tab，位置在 `字体` 右侧。
- 在 `样式` tab 中新增 `日程图样式` 设置项。
- 提供四个选项：`默认`、`经典`、`极简`、`实色`。
- 设置值本地持久化到 `localStorage`。
- 统计视图中的 `day / week` 日程图接入样式切换。
- `month` 热力图不受影响。

## 实现

- 在 `src/constants/storageKeys.ts` 中新增 `lumostime_schedule_style` 存储键。
- 在 `src/contexts/SettingsContext.tsx` 中新增 `ScheduleStyle` 类型和状态，并做本地持久化。
- 对历史值 `outline` 做兼容迁移，自动映射到 `minimal`。
- 在 `src/views/SponsorshipView.tsx` 中提供样式选项按钮。
- 在 `src/views/StatsView.tsx` 中读取当前设置，并传给 `src/components/stats/ScheduleView.tsx`。
- 在 `src/utils/colorAdapterUtils.ts` / `src/utils/chartUtils.ts` 中基于活动已有颜色推导 `classic / minimal / solid` 的样式表现。

## 当前规则

- `default`：沿用现有默认日程图样式。
- `classic`：浅底色、细描边、左侧强调边。
- `minimal`：透明背景、仅保留左侧强调边。
- `solid`：实色背景、高对比文字。
