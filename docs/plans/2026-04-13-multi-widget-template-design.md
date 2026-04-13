# 多小组件模板化重构设计

Date: 2026-04-13

## Goals
- 将当前“全局唯一一套 4 槽位配置”的小组件逻辑，重构为“模板库 + 桌面实例绑定模板”的结构。
- 允许用户在 App 设置页中创建多个带名字的小组件模板。
- 允许用户在桌面上添加多个同类小组件实例，并为每个实例选择不同模板。
- 将当前扁平设置页重构为更清晰的分层交互：模板列表页、模板编辑弹窗、桌面添加时模板选择页。
- 保持桌面小组件点击行为仍然用于开始/停止计时，不将主点击区改成配置入口。

## Non-Goals
- 不支持在桌面实例层单独修改 4 个活动槽位。
- 不支持“同一个模板绑定到实例后再局部覆盖”。
- 不尝试让 Android 系统小组件选择器动态显示多个用户自定义名称的小组件类型。
- 不改变当前 2x2 小组件的核心视觉布局。
- 不在本阶段加入 widget 内复杂编辑、拖拽排序、批量复制实例等扩展能力。

## Confirmed Product Rules
- 模板只能在 App 内编辑。
- 桌面实例只能选择模板，不能拥有自己的独立活动配置。
- 用户修改模板后，所有绑定该模板的桌面实例都要同步刷新。
- 桌面小组件的主点击区始终用于计时操作，不用于配置。

## Current State
- 前端设置页只有一份全局槽位配置，保存在 `localStorage`。
- Android 原生层只有一份全局槽位配置，保存在 `SharedPreferences`。
- 所有桌面小组件实例共用同一份 snapshot，因此桌面上添加多个实例时，内容完全一致。
- 当前设置页是扁平的 4 槽位编辑界面，没有“模板列表 -> 命名 -> 编辑”的层级。

## Main Problem
当前实现缺少两个关键抽象：

1. **模板抽象**
   - 缺少“小组件模板”的独立模型，无法在设置页保存多个命名配置。

2. **实例绑定抽象**
   - 缺少“桌面实例绑定哪一个模板”的映射关系，导致所有桌面实例只能读取同一套配置。

因此，这次重构的重点不是单纯改 UI，而是同时升级：
- 前端数据模型
- 原生存储模型
- Android widget 配置链路
- 设置页交互结构

## Recommended Architecture

### 1. Template Layer
App 内新增小组件模板库，模板是唯一可编辑的配置对象。

建议数据结构：

```ts
interface WidgetTemplate {
  id: string;
  name: string;
  slots: WidgetTemplateSlot[];
  createdAt: number;
  updatedAt: number;
}

interface WidgetTemplateSlot {
  slotIndex: number;
  activityId: string | null;
  categoryId: string | null;
  icon: string | null;
  uiIconAssetPath: string | null;
  uiIconFallbackAssetPath: string | null;
  label: string | null;
  color: string | null;
}
```

### 2. Instance Binding Layer
每个桌面小组件实例只保存“自己绑定了哪个模板”。

建议数据结构：

```ts
interface WidgetInstanceBinding {
  appWidgetId: number;
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
}
```

### 3. Runtime Layer
运行态仍然只允许同一时刻一个活动激活，但需要额外保留来源信息，便于桌面刷新和后续排查。

建议保留：
- 当前激活活动
- 激活来源 `app` / `widget`
- 命中的 `slotIndex`

本阶段不需要把运行态改成“每个实例各自有一套”，因为当前产品仍然是“全局只允许一个计时活动”。

## Interaction Design

### App 内设置页
新的设置页不再直接展示单个 4 槽位编辑界面，而是拆成两层：

1. **模板列表页**
   - 展示所有已创建的小组件模板
   - 每个模板显示：
     - 模板名称
     - 2x2 预览
     - 绑定中的实例数量
   - 支持操作：
     - 新建模板
     - 编辑模板
     - 重命名模板
     - 删除模板

2. **模板编辑弹窗**
   - 专门编辑一个模板的 4 个槽位
   - 由设置页中的“新建”或“编辑”打开
   - 阅览/预览入口也复用同一弹窗

### 桌面添加流程
用户从系统桌面添加小组件时：

1. 系统创建一个新的 widget 实例，生成 `appWidgetId`
2. 系统自动打开 widget 配置页
3. 配置页只让用户选择要绑定的模板
4. 选择完成后保存 `appWidgetId -> templateId`
5. 立即刷新该桌面实例

如果用户尚未创建模板：
- 配置页展示“暂无模板”
- 引导用户先回 App 设置页创建模板

### 后续修改流程
- 用户如果要修改内容，只能回 App 内编辑模板
- 模板保存后，所有绑定该模板的桌面实例统一刷新

## Android Strategy

### Why Not Multiple Providers
Android 的标准做法不是为每个用户自定义名称动态生成新的 widget provider。
更稳定的方式是：
- 保留一个固定的 `AppWidgetProvider`
- 让用户多次添加同一个 widget 类型
- 每个实例通过 `appWidgetId` 单独选择绑定模板

### Configure Activity
在 `appwidget-provider` 中增加配置页能力：
- 使用 `android:configure`
- 支持在添加小组件时自动打开配置页

配置页职责非常轻，只负责：
- 读取模板列表
- 选择一个模板
- 保存实例绑定

它不负责完整编辑模板内容，模板编辑仍放在 App 内统一处理。

### Widget Update Model
当前是：
- 全量实例共用一个 snapshot

重构后应改成：
- 每个 `appWidgetId` 单独读取自己的绑定模板
- 基于模板 + 全局运行态构建对应实例 snapshot
- 再逐个更新到桌面

因此原生刷新链路会从：
- `loadConfig() -> build() -> refreshAll()`

变成：
- `loadBinding(appWidgetId) -> loadTemplate(templateId) -> build(appWidgetId) -> updateAppWidget(appWidgetId)`

## Storage Design

### Frontend Storage
前端本地存储从单一槽位 key 改成模板集合：

- `lumostime_widget_templates_v1`

仅用于：
- Web 端预览
- App 内设置页加载与编辑
- Android 原生桥接前的本地缓存

### Native Storage
原生 `SharedPreferences` 建议拆分为：

- `templates_v1`
- `instance_bindings_v1`
- `runtime_v1`
- `pending_actions_v1`
- `last_widget_stop_at_v1`

### Delete Cleanup
当桌面实例被系统删除时：
- 需要在 `onDeleted()` 或相应清理链路中删除该 `appWidgetId` 的绑定关系
- 模板本身不删除

## Bridge API Changes
当前桥接接口以“单份全局 slots”为中心，需要改成“模板 + 实例绑定”为中心。

建议新增或调整以下接口：

```ts
getTemplates(): Promise<{ templates: WidgetTemplate[] }>
saveTemplates(options: { templates: WidgetTemplate[] }): Promise<void>
getInstanceBindings(): Promise<{ bindings: WidgetInstanceBinding[] }>
bindWidgetInstance(options: { appWidgetId: number; templateId: string | null }): Promise<void>
refreshWidget(options?: { appWidgetId?: number; templateId?: string }): Promise<void>
```

保留现有运行态相关接口：
- `getPendingActions`
- `clearPendingActions`
- `getRuntimeState`
- `syncRuntimeState`

## UI Refactor Plan

### Screen Structure
`WidgetSettingsView` 改造成模板管理页：

1. 顶部说明区
   - 解释“小组件模板”与“桌面实例”的关系

2. 模板列表区
   - 卡片列表
   - 展示模板名、预览、绑定数量

3. 底部操作
   - 新建模板按钮

### Modal Structure
新增两个弹窗组件：

1. `WidgetTemplateNameModal`
   - 输入模板名称
   - 用于新建/重命名

2. `WidgetTemplateEditorModal`
   - 编辑 4 个槽位
   - 展示 2x2 预览
   - 保存后回写模板库

其中 `WidgetTemplateEditorModal` 既供设置页使用，也供未来阅览入口复用。

## Data Migration
必须保证老用户升级后不丢配置。

迁移策略：

1. 读取旧版全局 4 槽位配置
2. 若新模板库为空且旧配置存在：
   - 自动创建一个默认模板，如“我的小组件”
   - 将旧槽位复制到该模板中
3. 现有桌面实例若没有绑定关系：
   - 自动绑定到默认模板

这样可以保证：
- 老用户升级后桌面不至于空白
- 后续再逐步新建更多模板

## Error Handling

### No Template
- 桌面添加时若没有任何模板，配置页显示空状态与引导文案
- 不为实例写入空绑定

### Deleted Template
若某实例绑定的模板已被删除：
- 小组件显示禁用占位态
- 点击无效
- App 内模板页提示该实例需要重新绑定

本阶段建议更简单的策略：
- 删除模板前，如果仍有绑定实例，则禁止删除并提示“请先移除对应桌面小组件或改绑其他模板”

### Missing Activity
若模板中的某活动已被删除：
- 对应槽位回退为空槽位
- 编辑页提示该槽位需要重新选择
- 桌面端显示为空占位

## Testing Plan

### Manual Functional Tests
1. 在设置页创建两个模板，名称不同，内容不同
2. 在桌面添加第一个小组件并绑定模板 A
3. 在桌面添加第二个小组件并绑定模板 B
4. 验证两个小组件显示内容不同
5. 修改模板 A，验证所有绑定 A 的实例同步刷新
6. 删除桌面上的某一个实例，验证其他实例不受影响
7. 重启 App 与系统桌面后，验证模板和绑定关系仍然存在

### Compatibility Tests
1. 老版本已有单一配置时升级，验证自动迁移为默认模板
2. Web/非原生 Android 环境下，设置页仍可正常管理模板本地数据
3. 缺少模板时桌面配置页能正确提示，不崩溃

### Runtime Tests
1. 从模板 A 对应实例启动活动
2. 点击同一槽位，验证停止逻辑正常
3. 点击另一模板实例中的槽位，验证全局切换逻辑正常
4. 验证 pending action 仍能正常导入正式日志

## Implementation Phases

### Phase 1: Data Model and Storage
- 前端新增模板类型、模板存储、迁移逻辑
- 原生新增模板存储与实例绑定存储
- 原生模型从“共享 slots”改为“模板 + 绑定”

### Phase 2: Native Widget Binding Flow
- 增加 Android 配置页
- 打通 `appWidgetId -> templateId` 绑定
- 改造 widget 更新与点击链路为按实例读取模板

### Phase 3: Settings UI Refactor
- 将 `WidgetSettingsView` 重构为模板管理页
- 新增命名弹窗与模板编辑弹窗
- 支持模板新建、编辑、重命名、删除

### Phase 4: Migration and Verification
- 加入旧版单配置自动迁移
- 手动回归桌面刷新、配置选择、日志同步
- 视情况补充文档和提示文案

## Files Expected to Change
- `src/services/widgetTimerService.ts`
- `src/views/settings/WidgetSettingsView.tsx`
- `src/plugins/WidgetBridgePlugin.ts`
- `src/plugins/WidgetBridgePlugin.web.ts`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetModels.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetStores.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetSnapshotBuilder.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetTimerController.kt`
- `android/app/src/main/java/com/mistycrown/lumostime/QuickLogWidget.java`
- `android/app/src/main/java/com/mistycrown/lumostime/WidgetBridgePlugin.kt`
- `android/app/src/main/res/xml/widget_info.xml`
- `android/app/src/main/AndroidManifest.xml`

## Final Recommendation
采用“模板统一编辑，桌面实例仅选择模板”的方案。

这是当前需求下最清晰、最稳妥、也最容易长期维护的结构：
- 用户心智清楚
- Android 实现路径标准
- 可以自然支持多个桌面实例
- 可以避免模板与实例双重编辑带来的数据分叉问题
