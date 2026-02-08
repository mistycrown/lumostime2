# 数据重置工具使用指南

## 概述

这是一个浏览器控制台工具，可以快速将标签数据重置为默认值。当你的数据出现问题（如图标显示错误）时，可以使用这个工具快速恢复。

## 使用方法

### 1. 打开浏览器控制台

- **Chrome/Edge**: 按 `F12` 或 `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: 按 `F12` 或 `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
- **Safari**: 按 `Cmd+Option+C`

### 2. 查看帮助信息

在控制台中输入：

```javascript
window.resetDataHelp()
```

会显示所有可用命令的帮助信息。

## 可用命令

### 📋 查看当前数据状态

```javascript
window.inspectData()
```

这个命令会显示：
- Categories 数量和示例
- Scopes 数量和示例
- TodoCategories 数量和示例
- 迁移标记状态
- 当前主题设置

**示例输出**：
```
[ResetDataTool] ========== 当前数据状态 ==========
[Categories] 数量: 7
[Categories] 第一个: {id: 'life', name: '生活', icon: '🏠', ...}
[Categories] 第一个 activity: {id: 'commute', name: '通勤', icon: '🚇', ...}
...
[迁移标记]
- uiicon_generated: true
- data_repair_v1_done: true
...
```

---

### 🔄 重置所有数据

```javascript
window.resetAllData()
```

这个命令会：
- 重置 Categories 为默认值
- 重置 Scopes 为默认值
- 重置 TodoCategories 为默认值

**⚠️ 注意**：这会覆盖你所有的自定义标签！

---

### 🏷️ 只重置 Categories

```javascript
window.resetCategories()
```

只重置 Categories（包括所有 activities），不影响 Scopes 和 TodoCategories。

---

### 🎯 只重置 Scopes

```javascript
window.resetScopes()
```

只重置 Scopes，不影响 Categories 和 TodoCategories。

---

### ✅ 只重置 TodoCategories

```javascript
window.resetTodoCategories()
```

只重置 TodoCategories，不影响 Categories 和 Scopes。

---

### 🧹 清除迁移标记

```javascript
window.clearMigrationFlags()
```

清除所有迁移标记，包括：
- `lumostime_uiicon_generated` - UI 图标生成标记
- `lumostime_data_repair_v1_done` - 数据修复标记
- `lumostime_dual_icon_migration_done` - 双图标迁移标记

**用途**：用于测试首次迁移逻辑。清除后，下次从默认主题切换到自定义主题时，会重新生成 uiIcon。

---

## 推荐使用流程

### 场景 1: 图标显示为问号 ❓

如果你从自定义主题切换回默认主题后，所有图标都显示为问号，说明 `icon` 字段被错误地替换了。

**解决步骤**：

1. **查看当前状态**
   ```javascript
   window.inspectData()
   ```
   检查 `icon` 字段是否是 `ui:xxx` 格式（错误）而不是 emoji（正确）

2. **重置数据**
   ```javascript
   window.resetAllData()
   ```

3. **清除迁移标记**
   ```javascript
   window.clearMigrationFlags()
   ```

4. **刷新页面**
   ```javascript
   location.reload()
   ```

5. **切换到自定义主题**
   - 打开投喂功能页面
   - 选择任意自定义主题（如 Purple）
   - 系统会自动生成 uiIcon 并刷新页面

6. **验证**
   - 在自定义主题下，图标应该显示为 UI 图标
   - 切换回默认主题，图标应该显示为 emoji（不是问号）

---

### 场景 2: 测试首次迁移逻辑

如果你想测试首次从默认主题切换到自定义主题的迁移逻辑：

1. **清除迁移标记**
   ```javascript
   window.clearMigrationFlags()
   ```

2. **刷新页面**
   ```javascript
   location.reload()
   ```

3. **切换到自定义主题**
   - 系统会检测到这是首次切换
   - 自动生成 uiIcon
   - 刷新页面

---

### 场景 3: 恢复默认标签

如果你想放弃所有自定义标签，恢复到默认状态：

1. **重置所有数据**
   ```javascript
   window.resetAllData()
   ```

2. **清除迁移标记**
   ```javascript
   window.clearMigrationFlags()
   ```

3. **刷新页面**
   ```javascript
   location.reload()
   ```

---

## 默认数据说明

### Categories (7个)

1. **生活** 🏠
   - 通勤 🚇
   - 饮食 🍱
   - 家务 🧹
   - 洗护 🚿
   - 购物 🛒
   - 杂务 🧾

2. **睡眠** 💤
   - 睡觉 🛌
   - 小憩 🔋

3. **学习** 🎓
   - 上课开会 🏫
   - 网课自学 💻
   - 书籍文献 📖
   - 代码编程 👾
   - 论文写作 ✒️

4. **与自己** 🪞
   - 日记复盘 🧠
   - 整理收集 🗂️
   - 工具开发 ⚙️
   - 运动健身 🏃

5. **与他人** 🤝
   - 兼职工作 💰
   - 社会织网 🕸️

6. **探索世界** 🧭
   - 设计 🎨
   - 音乐 🎵
   - 手工 🧶
   - 书法 🖌️

7. **爱欲再生产** 🎡
   - 闲聊瞎扯 🍵
   - 网上冲浪 🏄
   - 看文看剧 🍿
   - 玩玩游戏 🎮
   - 不可名状 🔮

### Scopes (4个)

1. **专业输入** 🚩
2. **博士课题** 🏛️
3. **博雅通识** 🦉
4. **AI玩具** ⚡️

### TodoCategories (4个)

1. **毕业论文** 🎓
2. **学习计划** 📚
3. **生活杂务** 🏠
4. **开发任务** ⚙️

---

## 注意事项

### ⚠️ 数据会被覆盖

使用重置命令会**完全覆盖**现有数据，包括：
- 你添加的自定义标签
- 你修改的标签名称和图标
- 你的标签顺序

**建议**：在重置前，先用 `window.inspectData()` 查看当前数据，确认是否需要备份。

### 💾 如何备份数据

如果你想保留当前数据，可以在重置前手动备份：

```javascript
// 备份 Categories
const categoriesBackup = localStorage.getItem('lumostime_categories');
console.log('Categories 备份:', categoriesBackup);

// 备份 Scopes
const scopesBackup = localStorage.getItem('lumostime_scopes');
console.log('Scopes 备份:', scopesBackup);

// 备份 TodoCategories
const todoCategoriesBackup = localStorage.getItem('lumostime_todoCategories');
console.log('TodoCategories 备份:', todoCategoriesBackup);
```

复制控制台输出的 JSON 字符串保存到文本文件中。

### 🔄 如何恢复备份

```javascript
// 恢复 Categories
localStorage.setItem('lumostime_categories', '你的备份JSON字符串');

// 恢复 Scopes
localStorage.setItem('lumostime_scopes', '你的备份JSON字符串');

// 恢复 TodoCategories
localStorage.setItem('lumostime_todoCategories', '你的备份JSON字符串');

// 刷新页面
location.reload();
```

---

## 常见问题

### Q: 重置后为什么还是显示旧数据？

A: 需要刷新页面才能看到效果。执行 `location.reload()` 或按 `F5`。

### Q: 重置后我的时间记录会丢失吗？

A: 不会！重置只影响标签定义（Categories、Scopes、TodoCategories），不会影响你的时间记录（Logs）和待办事项（Todos）。

### Q: 清除迁移标记有什么影响？

A: 清除后，下次从默认主题切换到自定义主题时，系统会重新生成 uiIcon。如果你的数据已经有 uiIcon，重新生成可能会覆盖你手动设置的 UI 图标。

### Q: 如何查看工具是否加载成功？

A: 打开控制台，应该能看到：
```
[ResetDataTool] ✅ 数据重置工具已加载
[ResetDataTool] 💡 输入 window.resetDataHelp() 查看帮助
```

如果没有看到，刷新页面重试。

---

## 技术细节

### 工具实现

- **文件位置**: `src/utils/resetDataTool.ts`
- **初始化位置**: `src/hooks/useAppInitialization.ts`
- **默认数据来源**: `src/constants.ts`

### 数据存储

所有数据都存储在 `localStorage` 中：
- `lumostime_categories` - Categories 数据
- `lumostime_scopes` - Scopes 数据
- `lumostime_todoCategories` - TodoCategories 数据

### 迁移标记

- `lumostime_uiicon_generated` - 标记是否已生成 uiIcon
- `lumostime_data_repair_v1_done` - 标记是否已完成数据修复
- `lumostime_dual_icon_migration_done` - 标记是否已完成双图标迁移

---

## 总结

这个工具提供了一个快速、安全的方式来重置标签数据。当遇到图标显示问题或想要恢复默认设置时，可以使用这个工具快速解决。

记住：
1. 使用前先 `inspectData()` 查看当前状态
2. 重置后需要刷新页面
3. 重要数据记得备份
4. 时间记录不会受影响

祝使用愉快！🎉
