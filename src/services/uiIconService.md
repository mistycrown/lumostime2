# UI Icon 主题系统使用文档

## 概述

UI Icon 主题系统允许用户切换应用内所有 UI 图标的视觉风格。系统支持：
- 多套主题（默认、purple 等）
- 自动格式降级（WebP → PNG）
- 类型安全
- 易于扩展

## 文件结构

```
public/uiicon/
├── purple/
│   ├── 01.png / 01.webp  # 同步按钮
│   ├── 02.png / 02.webp  # 设置
│   ├── 03.png / 03.webp  # 管理
│   ├── 04.png / 04.webp  # 日历
│   ├── 05.png / 05.webp  # 增加记录
│   ├── 06.png / 06.webp  # 打点计时
│   ├── 07.png / 07.webp  # AI 补记
│   ├── 08.png / 08.webp  # 标签
│   ├── 09.png / 09.webp  # 领域
│   ├── 10.png / 10.webp  # 编年史
│   ├── 11.png / 11.webp  # 回忆录
│   ├── 12.png / 12.webp  # 阅读模式
│   ├── 13.png / 13.webp  # 编辑模式
│   ├── 14.png / 14.webp  # 正向排序
│   ├── 15.png / 15.webp  # 反向排序
│   └── 16.png / 16.webp  # 数据视图
└── [其他主题]/
    └── ...
```

## 图标映射表

| 编号 | 类型 | 说明 | 使用位置 |
|------|------|------|----------|
| 01 | `sync` | 同步按钮 | 计时、记录、待办、脉络页左上角 |
| 02 | `settings` | 设置 | 记录页右上角 |
| 03 | `manage` | 管理 | 待办页右上角、索引页（标签/领域）右上角 |
| 04 | `calendar` | 日历 | 脉络页右上角 |
| 05 | `add-record` | 增加记录 | 脉络页右下角 |
| 06 | `timer` | 打点计时 | "增加记录"左边的悬浮按钮 |
| 07 | `ai-assist` | AI 补记 | "添加记录"上方悬浮按钮、待办页 AI 添加 |
| 08 | `tags` | 标签 | 索引页右下角悬浮按钮 |
| 09 | `scope` | 领域 | 索引页右下角悬浮按钮 |
| 10 | `chronicle` | 编年史 | 档案页悬浮按钮 |
| 11 | `memoir` | 回忆录 | 档案页悬浮按钮 |
| 12 | `reading` | 阅读模式 | 周报/日报/月报详情页右下角 |
| 13 | `editing` | 编辑模式 | 周报/日报/月报详情页右下角 |
| 14 | `sort-asc` | 正向排序 | 脉络页标题栏上方 |
| 15 | `sort-desc` | 反向排序 | 脉络页标题栏上方 |
| 16 | `data-view` | 数据视图 | 脉络页顶部 |

## 基本使用

### 1. 在组件中使用 UIIcon

```tsx
import { UIIcon } from '@/components/UIIcon';
import { Settings, RefreshCw, Calendar } from 'lucide-react';

// 设置按钮
<UIIcon 
  type="settings" 
  fallbackIcon={Settings} 
  size={20} 
  className="text-stone-600"
/>

// 同步按钮
<UIIcon 
  type="sync" 
  fallbackIcon={RefreshCw} 
  size={20} 
  className="text-stone-600"
/>

// 日历按钮
<UIIcon 
  type="calendar" 
  fallbackIcon={Calendar} 
  size={20} 
  className="text-stone-600"
/>
```

### 2. 在按钮中使用

```tsx
<button className="p-2 hover:bg-stone-100 rounded-lg">
  <UIIcon 
    type="settings" 
    fallbackIcon={Settings} 
    size={20} 
  />
</button>
```

### 3. 使用 Hook（高级用法）

```tsx
import { useUIIcon } from '@/services/uiIconService';
import { Settings } from 'lucide-react';

function MyComponent() {
  const { isCustomTheme, iconPath, fallbackPath } = useUIIcon('settings');

  if (!isCustomTheme) {
    return <Settings size={20} />;
  }

  return (
    <img 
      src={iconPath} 
      alt="settings"
      onError={(e) => {
        e.currentTarget.src = fallbackPath;
      }}
    />
  );
}
```

## 需要替换的位置

### 记录页 (RecordView)
- [ ] 右上角设置按钮：`settings`
- [ ] 左上角同步按钮：`sync`

### 脉络页 (TimelineView)
- [ ] 左上角同步按钮：`sync`
- [ ] 右上角日历按钮：`calendar`
- [ ] 右下角增加记录：`add-record`
- [ ] 打点计时悬浮按钮：`timer`
- [ ] AI 补记悬浮按钮：`ai-assist`
- [ ] 顶部正向排序：`sort-asc`
- [ ] 顶部反向排序：`sort-desc`
- [ ] 顶部数据视图：`data-view`

### 待办页 (TodoView)
- [ ] 左上角同步按钮：`sync`
- [ ] 右上角管理按钮：`manage`
- [ ] AI 添加待办：`ai-assist`

### 索引页 (TagsView / ScopeView)
- [ ] 左上角同步按钮：`sync`
- [ ] 右上角管理按钮：`manage`
- [ ] 右下角切换到标签：`tags`
- [ ] 右下角切换到领域：`scope`

### 档案页 (Archive)
- [ ] 切换到编年史：`chronicle`
- [ ] 切换到回忆录：`memoir`

### 日报/周报/月报详情页
- [ ] 右下角阅读模式：`reading`
- [ ] 右下角编辑模式：`editing`

## 添加新主题

1. 在 `public/uiicon/` 下创建新主题文件夹
2. 添加 16 张图标（01.png 到 16.png）
3. 在 `uiIconService.ts` 中添加主题名称：

```ts
export const UI_ICON_THEMES = ['default', 'purple', 'new-theme'] as const;
```

4. 在投喂功能页面添加主题预览

## 图片格式转换

### 开发阶段（PNG）
```bash
# 图片已经是 PNG 格式，直接使用
```

### 生产阶段（转换为 WebP）
```bash
# 使用脚本批量转换
npm run convert-to-webp
```

系统会自动处理降级：
1. 优先加载 WebP 格式
2. 如果 WebP 加载失败，自动降级到 PNG
3. 如果 PNG 也失败，显示 Lucide 图标

## 注意事项

1. **图标大小**：建议使用 48x48 或更高分辨率
2. **命名规范**：必须使用 01-16 的编号
3. **格式支持**：PNG（调试）和 WebP（生产）
4. **降级策略**：WebP → PNG → Lucide Icon
5. **性能优化**：使用 WebP 可减少 30-50% 的文件大小

## 测试清单

- [ ] 默认主题显示 Lucide 图标
- [ ] 切换到 purple 主题显示自定义图标
- [ ] WebP 格式正常加载
- [ ] PNG 降级正常工作
- [ ] 主题切换实时生效
- [ ] 所有 16 个图标位置正确
