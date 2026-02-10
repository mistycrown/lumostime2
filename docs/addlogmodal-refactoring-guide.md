# AddLogModal.tsx 重构指南

## 概述

本指南说明如何使用新创建的 Hooks 重构 AddLogModal.tsx，将 1132 行的复杂组件简化为更易维护的代码。

## 重构步骤

### 步骤 1: 更新导入语句

**当前代码**:
```typescript
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { imageService } from '../services/imageService';
```

**重构后**:
```typescript
import React, { useState, useEffect, useRef } from 'react';
import { useLogForm, useTimeCalculation, useImageManager, useSuggestions } from '../hooks';
```

**说明**: 移除 `useMemo`（已在 Hooks 中使用），移除 `imageService`（已在 useImageManager 中封装）

---

### 步骤 2: 替换状态管理

**当前代码** (20+ useState):
```typescript
const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0].id);
const [selectedActivityId, setSelectedActivityId] = useState<string>(categories[0].activities[0].id);
const [note, setNote] = useState('');
const [linkedTodoId, setLinkedTodoId] = useState<string | undefined>(undefined);
const [progressIncrement, setProgressIncrement] = useState(0);
const [focusScore, setFocusScore] = useState<number | undefined>(undefined);
const [scopeIds, setScopeIds] = useState<string[] | undefined>(undefined);
const [images, setImages] = useState<string[]>([]);
const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
const [previewFilename, setPreviewFilename] = useState<string | null>(null);
const [comments, setComments] = useState<Comment[]>([]);
const [reactions, setReactions] = useState<string[]>([]);
const [trackStartTime, setTrackStartTime] = useState<number>(0);
const [trackEndTime, setTrackEndTime] = useState<number>(0);
const [currentStartTime, setCurrentStartTime] = useState<number>(0);
const [currentEndTime, setCurrentEndTime] = useState<number>(0);
// ... 还有初始化 useEffect (100+ 行)
```

**重构后**:
```typescript
// 1. 表单状态管理
const { formState, updateField, updateFields, previousLogEndTime } = useLogForm({
  initialLog,
  initialStartTime,
  initialEndTime,
  categories,
  todos,
  todoCategories,
  lastLogEndTime,
  allLogs
});

// 2. 时间计算
const timeCalc = useTimeCalculation(
  formState.currentStartTime,
  formState.currentEndTime,
  formState.trackStartTime,
  formState.trackEndTime
);

// 3. 图片管理
const imageManager = useImageManager(formState.images);

// 4. 建议系统
const suggestions = useSuggestions(
  formState.linkedTodoId,
  formState.note,
  formState.selectedActivityId,
  formState.scopeIds,
  categories,
  todos,
  scopes,
  autoLinkRules
);

// 5. UI 状态（保留）
const [isNoteExpanded, setIsNoteExpanded] = useState(false);
const [isDraggingStart, setIsDraggingStart] = useState(false);
const [isDraggingEnd, setIsDraggingEnd] = useState(false);
```

**说明**: 
- 将 20+ 个状态合并为 4 个 Hook 调用
- 减少约 150 行初始化代码
- 自动处理所有初始化逻辑

---

### 步骤 3: 更新状态访问

**当前代码**:
```typescript
<input value={note} onChange={e => setNote(e.target.value)} />
<div>{selectedCategoryId}</div>
```

**重构后**:
```typescript
<input 
  value={formState.note} 
  onChange={e => updateField('note', e.target.value)} 
/>
<div>{formState.selectedCategoryId}</div>
```

**批量更新示例**:
```typescript
// 之前
setSelectedCategoryId('cat-1');
setSelectedActivityId('act-1');
setNote('Updated');

// 之后
updateFields({
  selectedCategoryId: 'cat-1',
  selectedActivityId: 'act-1',
  note: 'Updated'
});
```

---

### 步骤 4: 替换时间计算逻辑

**当前代码** (100+ 行):
```typescript
const getHM = (ts: number) => {
  const d = new Date(ts);
  return { h: d.getHours(), m: d.getMinutes() };
};

const startHM = useMemo(() => getHM(currentStartTime), [currentStartTime]);
const endHM = useMemo(() => getHM(currentEndTime), [currentEndTime]);

const durationDisplay = useMemo(() => {
  const diff = (currentEndTime - currentStartTime) / 1000 / 60;
  if (diff <= 0) return '---';
  const h = Math.floor(diff / 60);
  const m = Math.round(diff % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}, [currentStartTime, currentEndTime]);

const trackDuration = trackEndTime - trackStartTime;
const safeTrackDuration = trackDuration > 0 ? trackDuration : 1;
const startPercent = Math.max(0, Math.min(100, ((currentStartTime - trackStartTime) / safeTrackDuration) * 100));
const endPercent = Math.max(0, Math.min(100, ((currentEndTime - trackStartTime) / safeTrackDuration) * 100));

const handleTimeInput = (type: 'start' | 'end', field: 'h' | 'm', value: number) => {
  // 50+ 行复杂逻辑...
};
```

**重构后**:
```typescript
// 所有时间计算都在 timeCalc 中
<div>{timeCalc.durationDisplay}</div>
<input value={timeCalc.startHM.h} />
<input value={timeCalc.startHM.m} />

// 更新时间
const handleTimeInput = (type: 'start' | 'end', field: 'h' | 'm', value: number) => {
  const newTime = timeCalc.createTimeFromInput(
    type === 'start' ? formState.currentStartTime : formState.currentEndTime,
    field,
    value
  );
  updateField(type === 'start' ? 'currentStartTime' : 'currentEndTime', newTime);
};

// 设置为当前时间
const handleSetEndToNow = () => {
  const now = timeCalc.setToNow('end', formState.currentStartTime);
  updateField('currentEndTime', now);
};

// 滑块百分比
<div style={{ left: `${timeCalc.startPercent}%` }} />
<div style={{ left: `${timeCalc.endPercent}%` }} />
```

---

### 步骤 5: 替换图片管理逻辑

**当前代码** (80+ 行):
```typescript
const [images, setImages] = useState<string[]>([]);
const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
const [previewFilename, setPreviewFilename] = useState<string | null>(null);

useEffect(() => {
  const loadUrls = async () => {
    // 50+ 行加载逻辑，没有内存清理
  };
  loadUrls();
}, [images, imageUrls]);

const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
  // 20+ 行处理逻辑
};

const handleDeleteImage = async (filename: string) => {
  // 20+ 行删除逻辑
};
```

**重构后**:
```typescript
// 所有图片逻辑都在 imageManager 中
const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files?.[0]) {
    await imageManager.handleAddImage(e.target.files[0]);
  }
};

const handleDeleteImage = async (filename: string) => {
  await imageManager.handleDeleteImage(filename);
  if (initialLog && onImageRemove) {
    onImageRemove(initialLog.id, filename);
  }
};

// 使用图片数据
{imageManager.images.map(img => (
  <img key={img} src={imageManager.imageUrls[img]} />
))}

// 预览
<ImagePreviewModal
  imageUrl={imageManager.previewFilename ? imageManager.imageUrls[imageManager.previewFilename] : null}
  onClose={() => imageManager.setPreviewFilename(null)}
  onDelete={() => {
    if (imageManager.previewFilename) {
      handleDeleteImage(imageManager.previewFilename);
      imageManager.setPreviewFilename(null);
    }
  }}
/>
```

**关键改进**: 自动清理 blob URLs，防止内存泄漏

---

### 步骤 6: 替换建议系统逻辑

**当前代码** (100+ 行):
```typescript
const [suggestions, setSuggestions] = useState<{
  activity?: { ... };
  scopes: { ... }[];
}>({ scopes: [] });

useEffect(() => {
  const newSuggestions = { scopes: [] };
  
  // 50+ 行活动建议逻辑
  const linkedTodo = todos.find(t => t.id === linkedTodoId);
  if (linkedTodo?.linkedActivityId && linkedTodo.linkedCategoryId) {
    // ...
  }
  
  // 50+ 行领域建议逻辑
  if (linkedTodo?.defaultScopeIds) {
    // ...
  }
  
  setSuggestions(newSuggestions);
}, [linkedTodoId, note, selectedActivityId, scopeIds, categories, todos, scopes, autoLinkRules]);
```

**重构后**:
```typescript
// 建议系统已经在 useSuggestions Hook 中
// 直接使用 suggestions 对象

{suggestions.activity && (
  <button onClick={() => {
    updateFields({
      selectedCategoryId: suggestions.activity.categoryId,
      selectedActivityId: suggestions.activity.id
    });
  }}>
    {suggestions.activity.name}
  </button>
)}

{suggestions.scopes.map(scope => (
  <button key={scope.id} onClick={() => {
    const currentScopes = formState.scopeIds || [];
    if (!currentScopes.includes(scope.id)) {
      updateField('scopeIds', [...currentScopes, scope.id]);
    }
  }}>
    {scope.name}
  </button>
))}
```

---

### 步骤 7: 更新评论和反应处理

**当前代码**:
```typescript
const handleAddComment = (content: string) => {
  const newComment: Comment = {
    id: crypto.randomUUID(),
    content,
    createdAt: Date.now()
  };
  setComments(prev => [...prev, newComment]);
};

const handleEditComment = (commentId: string, content: string) => {
  setComments(prev => prev.map(comment =>
    comment.id === commentId ? { ...comment, content } : comment
  ));
};

const handleDeleteComment = (commentId: string) => {
  setComments(prev => prev.filter(comment => comment.id !== commentId));
};

const handleToggleReaction = (emoji: string) => {
  setReactions(prev => {
    if (prev.includes(emoji)) {
      return prev.filter(r => r !== emoji);
    }
    return [...prev, emoji];
  });
};
```

**重构后**:
```typescript
const handleAddComment = (content: string) => {
  const newComment: Comment = {
    id: crypto.randomUUID(),
    content,
    createdAt: Date.now()
  };
  updateField('comments', [...formState.comments, newComment]);
};

const handleEditComment = (commentId: string, content: string) => {
  updateField('comments', formState.comments.map(comment =>
    comment.id === commentId ? { ...comment, content } : comment
  ));
};

const handleDeleteComment = (commentId: string) => {
  updateField('comments', formState.comments.filter(c => c.id !== commentId));
};

const handleToggleReaction = (emoji: string) => {
  const reactions = formState.reactions;
  if (reactions.includes(emoji)) {
    updateField('reactions', reactions.filter(r => r !== emoji));
  } else {
    updateField('reactions', [...reactions, emoji]);
  }
};
```

---

### 步骤 8: 更新保存逻辑

**当前代码**:
```typescript
const handleSave = () => {
  const duration = (currentEndTime - currentStartTime) / 1000;
  if (duration <= 0) return;

  const newLog: Log = {
    id: initialLog ? initialLog.id : crypto.randomUUID(),
    categoryId: selectedCategoryId,
    activityId: selectedActivityId,
    startTime: currentStartTime,
    endTime: currentEndTime,
    duration: duration,
    note: note.trim(),
    linkedTodoId: linkedTodoId,
    progressIncrement: linkedTodoId && progressIncrement ? progressIncrement : undefined,
    focusScore: focusScore,
    scopeIds: scopeIds,
    images: images,
    comments: comments.length > 0 ? comments : undefined,
    reactions: reactions.length > 0 ? reactions : undefined,
  };
  onSave(newLog);
};
```

**重构后**:
```typescript
const handleSave = () => {
  const duration = (formState.currentEndTime - formState.currentStartTime) / 1000;
  if (duration <= 0) return;

  const newLog: Log = {
    id: initialLog ? initialLog.id : crypto.randomUUID(),
    categoryId: formState.selectedCategoryId,
    activityId: formState.selectedActivityId,
    startTime: formState.currentStartTime,
    endTime: formState.currentEndTime,
    duration: duration,
    note: formState.note.trim(),
    linkedTodoId: formState.linkedTodoId,
    progressIncrement: formState.linkedTodoId && formState.progressIncrement ? formState.progressIncrement : undefined,
    focusScore: formState.focusScore,
    scopeIds: formState.scopeIds,
    images: imageManager.images,
    comments: formState.comments.length > 0 ? formState.comments : undefined,
    reactions: formState.reactions.length > 0 ? formState.reactions : undefined,
  };
  onSave(newLog);
};
```

---

### 步骤 9: 更新滑块逻辑

**当前代码**:
```typescript
const calculateTimeFromClientX = (clientX: number) => {
  if (!sliderRef.current || trackDuration <= 0) return null;
  const rect = sliderRef.current.getBoundingClientRect();
  const percent = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  let newTime = trackStartTime + (percent / 100) * trackDuration;
  const MS_PER_MIN = 60000;
  return Math.round(newTime / MS_PER_MIN) * MS_PER_MIN;
};

const handleDragUpdate = (clientX: number) => {
  const newTime = calculateTimeFromClientX(clientX);
  if (newTime === null) return;

  if (isDraggingStart) {
    if (newTime > currentEndTime) {
      setCurrentStartTime(currentEndTime);
    } else if (newTime < trackStartTime) {
      setCurrentStartTime(trackStartTime);
    } else {
      setCurrentStartTime(newTime);
    }
  } else if (isDraggingEnd) {
    // ...
  }
};
```

**重构后**:
```typescript
const handleDragUpdate = (clientX: number) => {
  if (!sliderRef.current) return;
  
  const rect = sliderRef.current.getBoundingClientRect();
  const newTime = timeCalc.calculateTimeFromClientX(clientX, rect);
  if (newTime === null) return;

  if (isDraggingStart) {
    if (newTime > formState.currentEndTime) {
      updateField('currentStartTime', formState.currentEndTime);
    } else if (newTime < formState.trackStartTime) {
      updateField('currentStartTime', formState.trackStartTime);
    } else {
      updateField('currentStartTime', newTime);
    }
  } else if (isDraggingEnd) {
    if (newTime < formState.currentStartTime) {
      updateField('currentEndTime', formState.currentStartTime);
    } else if (newTime > formState.trackEndTime) {
      updateField('currentEndTime', formState.trackEndTime);
    } else {
      updateField('currentEndTime', newTime);
    }
  }
};
```

---

## 重构效果对比

### 代码行数
- **之前**: 1132 行
- **之后**: ~650 行（预估）
- **减少**: ~480 行（42%）

### 状态管理
- **之前**: 20+ 个 useState
- **之后**: 4 个 Hook + 3 个 UI 状态
- **简化**: 75%

### 内存管理
- **之前**: 图片 blob URLs 不清理（内存泄漏）
- **之后**: 自动清理（useImageManager）
- **改进**: 修复内存泄漏

### 可维护性
- **之前**: 复杂的初始化逻辑分散在多处
- **之后**: 集中在 Hooks 中，易于测试
- **改进**: 显著提升

---

## 测试清单

重构完成后，请测试以下功能：

### 基本功能
- [ ] 创建新记录
- [ ] 编辑现有记录
- [ ] 填充时间间隙
- [ ] 删除记录

### 时间功能
- [ ] 时间滑块拖动
- [ ] 手动输入时间（小时/分钟）
- [ ] "到上尾"按钮（设置开始时间为上一条记录结束时间）
- [ ] "到现在"按钮（设置结束时间为当前时间）
- [ ] 持续时间显示正确

### 关联功能
- [ ] 选择分类和活动
- [ ] 关联待办
- [ ] 待办进度增量
- [ ] 关联领域
- [ ] 活动建议显示和应用
- [ ] 领域建议显示和应用

### 图片功能
- [ ] 添加图片
- [ ] 删除图片
- [ ] 预览图片
- [ ] 组件卸载后检查内存（开发者工具 Memory Profiler）

### 其他功能
- [ ] 添加/编辑/删除评论
- [ ] 添加/删除反应
- [ ] 专注度评分
- [ ] 笔记输入和展开/收缩
- [ ] 自动聚焦笔记输入框（新建时）

---

## 注意事项

1. **渐进式重构**: 建议一次重构一个部分，每次都进行测试
2. **保留备份**: 在开始重构前创建备份分支
3. **类型检查**: 每次修改后运行 TypeScript 诊断
4. **功能测试**: 重点测试时间计算和图片管理功能
5. **内存检查**: 使用浏览器开发者工具检查内存泄漏是否修复

---

## 常见问题

### Q: 如何访问嵌套的状态？
A: 使用 `formState.fieldName`，例如 `formState.note`

### Q: 如何更新多个字段？
A: 使用 `updateFields({ field1: value1, field2: value2 })`

### Q: 图片 URLs 何时加载？
A: `useImageManager` 会自动加载，无需手动处理

### Q: 建议何时更新？
A: `useSuggestions` 会自动响应依赖变化，无需手动触发

### Q: 如何确认内存泄漏已修复？
A: 
1. 打开浏览器开发者工具 > Memory
2. 添加多张图片
3. 关闭 Modal
4. 点击"Take heap snapshot"
5. 搜索 "blob:"，应该没有残留的 blob URLs

---

## 总结

通过使用新创建的 Hooks，AddLogModal.tsx 的代码量减少了约 42%，状态管理简化了 75%，并修复了内存泄漏问题。重构后的代码更易维护、测试和扩展。

建议采用渐进式重构策略，每次重构一个部分并进行充分测试，确保功能完整性。
