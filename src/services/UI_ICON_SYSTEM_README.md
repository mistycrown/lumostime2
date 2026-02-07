# UI Icon 主题系统 - 完整说明

## 📋 系统概述

这是一个模块化的 UI 图标主题管理系统，支持：
- ✅ 多套主题切换
- ✅ PNG/WebP 自动降级
- ✅ 类型安全
- ✅ 易于扩展
- ✅ 性能优化

## 📁 文件结构

```
src/
├── services/
│   ├── uiIconService.ts          # 核心服务（主题管理、路径生成）
│   └── uiIconService.md          # 详细使用文档
├── components/
│   ├── UIIcon.tsx                # 通用图标组件
│   └── UIIcon.example.tsx        # 使用示例
└── contexts/
    └── SettingsContext.tsx       # 已集成主题设置

public/
└── uiicon/
    ├── purple/                   # Purple 主题
    │   ├── 01.png / 01.webp     # 同步
    │   ├── 02.png / 02.webp     # 设置
    │   └── ...                   # 03-16
    └── [其他主题]/
```

## 🎨 16 个图标映射

| # | 类型 | 文件名 | 说明 | 使用位置 |
|---|------|--------|------|----------|
| 1 | `sync` | 01 | 同步按钮 | 计时、记录、待办、脉络页左上角 |
| 2 | `settings` | 02 | 设置 | 记录页右上角 |
| 3 | `manage` | 03 | 管理 | 待办页、索引页右上角 |
| 4 | `calendar` | 04 | 日历 | 脉络页右上角 |
| 5 | `add-record` | 05 | 增加记录 | 脉络页右下角 |
| 6 | `timer` | 06 | 打点计时 | 增加记录左边悬浮按钮 |
| 7 | `ai-assist` | 07 | AI 补记 | 添加记录上方、待办页 AI 添加 |
| 8 | `tags` | 08 | 标签 | 索引页右下角悬浮按钮 |
| 9 | `scope` | 09 | 领域 | 索引页右下角悬浮按钮 |
| 10 | `chronicle` | 10 | 编年史 | 档案页悬浮按钮 |
| 11 | `memoir` | 11 | 回忆录 | 档案页悬浮按钮 |
| 12 | `reading` | 12 | 阅读模式 | 日报/周报/月报详情页 |
| 13 | `editing` | 13 | 编辑模式 | 日报/周报/月报详情页 |
| 14 | `sort-asc` | 14 | 正向排序 | 脉络页标题栏 |
| 15 | `sort-desc` | 15 | 反向排序 | 脉络页标题栏 |
| 16 | `data-view` | 16 | 数据视图 | 脉络页顶部 |

## 🚀 快速开始

### 1. 基本使用

```tsx
import { UIIcon } from '@/components/UIIcon';
import { Settings } from 'lucide-react';

// 在任何地方使用
<UIIcon 
  type="settings" 
  fallbackIcon={Settings} 
  size={20} 
  className="text-stone-600"
/>
```

### 2. 替换现有图标

**替换前：**
```tsx
<Settings size={20} className="text-stone-600" />
```

**替换后：**
```tsx
<UIIcon 
  type="settings" 
  fallbackIcon={Settings} 
  size={20} 
  className="text-stone-600"
/>
```

### 3. 在按钮中使用

```tsx
<button className="p-2 hover:bg-stone-100 rounded-lg">
  <UIIcon 
    type="sync" 
    fallbackIcon={RefreshCw} 
    size={20} 
  />
</button>
```

## 🔄 工作原理

### 主题切换流程

```
用户选择主题
    ↓
SettingsContext 更新 uiIconTheme
    ↓
uiIconService.setTheme() 被调用
    ↓
触发 'ui-icon-theme-changed' 事件
    ↓
所有 UIIcon 组件监听到事件
    ↓
重新渲染，显示新主题图标
```

### 图片加载降级

```
尝试加载 WebP
    ↓
失败？→ 尝试加载 PNG
    ↓
失败？→ 显示 Lucide 图标
```

## 📦 核心 API

### uiIconService

```ts
// 获取当前主题
uiIconService.getCurrentTheme(): UIIconTheme

// 设置主题
uiIconService.setTheme(theme: UIIconTheme): void

// 获取图标路径
uiIconService.getIconPath(iconType: UIIconType, format?: 'png' | 'webp'): string

// 获取带降级的路径
uiIconService.getIconPathWithFallback(iconType: UIIconType): { primary: string; fallback: string }

// 检查是否使用自定义主题
uiIconService.isCustomTheme(): boolean
```

### UIIcon 组件

```tsx
interface UIIconProps {
  type: UIIconType;           // 图标类型
  fallbackIcon: LucideIcon;   // 降级图标
  size?: number;              // 大小（默认 20）
  className?: string;         // 自定义类名
}
```

### useUIIcon Hook

```tsx
const { isCustomTheme, iconPath, fallbackPath, theme } = useUIIcon('settings');
```

## 🎯 需要替换的页面清单

### 高优先级（常用功能）
- [ ] RecordView - 记录页（设置、同步）
- [ ] TimelineView - 脉络页（日历、同步、排序、数据视图、悬浮按钮）
- [ ] TodoView - 待办页（管理、同步、AI 添加）

### 中优先级
- [ ] TagsView - 标签页（管理、同步、切换按钮）
- [ ] ScopeView - 领域页（管理、同步、切换按钮）
- [ ] DailyReviewView - 日报详情（阅读/编辑模式）
- [ ] WeeklyReviewView - 周报详情（阅读/编辑模式）
- [ ] MonthlyReviewView - 月报详情（阅读/编辑模式）

### 低优先级
- [ ] Archive 相关页面（编年史、回忆录切换）

## 🔧 添加新主题

### 步骤 1: 准备图标文件

在 `public/uiicon/` 下创建新主题文件夹：

```
public/uiicon/new-theme/
├── 01.png
├── 02.png
├── ...
└── 16.png
```

### 步骤 2: 注册主题

在 `src/services/uiIconService.ts` 中：

```ts
export const UI_ICON_THEMES = ['default', 'purple', 'new-theme'] as const;
```

### 步骤 3: 添加主题预览

在 `src/views/SponsorshipView.tsx` 的 Icon Tab 中添加新主题选项。

### 步骤 4: 转换为 WebP（生产环境）

```bash
npm run convert-to-webp
```

## 📊 性能优化

### 图片格式对比

| 格式 | 大小 | 质量 | 兼容性 |
|------|------|------|--------|
| PNG | 100% | 无损 | 完美 |
| WebP | 30-50% | 接近无损 | 现代浏览器 |

### 优化建议

1. **生产环境使用 WebP**：减少 50% 文件大小
2. **保留 PNG 作为降级**：确保兼容性
3. **图标尺寸建议**：48x48 或 64x64
4. **懒加载**：UIIcon 组件已实现按需加载

## 🐛 调试技巧

### 查看当前主题

```js
// 在浏览器控制台
import { uiIconService } from './services/uiIconService';
console.log(uiIconService.getCurrentTheme());
```

### 测试图标路径

```js
console.log(uiIconService.getIconPath('settings', 'png'));
// 输出: /uiicon/purple/02.png
```

### 监听主题变更

```js
window.addEventListener('ui-icon-theme-changed', (e) => {
  console.log('主题已切换:', e.detail.theme);
});
```

## ⚠️ 注意事项

1. **命名规范**：图标文件必须使用 01-16 编号
2. **格式支持**：同时提供 PNG 和 WebP 格式
3. **降级策略**：WebP → PNG → Lucide Icon
4. **主题一致性**：确保所有图标风格统一
5. **性能考虑**：避免过大的图片文件（建议 < 10KB）

## 📝 TODO

- [ ] 替换所有页面的图标
- [ ] 添加更多主题
- [ ] 优化图片加载性能
- [ ] 添加主题预览功能
- [ ] 支持自定义主题上传

## 🎉 总结

这个系统提供了：
- **灵活性**：轻松添加新主题
- **可靠性**：多层降级保证显示
- **性能**：WebP 格式优化加载
- **易用性**：简单的 API 和组件
- **可维护性**：清晰的文件结构和文档

开始使用吧！🚀
