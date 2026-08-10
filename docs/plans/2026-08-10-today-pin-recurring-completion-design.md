# TODAY + PIN 循环任务完成按钮设计

## 范围

仅调整 Android 原生 TODAY + PIN 小组件。普通任务保持现有完成交互；带有 `recurrenceRule` 的循环任务不允许通过小组件完成。

## 方案

在原生小组件条目模型中增加循环状态，由 Web 侧同步源数据构建条目时从 `recurrenceRule` 派生。RemoteViews 渲染循环 icon 替代左侧完成 checkbox，并跳过该控件的完成 `PendingIntent`；普通任务继续使用现有 checkbox 和完成事件。

## 验收

- 普通 TODAY/PIN 任务左侧仍显示 checkbox，点击后继续提交完成动作。
- 循环任务左侧显示循环 icon，不能触发完成动作。
- 循环任务右侧的开始专注/打开操作不变。
- Android 项目不执行 Gradle 编译，按仓库约定仅做静态检查与必要的 TypeScript 构建验证。
