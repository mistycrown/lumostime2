# Todo/标签/领域图标和颜色选择器功能

## 功能概述

在 Todo Management、Tag Management 和 Scope Management 页面中，为分类和子项添加了快速图标选择和颜色选择功能。当用户启用自定义 UI 图标主题时，可以通过点击调色板按钮快速选择图标。在 Tag Management 中，还可以为活动（二级分类）选择颜色。

## 功能特性

### 1. 图标选择器
#### 条件显示
- 仅在用户启用自定义 UI 图标主题时显示（`uiIconTheme !== 'default'`）
- 使用 `uiIconService.isCustomTheme()` 判断是否启用

#### 按钮位置
- 位于每个分类/子项标题行的右侧按钮组中
- 在上下移动按钮的左侧
- 使用调色板图标（Palette）表示

### 2. 颜色选择器（Tag Management 专属）
#### 显示条件
- 始终显示，无需启用自定义主题
- 在大分类（Category）和二级分类（Activity）行都显示

#### 按钮位置
- 位于名称输入框右侧
- 显示为带有当前颜色的圆形按钮（只有圆圈内有颜色）
- 点击后展开颜色选择面板

#### 交互特性
- **实时预览**：选择颜色后立即应用到圆形按钮
- **视觉反馈**：当前选中的颜色会显示 ring 高亮效果
- **颜色选项**：提供 20+ 种预设颜色，涵盖灰色、红色、橙色、黄色、绿色、蓝色、紫色、粉色系
- **圆形显示**：颜色按钮和选择器中的颜色都以圆形显示，使用 `style` 内联样式设置背景色

### 3. 支持的页面和层级

#### Todo Management (TodoBatchManageView)
- **大分类**：支持图标选择器

#### Tag Management (BatchManageView)
- **大分类（Category）**：支持图标选择器 + **颜色选择器**
- **二级分类（Activity）**：支持图标选择器 + **颜色选择器**

#### Scope Management (ScopeManageView)
- **领域（Scope）**：支持图标选择器

### 4. 交互流程

#### 图标选择
1. 点击调色板按钮，展开图标选择器
2. 选择器显示在对应项目下方
3. 选择图标后，自动更新对应项的 icon 字段
4. 选择器自动关闭

#### 颜色选择（Tag Management 大分类和活动）
1. 点击颜色圆形按钮，展开颜色选择面板
2. 面板显示在对应项下方
3. 点击任意颜色，**立即应用**到对应项的颜色字段
4. 颜色按钮实时显示当前选中的颜色（只在圆圈内显示）
5. 可以再次点击按钮关闭面板

### 5. 数据格式

#### 图标格式
- 选中的图标以 `ui:iconType` 格式存储
- 例如：`ui:study`、`ui:book`、`ui:code` 等

#### 颜色格式
- **大分类（Category）**：颜色存储在 `themeColor` 字段，格式为 Tailwind 类名，例如：`text-emerald-600`
- **活动（Activity）**：颜色存储在 `color` 字段，格式为 Tailwind 类名，例如：`bg-emerald-100 text-emerald-700`
- 包含背景色和文字色两个类名

## 技术实现

### 组件引入
```typescript
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { uiIconService } from '../services/uiIconService';
import { useSettings } from '../contexts/SettingsContext';
import { COLOR_OPTIONS } from '../constants';
import { Palette } from 'lucide-react';
```

### 状态管理

#### Todo Management & Scope Management
```typescript
const [iconSelectorOpen, setIconSelectorOpen] = useState<string | null>(null);
const { uiIconTheme } = useSettings();
const isCustomIconEnabled = uiIconService.isCustomTheme();
```

#### Tag Management (支持两级图标 + 两级颜色)
```typescript
const [iconSelectorOpen, setIconSelectorOpen] = useState<{ type: 'category' | 'activity', id: string } | null>(null);
const [colorPickerOpen, setColorPickerOpen] = useState<{ type: 'category' | 'activity', id: string } | null>(null);
const { uiIconTheme } = useSettings();
const isCustomIconEnabled = uiIconService.isCustomTheme();
```

### 颜色选择处理（Tag Management）

```typescript
// 大分类颜色选择
const handleCategoryColorChange = (catId: string, color: string) => {
    setCategories(prev => prev.map(c => {
        if (c.id === catId) {
            return { ...c, themeColor: color };
        }
        return c;
    }));
};

// 活动颜色选择
const handleActivityColorChange = (catId: string, actId: string, color: string) => {
    setCategories(prev => prev.map(c => {
        if (c.id === catId) {
            return {
                ...c,
                activities: c.activities.map(a => {
                    if (a.id === actId) {
                        return { ...a, color };
                    }
                    return a;
                })
            };
        }
        return c;
    }));
};

// 从颜色字符串提取显示颜色
const getColorFromActivityColor = (colorStr: string): string => {
    const match = colorStr.match(/bg-([a-z]+)-/);
    if (match) {
        const colorName = match[1];
        const option = COLOR_OPTIONS.find(opt => opt.id === colorName);
        return option ? option.picker : '#e7e5e4';
    }
    return '#e7e5e4';
};

const getColorFromCategoryThemeColor = (themeColor: string): string => {
    const match = themeColor.match(/text-([a-z]+)-/);
    if (match) {
        const colorName = match[1];
        const option = COLOR_OPTIONS.find(opt => opt.id === colorName);
        return option ? option.picker : '#e7e5e4';
    }
    return '#e7e5e4';
};
```

### 颜色选择器 UI

```tsx
{/* Color Picker Button - 只在圆圈内显示颜色 */}
<button
    onClick={() => setColorPickerOpen(...)}
    className="p-1.5 rounded-lg transition-all shrink-0 hover:bg-stone-100"
    title="选择颜色"
>
    <div 
        className="w-4 h-4 rounded-full border border-stone-300"
        style={{ backgroundColor: getColorFromActivityColor(activity.color) }}
    />
</button>

{/* Color Picker Dropdown - 使用内联样式显示颜色 */}
{colorPickerOpen?.type === 'activity' && colorPickerOpen?.id === activity.id && (
    <div className="p-3 mt-1 bg-stone-50/50 rounded-xl border border-stone-100">
        <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => handleActivityColorChange(category.id, activity.id, `${opt.bg} ${opt.text}`)}
                    title={opt.label}
                    className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${
                        activity.color.includes(opt.bg) 
                            ? `ring-2 ${opt.ring} ring-offset-2` 
                            : ''
                    }`}
                    style={{ backgroundColor: opt.picker }}
                />
            ))}
        </div>
    </div>
)}
```

## UI 布局

### Tag Management (两级 + 颜色选择)
```
┌─────────────────────────────────────────────────┐
│ [▼] ui:home生活  [🔴][🎨][↑][↓][+][🗑]         │
├─────────────────────────────────────────────────┤
│ [大分类颜色选择器 - 点击🔴后显示]                │
│ ⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪                          │
├─────────────────────────────────────────────────┤
│ [分类图标选择器 - 仅在点击分类🎨后显示]          │
├─────────────────────────────────────────────────┤
│   ⋮ ui:commute通勤  [🟡][🎨][↑][↓][🗑]         │
│   ├─────────────────────────────────────────────┤
│   │ [活动颜色选择器 - 点击🟡后显示]              │
│   │ ⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪                          │
│   ├─────────────────────────────────────────────┤
│   │ [活动图标选择器 - 仅在点击活动🎨后显示]      │
│   └─────────────────────────────────────────────┘
│   ⋮ 🍽饮食  [🟠][🎨][↑][↓][🗑]                  │
└─────────────────────────────────────────────────┘

注：🔴🟡🟠 表示颜色圆形按钮，只有圆圈内有颜色
```

## 用户体验

### 优点
- **图标选择**：快速修改图标，无需手动输入 `ui:` 前缀，可视化选择更直观
- **颜色选择**：实时预览颜色效果，所见即所得，只在圆圈内显示颜色更简洁
- **条件显示**：图标选择器仅在需要时显示，不影响默认主题用户
- **多层级支持**：Tag Management 支持大分类和二级分类的独立配置（图标+颜色）
- **一致性**：颜色选择器使用与应用其他部分相同的 COLOR_OPTIONS

### 注意事项
- 图标选择器使用 `UIIconSelectorCompact` 组件，显示所有可用图标
- 颜色选择器始终可用，不受主题设置影响
- 颜色按钮使用内联 `style` 设置背景色，只在圆圈内显示颜色
- 选择器在选择后自动关闭（图标）或保持打开（颜色）
- 可以通过再次点击按钮关闭选择器
- Tag Management 中，大分类和二级分类的图标、颜色选择器独立管理
- 颜色变化实时生效，无需额外保存操作
- 大分类使用 `themeColor` 字段（text-color 格式），活动使用 `color` 字段（bg-color + text-color 格式）

## 相关文件

- `src/views/TodoBatchManageView.tsx` - Todo 管理
- `src/views/BatchManageView.tsx` - 标签管理（支持两级图标 + 颜色选择）
- `src/views/ScopeManageView.tsx` - 领域管理
- `src/components/UIIconSelector.tsx` - 图标选择器组件
- `src/services/uiIconService.ts` - 图标服务
- `src/contexts/SettingsContext.tsx` - 设置上下文
- `src/constants.ts` - 颜色选项定义

## 更新日期

2026-02-08
