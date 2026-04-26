# 小组件预览资源设计

## 背景

当前 Android 小组件 provider 已经声明了 `previewLayout`，但 `previewImage` 过去使用的是应用图标，导致部分 launcher 在“添加小组件”界面无法正确显示预览。

本次目标不是做一套装饰性草图，而是让预览图尽量贴近现有组件的真实结构，方便用户在系统选择器里一眼认出不同尺寸和不同组件类型。

## 设计结论

采用“保留现有 `previewLayout` 绑定，同时重画每个 `previewImage`”的方案。

### 计时器组件

计时器类组件的预览只表现槽位结构，不额外加入标题条或示意文本。

- `2x2`：两行两列圆
- `2x1`：一行两列圆
- `3x2`：三列两行圆
- `4x1`：一行四列圆
- `4x2`：四列两行圆

圆形使用统一的留白、对齐和配色，重点体现组件尺寸和槽位数量。
所有圆都使用严格的等宽高边界，避免在系统预览里出现被拉伸或压扁的视觉效果。

### DAILY_RUNTIME 组件

`DAILY_RUNTIME` 预览参考现有组件的热力图结构。

- `4x3` 对应 `widget_preview_daily_runtime_4x4.xml`
  - 上半部分展示 GitHub 风格热力图
  - 中间留出明确分隔带
  - 下半部分展示真实组件同类信息区，即图例标签
- `4x2`
  - 仅展示热力图
  - 不绘制图例标签

图例区不再使用抽象块状草图，而是改成更接近真实组件的“色点 + 标签条”结构。

## 实现范围

- 重画 `android/app/src/main/res/drawable/widget_preview_*.xml`
- 保持 `android/app/src/main/res/xml/widget_info*.xml` 的 `previewImage` 资源映射不变
- 不修改运行时 widget 渲染逻辑

## 验证重点

- 小组件选择器中的计时器预览能清晰显示对应数量的圆形槽位
- `DAILY_RUNTIME` 的 `4x3` 预览呈现“热力图 + 标签”结构
- `DAILY_RUNTIME` 的 `4x2` 预览仅呈现热力图
- 所有新增或修改的 XML 资源都能被 Android 资源解析器正常读取
