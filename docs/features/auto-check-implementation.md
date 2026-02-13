# 自动日课功能实现指南

## 概述

自动日课功能允许用户设定规则，系统根据当天的活动记录自动判断日课完成状态。

## 数据结构

### CheckTemplateItem 扩展
```typescript
interface CheckTemplateItem {
  id: string;
  content: string;
  icon?: string;
  uiIcon?: string;
  type?: 'manual' | 'auto'; // 新增：类型
  autoConfig?: AutoCheckConfig; // 新增：自动配置
}
```

### AutoCheckConfig
```typescript
interface AutoCheckConfig {
  filterExpression: string; // 筛选表达式（如 "#学习 %专业输入"）
  comparisonType: 'duration' | 'startTime' | 'endTime'; // 判断类型
  operator: '>=' | '<=' | '>' | '<' | '='; // 比较运算符
  targetValue: number; // 目标值（分钟数）
}
```

## 核心功能

### 1. 自动判断逻辑 (autoCheckUtils.ts)

- `evaluateAutoCheck()`: 判断单个自动日课是否完成
- `updateAutoCheckItems()`: 批量更新自动日课状态
- `calculateLogStats()`: 计算匹配记录的统计信息

### 2. UI 组件

#### AutoCheckItemEditor
独立的自动日课配置编辑器，支持：
- 设置筛选条件
- 选择判断类型（时长/开始时间/结束时间）
- 设置比较运算符
- 输入目标值
- 实时预览规则

### 3. 集成到 CheckTemplateManageView

需要在模板编辑界面添加：

1. 为每个日课项添加"类型"选择（手动/自动）
2. 当选择"自动"时，显示配置按钮
3. 点击配置按钮打开 AutoCheckItemEditor
4. 保存配置后更新 CheckTemplateItem

示例代码片段：
```tsx
// 在日课项列表中添加类型切换
<select
  value={item.type || 'manual'}
  onChange={(e) => {
    const newType = e.target.value as 'manual' | 'auto';
    if (newType === 'auto') {
      // 打开自动配置编辑器
      setEditingAutoItem(item);
    } else {
      // 清除自动配置
      handleUpdateItem(idx, { ...item, type: 'manual', autoConfig: undefined });
    }
  }}
>
  <option value="manual">手动</option>
  <option value="auto">自动</option>
</select>

// 显示配置按钮（仅自动类型）
{item.type === 'auto' && (
  <button onClick={() => setEditingAutoItem(item)}>
    <Zap size={14} /> 配置规则
  </button>
)}

// 渲染编辑器
{editingAutoItem && (
  <AutoCheckItemEditor
    item={editingAutoItem}
    onUpdate={(updated) => {
      // 更新模板项
      handleUpdateItem(itemIndex, updated);
      setEditingAutoItem(null);
    }}
    onCancel={() => setEditingAutoItem(null)}
  />
)}
```

### 4. DailyReviewView 集成

已完成的功能：
- ✅ 自动更新日课状态（切换到日课标签时）
- ✅ 防止手动切换自动类型日课
- ✅ 从模板导入时支持自动类型
- ✅ 视觉标识（蓝色复选框 + "自动"标签）

## 使用示例

### 示例 1：学习时长达标
- 筛选条件：`#学习 %专业输入`
- 判断类型：总时长
- 运算符：>=
- 目标值：240（4小时）

### 示例 2：早起
- 筛选条件：`#起床`
- 判断类型：最早开始时间
- 运算符：<=
- 目标值：480（8:00）

### 示例 3：控制手机使用
- 筛选条件：`#手机 %娱乐`
- 判断类型：总时长
- 运算符：<=
- 目标值：120（2小时）

## 数据统计

自动日课的完成状态会被保存为布尔值，因此可以：
- 纳入日课统计（CheckView）
- 参与完成率计算
- 生成 AI 叙事时包含在内

## 注意事项

1. 自动日课每次打开日课页面时更新一次，不实时更新
2. 自动日课不能手动切换完成状态
3. 筛选条件使用与自定义筛选器相同的语法
4. 时间值以分钟为单位存储（从 0:00 开始）
5. 自动日课在模板中可以与手动日课混合使用

## 后续优化建议

1. 添加更多判断类型（如最晚开始时间、最晚结束时间）
2. 支持复合条件（AND/OR 逻辑）
3. 添加日课完成历史趋势图
4. 支持自定义提醒（未达标时提示）
5. 导出自动日课规则模板
