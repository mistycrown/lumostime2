# Constants Directory

This directory contains application-wide constants, configuration, and static data.

## Files

### Storage Management
- `storageKeys.ts`: localStorage 键名统一管理
  - 集中管理所有 localStorage 键名
  - 提供类型安全的工具函数（get/set/getJSON/setJSON/getBoolean/setBoolean）
  - 按功能分类：TIMEPAL_KEYS, THEME_KEYS, USER_DATA_KEYS, SETTINGS_KEYS, SYNC_KEYS, SPONSORSHIP_KEYS

### TimePal Configuration
- `timePalConfig.ts`: 时光小友配置
  - 小动物类型定义
  - 图片路径管理
  - Emoji 占位符
  - 形态等级配置

- `timePalQuotes.ts`: 时光小友名言库
  - 内置激励名言
  - 自定义名言支持

### Security
- `redemptionHashes.ts`: 兑换码哈希值（用于投喂功能验证）

### Legacy
- `constants.ts`: 旧版常量文件（可能需要迁移到其他文件）

## 使用示例

### storageKeys.ts
```typescript
import { TIMEPAL_KEYS, storage } from '../constants/storageKeys';

// 类型安全的存储操作
storage.set(TIMEPAL_KEYS.TYPE, 'cat');
const type = storage.get(TIMEPAL_KEYS.TYPE);

// JSON 存储
storage.setJSON(TIMEPAL_KEYS.CUSTOM_QUOTES, ['quote1', 'quote2']);
const quotes = storage.getJSON<string[]>(TIMEPAL_KEYS.CUSTOM_QUOTES, []);

// 布尔值存储
storage.setBoolean(TIMEPAL_KEYS.FILTER_ENABLED, true);
const enabled = storage.getBoolean(TIMEPAL_KEYS.FILTER_ENABLED, false);
```

### timePalConfig.ts
```typescript
import { getTimePalImagePath, getTimePalEmoji } from '../constants/timePalConfig';

const imagePath = getTimePalImagePath('cat', 3);
const emoji = getTimePalEmoji('cat');
```

## 设计原则
1. **集中管理**：避免硬编码字符串分散在各处
2. **类型安全**：使用 TypeScript 类型定义确保类型安全
3. **易于维护**：修改常量只需在一处进行
4. **清晰分类**：按功能模块分类组织

## Recently Added (2026-02)
- `storageKeys.ts`: 新增 - 统一管理所有 localStorage 键名，提供类型安全的工具函数

> ⚠️ 本文档最后更新：2026-02-09
