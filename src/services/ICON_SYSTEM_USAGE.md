# UI 图标系统使用指南

## 概述

UI 图标系统支持在 Emoji 和自定义图标主题之间无缝切换。当用户启用自定义图标主题时，系统会自动将默认 Emoji 替换为对应的图标图片。

## 核心概念

### 1. 图标格式

- **Emoji 格式**: 直接存储 Emoji 字符，如 `"📚"`, `"🏃"`, `"💼"`
- **UI 图标格式**: 使用 `"ui:iconType"` 格式，如 `"ui:book"`, `"ui:workout"`, `"ui:briefcase"`

### 2. 渲染逻辑

```
用户数据中的 icon 字段
    ↓
是否以 "ui:" 开头？
    ├─ 是 → 检查当前主题
    │         ├─ default → 渲染 Emoji（取第一个字符）
    │         └─ 其他主题 → 渲染图片（PNG 优先，WebP 降级）
    └─ 否 → 直接渲染 Emoji
```

### 3. 自动迁移

当用户首次从 `default` 主题切换到其他主题时：
1. 扫描所有 Category、Activity、Scope、TodoCategory
2. 识别哪些图标是"默认 Emoji"（在映射表中）
3. 将默认 Emoji 转换为 `"ui:iconType"` 格式
4. 保留用户自定义的 Emoji 不变

## 使用方法

### 方法 1: 使用 IconRenderer 组件（推荐）

```tsx
import { IconRenderer } from '@/components/IconRenderer';

function CategoryCard({ category }) {
  return (
    <div>
      {/* 自动判断并渲染 */}
      <IconRenderer 
        icon={category.icon} 
        size={24}
        className="mr-2"
      />
      <span>{category.name}</span>
    </div>
  );
}
```

### 方法 2: 使用 useIconRenderer Hook

```tsx
import { useIconRenderer } from '@/components/IconRenderer';

function ActivityItem({ activity }) {
  const { isImage, src, fallbackSrc, emoji } = useIconRenderer(activity.icon);
  
  return (
    <div>
      {isImage ? (
        <img 
          src={src} 
          alt={activity.name}
          onError={(e) => {
            if (e.currentTarget.src === src) {
              e.currentTarget.src = fallbackSrc;
            }
          }}
        />
      ) : (
        <span>{emoji}</span>
      )}
      <span>{activity.name}</span>
    </div>
  );
}
```

### 方法 3: 手动解析

```tsx
import { uiIconService } from '@/services/uiIconService';

function ScopeTag({ scope }) {
  const { isUIIcon, value } = uiIconService.parseIconString(scope.icon);
  const currentTheme = uiIconService.getCurrentTheme();
  
  if (isUIIcon && currentTheme !== 'default') {
    const { primary, fallback } = uiIconService.getIconPathWithFallback(value);
    return <img src={primary} alt={scope.name} />;
  }
  
  return <span>{value}</span>;
}
```

## 集成到应用

### 1. 在 App.tsx 或主组件中添加迁移 Hook

```tsx
import { useIconMigration } from '@/hooks/useIconMigration';
import { useSettings } from '@/contexts/SettingsContext';
import { useCategoryScope } from '@/contexts/CategoryScopeContext';
import { useData } from '@/contexts/DataContext';

function App() {
  const { uiIconTheme } = useSettings();
  const { categories, setCategories, scopes, setScopes } = useCategoryScope();
  const { todoCategories, setTodoCategories } = useData();
  
  // 自动迁移
  useIconMigration({
    uiIconTheme,
    categories,
    scopes,
    todoCategories,
    onCategoriesUpdate: setCategories,
    onScopesUpdate: setScopes,
    onTodoCategoriesUpdate: setTodoCategories
  });
  
  return <YourApp />;
}
```

### 2. 替换现有的图标渲染

在所有渲染 Category、Activity、Scope、TodoCategory 图标的地方，将：

```tsx
// 旧代码
<span>{category.icon}</span>
```

替换为：

```tsx
// 新代码
<IconRenderer icon={category.icon} />
```

## 默认 Emoji 映射表

系统内置了 `constants.ts` 中实际使用的 Emoji 映射：

### 分类 (Categories)
- 🏠 → `home` (生活)
- 💤 → `sleep` (睡眠)
- 🎓 → `study` (学习)
- 🪞 → `self` (与自己)
- 🤝 → `handshake` (与他人)
- 🧭 → `explore` (探索世界)
- 🎡 → `art` (爱欲再生产)

### 标签 (Activities)
- 🚇 → `commute` (通勤)
- 🍱 → `meal` (饮食)
- 🧹 → `housework` (家务)
- 🚿 → `hygiene` (洗护)
- 🛒 → `shopping` (购物)
- 🧾 → `chores` (杂务)
- 🛌 → `sleep` (睡觉)
- 🔋 → `nap` (小憩)
- 🏫 → `meeting` (上课开会)
- 💻 → `laptop` (网课自学)
- 📖 → `book` (书籍文献)
- 👾 → `code` (代码编程)
- ✒️ → `thesis` (论文写作)
- 🧠 → `think` (日记复盘)
- 🗂️ → `folder` (整理收集)
- ⚙️ → `settings` (工具开发)
- 🏃 → `workout` (运动健身)
- 💰 → `money` (兼职工作)
- 🕸️ → `social` (社会织网)
- 🎨 → `design` (设计)
- 🎵 → `music` (音乐)
- 🧶 → `craft` (手工)
- 🖌️ → `brush` (书法)
- 🍵 → `chat` (闲聊瞎扯)
- 🏄 → `surf` (网上冲浪)
- 🍿 → `watch` (看文看剧)
- 🎮 → `game` (玩玩游戏)
- 🔮 → `mystery` (不可名状)

### 领域 (Scopes)
- 🚩 → `phd` (专业输入)
- 🏛️ → `phd` (博士课题)
- 🦉 → `wisdom` (博雅通识)
- ⚡️ → `ai` (AI玩具)

### 待办分类 (TodoCategories)
- 🎓 → `study` (毕业论文)
- 📚 → `book` (学习计划)
- 🏠 → `home` (生活杂务)
- ⚙️ → `settings` (开发任务)

### 日课模板 (CheckTemplates)
- 💧 → `water` (早起喝水)
- 🛏️ → `sleep` (整理床铺)
- 💊 → `medical` (吃维生素)
- 🧘 → `meditation` (冥想)
- 🧹 → `housework` (收拾书桌)
- 👕 → `shopping` (准备明天衣物)

完整映射表请参考 `src/services/uiIconService.ts` 中的 `DEFAULT_EMOJI_TO_ICON_MAP`。

## 添加新的图标映射

如果需要添加新的 Emoji 映射：

```typescript
// 在 src/services/uiIconService.ts 中
export const DEFAULT_EMOJI_TO_ICON_MAP: Record<string, UIIconType> = {
  // ... 现有映射
  '🆕': 'your-new-icon-type',  // 添加新映射
};
```

## 测试迁移

```typescript
import { triggerManualMigration } from '@/hooks/useIconMigration';

// 重置并重新迁移（用于测试）
const result = triggerManualMigration({
  categories,
  scopes,
  todoCategories
});

console.log('迁移结果:', result);
```

## 注意事项

1. **PNG 优先**: 系统优先加载 PNG 格式，如果失败则降级到 WebP
2. **用户自定义保留**: 用户修改过的 Emoji 不会被自动替换
3. **一次性迁移**: 迁移只在首次启用自定义主题时执行一次
4. **向后兼容**: 即使启用自定义主题，用户仍可以使用任意 Emoji
5. **主题切换**: 切换回 `default` 主题时，UI 图标格式会自动渲染为 Emoji

## 文件结构

```
src/
├── services/
│   ├── uiIconService.ts           # 核心服务
│   ├── iconMigrationService.ts    # 迁移服务
│   └── UI_ICON_REFERENCE.md       # 图标编号参考
├── components/
│   └── IconRenderer.tsx            # 渲染组件
└── hooks/
    └── useIconMigration.ts         # 迁移 Hook
```

## 常见问题

### Q: 为什么我的图标没有被替换？
A: 检查以下几点：
1. 是否已启用自定义主题（非 `default`）
2. 该 Emoji 是否在 `DEFAULT_EMOJI_TO_ICON_MAP` 中
3. 是否已经执行过迁移（检查 localStorage 中的 `lumostime_icon_migration_done`）

### Q: 如何重新触发迁移？
A: 使用 `triggerManualMigration()` 函数，或清除 localStorage 中的 `lumostime_icon_migration_done` 键。

### Q: 用户自定义的 Emoji 会被替换吗？
A: 不会。只有在默认映射表中的 Emoji 才会被替换。

### Q: 如何添加新的图标类型？
A: 
1. 在 `uiIconService.ts` 中添加新的 `UIIconType`
2. 更新 `ICON_NUMBER_MAP` 添加编号映射
3. 在 `DEFAULT_EMOJI_TO_ICON_MAP` 中添加 Emoji 映射
4. 确保所有主题文件夹中都有对应编号的图标文件
