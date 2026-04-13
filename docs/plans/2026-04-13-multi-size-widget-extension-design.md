# 多尺寸小组件扩展设计

Date: 2026-04-13

## Goals
- 在现有“模板库 + 桌面实例绑定模板”的基础上，扩展支持多种小组件尺寸。
- 支持以下尺寸：
  - `1x2`
  - `2x1`
  - `2x2`
  - `1x4`
  - `4x1`
  - `2x4`
- 模板内部可以修改尺寸，修改时按规则自动裁剪或补齐槽位。
- 桌面标题点击切换模板时，只在“同尺寸模板”中轮换。
- 保持视觉语言与现有 `2x2` 小组件一致，只调整布局尺寸和槽位数量。

## Non-Goals
- 不在本阶段支持任意自定义尺寸。
- 不做自由拖拽布局、响应式自动换列、可滚动 widget。
- 不支持实例层独立配置活动槽位。
- 不在本阶段支持每种尺寸独立的视觉风格。

## Confirmed Product Rules
- 模板带有尺寸字段。
- 模板创建后允许修改尺寸。
- 改尺寸时：
  - 若新尺寸槽位数更少，按顺序保留前 N 个槽位，其余裁掉。
  - 若新尺寸槽位数更多，保留已有槽位，新增槽位补为空。
- 标题点击切换模板时，只在当前 widget 尺寸对应的模板列表中循环切换。
- 例如：
  - `2x2` 只切换到其他 `2x2` 模板
  - `1x4` 只切换到其他 `1x4` 模板

## Size Mapping

### 尺寸与槽位数映射
- `1x2` -> `2` 槽位
- `2x1` -> `2` 槽位
- `2x2` -> `4` 槽位
- `1x4` -> `4` 槽位
- `4x1` -> `4` 槽位
- `2x4` -> `8` 槽位

### 尺寸与布局排布
- `1x2`：单列双行
- `2x1`：双列单行
- `2x2`：双列双行
- `1x4`：单列四行
- `4x1`：四列单行
- `2x4`：双列四行

## Approaches

### 方案 A：一个模板模型支持全部尺寸
- 模板新增 `size` 字段。
- 槽位数组长度随尺寸变化。
- Android 按尺寸分别渲染不同布局。

优点：
- 现有模板体系可平滑扩展。
- 设置页逻辑最统一。
- 尺寸变更、模板切换规则都容易表达。

缺点：
- 需要在原生层新增多套 widget provider/layout。

### 方案 B：每种尺寸一套独立模板体系
- `2x2` 模板、`1x4` 模板、`2x4` 模板各自完全分开存储。

优点：
- 原生层按尺寸管理更直接。

缺点：
- 前端设置页会被拆散。
- 模板改尺寸会很别扭，等于“删旧建新”。
- 不符合“模板创建后也可改尺寸”的产品规则。

### Recommendation
采用方案 A。

原因：
- 最符合当前已确认的产品规则。
- 对已有模板页改造最小。
- 可以保留现有“模板统一编辑、实例只做选择”的核心结构。

## Data Model Changes

### Frontend Template Model
在现有 `WidgetTemplate` 上新增：

```ts
type WidgetSize = '1x2' | '2x1' | '2x2' | '1x4' | '4x1' | '2x4';

interface WidgetTemplate {
  id: string;
  name: string;
  size: WidgetSize;
  slots: WidgetTemplateSlot[];
  createdAt: number;
  updatedAt: number;
}
```

### Native Template Model
原生 `WidgetTemplate` 同步增加 `size` 字段。

### Instance Binding Model
实例绑定结构不需要新增尺寸字段。
因为实例当前尺寸由 widget 类型本身决定，绑定模板时只允许同尺寸模板即可。

## Slot Resizing Rules

### Resize Algorithm
当模板尺寸变化时，按目标尺寸对应的槽位数处理：

1. 读取旧槽位数组
2. 读取目标尺寸对应的新槽位数
3. 若旧数组长度大于新长度：
   - 只保留前 N 个
4. 若旧数组长度小于新长度：
   - 追加空槽位直到补齐
5. 槽位索引重排为 `0..N-1`

### Example
- `2x2 (4 槽)` -> `1x2 (2 槽)`
  - 保留原槽位 `1, 2`
  - 删除原槽位 `3, 4`

- `1x2 (2 槽)` -> `2x4 (8 槽)`
  - 保留原槽位 `1, 2`
  - 新增空槽位 `3..8`

## Template Switching Rules

### Widget Title Tap
点击 widget 标题时：

1. 读取当前实例尺寸
2. 读取所有模板
3. 仅筛选出同尺寸模板
4. 在这个子集里循环切换到下一个模板

### Empty Result
如果当前尺寸下只有一个模板：
- 点击标题后不切换
- 保持当前模板

如果当前尺寸下没有模板：
- 显示空状态标题
- 槽位全部以占位态渲染

## Android Strategy

### Why Multiple Providers Are Needed
Android 桌面小组件尺寸不是单纯改一个参数就能完全覆盖的。
为了让系统小组件列表里出现不同尺寸入口，并匹配正确的栅格尺寸，需要按尺寸注册不同的 provider。

建议新增 provider：
- `QuickLogWidget2x2`
- `QuickLogWidget1x2`
- `QuickLogWidget2x1`
- `QuickLogWidget1x4`
- `QuickLogWidget4x1`
- `QuickLogWidget2x4`

它们可共用同一套存储、控制器、桥接和切换逻辑，只在以下方面不同：
- provider info xml
- layout xml
- 尺寸标识

### Shared Base Logic
可保留一套共享逻辑，避免复制：
- 读取绑定模板
- 按尺寸过滤可切换模板
- 标题点击切换
- 槽位点击开始/停止
- 运行态同步

### Layout Files
新增布局：
- `widget_layout_1x2.xml`
- `widget_layout_2x1.xml`
- `widget_layout_2x2.xml`
- `widget_layout_1x4.xml`
- `widget_layout_4x1.xml`
- `widget_layout_2x4.xml`

视觉要求：
- 背景、标题样式、圆形槽位、配色逻辑与现有 `2x2` 保持一致
- 仅改变网格排列和容器比例

## Settings UI Changes

### Template List Page
列表页仍保持现在的轻量结构：
- 右上角一个“新建”
- 列表项只显示模板标题
- 点击列表项进入详情页
- 保留删除按钮

不在列表页展示尺寸缩略图。

### Template Detail Page
详情页新增“尺寸”设置项：

1. 模板名称输入框
2. 尺寸选择器
3. 槽位编辑区
4. 保存按钮

### Size Selector
建议用现有风格的选择器：
- `1x2`
- `2x1`
- `2x2`
- `1x4`
- `4x1`
- `2x4`

切换尺寸时：
- 立即在前端本地预览中更新槽位数量
- 不立刻保存
- 直到用户点击“保存模板并刷新”

### Slot Editor Behavior
槽位编辑区根据尺寸动态变化：
- `1x2 / 2x1` 显示 2 个槽位
- `2x2 / 1x4 / 4x1` 显示 4 个槽位
- `2x4` 显示 8 个槽位

## Migration Plan

### Existing Templates
现有所有模板默认迁移为：
- `size = '2x2'`

因为当前产品只实现了 `2x2`，这是最自然的兼容策略。

### Existing Desktop Instances
现有桌面实例全部视为：
- `2x2` widget 实例

不做额外转换。

## Error Handling

### Invalid Size
若模板缺失尺寸或尺寸非法：
- 前端回退为 `2x2`
- 原生回退为 `2x2`

### Size Mismatch Binding
若某实例绑定了不同尺寸模板：
- 原生层在渲染前拒绝使用该模板
- 自动回退到该尺寸下第一个模板
- 若仍没有可用模板，则显示空态

### Template Deleted
若当前尺寸下可切换模板被删到只剩 0 个：
- 标题显示“暂无模板”
- 槽位显示占位态

## Testing Plan

### Manual Tests
1. 新建 `1x2` 模板并保存，验证详情页只出现 2 个槽位
2. 将 `1x2` 模板改为 `2x4`，验证原槽位保留且新增空槽补齐到 8 个
3. 将 `2x4` 模板改回 `2x1`，验证仅保留前 2 个槽位
4. 添加不同尺寸 widget 到桌面，验证各自显示正确布局
5. 点击标题切换模板，验证只在同尺寸模板中切换
6. 修改模板名称与活动，验证对应尺寸实例刷新
7. 不同尺寸 widget 并存时，验证互不串尺寸

### Regression Tests
1. 现有 `2x2` 模板升级后仍可正常使用
2. 原有 `2x2` 桌面实例仍可正常点击开始/停止
3. pending action 导入日志链路不受影响

## Implementation Phases

### Phase 1: Model and Service Layer
- 新增 `WidgetSize` 类型
- 模板新增 `size`
- 新增尺寸到槽位数的映射函数
- 新增尺寸变更时的槽位裁剪/补齐逻辑
- 做旧模板 `2x2` 迁移

### Phase 2: Settings UI
- 详情页增加尺寸选择
- 槽位编辑区根据尺寸动态生成
- 保存时写回新模板结构

### Phase 3: Android Providers and Layouts
- 拆出各尺寸 provider info
- 新增各尺寸 layout
- provider 共享同一套核心逻辑

### Phase 4: Size-Scoped Template Switching
- 标题点击只在同尺寸模板中轮换
- 尺寸不匹配绑定自动兜底

### Phase 5: Verification
- Web 构建验证
- Android 编译验证
- 真机桌面多尺寸手测

## Files Expected to Change
- `src/services/widgetTimerService.ts`
- `src/views/settings/WidgetSettingsView.tsx`
- `src/plugins/WidgetBridgePlugin.ts`
- `src/plugins/WidgetBridgePlugin.web.ts`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetModels.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetStores.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/QuickLogWidget.java`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetSnapshotBuilder.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetTimerController.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetBridgePlugin.kt`
- `android/app/src/main/res/layout/` 下新增多尺寸布局
- `android/app/src/main/res/xml/` 下新增多尺寸 provider info
- `android/app/src/main/AndroidManifest.xml`

## Final Recommendation
在当前模板化重构的基础上，继续扩展为“多尺寸模板系统”，而不是为每种尺寸重新造一套配置体系。

这条路线最稳：
- 对现有 2x2 成果复用最多
- 符合“模板可改尺寸”的产品规则
- 同尺寸标题切换逻辑自然清晰
- 可以逐步扩展到更多尺寸而不推倒重来
