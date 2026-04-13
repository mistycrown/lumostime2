# 多小组件模板化重构设计
Date: 2026-04-13

## Goals
- 将当前“全局唯一一套 4 槽位配置”的小组件逻辑，重构为“模板库 + 桌面实例自动绑定模板”的结构。
- 允许用户在 App 设置页中创建多个带名字的小组件模板。
- 允许用户在桌面上添加多个同类小组件实例，并让每个实例按尺寸自动绑定到可用模板。
- 将当前扁平设置页重构为更清晰的分层交互：模板列表页与模板编辑界面。
- 保持桌面小组件点击行为仍然用于开始/停止计时，不将主点击区改成配置入口。

## Non-Goals
- 不支持在桌面实例层单独修改活动槽位。
- 不支持在新增桌面小组件时弹出配置页或手动选择模板。
- 不支持在 widget 内做复杂编辑、拖拽排序、批量复制实例等扩展能力。

## Confirmed Product Rules
- 模板只能在 App 内编辑。
- 桌面实例不提供“新增时选择模板”或其他手动绑定入口，只保留自动绑定与标题循环切换模板。
- 用户修改模板后，所有绑定该模板的桌面实例都要同步刷新。
- 桌面小组件的主点击区始终用于计时操作，不用于配置。

## Current State
- 前端设置页管理模板集合，并显示各模板的绑定数量。
- Android 原生层按 `appWidgetId` 保存实例绑定关系，并在刷新时按实例读取模板。
- 新增桌面小组件时，原生层会按尺寸自动补齐绑定，默认绑定该尺寸下第一个可用模板。
- 桌面标题点击用于循环切换当前尺寸下的模板。

## Recommended Architecture

### 1. Template Layer
模板是唯一可编辑的配置对象。

```ts
interface WidgetTemplate {
  id: string;
  name: string;
  size: WidgetSize;
  slots: WidgetTemplateSlot[];
  createdAt: number;
  updatedAt: number;
}
```

### 2. Instance Binding Layer
每个桌面小组件实例只保存“自己当前绑定了哪个模板”。

```ts
interface WidgetInstanceBinding {
  appWidgetId: number;
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
}
```

这层绑定关系继续保留，但只允许系统自动维护，不暴露手动绑定接口。

### 3. Runtime Layer
运行态仍然保持“全局同一时刻只允许一个活动计时”。

建议保留：
- 当前激活活动
- 激活来源 `app` / `widget`
- 命中的 `slotIndex`
- 来源实例 `appWidgetId`

## Interaction Design

### App 内设置页
`WidgetSettingsView` 作为模板管理页，负责：
- 展示模板列表
- 新建模板
- 编辑模板名称、尺寸与槽位
- 删除未被绑定的模板

### 桌面添加流程
用户从系统桌面添加小组件时：

1. 系统创建一个新的 widget 实例，生成 `appWidgetId`
2. 原生层根据当前 widget 尺寸自动补齐绑定关系
3. 若该尺寸下已有模板，则默认绑定第一个可用模板
4. 若该尺寸下没有模板，则该实例显示空白占位，等待后续创建模板后刷新
5. 用户如需切换模板，只能通过桌面标题点击循环切换

## Android Strategy

### No Configure Activity
不在 `appwidget-provider` 中增加 `android:configure`。

原因：
- 当前产品不需要新增时手动选模板
- 自动绑定更符合现有交互
- 可以减少配置页、跳转链路和失败场景

### Widget Update Model
刷新模型保持为“按实例读取模板并构建 snapshot”：

`loadBinding(appWidgetId) -> loadTemplate(templateId) -> build(appWidgetId) -> updateAppWidget(appWidgetId)`

## Storage Design

### Frontend Storage
- `lumostime_widget_templates_v1`

### Native Storage
- `templates_v1`
- `instance_bindings_v1`
- `runtime_v1`
- `pending_actions_v1`
- `last_widget_stop_at_v1`

### Delete Cleanup
当桌面实例被系统删除时：
- 需要在 `onDeleted()` 中删除该 `appWidgetId` 的绑定关系
- 模板本身不删除

## Bridge API
当前桥接接口应保持为：

```ts
getTemplates(): Promise<{ templates: WidgetTemplate[] }>
saveTemplates(options: { templates: WidgetTemplate[] }): Promise<void>
getInstanceBindings(): Promise<{ bindings: WidgetInstanceBinding[] }>
refreshWidget(options?: { appWidgetId?: number; templateId?: string }): Promise<void>
getPendingActions(): Promise<{ actions: WidgetPendingAction[] }>
clearPendingActions(options: { ids: string[] }): Promise<void>
getRuntimeState(): Promise<{ runtimeState: WidgetBridgeRuntimeState | null }>
syncRuntimeState(options: { runtimeState: WidgetBridgeRuntimeState | null }): Promise<void>
```

不再提供手动绑定实例到模板的桥接接口。

## Error Handling

### No Template
- 桌面添加时若没有任何模板，小组件显示空状态或占位态
- 不弹出配置页，也不提供手动绑定入口

### Deleted Template
- 若某实例绑定的模板被删除，刷新时自动回退到同尺寸下第一个可用模板
- 若同尺寸没有可用模板，则显示空状态

### Missing Activity
- 若模板中的活动已被删除，对应槽位回退为空槽位

## Testing Plan

### Manual Functional Tests
1. 在设置页创建两个同尺寸模板，名称和内容不同
2. 在桌面添加第一个小组件，验证其自动绑定到首个可用模板
3. 点击标题，验证可循环切换到下一个模板
4. 修改模板 A，验证所有绑定模板 A 的实例同步刷新
5. 删除桌面实例，验证其它实例不受影响
6. 重启 App 与系统桌面后，验证模板与绑定关系仍然存在

### Compatibility Tests
1. 老版本已有单一配置时升级，验证自动迁移为默认模板
2. Web/非原生 Android 环境下，设置页仍可正常管理模板本地数据
3. 缺少模板时桌面小组件可正常显示空状态，不崩溃

### Runtime Tests
1. 从模板 A 对应实例启动活动
2. 点击同一槽位，验证停止逻辑正常
3. 点击另一模板实例中的槽位，验证全局切换逻辑正常
4. 验证 pending action 仍能正常导入正式日志

## Implementation Phases

### Phase 1: Data Model and Storage
- 前端新增模板类型、模板存储、迁移逻辑
- 原生新增模板存储与实例绑定存储
- 原生模型从“共享 slots”改为“模板 + 自动绑定”

### Phase 2: Native Widget Binding Flow
- 打通 `appWidgetId -> templateId` 自动绑定
- 改造 widget 更新与点击链路为按实例读取模板
- 保留标题循环切换模板

### Phase 3: Settings UI Refactor
- 将 `WidgetSettingsView` 重构为模板管理页
- 支持模板新建、编辑、删除与绑定数展示

### Phase 4: Migration and Verification
- 加入旧版单配置自动迁移
- 手动回归桌面刷新、标题切换、日志同步

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

## Final Recommendation
采用“模板统一编辑，桌面实例自动绑定并可通过标题循环切换模板”的方案。

这能保留多模板与多实例能力，同时删除新增时手动选择模板的复杂链路，减少原生配置页、桥接接口和用户理解成本。
