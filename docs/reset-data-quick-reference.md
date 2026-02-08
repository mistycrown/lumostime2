# 数据重置工具 - 快速参考

## 🚀 快速开始

打开浏览器控制台（F12），输入以下命令：

```javascript
// 查看帮助
window.resetDataHelp()

// 查看当前状态
window.inspectData()

// 重置所有数据
window.resetAllData()

// 清除迁移标记
window.clearMigrationFlags()

// 刷新页面
location.reload()
```

---

## 📋 所有命令

| 命令 | 说明 |
|------|------|
| `window.resetDataHelp()` | 显示帮助信息 |
| `window.inspectData()` | 查看当前数据状态 |
| `window.resetAllData()` | 重置所有数据（categories + scopes + todoCategories） |
| `window.resetCategories()` | 只重置 categories |
| `window.resetScopes()` | 只重置 scopes |
| `window.resetTodoCategories()` | 只重置 todoCategories |
| `window.clearMigrationFlags()` | 清除迁移标记 |

---

## 🔧 常见问题修复

### 图标显示为问号 ❓

```javascript
// 1. 重置数据
window.resetAllData()

// 2. 清除迁移标记
window.clearMigrationFlags()

// 3. 刷新页面
location.reload()

// 4. 切换到自定义主题（会自动生成 uiIcon）
```

### 测试首次迁移

```javascript
// 1. 清除迁移标记
window.clearMigrationFlags()

// 2. 刷新页面
location.reload()

// 3. 切换到自定义主题
```

### 恢复默认设置

```javascript
// 1. 重置所有数据
window.resetAllData()

// 2. 清除迁移标记
window.clearMigrationFlags()

// 3. 刷新页面
location.reload()
```

---

## 💾 数据备份

### 备份

```javascript
// 备份所有数据
const backup = {
  categories: localStorage.getItem('lumostime_categories'),
  scopes: localStorage.getItem('lumostime_scopes'),
  todoCategories: localStorage.getItem('lumostime_todoCategories')
};
console.log(JSON.stringify(backup));
// 复制输出的 JSON 保存到文件
```

### 恢复

```javascript
// 恢复数据（替换为你的备份 JSON）
const backup = {"categories":"...","scopes":"...","todoCategories":"..."};
localStorage.setItem('lumostime_categories', backup.categories);
localStorage.setItem('lumostime_scopes', backup.scopes);
localStorage.setItem('lumostime_todoCategories', backup.todoCategories);
location.reload();
```

---

## ⚠️ 注意事项

- ✅ 重置后需要刷新页面
- ✅ 时间记录（Logs）不会受影响
- ✅ 待办事项（Todos）不会受影响
- ❌ 自定义标签会被覆盖
- ❌ 标签顺序会被重置

---

## 📚 详细文档

查看完整文档：`docs/reset-data-tool-guide.md`
