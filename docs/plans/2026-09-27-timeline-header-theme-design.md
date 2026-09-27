# 时间脉络顶部主题装饰设计

## 目标

将时间脉络顶部的美术素材从日历交互中剥离，作为可独立替换的主题装饰层。首个主题为 `pink-notebook`，使用现有 `public/mdlo/pink/` 素材验证分层方案。

## 方案

在 `CalendarWidget` 增加可选 `headerTheme` 属性。主题开启后：

- 标题栏底部渲染低透明度云朵/水彩纹理；
- 顶部工具栏和日期按钮始终保持在装饰层上方；
- 折叠周日期栏以半透明白色圆角卡片呈现，胶带、爪印和星星仅贴在卡片边缘；
- 小猫跨越标题栏和日期栏的视觉交界，但位于交互控件下方且不接收指针事件；
- 展开月历保持原有布局，仅保留淡背景，避免重排复杂的月历内容。

## 主题参数

`TimelineHeaderDecorations` 中集中维护 `TIMELINE_HEADER_THEME_CONFIGS`。每个主题记录：

- `id`：稳定主题标识；
- `assets`：背景、猫、胶带、星光、爪印等文件路径；
- `headerBackgroundOpacity`：标题纹理透明度；
- `catWidth`、`catTop`、`catRight`：猫的尺度与锚点；
- `collapsedCardClassName`：日期卡片的表面、圆角和阴影；
- `headerAssets`、`calendarAssets`：各贴图的定位、大小、透明度和窄屏隐藏规则；
- `darkOpacityMultiplier`：深色模式下的整体降噪倍率（首轮只保留配置入口，等待主题模式接入）。

所有素材层都使用 `pointer-events: none` 和 `aria-hidden`，业务日期选择、Today、日历展开、快捷操作及其无障碍标签不受影响。

## 验证

1. TypeScript 生产构建通过；
2. 手动检查窄屏下装饰不遮挡顶部按钮；
3. 点击日期、Today、日历展开/收起仍有效；
4. 默认未传入 `headerTheme` 的其他日历调用维持现状。
