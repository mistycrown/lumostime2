# 主题方案功能说明

## 功能概述
主题方案功能允许用户一键应用完整的主题配置，包括：
- UI 图标主题
- 配色方案
- 背景图片
- 导航栏装饰
- 时间小友

## 可用方案

### 1. 默认方案
- **描述**: 系统默认配置
- **图标**: ⚙️
- **配置**: 
  - UI主题: default
  - 配色: default
  - 背景: default
  - 导航: default
  - 时间小友: default

### 2. 紫色梦境
- **描述**: 优雅的紫色主题
- **图标**: 💜
- **配置**:
  - UI主题: purple
  - 配色: morandi-purple (莫兰迪紫)
  - 背景: purple
  - 导航: purple
  - 时间小友: girl3

### 3. 粉猫物语
- **描述**: 可爱的粉色主题
- **图标**: 🐱
- **配置**:
  - UI主题: cat
  - 配色: morandi-pink (莫兰迪粉)
  - 背景: pinkblue
  - 导航: cat2
  - 时间小友: cat

### 4. 小王子飞天
- **描述**: 梦幻的小王子主题
- **图标**: 🤴
- **配置**:
  - UI主题: prince
  - 配色: dunhuang-feitian (飞天)
  - 背景: pinkblue
  - 导航: little_prince
  - 时间小友: prince

### 5. 森林禅意
- **描述**: 清新自然的绿色主题
- **图标**: 🌿
- **配置**:
  - UI主题: forest
  - 配色: bamboo-green (竹青)
  - 背景: green
  - 导航: plant
  - 时间小友: rabbit

### 6. 海洋蓝调
- **描述**: 宁静的青色主题
- **图标**: 🌊
- **配置**:
  - UI主题: water
  - 配色: morandi-cyan (莫兰迪青)
  - 背景: grenn3
  - 导航: ya
  - 时间小友: flower

### 7. 焦糖拿铁
- **描述**: 温暖的焦糖主题
- **图标**: ☕
- **配置**:
  - UI主题: color
  - 配色: latte-caramel (焦糖拿铁)
  - 背景: greenpink
  - 导航: grass
  - 时间小友: rabbit2

### 8. 植物绿意
- **描述**: 清新的莫兰迪绿
- **图标**: 🌱
- **配置**:
  - UI主题: plant
  - 配色: morandi-green (莫兰迪绿)
  - 背景: grenn3
  - 导航: plant2
  - 时间小友: flower

## 使用方法

1. 进入"投喂功能"页面
2. 选择"方案"标签页
3. 点击任意方案卡片即可一键应用
4. 应用图标需要在"Icon"标签页单独设置（仅 Android）

## 技术实现

### 文件修改
1. **src/views/SponsorshipView.tsx**
   - 添加 `THEME_PRESETS` 配置数组
   - 实现 `applyThemePreset()` 函数
   - 添加 `currentPresetId` 状态管理
   - 更新方案卡片的选中状态和点击事件

2. **src/services/backgroundService.ts**
   - 新增背景: black, pink, pinkblue, greenpink

3. **src/services/navigationDecorationService.ts**
   - 新增导航装饰: ghost, knit
   - 统一所有装饰格式，按字母顺序排列

4. **src/constants/timePalConfig.ts**
   - 新增时间小友类型: flower

### 应用逻辑
```typescript
const applyThemePreset = async (preset: ThemePreset) => {
    // 1. 设置 UI 主题
    setUiIconTheme(preset.uiTheme);
    
    // 2. 设置配色方案
    setColorScheme(preset.colorScheme);
    
    // 3. 设置背景
    backgroundService.setCurrentBackground(preset.background);
    
    // 4. 设置导航装饰
    navigationDecorationService.setCurrentDecoration(preset.navigation);
    
    // 5. 设置时间小友
    localStorage.setItem('lumostime_timepal_type', preset.timePal);
    window.dispatchEvent(new Event('timepal-type-changed'));
    
    // 6. 保存当前方案
    localStorage.setItem('lumostime_current_preset', preset.id);
    setCurrentPresetId(preset.id);
};
```

## 注意事项

1. 应用图标切换需要在 Android 平台上单独操作
2. 方案应用后会立即生效，无需刷新页面
3. 当前应用的方案会显示选中状态（带勾选标记）
4. 方案配置保存在 localStorage 中，重启应用后保持
