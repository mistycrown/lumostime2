# 原则卡片来源模式说明

## 概述
原则卡片现在支持三种来源模式，用户可以根据需求选择不同的方式来设置原则内容。

## 三种来源模式

### 1. 从原则库选择 (library)
- **描述**: 从原则库中选择一个已保存的原则
- **特点**: 
  - 标题、正面文字、反面文字自动从原则库获取
  - 用户无需手动输入内容
  - 如果原则库中的内容更新，卡片内容会自动同步
- **适用场景**: 使用预设或自定义的核心原则
- **数据字段**:
  ```typescript
  {
    type: 'principle',
    principleSource: 'library',
    principleId: 'preset-1', // 原则库中的原则ID
    title: '拥抱现实', // 从原则库自动获取
    frontText: '痛苦 + 反思 = 进步', // 从原则库自动获取
    backText: '接受现实，从中学习' // 从原则库自动获取
  }
  ```

### 2. 手动输入 (manual)
- **描述**: 用户自定义原则内容
- **特点**: 
  - 完全自定义标题、正面文字、反面文字
  - 不依赖原则库
  - 内容固定，不会随原则库变化
- **适用场景**: 临时性原则或特定场景的自定义内容
- **数据字段**:
  ```typescript
  {
    type: 'principle',
    principleSource: 'manual', // 或不设置（默认为manual）
    title: '自定义标题',
    frontText: '自定义正面文字',
    backText: '自定义反面文字'
  }
  ```

### 3. 随机选取 (random)
- **描述**: 每次从原则库中随机选择一个原则
- **特点**: 
  - 每次查看卡片时随机选择
  - 增加惊喜感和多样性
  - 标题、正面文字、反面文字自动从随机选中的原则获取
- **适用场景**: 希望每天看到不同原则的场景
- **数据字段**:
  ```typescript
  {
    type: 'principle',
    principleSource: 'random',
    title: '', // 运行时随机获取
    frontText: '', // 运行时随机获取
    backText: '' // 运行时随机获取
  }
  ```

## 数据结构

### SceneCardData 新增字段
```typescript
interface SceneCardData {
  // ... 其他字段
  
  // 原则来源（仅 principle 类型）
  principleSource?: 'library' | 'manual' | 'random';
  principleId?: string; // 原则库中的原则ID（当 principleSource 为 'library' 时使用）
}
```

## 实现逻辑

### 场景卡片渲染 (SceneCard.tsx)
```typescript
// 在 SceneCard 组件中处理原则内容
React.useEffect(() => {
  if (data.type === 'principle') {
    if (data.principleSource === 'random') {
      // 随机选取模式：从原则库中随机选择
      const stored = localStorage.getItem('lumostime_principles');
      if (stored) {
        const principles = JSON.parse(stored);
        if (principles.length > 0) {
          const randomIndex = Math.floor(Math.random() * principles.length);
          const randomPrinciple = principles[randomIndex];
          setDisplayData({
            ...data,
            title: randomPrinciple.title,
            frontText: randomPrinciple.frontText,
            backText: randomPrinciple.backText
          });
          return;
        }
      }
    } else if (data.principleSource === 'library' && data.principleId) {
      // 从原则库选择模式：根据 principleId 获取原则内容
      const stored = localStorage.getItem('lumostime_principles');
      if (stored) {
        const principles = JSON.parse(stored);
        const principle = principles.find(p => p.id === data.principleId);
        if (principle) {
          setDisplayData({
            ...data,
            title: principle.title,
            frontText: principle.frontText,
            backText: principle.backText
          });
          return;
        }
      }
    }
  }
  // 其他情况或手动输入模式，直接使用原始数据
  setDisplayData(data);
}, [data]);
```

### 场景设置编辑 (SceneSettingsView.tsx)
用户在编辑原则卡片时，可以选择三种模式：
1. 点击"从原则库中选择"，显示原则选择器
2. 点击"手动输入"，显示标题、正面文字、反面文字输入框
3. 点击"随机选取"，无需额外配置

## UI 交互

### 编辑界面
```
原则来源
┌─────────────────────────────────┐
│ ✓ 从原则库中选择                │
│   选择已保存的原则              │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   手动输入                      │
│   自定义原则内容                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   随机选取                      │
│   每次从原则库中随机选择        │
└─────────────────────────────────┘
```

### 字段显示规则
- **library 模式**: 
  - 显示原则选择器
  - 标题输入框禁用（自动填充）
  - 不显示正面/反面文字输入框
  
- **manual 模式**: 
  - 不显示原则选择器
  - 标题输入框可编辑
  - 显示正面/反面文字输入框
  
- **random 模式**: 
  - 不显示原则选择器
  - 标题输入框禁用（提示"标题将自动从原则库获取"）
  - 不显示正面/反面文字输入框

## 预设数据更新

### 更新内容
所有预设场景中的原则卡片已更新为使用 `library` 模式：

```typescript
// 早晨 - 拥抱现实
{
  id: '5',
  type: 'principle',
  principleSource: 'library',
  principleId: 'preset-1',
  title: '拥抱现实',
  frontText: '痛苦 + 反思 = 进步',
  backText: '接受现实，从中学习',
  action: { type: 'none' }
}

// 上午 - 极度求真
{
  id: '7',
  type: 'principle',
  principleSource: 'library',
  principleId: 'preset-2',
  title: '极度求真',
  frontText: '真理比正确更重要',
  backText: '保持开放心态，追求真相',
  action: { type: 'none' }
}

// 下午 - 五步流程
{
  id: '11',
  type: 'principle',
  principleSource: 'library',
  principleId: 'preset-3',
  title: '五步流程',
  frontText: '目标 → 问题 → 诊断 → 方案 → 执行',
  backText: '系统化解决问题',
  action: { type: 'none' }
}
```

## 兼容性处理

### 旧数据兼容
- 如果 `principleSource` 字段不存在，默认视为 `manual` 模式
- 旧的原则卡片数据会继续正常工作，显示已保存的内容

### 原则库为空的处理
- **library 模式**: 如果找不到对应的原则，显示卡片中保存的内容（降级为 manual 模式）
- **random 模式**: 如果原则库为空，显示卡片中保存的内容（降级为 manual 模式）

## 使用建议

### 推荐场景
1. **固定原则**: 使用 `library` 模式，便于统一管理和更新
2. **临时提醒**: 使用 `manual` 模式，快速创建特定内容
3. **每日惊喜**: 使用 `random` 模式，增加多样性

### 最佳实践
1. 先在原则库中创建常用原则
2. 在场景中使用 `library` 模式引用这些原则
3. 如果需要修改原则内容，在原则库中统一修改
4. 使用 `random` 模式为生活增添变化

## 注意事项
1. `library` 和 `random` 模式依赖原则库，确保原则库中有内容
2. 删除原则库中的原则不会影响已创建的卡片（会降级为 manual 模式）
3. 随机模式每次组件重新渲染时都会重新随机选择
4. 保存卡片时会正确保存 `principleSource` 和 `principleId` 字段，确保模式设置持久化

## 实现状态
✅ 已完成：
- 三种原则来源模式的 UI 选择
- SceneCard 组件的动态内容渲染（library、manual、random）
- 原则库选择器组件
- 预设数据更新
- 保存逻辑修复（handleSaveCard 正确保存 principleSource 和 principleId）
