# 代码审查问题汇总

## 审查日期
2026-02-09

---

## 🔴 严重问题

### 1. geminiService.ts - 未被使用的服务
**文件：** `src/services/geminiService.ts`
**发现时间：** 2026-02-09

**问题描述：**
整个服务文件未在任何地方被引用或使用，可能是废弃代码。

**建议：**
1. 确认该服务是否需要删除
2. 如果需要保留，应在适当的地方使用它
3. 如果是待使用的功能，应添加 TODO 注释说明

---

## 🟡 中等问题

### ~~1. TimePalSettings.tsx - asCard 参数未使用~~ ✅ 已修复
**文件：** `src/components/TimePalSettings.tsx`
**修复时间：** 2026-02-09

**问题描述：**
参数定义但未使用，两个分支完全相同。

**修复方案：**
删除了未使用的 `asCard` 参数及相关代码。

---

### ~~2. TimePalSettings.tsx - 缺少 @input 和 @output 注释~~ ✅ 已修复
**文件：** `src/components/TimePalSettings.tsx`
**修复时间：** 2026-02-09

**问题描述：**
文件头注释缺少标准的 `@input` 和 `@output` 标记。

**修复方案：**
补充了完整的文件头注释。

---

### 3. useLogManager.ts - 缺少文件头注释
**文件：** `src/hooks/useLogManager.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释：
```typescript
/**
 * @file useLogManager.ts
 * @description 日志管理 Hook - 处理日志的增删改查、快速打点、批量添加等功能
 * @input 无（使用 Context）
 * @output 日志管理相关的处理函数
 * @pos Hook
 */
```

---

### 4. useTodoManager.ts - 缺少文件头注释
**文件：** `src/hooks/useTodoManager.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释：
```typescript
/**
 * @file useTodoManager.ts
 * @description Todo 管理 Hook - 处理待办事项的增删改查、完成切换、批量添加等功能
 * @input 无（使用 Context）
 * @output Todo 管理相关的处理函数
 * @pos Hook
 */
```

---

### 5. useGoalManager.ts - 缺少文件头注释
**文件：** `src/hooks/useGoalManager.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释：
```typescript
/**
 * @file useGoalManager.ts
 * @description 目标管理 Hook - 处理目标的增删改查、归档等功能
 * @input 无（使用 Context）
 * @output 目标管理相关的处理函数
 * @pos Hook
 */
```

---

### 6. useReviewManager.ts - 缺少文件头注释
**文件：** `src/hooks/useReviewManager.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释：
```typescript
/**
 * @file useReviewManager.ts
 * @description 回顾管理 Hook - 处理日报/周报/月报的增删改查、AI 叙事生成等功能
 * @input 无（使用 Context）
 * @output 回顾管理相关的处理函数
 * @pos Hook
 */
```

---

### 7. useSearchManager.ts - 缺少文件头注释
**文件：** `src/hooks/useSearchManager.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释：
```typescript
/**
 * @file useSearchManager.ts
 * @description 搜索管理 Hook - 处理搜索功能的打开/关闭、搜索结果选择等功能
 * @input 无（使用 Context）
 * @output 搜索管理相关的处理函数
 * @pos Hook
 */
```

---

### 8. useAppInitialization.ts - 缺少文件头注释
**文件：** `src/hooks/useAppInitialization.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释。

---

### 9. useAppLifecycle.ts - 缺少文件头注释
**文件：** `src/hooks/useAppLifecycle.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释。

---

### 10. useAppDetection.ts - 缺少文件头注释
**文件：** `src/hooks/useAppDetection.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释。

---

### 11. useSyncManager.ts - 缺少文件头注释
**文件：** `src/hooks/useSyncManager.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释。

**注：** 该文件内部注释非常详细，但缺少标准的文件头注释。

---

### 12. useDeepLink.ts - 缺少文件头注释
**文件：** `src/hooks/useDeepLink.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释。

---

### 13. useHardwareBackButton.ts - 缺少文件头注释
**文件：** `src/hooks/useHardwareBackButton.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释。

---

### 17. redemptionService.ts - 缺少文件头注释
**文件：** `src/services/redemptionService.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释：
```typescript
/**
 * @file redemptionService.ts
 * @description 兑换码验证服务 - 处理兑换码的验证、保存、清除等功能
 * @input 无（类实例化后调用方法）
 * @output 验证结果、用户ID等
 * @pos Service
 */
```

---

## 🟢 轻微问题

### 1. UiThemeButton.tsx - 缺少无障碍属性
**文件：** `src/components/UiThemeButton.tsx`
**位置：** 第 25-27 行

**问题描述：**
按钮缺少 `aria-label` 属性，不利于屏幕阅读器用户。

**建议：**
```typescript
<button
    onClick={() => onThemeChange(theme)}
    aria-label={`选择 ${theme} 主题`}
    className={...}
>
```

---

### 2. UiThemeButton.tsx - 缺少使用示例
**文件：** `src/components/UiThemeButton.tsx`
**位置：** 文件头部

**问题描述：**
文件头注释可以添加使用示例，方便其他开发者理解。

**建议：**
```typescript
/**
 * @file UiThemeButton.tsx
 * @description UI 主题选择按钮组件
 * @input theme: 主题名称, currentTheme: 当前主题, onThemeChange: 主题切换回调
 * @output 主题选择按钮
 * @pos Component
 * 
 * @example
 * ```tsx
 * <UiThemeButton
 *     theme="purple"
 *     currentTheme={uiIconTheme}
 *     onThemeChange={handleUiIconThemeChange}
 * />
 * ```
 */
```

---

### 3. TimePalSettings.tsx - 图片加载错误处理可以优化
**文件：** `src/components/TimePalSettings.tsx`
**位置：** 第 127-134 行

**问题描述：**
图片加载错误时直接修改 DOM (`parent.innerHTML`)，不是 React 的最佳实践。

**当前：**
```typescript
onError={(e) => {
    e.currentTarget.style.display = 'none';
    const parent = e.currentTarget.parentElement;
    if (parent) {
        parent.innerHTML = `<span class="text-3xl">${getTimePalEmoji(option.type)}</span>`;
    }
}}
```

**建议：**
使用 `useTimePalImage` Hook（已经创建）来处理图片加载和降级逻辑。

---

### 4. redemptionService.ts - 未使用的工具函数
**文件：** `src/services/redemptionService.ts`
**位置：** 第 13-15 行

**问题描述：**
定义了 3 个工具函数 `_x1`, `_x2`, `_x3`，但在代码中未被使用。

**建议：**
删除未使用的函数：
```typescript
// 删除这些未使用的函数
const _x1 = (n: number) => n ^ 0x5A5A;
const _x2 = (n: number) => (n << 3) | (n >> 29);
const _x3 = (n: number) => n * 0x9E3779B9;
```

---

### 5. colorSchemeService.ts - 空的样式映射表
**文件：** `src/services/colorSchemeService.ts`
**位置：** 第 44-72 行

**问题描述：**
`COLOR_SCHEME_STYLES` 映射表中所有配色方案的值都是空对象 `{}`，没有实际样式配置。

**建议：**
1. 如果不需要样式映射，可以删除这个映射表和相关方法
2. 如果需要，应该补充实际的样式配置

---

### 6. colorSchemeService.ts - validSchemes 数组不完整
**文件：** `src/services/colorSchemeService.ts`
**位置：** 第 95 行

**问题描述：**
`validSchemes` 数组只包含 4 种配色方案，但实际定义了 28 种。

**当前：**
```typescript
const validSchemes: ColorScheme[] = ['default', 'morandi-purple', 'morandi-blue', 'morandi-green', 'morandi-pink'];
```

**建议：**
更新为包含所有有效的配色方案，或者使用类型推断自动生成。

---

## 📝 文档问题

### 1. components 文件夹缺少 README.md
**位置：** `src/components/`

**问题描述：**
components 文件夹下有 52 个组件文件，但缺少 README.md 说明文档。

**建议：**
创建 `src/components/README.md`，包含：
- 组件分类说明
- 核心组件列表
- 使用指南
- 命名规范

---

### 2. 新增组件未在文档中说明
**文件：** `src/components/UiThemeButton.tsx`

**问题描述：**
新增的 `UiThemeButton` 组件未在任何 README 或索引文件中说明。

**建议：**
在 `src/components/README.md` 中添加该组件的说明。

---

## 统计

### 问题分布
- 🔴 严重问题：0
- 🟡 中等问题：5（数据管理 Hooks 缺少文件头注释）
- 🟢 轻微问题：2
- 📝 文档问题：0（已全部修复 ✅）

### 按文件统计
- `UiThemeButton.tsx`: 2 个问题（轻微）
- `TimePalSettings.tsx`: ✅ 已修复所有问题
- `useLogManager.ts`: 1 个问题（中等 - 缺少文件头注释）
- `useTodoManager.ts`: 1 个问题（中等 - 缺少文件头注释）
- `useGoalManager.ts`: 1 个问题（中等 - 缺少文件头注释）
- `useReviewManager.ts`: 1 个问题（中等 - 缺少文件头注释）
- `useSearchManager.ts`: 1 个问题（中等 - 缺少文件头注释）

---

## 优先级建议

### ~~立即修复~~ ✅ 已完成
1. ~~🟡 TimePalSettings.tsx - 删除或实现 asCard 参数~~
2. ~~🟡 TimePalSettings.tsx - 补充文件头注释~~
3. ~~📝 更新 src/components/README.md~~
4. ~~📝 创建 src/hooks/README.md~~
5. ~~📝 创建 src/constants/README.md~~

### 短期修复
1. 🟡 为 5 个数据管理 Hooks 添加文件头注释
   - useLogManager.ts
   - useTodoManager.ts
   - useGoalManager.ts
   - useReviewManager.ts
   - useSearchManager.ts

### 长期优化
1. 🟢 添加无障碍属性
2. 🟢 优化图片加载错误处理（使用 useTimePalImage Hook）
3. 🟢 添加使用示例注释

---

## 下一步
继续审查其他组件，或者先修复数据管理 Hooks 的文件头注释问题。


---

## 统计更新（2026-02-09 第四批审查后）

### 问题分布
- 🔴 严重问题：0
- 🟡 中等问题：11（Hooks 缺少文件头注释）
- 🟢 轻微问题：5
- 📝 文档问题：0（已全部修复）

### 按文件统计
- `UiThemeButton.tsx`: 2 个问题（轻微）
- `TimePalSettings.tsx`: ✅ 已修复所有问题
- **Hooks 文件夹**: 11 个文件缺少文件头注释（中等问题）
  - useLogManager.ts
  - useTodoManager.ts
  - useGoalManager.ts
  - useReviewManager.ts
  - useSearchManager.ts
  - useAppInitialization.ts
  - useAppLifecycle.ts
  - useAppDetection.ts
  - useSyncManager.ts
  - useDeepLink.ts
  - useHardwareBackButton.ts

### 优先级建议更新

#### 短期修复（建议批量处理）
1. 🟡 为 11 个 Hooks 添加文件头注释
   - 这是标准的文档规范，应该统一补充
   - 可以批量处理，提高效率

#### 长期优化
1. 🟢 添加无障碍属性
2. 🟢 优化图片加载错误处理
3. 🟢 添加使用示例注释
4. 🟢 清理被注释掉的代码

---

## 下一步
继续审查剩余的 2 个 Hooks（useCustomPresets, useIconMigration），然后可以考虑批量修复文件头注释问题。


---

## 新增问题（第五批审查）

### 14. useIconMigration.ts - 未找到使用位置
**文件：** `src/hooks/useIconMigration.ts`
**发现时间：** 2026-02-09

**问题描述：**
该 Hook 未在任何文件中被使用，可能是废弃代码或待使用的功能。

**建议：**
1. 确认该 Hook 是否需要删除
2. 如果需要保留，应在适当的地方使用它
3. 如果是待使用的功能，应添加 TODO 注释说明

---

### 15. useScrollTracker.ts - 缺少文件头注释
**文件：** `src/hooks/useScrollTracker.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释。

---

### 16. useFloatingWindow.ts - 缺少文件头注释
**文件：** `src/hooks/useFloatingWindow.ts`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释。

---

## 统计更新（2026-02-09 第六批审查后）

### 问题分布
- 🔴 严重问题：0
- 🟡 中等问题：15（13 个 Hooks 缺少文件头注释 + 1 个未使用的 Hook + 1 个 Service 缺少文件头注释）
- 🟢 轻微问题：9
- 📝 文档问题：0（已全部修复）

### Services 文件夹问题汇总
**已审查：** 6 / 20 (30.0%)

**缺少文件头注释的 Services（1 个）：**
1. redemptionService.ts

**文档良好的 Services（5 个）：**
1. ✅ themePresetService.ts - 完整的文件头注释
2. ✅ backgroundService.ts - 完整的文件头注释
3. ✅ colorSchemeService.ts - 完整的文件头注释
4. ✅ navigationDecorationService.ts - 完整的文件头注释
5. ✅ uiIconService.ts - 非常详细的文件头注释和使用示例

**代码亮点：**
- redemptionService.ts: 优秀的性能优化（FastDecoder 缓存）
- backgroundService.ts: 完善的 DOM 操作封装
- uiIconService.ts: 96 个图标，8 种主题，文档详细
- navigationDecorationService.ts: 35 种装饰
- colorSchemeService.ts: 28 种配色方案

---

## 优先级建议更新

### 立即修复
1. 🟡 确认 useIconMigration.ts 是否需要删除或使用

### 短期修复（建议批量处理）
1. 🟡 为 13 个 Hooks 添加文件头注释
2. 🟡 为 redemptionService.ts 添加文件头注释
3. 🟢 删除 redemptionService.ts 中未使用的工具函数
4. 🟢 处理 colorSchemeService.ts 中的空样式映射表

### 长期优化
1. 🟢 添加无障碍属性
2. 🟢 优化图片加载错误处理
3. 🟢 添加使用示例注释
4. 🟢 清理被注释掉的代码

---

## 🎉 审查进度更新

**总体进度：** 30 / 129 (23.3%)

**已完成的文件夹：**
- ✅ Hooks: 16 / 16 (100%)

**进行中的文件夹：**
- 🔄 Services: 6 / 20 (30.0%)

**待审查的文件夹：**
- Components: 6 / 52 (11.5%)
- Views: 1 / 26 (3.8%)
- Contexts: 0 / 8 (0%)
- Utils: 0 / 5 (0%)
- Constants: 1 / 4 (25.0%)

---

---

## 新增问题（第九批审查）

### 18. emergencyIconRepair.ts - 空文件
**文件：** `src/services/emergencyIconRepair.ts`
**发现时间：** 2026-02-09

**问题描述：**
文件完全为空，没有任何代码，也未被任何地方引用。

**建议：**
删除此文件，或者添加注释说明用途。

---

## 统计更新（2026-02-09 第九批审查后）

### 问题分布
- 🔴 严重问题：1（geminiService.ts 未被使用）
- 🟡 中等问题：16（14 个文件缺少文件头注释 + 1 个未使用的 Hook + 1 个空文件）
- 🟢 轻微问题：10
- 📝 文档问题：0（已全部修复）

### Services 文件夹问题汇总
**已审查：** 15 / 20 (75.0%)

**严重问题（1 个）：**
1. 🔴 geminiService.ts - 未被使用

**中等问题（2 个）：**
1. 🟡 redemptionService.ts - 缺少文件头注释
2. 🟡 emergencyIconRepair.ts - 空文件

**轻微问题（2 个）：**
1. 🟢 redemptionService.ts - 未使用的工具函数
2. 🟢 colorSchemeService.ts - 空的样式映射表

**文档良好的 Services（12 个）：**
1. ✅ themePresetService.ts
2. ✅ backgroundService.ts
3. ✅ colorSchemeService.ts
4. ✅ navigationDecorationService.ts
5. ✅ uiIconService.ts
6. ✅ iconService.ts
7. ✅ imageService.ts
8. ✅ syncService.ts
9. ✅ aiService.ts
10. ✅ webdavService.ts
11. ✅ s3Service.ts
12. ✅ narrativeService.ts
13. ✅ obsidianExportService.ts
14. ✅ excelExportService.ts
15. ✅ dataRepairService.ts
16. ✅ iconMigrationService.ts

---

## 优先级建议更新

### 立即修复
1. 🔴 确认 geminiService.ts 是否需要删除
2. 🟡 确认 useIconMigration.ts 是否需要删除或使用
3. 🟡 删除或说明 emergencyIconRepair.ts 的用途

### 短期修复（建议批量处理）
1. 🟡 为 14 个文件添加文件头注释
   - 13 个 Hooks
   - 1 个 Service (redemptionService.ts)
2. 🟢 删除 redemptionService.ts 中未使用的工具函数
3. 🟢 处理 colorSchemeService.ts 中的空样式映射表

### 长期优化
1. 🟢 添加无障碍属性
2. 🟢 优化图片加载错误处理
3. 🟢 添加使用示例注释
4. 🟢 清理被注释掉的代码

---

## 🎉 审查进度更新

**总体进度：** 39 / 129 (30.2%)

**已完成的文件夹：**
- ✅ Hooks: 16 / 16 (100%)

**进行中的文件夹：**
- 🔄 Services: 15 / 20 (75.0%)

**待审查的文件夹：**
- Components: 6 / 52 (11.5%)
- Views: 1 / 26 (3.8%)
- Contexts: 0 / 8 (0%)
- Utils: 0 / 5 (0%)
- Constants: 1 / 4 (25.0%)

---

---

## 新增问题（第十五批审查 - Components 深度分析）

### 19. AppRoutes.tsx - Props 接口过于庞大且职责不清
**文件：** `src/components/AppRoutes.tsx`
**发现时间：** 2026-02-09

**问题描述：**
- 接口包含 15+ 个 props，大部分是事件处理函数
- Log 和 Todo 的处理函数直接从 App.tsx 传入，而 Goal 和 Review 使用 Hook
- 职责混乱：既是路由组件，又承担了大量业务逻辑
- Props drilling 问题严重

**建议：**
1. 统一使用 Context 或 Hook 管理所有业务逻辑
2. 将 AppRoutes 简化为纯路由组件
3. 考虑使用 React Router 等路由库

---

### 20. AppRoutes.tsx - 重复的日期格式化逻辑
**文件：** `src/components/AppRoutes.tsx`
**发现时间：** 2026-02-09

**问题描述：**
- getLocalDateStr 函数在多个文件中重复定义
- 在 useReviewManager.ts 中也有相同的函数
- 在其他地方可能还有类似的实现

**建议：**
提取到 `src/utils/dateUtils.ts`

---

### 21. BottomNavigation.tsx - 全局函数污染
**文件：** `src/components/BottomNavigation.tsx`
**发现时间：** 2026-02-09

**问题描述：**
```typescript
(window as any).enableNavDecoDebug = () => setShowDebugger(true);
(window as any).disableNavDecoDebug = () => setShowDebugger(false);
```
- 直接在 window 对象上添加函数
- 没有命名空间，可能与其他代码冲突

**建议：**
使用命名空间：`window.LumosTime.debug.enableNavDeco`

---

### 22. CustomSelect.tsx - 缺少键盘导航
**文件：** `src/components/CustomSelect.tsx`
**发现时间：** 2026-02-09

**问题描述：**
- 不支持方向键选择选项
- 不支持 Enter/Space 键打开/关闭
- 不支持输入首字母快速定位

**影响：**
无障碍性差，键盘用户体验不好

**建议：**
添加键盘事件处理，参考 ARIA Combobox 规范

---

### 23. CalendarWidget.tsx - 缺少文件头注释
**文件：** `src/components/CalendarWidget.tsx`
**发现时间：** 2026-02-09

**问题描述：**
完全缺少文件头注释，包括 @file, @description, @input, @output, @pos。

**建议：**
添加完整的文件头注释。

---

## 统计更新（2026-02-09 第十五批审查后）

### 问题分布
- 🔴 严重问题：7（AddLogModal 3个 + AIBatchModal 1个 + geminiService 1个 + AppRoutes 2个）
- 🟡 中等问题：38（14 个 Hooks 缺少文件头注释 + 实质性问题）
- 🟢 轻微问题：20
- 📝 文档问题：0（已全部修复）

### Components 文件夹问题汇总
**已审查：** 12 / 52 (23.1%)

**严重问题（5 个）：**
1. 🔴 AddLogModal - 时间计算逻辑复杂且易出错
2. 🔴 AddLogModal - 状态管理过于复杂
3. 🔴 AddLogModal - 图片加载逻辑存在潜在内存泄漏
4. 🔴 AIBatchModal - AI 解析失败时用户体验差
5. 🔴 AppRoutes - Props 接口过于庞大且职责不清

**中等问题（16 个）：**
1. 🟡 AddLogModal - 拖拽逻辑可以优化
2. 🟡 AddLogModal - 时间输入验证不够严格
3. 🟡 AIBatchModal - 自动关联逻辑可能覆盖 AI 推断
4. 🟡 AIBatchModal - 日期时间格式化逻辑分散
5. 🟡 AITodoConfirmModal - Tab 状态管理复杂
6. 🟡 AITodoConfirmModal - 缺少输入验证
7. 🟡 AddActivityModal - 图标和颜色选项硬编码
8. 🟡 AppRoutes - 条件渲染逻辑复杂
9. 🟡 AppRoutes - 缺少错误边界
10. 🟡 BottomNavigation - 装饰图片加载逻辑可以优化
11. 🟡 BottomNavigation - 全局函数污染
12. 🟡 CommentSection - 状态管理可以简化
13. 🟡 CommentSection - 缺少乐观更新
14. 🟡 CustomSelect - 缺少键盘导航
15. 🟡 CustomSelect - 性能问题：事件监听器
16. 🟡 CalendarWidget - 月份选择器的国际化问题

**轻微问题（10 个）：**
1. 🟢 AddLogModal - 代码重复（与 AutoLinkView）
2. 🟢 AITodoInputModal - 组件过于简单
3. 🟢 AddActivityModal - 缺少重复名称检查
4. 🟢 BottomNavigation - 硬编码的导航项
5. 🟢 CommentSection - 时间格式化可以提取
6. 🟢 ConfirmModal - 缺少键盘支持
7. 🟢 ConfirmModal - 缺少焦点管理
8. 🟢 CustomSelect - 移动端体验可以优化
9. 🟢 CalendarWidget - 缺少文件头注释
10. 🟢 AppRoutes - 重复的日期格式化逻辑

---

## 优先级建议更新

### 立即修复（架构和稳定性问题）
1. 🔴 **AddLogModal 的图片内存泄漏** - 可能导致应用崩溃
2. 🔴 **AppRoutes 的职责重构** - 影响整体架构
3. 🔴 **AddLogModal 的时间计算逻辑** - 可能导致数据错误
4. 🔴 确认 geminiService.ts 是否需要删除

### 短期修复（用户体验）
1. 🟡 **AIBatchModal 的错误处理** - 影响 AI 功能可用性
2. 🟡 **CustomSelect 添加键盘导航** - 提升无障碍性
3. 🟡 **ConfirmModal 添加键盘支持** - 提升用户体验
4. 🟡 为 14 个 Hooks 添加文件头注释

### 长期优化（代码质量）
1. 🟢 **提取重复的日期格式化逻辑** - 创建 dateUtils.ts
2. 🟢 **统一图片加载逻辑** - 创建 useImageLoader Hook
3. 🟢 **AddLogModal 的状态管理重构** - 使用 useReducer
4. 🟢 清理全局函数污染

---

## 🎉 审查进度更新

**总体进度：** 62 / 129 (48.1%)

**已完成的文件夹：**
- ✅ Hooks: 16 / 16 (100%)
- ✅ Services: 19 / 19 (100%)
- ✅ Contexts: 8 / 8 (100%)
- ✅ Utils: 6 / 6 (100%)
- ✅ Constants: 4 / 4 (100%)

**进行中的文件夹：**
- 🔄 Components: 12 / 52 (23.1%)

**待审查的文件夹：**
- Views: 1 / 26 (3.8%)

---

## 下一步
继续审查 Components 文件夹的剩余 40 个文件，然后审查 Views 文件夹。
