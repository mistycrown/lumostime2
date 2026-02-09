# 代码审查问题汇总

## 审查日期
2026-02-09

---

## 🔴 严重问题

暂无

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
- 🟡 中等问题：0（已全部修复 ✅）
- 🟢 轻微问题：2
- 📝 文档问题：1

### 按文件统计
- `UiThemeButton.tsx`: 2 个问题（轻微）
- `TimePalSettings.tsx`: ✅ 已修复所有问题
- `themePresetService.ts`: 0 个问题
- `useTimePalImage.ts`: 0 个问题
- `storageKeys.ts`: 0 个问题
- `src/components/`: 1 个问题（文档）

---

## 优先级建议

### ~~立即修复~~ ✅ 已完成
1. ~~🟡 TimePalSettings.tsx - 删除或实现 asCard 参数~~
2. ~~🟡 TimePalSettings.tsx - 补充文件头注释~~

### 短期修复
1. 📝 更新 src/components/README.md（添加新组件说明）
2. 📝 创建 src/hooks/README.md
3. 📝 创建 src/constants/README.md

### 长期优化
1. 🟢 添加无障碍属性
2. 🟢 优化图片加载错误处理（使用 useTimePalImage Hook）
3. 🟢 添加使用示例注释

---

## 下一步
第一批核心组件审查完成！继续审查第二批：
- SponsorshipView.tsx
- PresetEditModal.tsx
- BackgroundSelector.tsx
- NavigationDecorationSelector.tsx
- ColorSchemeSelector.tsx
