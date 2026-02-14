# DailyReviewView 迁移示例

## 需要修改的部分

### 1. useReviewState Hook 调用

**修改前：**
```typescript
const {
    answers,
    setAnswers,
    narrative,
    setNarrative,
    isEditing,
    setIsEditing,
    isGenerating,
    setIsGenerating,
    editedNarrative,
    setEditedNarrative,
    isStyleModalOpen,
    setIsStyleModalOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    isReadingMode,
    toggleReadingMode
} = useReviewState({
    initialAnswers: review.answers || [],
    initialNarrative: review.narrative || '',
    storageKey: 'dailyReview_guideMode'
});
```

**修改后：**
```typescript
const {
    answers,
    setAnswers,
    summary,
    setSummary,
    narrative,
    setNarrative,
    isEditingSummary,
    setIsEditingSummary,
    isEditingNarrative,
    setIsEditingNarrative,
    isGenerating,
    setIsGenerating,
    editedSummary,
    setEditedSummary,
    editedNarrative,
    setEditedNarrative,
    isStyleModalOpen,
    setIsStyleModalOpen,
    isDeleteSummaryConfirmOpen,
    setIsDeleteSummaryConfirmOpen,
    isDeleteNarrativeConfirmOpen,
    setIsDeleteNarrativeConfirmOpen,
    isReadingMode,
    toggleReadingMode
} = useReviewState({
    initialAnswers: review.answers || [],
    initialSummary: review.summary || '',
    initialNarrative: review.narrative || '',
    storageKey: 'dailyReview_guideMode'
});
```

### 2. useEffect 同步

**修改前：**
```typescript
useEffect(() => {
    setCheckItems(migratedItems);
    setAnswers(review.answers || []);
    setNarrative(review.narrative || '');
}, [review]);
```

**修改后：**
```typescript
useEffect(() => {
    setCheckItems(migratedItems);
    setAnswers(review.answers || []);
    setSummary(review.summary || '');
    setNarrative(review.narrative || '');
}, [review]);
```

### 3. 添加手动叙事处理函数

```typescript
// 保存手动叙事
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

// 删除手动叙事
const handleDeleteSummary = () => {
    setIsDeleteSummaryConfirmOpen(true);
};

const confirmDeleteSummary = async () => {
    try {
        const updatedReview = {
            ...review,
            summary: '',
            summaryUpdatedAt: undefined,
            updatedAt: Date.now()
        };
        await onUpdateReview(updatedReview);
        setSummary('');
        setEditedSummary('');
        setIsEditingSummary(false);
        addToast('success', '手动叙事已删除');
    } catch (error) {
        console.error('Failed to delete summary', error);
        addToast('error', '删除失败');
    } finally {
        setIsDeleteSummaryConfirmOpen(false);
    }
};
```

### 4. 修改 AI 叙事处理函数

**修改前：**
```typescript
const handleSaveNarrative = () => {
    setNarrative(editedNarrative);
    setIsEditing(false);

    const updatedReview = {
        ...review,
        narrative: editedNarrative,
        narrativeUpdatedAt: Date.now(),
        isEdited: true,
        updatedAt: Date.now()
    };
    onUpdateReview(updatedReview);
};

const handleDeleteNarrative = () => {
    setIsDeleteConfirmOpen(true);
};

const confirmDeleteNarrative = async () => {
    try {
        const updatedReview = {
            ...review,
            narrative: '',
            narrativeUpdatedAt: undefined,
            updatedAt: Date.now()
        };
        await onUpdateReview(updatedReview);
        setNarrative('');
        setEditedNarrative('');
        setIsEditing(false);
        addToast('success', '叙事已删除');
    } catch (error) {
        console.error('Failed to delete narrative', error);
        addToast('error', '删除失败');
    } finally {
        setIsDeleteConfirmOpen(false);
    }
};
```

**修改后：**
```typescript
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

const handleDeleteNarrative = () => {
    setIsDeleteNarrativeConfirmOpen(true);
};

const confirmDeleteNarrative = async () => {
    try {
        const updatedReview = {
            ...review,
            narrative: '',
            narrativeUpdatedAt: undefined,
            updatedAt: Date.now()
        };
        await onUpdateReview(updatedReview);
        setNarrative('');
        setEditedNarrative('');
        setIsEditingNarrative(false);
        addToast('success', 'AI 叙事已删除');
    } catch (error) {
        console.error('Failed to delete narrative', error);
        addToast('error', '删除失败');
    } finally {
        setIsDeleteNarrativeConfirmOpen(false);
    }
};
```

### 5. 更新 ReviewNarrativeTab 组件调用

**修改前：**
```typescript
{activeTab === 'narrative' && (
    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 animate-in fade-in duration-300 pb-40 px-7">
        <ReviewNarrativeTab
            narrative={narrative}
            isEditing={isEditing}
            isGenerating={isGenerating}
            editedNarrative={editedNarrative}
            onEditedNarrativeChange={setEditedNarrative}
            onStartEditing={() => {
                setEditedNarrative('');
                setIsEditing(true);
            }}
            onGenerateNarrative={handleGenerateNarrative}
            onDeleteNarrative={handleDeleteNarrative}
        />
    </div>
)}
```

**修改后：**
```typescript
{activeTab === 'narrative' && (
    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 animate-in fade-in duration-300 pb-40 px-7">
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
    </div>
)}
```

### 6. 更新 Floating Button

**修改前：**
```typescript
{activeTab === 'narrative' && (narrative || isEditing) && (
    <FloatingButton
        onClick={() => {
            if (isEditing) handleSaveNarrative();
            else {
                setEditedNarrative(narrative);
                setIsEditing(true);
            }
        }}
        position="custom"
        className="fixed bottom-16 right-6"
    >
        <UIIcon 
            type={isEditing ? "editing" : "reading"}
            fallbackIcon={isEditing ? LucideIcons.Check : Edit3}
            size={24}
            className="text-white"
        />
    </FloatingButton>
)}
```

**修改后（可选，因为新设计中每个区域都有自己的保存按钮）：**
```typescript
// 可以移除 Floating Button，或者保留用于快速切换编辑模式
// 如果保留，需要判断当前正在编辑哪个字段
{activeTab === 'narrative' && (isEditingSummary || isEditingNarrative) && (
    <FloatingButton
        onClick={() => {
            if (isEditingSummary) handleSaveSummary();
            if (isEditingNarrative) handleSaveNarrative();
        }}
        position="custom"
        className="fixed bottom-16 right-6"
    >
        <UIIcon 
            type="editing"
            fallbackIcon={LucideIcons.Check}
            size={24}
            className="text-white"
        />
    </FloatingButton>
)}
```

### 7. 添加删除确认 Modal

**修改前：**
```typescript
<ConfirmModal
    isOpen={isDeleteConfirmOpen}
    onClose={() => setIsDeleteConfirmOpen(false)}
    onConfirm={confirmDeleteNarrative}
    title="删除叙事？"
    description="确定要删除当前生成的叙事吗？此操作无法撤销，需要重新生成。"
    confirmText="确认删除"
    type="danger"
/>
```

**修改后：**
```typescript
{/* 删除手动叙事确认 */}
<ConfirmModal
    isOpen={isDeleteSummaryConfirmOpen}
    onClose={() => setIsDeleteSummaryConfirmOpen(false)}
    onConfirm={confirmDeleteSummary}
    title="删除手动叙事？"
    description="确定要删除这条总结吗？此操作无法撤销。"
    confirmText="确认删除"
    type="danger"
/>

{/* 删除 AI 叙事确认 */}
<ConfirmModal
    isOpen={isDeleteNarrativeConfirmOpen}
    onClose={() => setIsDeleteNarrativeConfirmOpen(false)}
    onConfirm={confirmDeleteNarrative}
    title="删除 AI 叙事？"
    description="确定要删除当前生成的 AI 叙事吗？此操作无法撤销，需要重新生成。"
    confirmText="确认删除"
    type="danger"
/>
```

## 完整的修改清单

- [ ] 更新 `useReviewState` hook 调用，添加 summary 相关状态
- [ ] 在 `useEffect` 中同步 `summary` 字段
- [ ] 添加 `handleSaveSummary` 函数
- [ ] 添加 `handleDeleteSummary` 和 `confirmDeleteSummary` 函数
- [ ] 修改 `handleSaveNarrative` 使用 `setIsEditingNarrative`
- [ ] 修改 `confirmDeleteNarrative` 使用 `setIsEditingNarrative`
- [ ] 更新 `ReviewNarrativeTab` 组件的 props
- [ ] 更新或移除 Floating Button（可选）
- [ ] 添加两个独立的删除确认 Modal
- [ ] 测试所有功能是否正常工作

## 同样的修改需要应用到

- `WeeklyReviewView.tsx`
- `MonthlyReviewView.tsx`

这两个文件的修改方式与 `DailyReviewView.tsx` 完全相同。
