# 原则库数据同步集成说明

## 概述
原则库数据已完全集成到应用的备份和同步系统中，确保用户的原则数据可以在设备间同步和导出/导入。

## 存储位置
- **localStorage 键名**: `lumostime_principles`
- **数据格式**: JSON 数组，包含 Principle 对象

## 集成的文件和修改

### 1. 数据导出 (Export)

#### `src/App.tsx` - `handleExportData`
```typescript
const handleExportData = () => {
    // 从 localStorage 读取原则库
    const principlesStr = localStorage.getItem('lumostime_principles');
    const principles = principlesStr ? JSON.parse(principlesStr) : [];
    
    const data = {
        // ... 其他数据
        principles, // 添加原则库
        version: '1.0.0',
        timestamp: Date.now()
    };
    // ... 导出逻辑
};
```

### 2. 数据导入/恢复 (Import/Restore)

#### `src/hooks/useSyncManager.ts` - `handleSyncDataUpdate`
```typescript
const handleSyncDataUpdate = async (data: any) => {
    // ... 其他数据恢复
    
    // 恢复原则库到 localStorage
    if (data.principles) {
        localStorage.setItem('lumostime_principles', JSON.stringify(data.principles));
        // 触发事件通知原则库页面更新
        window.dispatchEvent(new Event('principleLibraryChanged'));
    }
    
    // ... 其他逻辑
};
```

### 3. 云端同步 (Cloud Sync)

#### `src/views/SettingsView.tsx` - `getFullLocalData`
```typescript
const getFullLocalData = () => {
    // 从 localStorage 读取原则库
    const principlesStr = localStorage.getItem('lumostime_principles');
    const principles = principlesStr ? JSON.parse(principlesStr) : [];
    
    const localData = {
        // ... 其他数据
        principles, // 添加原则库
        version: '1.0.0',
        timestamp: Date.now()
    };
    return localData;
};
```

#### `src/hooks/useSyncManager.ts` - `getFullLocalData`
```typescript
const getFullLocalData = () => {
    // 从 localStorage 读取原则库
    const principlesStr = localStorage.getItem('lumostime_principles');
    const principles = principlesStr ? JSON.parse(principlesStr) : [];
    
    const localData = {
        // ... 其他数据
        principles, // 添加原则库
        version: '1.0.0',
        timestamp: localDataTimestamp
    };
    return localData;
};
```

## 数据流程

### 导出流程
1. 用户点击"导出数据"
2. `handleExportData` 从 localStorage 读取 `lumostime_principles`
3. 将原则库数据包含在导出的 JSON 文件中
4. 生成 `lumostime_backup_YYYY-MM-DD.json` 文件

### 导入流程
1. 用户选择导入文件
2. `handleImportData` 读取 JSON 文件
3. 调用 `handleSyncDataUpdate` 恢复数据
4. 原则库数据写入 localStorage
5. 触发 `principleLibraryChanged` 事件更新 UI

### 云端同步流程

#### 上传 (Upload)
1. 用户触发云端同步（WebDAV 或 S3）
2. `getFullLocalData` 收集所有本地数据，包括原则库
3. 数据上传到云端 `lumostime_backup.json`
4. 更新本地时间戳

#### 下载 (Download)
1. 用户触发从云端下载
2. 下载 `lumostime_backup.json`
3. 调用 `handleSyncDataUpdate` 恢复数据
4. 原则库数据写入 localStorage
5. 触发 `principleLibraryChanged` 事件
6. 更新本地时间戳

## 事件通知
当原则库数据发生变化时，会触发以下事件：
- **事件名称**: `principleLibraryChanged`
- **触发时机**: 
  - 用户在原则库页面添加/编辑/删除原则
  - 从云端或文件恢复数据
  - 重置原则库为默认状态
- **监听位置**: 
  - `src/views/SceneSettingsView.tsx` - 原则选择器组件

## 数据结构

### Principle 接口
```typescript
interface Principle {
    id: string;          // 唯一标识符
    title: string;       // 原则标题
    frontText: string;   // 正面文字
    backText: string;    // 反面文字
}
```

### 备份 JSON 结构
```json
{
    "logs": [...],
    "todos": [...],
    "categories": [...],
    // ... 其他数据
    "sceneTimeSlots": [...],
    "principles": [
        {
            "id": "preset-1",
            "title": "拥抱现实",
            "frontText": "痛苦 + 反思 = 进步",
            "backText": "接受现实，从中学习"
        }
    ],
    "version": "1.0.0",
    "timestamp": 1234567890
}
```

## 兼容性处理

### 旧版本数据兼容
如果导入的数据中没有 `principles` 字段：
- 不会覆盖现有的原则库数据
- 保持用户当前的原则库设置

### 首次使用
如果 localStorage 中没有 `lumostime_principles`：
- 原则库页面会自动使用默认预设（定义在 `src/constants/principlePresets.ts`）
- 包含3个预设原则：拥抱现实、极度求真、五步流程

## 测试建议

### 手动测试步骤
1. **导出测试**
   - 在原则库中添加自定义原则
   - 导出数据
   - 检查导出的 JSON 文件是否包含 `principles` 字段

2. **导入测试**
   - 修改导出的 JSON 文件中的原则数据
   - 导入文件
   - 检查原则库页面是否显示导入的数据

3. **云端同步测试**
   - 配置 WebDAV 或 S3
   - 在设备 A 添加原则并同步
   - 在设备 B 下载同步数据
   - 检查设备 B 的原则库是否包含设备 A 的数据

4. **重置测试**
   - 添加自定义原则
   - 点击重置按钮
   - 检查是否恢复为默认的3个预设原则

## 注意事项
1. 原则库数据存储在 localStorage 中，不在 React Context 中
2. 数据变化时需要手动触发 `principleLibraryChanged` 事件
3. 场景设置页面的原则选择器会监听此事件并自动更新
4. 导入/恢复数据时会触发事件，确保 UI 同步更新
