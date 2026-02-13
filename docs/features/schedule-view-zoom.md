# 日程视图缩放功能

## 功能概述

在数据统计的日程视图（日视图和周视图）中，用户可以通过双指缩放手势来调整时间格子的高度，从而显示更多的备注内容。

## 使用方法

1. 进入 **统计** 页面
2. 切换到 **日程视图**（日视图或周视图）
3. 使用双指在屏幕上进行缩放手势：
   - **放大**：双指分开，增加时间格子高度
   - **缩小**：双指合拢，减小时间格子高度
4. 缩放时会在顶部显示当前缩放比例（如 "缩放: 150%"）

## 技术实现

### 缩放范围
- 最小缩放：50%（0.5x）
- 最大缩放：300%（3x）
- 默认缩放：100%（1x）

### 动态行数计算

备注文字的显示行数会根据格子的实际高度动态计算：

#### 日视图
```typescript
const titleHeight = 16;      // 标题高度（text-[11px] + leading-tight）
const paddingTotal = 8;       // 上下 padding（p-1 = 4px * 2）
const noteLineHeight = 14;    // 备注行高（text-[10px] + leading-snug）
const availableHeight = height - titleHeight - paddingTotal;
const maxLines = Math.max(0, Math.floor(availableHeight / noteLineHeight));
```

#### 周视图
```typescript
const titleHeight = height < 20 ? 12 : 14;  // 根据格子高度调整标题大小
const paddingTotal = 4;                      // 上下 padding（p-0.5 = 2px * 2）
const noteLineHeight = 12;                   // 备注行高
const availableHeight = height - titleHeight - paddingTotal;
const maxLines = Math.max(0, Math.floor(availableHeight / noteLineHeight));
```

### 关键特性

1. **自适应显示**：备注文字的显示行数完全根据格子高度动态计算，不是固定截断
2. **平滑缩放**：使用 CSS transform 和 touch 事件实现流畅的缩放体验
3. **视图独立**：切换视图时自动重置缩放比例
4. **滚动支持**：缩放后的内容区域支持垂直滚动

## 用户体验优化

- 缩放时显示实时缩放比例提示
- 时间标签固定在左侧，不随滚动移动
- 周视图的星期标题固定在顶部
- 缩放手势不会干扰正常的滚动操作

## 适用场景

- 查看详细的时间记录备注
- 分析长时间段的活动详情
- 在小屏幕设备上获得更好的可读性
- 打印或截图时调整显示密度
