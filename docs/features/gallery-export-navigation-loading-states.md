# 画廊导出 - 导航按钮加载状态

## 问题描述

用户反馈：切换时间段的左右导航按钮（前一个周期/后一个周期/今天）在点击后没有加载反馈，用户不知道系统是否正在处理。

## 现有加载状态

在此修复之前，只有以下按钮有加载状态：
- ✅ 排版样式按钮（杂志、极简、报纸、胶片）
- ✅ 时间段按钮（周、月、年）
- ✅ 方向按钮（竖屏、横屏）

**缺失的加载状态：**
- ❌ 前一个周期按钮（←）
- ❌ 今天按钮（今）
- ❌ 下一个周期按钮（→）

## 解决方案

### 1. 创建导航处理函数

将原来的内联逻辑提取为独立的处理函数，并在每个函数中设置 `loadingTarget`：

```typescript
const handlePrev = () => {
    setLoadingTarget('nav-prev');
    if (currentPeriod === 'week') setCurrentDate(d => subWeeks(d, 1));
    else if (currentPeriod === 'month') setCurrentDate(d => subMonths(d, 1));
    else setCurrentDate(d => subYears(d, 1));
};

const handleNext = () => {
    setLoadingTarget('nav-next');
    if (currentPeriod === 'week') setCurrentDate(d => addWeeks(d, 1));
    else if (currentPeriod === 'month') setCurrentDate(d => addMonths(d, 1));
    else setCurrentDate(d => addYears(d, 1));
};

const handleToday = () => {
    setLoadingTarget('nav-today');
    setCurrentDate(new Date());
};
```

### 2. 更新按钮 UI

为每个导航按钮添加条件渲染逻辑：

```typescript
<button
    onClick={handlePrev}
    disabled={isLoading}
    className="... min-w-[28px]"  // 添加最小宽度保持按钮大小
    title="上一周期"
>
    {isLoading && loadingTarget === 'nav-prev' ? (
        <div className="w-3 h-3 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
    ) : (
        '←'
    )}
</button>
```

### 3. Loading Target 标识

新增的 loading target 值：
- `'nav-prev'` - 前一个周期按钮
- `'nav-next'` - 下一个周期按钮  
- `'nav-today'` - 今天按钮

### 4. 按钮状态管理

- **加载中**: 显示旋转圆圈，禁用所有按钮
- **空闲**: 显示原始文本/图标，按钮可点击
- **最小宽度**: `min-w-[28px]` 确保按钮在显示 spinner 时不会改变大小

## 完整的 Loading Target 列表

现在所有可能触发加载的按钮都有对应的 loading target：

| 按钮类型 | Loading Target | 显示内容 |
|---------|---------------|---------|
| 排版样式 | `layout-magazine` | 杂志 → 圆圈 |
| 排版样式 | `layout-minimal` | 极简 → 圆圈 |
| 排版样式 | `layout-newspaper` | 报纸 → 圆圈 |
| 排版样式 | `layout-film` | 胶片 → 圆圈 |
| 时间段 | `period-week` | 周 → 圆圈 |
| 时间段 | `period-month` | 月 → 圆圈 |
| 时间段 | `period-year` | 年 → 圆圈 |
| 方向 | `orientation-portrait` | 竖屏图标 → 圆圈 |
| 方向 | `orientation-landscape` | 横屏图标 → 圆圈 |
| 导航 | `nav-prev` | ← → 圆圈 |
| 导航 | `nav-today` | 今 → 圆圈 |
| 导航 | `nav-next` | → → 圆圈 |

## 用户体验改进

### 修复前
1. 用户点击 "←" 按钮
2. 没有任何视觉反馈
3. 用户不确定是否点击成功
4. 可能重复点击

### 修复后
1. 用户点击 "←" 按钮
2. 按钮立即显示旋转圆圈
3. 所有按钮被禁用（防止重复点击）
4. 图片加载完成后，圆圈消失，按钮恢复
5. 用户清楚知道系统正在处理

## 技术细节

### 加载流程

1. **用户点击导航按钮**
   ```typescript
   handlePrev() // 或 handleNext() / handleToday()
   ```

2. **设置 loading target**
   ```typescript
   setLoadingTarget('nav-prev')
   ```

3. **更新日期**
   ```typescript
   setCurrentDate(d => subWeeks(d, 1))
   ```

4. **触发 useEffect**
   - `dateRange` 重新计算（useMemo）
   - 图片加载 useEffect 触发
   - `setIsLoading(true)` 自动设置

5. **图片加载完成**
   ```typescript
   setIsLoading(false)
   setLoadingTarget('')
   ```

### 状态同步

所有按钮共享相同的 `isLoading` 状态，确保：
- 加载时所有按钮都被禁用
- 只有被点击的按钮显示 spinner
- 加载完成后所有按钮恢复

## 修改文件

- `src/components/GalleryExportView.tsx`

## 测试建议

1. **周视图导航**
   - 点击 "←" 查看上一周
   - 点击 "→" 查看下一周
   - 点击 "今" 回到本周
   - 验证每次点击都显示 spinner

2. **月视图导航**
   - 点击 "←" 查看上个月
   - 点击 "→" 查看下个月
   - 验证加载状态正确显示

3. **年视图导航**
   - 点击 "←" 查看去年
   - 点击 "→" 查看明年
   - 年视图图片较多，加载时间更长，spinner 应该更明显

4. **快速点击测试**
   - 快速连续点击导航按钮
   - 验证按钮在加载时被禁用
   - 确认不会触发多次加载

5. **组合测试**
   - 切换时间段后立即点击导航
   - 切换布局后立即点击导航
   - 验证加载状态不冲突

## 状态

✅ 已完成 - 所有导航按钮现已支持加载状态反馈
