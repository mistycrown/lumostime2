# 时光小友设置页面

## 功能说明

时光小友设置页面允许用户自定义时光小友的显示和统计行为。

## 主要功能

### 1. 选择小动物
- 🐱 猫咪
- 🐶 小狗
- 🐰 兔子

用户可以选择自己喜欢的小动物类型，选择会实时同步到脉络页面。

### 2. 统计时长设置
用户可以选择哪些标签（Activity）计入专注时长统计：

- **关闭筛选**：统计所有启用了"专注度追踪"的活动
- **开启筛选**：只统计选中的标签

#### 标签选择流程
1. 点击"已开启"按钮启用筛选
2. 选择一个分类（Category）
3. 在展开的活动列表中选择具体的标签
4. 已选择的标签会显示在底部
5. 点击"Clear"可以清空所有选择

## 状态同步

### 小动物类型同步
- 在脉络页面点击小动物图片切换类型
- 在设置页面选择小动物类型
- 两处的选择会实时同步

实现方式：
- 使用 `localStorage` 存储选择
- 使用自定义事件 `timepal-type-changed` 通知更新
- 使用 `storage` 事件监听跨标签页更新

### 筛选配置同步
筛选配置保存在 localStorage 中：
- `lumostime_timepal_filter_enabled`: 是否启用筛选
- `lumostime_timepal_filter_activities`: 选中的标签 ID 列表

## 显示规则

时光小友卡片只在以下情况显示：
1. **必须是今天**：只在当前日期显示
2. **有专注时长**：当天有符合条件的专注记录

## 集成方式

在赞赏功能页面中添加入口：

```tsx
import { TimePalSettingsView } from '../views/TimePalSettingsView';

// 在赞赏功能页面中
<button onClick={() => navigate('timepal-settings')}>
    <span className="text-2xl">🐾</span>
    <h3>时光小友</h3>
</button>

// 路由处理
{currentView === 'timepal-settings' && (
    <TimePalSettingsView
        onBack={() => setCurrentView('sponsor')}
        categories={categories}
    />
)}
```

## 数据存储

所有配置都存储在 localStorage 中：

| Key | 类型 | 说明 |
|-----|------|------|
| `lumostime_timepal_type` | string | 小动物类型 (cat/dog/rabbit) |
| `lumostime_timepal_filter_enabled` | string | 是否启用筛选 (true/false) |
| `lumostime_timepal_filter_activities` | string | 选中的标签 ID JSON 数组 |

## 未来优化

1. 添加更多小动物类型
2. 支持自定义形态等级阈值
3. 添加小动物互动动画
4. 支持小动物皮肤/装扮系统
