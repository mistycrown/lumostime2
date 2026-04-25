# 脉络页顶部快捷按钮可配置设计

日期：2026-04-25

## 目标

让用户可以自定义脉络页顶部显示哪些快捷按钮，最多显示 5 个，并在偏好设置中完成配置。

## 设计结论

1. 使用 `SettingsContext` 新增本地偏好字段 `timelineQuickActions`。
2. 默认值保持原有 5 个按钮：
   - 搜索
   - 全部筛选器
   - 统计视图
   - 画廊
   - 成就屏
3. 候选按钮扩展为：
   - 搜索
   - 全部筛选器
   - 统计视图
   - 画廊
   - 成就屏
   - 原则库
   - 同步
4. 偏好设置放在“显示”分组中，提供：
   - 已选按钮列表
   - 上移 / 下移
   - 移除
   - 从候选列表添加
5. 同步按钮不新增逻辑，直接复用现有 `onQuickSync / onSync` 行为：
   - 自动同步模式：直接执行同步
   - 手动同步模式：弹出同步方向选择
6. 原则库按钮直接打开设置页中的原则库子页。

## 数据规则

1. 配置存储到 `localStorage` 键 `lumostime_timeline_quick_actions`。
2. 读取时做去重、合法值过滤和最多 5 个的截断。
3. 配置缺失或解析失败时回退到默认值。

## 影响范围

1. `src/constants/timelineQuickActions.ts`
2. `src/contexts/SettingsContext.tsx`
3. `src/views/settings/PreferencesSettingsView.tsx`
4. `src/views/SettingsView.tsx`
5. `src/views/TimelineView.tsx`
6. `src/App.tsx`
