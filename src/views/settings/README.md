# Settings Views 重构说明

## 概述
将原本 3493 行的 `SettingsView.tsx` 拆分成多个独立的设置子页面组件，提高代码可维护性和可读性。

## 已创建的子组件

### 1. CloudSyncSettingsView.tsx
- **功能**: WebDAV 云同步配置
- **路径**: `src/views/settings/CloudSyncSettingsView.tsx`
- **主要功能**:
  - WebDAV 服务器连接配置
  - 上传/下载数据到云端
  - 断开连接和清理配置

### 2. AISettingsView.tsx
- **功能**: AI API 配置
- **路径**: `src/views/settings/AISettingsView.tsx`
- **主要功能**:
  - AI 服务商预设选择（Gemini, DeepSeek, 硅基流动, OpenAI）
  - API Key 配置
  - 连接测试

### 3. S3SyncSettingsView.tsx
- **功能**: S3 (腾讯云 COS) 云同步配置
- **路径**: `src/views/settings/S3SyncSettingsView.tsx`
- **主要功能**:
  - S3 存储桶配置
  - 上传/下载数据到 COS
  - 断开连接和清理配置

### 4. DataManagementView.tsx
- **功能**: 数据管理
- **路径**: `src/views/settings/DataManagementView.tsx`
- **主要功能**:
  - 数据备份与恢复（JSON 导入/导出）
  - Excel 导出
  - 图片管理（检查、清理未引用图片）
  - 云端备份清理
  - 重置和清空数据

## 待创建的子组件

### 5. PreferencesSettingsView.tsx
- 偏好设置（周开始日、回顾时间、默认页面等）

### 6. NarrativeSettingsView.tsx
- AI 叙事设定（个人信息、自定义叙事模板）

### 7. NFCSettingsView.tsx
- NFC 标签配置

### 8. UserGuideView.tsx
- 用户指南（Markdown 渲染）

## 使用方式

在主 `SettingsView.tsx` 中：

```tsx
import { CloudSyncSettingsView } from './settings/CloudSyncSettingsView';
import { AISettingsView } from './settings/AISettingsView';
import { S3SyncSettingsView } from './settings/S3SyncSettingsView';
import { DataManagementView } from './settings/DataManagementView';

// 在组件中根据 activeSubmenu 渲染对应的子组件
if (activeSubmenu === 'cloud') {
    return <CloudSyncSettingsView ... />;
}

if (activeSubmenu === 'ai') {
    return <AISettingsView ... />;
}

// ... 其他子页面
```

## 优势

1. **代码组织**: 每个设置页面独立管理，职责清晰
2. **可维护性**: 修改某个设置页面不影响其他页面
3. **可测试性**: 每个组件可以独立测试
4. **性能**: 按需加载，减少初始包大小
5. **协作**: 多人可以同时开发不同的设置页面

## 注意事项

- 所有子组件都接收 `onBack` 回调用于返回主设置页
- 共享的状态和方法通过 props 传递
- 保持统一的 UI 风格和交互模式
