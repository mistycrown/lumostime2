# Hooks Directory

This directory contains custom React hooks that encapsulate reusable logic and state management.

## Core Hooks

### Application Lifecycle
- `useAppDetection.ts`: 检测应用运行环境（Web/Native/Electron）
- `useAppInitialization.ts`: 应用初始化逻辑
- `useAppLifecycle.ts`: 应用生命周期管理
- `useHardwareBackButton.ts`: Android 硬件返回键处理

### Data Management
- `useLogManager.ts`: 日志数据管理（增删改查）
- `useTodoManager.ts`: 待办事项管理
- `useGoalManager.ts`: 目标管理
- `useReviewManager.ts`: 回顾数据管理
- `useSearchManager.ts`: 搜索功能管理

### UI & Interaction
- `useScrollTracker.ts`: 滚动位置追踪
- `useFloatingWindow.ts`: 浮动窗口控制
- `useDeepLink.ts`: Deep Link 处理

### Theme & Customization
- `useCustomPresets.ts`: 自定义主题预设管理
- `useTimePalImage.ts`: 时光小友图片加载（PNG/WebP 降级 + Emoji 占位符）
- `useIconMigration.ts`: 图标迁移逻辑

### Sync & Integration
- `useSyncManager.ts`: 数据同步管理（WebDAV）

## Recently Added (2026-02)
- `useTimePalImage.ts`: 新增 - 时光小友图片加载 Hook，支持 PNG → WebP → Emoji 降级策略

## Hook 命名规范
- 所有 Hook 必须以 `use` 开头
- 使用驼峰命名法（camelCase）
- 名称应清晰表达 Hook 的功能

## 使用示例

### useTimePalImage
```typescript
import { useTimePalImage } from '../hooks/useTimePalImage';

const MyComponent = () => {
    const { imageUrl, hasError, emoji, handleImageError } = useTimePalImage('cat', 3);
    
    return (
        <div>
            {hasError ? (
                <span>{emoji}</span>
            ) : (
                <img src={imageUrl} onError={handleImageError} alt="Time Pal" />
            )}
        </div>
    );
};
```

> ⚠️ 本文档最后更新：2026-02-09
