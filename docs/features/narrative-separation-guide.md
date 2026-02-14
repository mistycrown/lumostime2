# 叙事分离功能实现指南

## 概述

将 Review 中的叙事功能分为两个独立字段：
1. **手动叙事（summary）** - 一句话总结，用于多处展示
2. **AI 叙事（narrative）** - AI 生成的完整叙事内容

## 数据结构变更

### 类型定义更新

在 `src/types.ts` 中，三个 Review 接口都添加了新字段：

```typescript
export interface DailyReview {
  // ... 其他字段
  summary?: string;              // 新增：手动叙事
  summaryUpdatedAt?: number;     // 新增：手动叙事更新时间
  narrative?: string;            // 保留：AI 叙事
  narrativeUpdatedAt?: number;   // 保留：AI 叙事更新时间
  isEdited?: boolean;            // 保留：标记是否手动编辑过
}

export interface WeeklyReview {
  // ... 同上结构
  summary?: string;
  summaryUpdatedAt?: number;
  narrative?: string;
  narrativeUpdatedAt?: number;
  isEdited?: boolean;
}

export interface MonthlyReview {
  // ... 同上结构
  summary?: string;
  summaryUpdatedAt?: number;
  narrative?: string;
  narrativeUpdatedAt?: number;
  isEdited?: boolean;
}
```

## UI 组件更新

### ReviewNarrativeTab 组件

组件现在分为两个独立区域：

```typescript
interface ReviewNarrativeTabProps {
  // 手动叙事相关
  summary: string;
  isEditingSummary: boolean;
  editedSummary: string;
  onEditedSummaryChange: (value: string) => void;
  onStartEditingSummary: () => void;
  onSaveSummary: () => void;
  onDeleteSummary: () => void;
  
  // AI 叙事相关
  narrative: string;
  isEditingNarrative: boolean;
  editedNarrative: string;
  onEditedNarrativeChange: (value: string) => void;
  onStartEditingNarrative: () => void;
  onSaveNarrative: () => void;
  onGenerateNarrative: () => void;
  onDeleteNarrative: () => void;
  
  // 共享状态
  isGenerating: boolean;
}
```

### useReviewState Hook

Hook 现在管理两个独立的编辑状态：

```typescript
const {
  // 手动叙事
  summary,
  setSummary,
  isEditingSummary,
  setIsEditingSummary,
  editedSummary,
  setEditedSummary,
  isDeleteSummaryConfirmOpen,
  setIsDeleteSummaryConfirmOpen,
  
  // AI 叙事
  narrative,
  setNarrative,
  isEditingNarrative,
  setIsEditingNarrative,
  editedNarrative,
  setEditedNarrative,
  isDeleteNarrativeConfirmOpen,
  setIsDeleteNarrativeConfirmOpen,
  
  // 共享状态
  isGenerating,
  setIsGenerating,
  isStyleModalOpen,
  setIsStyleModalOpen,
  
  // ... 其他状态
} = useReviewState({
  initialAnswers: review.answers || [],
  initialSummary: review.summary || '',
  initialNarrative: review.narrative || '',
  storageKey: 'dailyReview_guideMode'
});
```

## 在 View 中的实现示例

### DailyReviewView 更新要点

```typescript
// 1. 初始化 hook 时传入 summary
const reviewState = useReviewState({
  initialAnswers: review.answers || [],
  initialSummary: review.summary || '',      // 新增
  initialNarrative: review.narrative || '',
  storageKey: 'dailyReview_guideMode'
});

// 2. 同步 review 变化时更新 summary
useEffect(() => {
  setSummary(review.summary || '');           // 新增
  setNarrative(review.narrative || '');
  // ...
}, [review]);

// 3. 实现手动叙事的保存和删除
const handleSaveSummary = () => {
  setSummary(editedSummary);
  setIsEditingSummary(false);
  
  const updatedReview = {
    ...review,
    summary: editedSummary,
    summaryUpdatedAt: Date.now(),
    updatedAt: Date.now()
  };
  onUpdateReview(updatedReview);
};

const handleDeleteSummary = () => {
  setIsDeleteSummaryConfirmOpen(true);
};

const confirmDeleteSummary = () => {
  const updatedReview = {
    ...review,
    summary: '',
    summaryUpdatedAt: undefined,
    updatedAt: Date.now()
  };
  onUpdateReview(updatedReview);
  setSummary('');
  setEditedSummary('');
  setIsDeleteSummaryConfirmOpen(false);
  addToast('success', '手动叙事已删除');
};

// 4. AI 叙事保持原有逻辑，但只操作 narrative 字段
const handleSaveNarrative = () => {
  setNarrative(editedNarrative);
  setIsEditingNarrative(false);
  
  const updatedReview = {
    ...review,
    narrative: editedNarrative,
    narrativeUpdatedAt: Date.now(),
    isEdited: true,
    updatedAt: Date.now()
  };
  onUpdateReview(updatedReview);
};

// 5. 传递给 ReviewNarrativeTab 组件
<ReviewNarrativeTab
  summary={summary}
  narrative={narrative}
  isEditingSummary={isEditingSummary}
  isEditingNarrative={isEditingNarrative}
  isGenerating={isGenerating}
  editedSummary={editedSummary}
  editedNarrative={editedNarrative}
  onEditedSummaryChange={setEditedSummary}
  onEditedNarrativeChange={setEditedNarrative}
  onStartEditingSummary={() => {
    setEditedSummary(summary);
    setIsEditingSummary(true);
  }}
  onStartEditingNarrative={() => {
    setEditedNarrative(narrative);
    setIsEditingNarrative(true);
  }}
  onSaveSummary={handleSaveSummary}
  onSaveNarrative={handleSaveNarrative}
  onGenerateNarrative={handleGenerateNarrative}
  onDeleteSummary={handleDeleteSummary}
  onDeleteNarrative={handleDeleteNarrative}
/>
```

## 数据迁移

对于已有数据，不需要特殊迁移：
- 旧的 `narrative` 字段保持不变，继续作为 AI 叙事使用
- 新的 `summary` 字段为可选，初始为空
- 用户可以逐步添加手动叙事

## 使用场景

### 手动叙事（summary）
- 在日历视图中显示每日的一句话总结
- 在时间轴上作为日期标记的副标题
- 在统计报表中作为简短描述
- 在搜索结果中作为预览文本

### AI 叙事（narrative）
- 完整的回顾内容，支持 Markdown 格式
- 用于深度反思和记录
- 可以包含多段落、列表、引用等丰富格式

## 注意事项

1. **独立性**：两个字段完全独立，互不影响
2. **可选性**：两个字段都是可选的，用户可以只填写其中一个
3. **时间戳**：分别记录更新时间，便于追踪
4. **UI 分离**：在叙事 Tab 中明确区分两个区域，避免混淆
5. **保存逻辑**：分别保存，互不干扰

## 后续优化建议

1. 在其他视图中使用 `summary` 字段展示简短总结
2. 考虑为 `summary` 添加字数限制（如 50-100 字）
3. 可以添加从 AI 叙事中提取摘要作为 summary 的功能
4. 在搜索功能中同时搜索 summary 和 narrative
