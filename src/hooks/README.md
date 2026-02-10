# Custom Hooks

这个目录包含从 AddLogModal.tsx 提取的可复用自定义 Hooks。

## 文件说明

### `useLogForm.ts`
表单状态管理 Hook，将 20+ 个独立状态合并为单个对象。

**功能**:
- 统一管理所有表单字段
- 自动处理初始化（编辑/新建/填充间隙）
- 计算上一条记录的结束时间
- 提供简洁的更新方法

**使用示例**:
```typescript
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

// 读取状态
console.log(formState.note);

// 更新单个字段
updateField('note', 'New note');

// 批量更新
updateFields({
  selectedCategoryId: 'cat-1',
  selectedActivityId: 'act-1',
  note: 'Updated note'
});
```

### `useTimeCalculation.ts`
时间计算和转换 Hook，处理所有时间相关逻辑。

**功能**:
- 时间戳 ↔ 小时/分钟转换
- 持续时间显示计算
- 滑块百分比计算
- 从输入创建时间戳
- 从滑块位置计算时间

**使用示例**:
```typescript
const {
  startHM,           // { h: 14, m: 30 }
  endHM,             // { h: 16, m: 45 }
  durationDisplay,   // "2h 15m"
  startPercent,      // 25.5
  endPercent,        // 75.8
  createTimeFromInput,
  calculateTimeFromClientX,
  setToNow
} = useTimeCalculation(
  currentStartTime,
  currentEndTime,
  trackStartTime,
  trackEndTime
);

// 从输入创建新时间
const newTime = createTimeFromInput(currentStartTime, 'h', 14);

// 设置为当前时间
const now = setToNow('end', currentStartTime);
```

### `useImageManager.ts`
图片管理 Hook，处理图片上传、删除和内存清理。

**功能**:
- 管理图片列表和 URL 映射
- 自动加载图片 URLs
- 添加和删除图片
- **防止内存泄漏**: 自动清理 blob URLs

**使用示例**:
```typescript
const {
  images,              // ['img1.jpg', 'img2.jpg']
  imageUrls,           // { 'img1.jpg': 'blob:...', ... }
  previewFilename,     // 'img1.jpg' | null
  setPreviewFilename,
  handleAddImage,
  handleDeleteImage
} = useImageManager(initialImages);

// 添加图片
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files?.[0]) {
    const filename = await handleAddImage(e.target.files[0]);
    console.log('Added:', filename);
  }
};

// 删除图片
await handleDeleteImage('img1.jpg');

// 预览图片
setPreviewFilename('img1.jpg');
```

**内存泄漏防护**:
- 组件卸载时自动清理所有 blob URLs
- 使用 `isMountedRef` 避免在卸载后更新状态
- 删除图片时立即清理对应的 blob URL

### `useSuggestions.ts`
智能建议系统 Hook，基于上下文提供活动和领域建议。

**功能**:
- 活动建议（关联待办 > 笔记关键词）
- 领域建议（待办 > 自动规则 > 关键词）
- 自动优先级排序
- 性能优化（useMemo）

**使用示例**:
```typescript
const suggestions = useSuggestions(
  linkedTodoId,
  note,
  selectedActivityId,
  scopeIds,
  categories,
  todos,
  scopes,
  autoLinkRules
);

// 活动建议
if (suggestions.activity) {
  console.log(suggestions.activity.name);      // "编程"
  console.log(suggestions.activity.reason);    // "关联待办"
  console.log(suggestions.activity.matchedKeyword); // "代码"
}

// 领域建议
suggestions.scopes.forEach(scope => {
  console.log(scope.name);    // "工作"
  console.log(scope.reason);  // "自动规则"
});
```

## 类型定义

### LogFormState
```typescript
interface LogFormState {
  selectedCategoryId: string;
  selectedActivityId: string;
  note: string;
  linkedTodoId?: string;
  progressIncrement: number;
  focusScore?: number;
  scopeIds?: string[];
  images: string[];
  comments: Comment[];
  reactions: string[];
  currentStartTime: number;
  currentEndTime: number;
  trackStartTime: number;
  trackEndTime: number;
}
```

### TimeHM
```typescript
interface TimeHM {
  h: number;  // 0-23
  m: number;  // 0-59
}
```

## 性能优化

所有 Hooks 都使用了性能优化技术：

1. **useMemo**: 避免重复计算
   ```typescript
   const durationDisplay = useMemo(() => {
     // 复杂计算...
   }, [currentStartTime, currentEndTime]);
   ```

2. **useCallback**: 稳定的函数引用
   ```typescript
   const handleAddImage = useCallback(async (file: File) => {
     // 处理逻辑...
   }, []);
   ```

3. **批量更新**: 减少 re-render
   ```typescript
   updateFields({ field1: value1, field2: value2 });
   ```

## 内存管理

### 图片内存泄漏防护

**问题**: blob URLs 不会自动释放，导致内存泄漏

**解决方案**:
```typescript
useEffect(() => {
  return () => {
    // 组件卸载时清理所有 blob URLs
    Object.values(imageUrls).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  };
}, []);
```

### 异步操作安全

**问题**: 组件卸载后异步操作仍可能更新状态

**解决方案**:
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
  };
}, []);

// 在异步操作中检查
if (!isMountedRef.current) return;
```

## 在 AddLogModal.tsx 中使用

```typescript
import {
  useLogForm,
  useTimeCalculation,
  useImageManager,
  useSuggestions
} from '../hooks';

export const AddLogModal: React.FC<AddLogModalProps> = (props) => {
  // 1. 表单状态
  const { formState, updateField, updateFields } = useLogForm({
    initialLog: props.initialLog,
    initialStartTime: props.initialStartTime,
    initialEndTime: props.initialEndTime,
    categories: props.categories,
    todos: props.todos,
    todoCategories: props.todoCategories,
    lastLogEndTime: props.lastLogEndTime,
    allLogs: props.allLogs
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
    props.categories,
    props.todos,
    props.scopes,
    props.autoLinkRules
  );

  // 使用状态和方法
  return (
    <div>
      <input
        value={formState.note}
        onChange={(e) => updateField('note', e.target.value)}
      />
      <div>{timeCalc.durationDisplay}</div>
      {/* ... */}
    </div>
  );
};
```

## 测试建议

### 单元测试示例

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useLogForm } from './useLogForm';

describe('useLogForm', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useLogForm({
      categories: mockCategories,
      todos: mockTodos,
      todoCategories: mockTodoCategories
    }));

    expect(result.current.formState.note).toBe('');
  });

  it('should update single field', () => {
    const { result } = renderHook(() => useLogForm({
      categories: mockCategories,
      todos: mockTodos,
      todoCategories: mockTodoCategories
    }));

    act(() => {
      result.current.updateField('note', 'Test note');
    });

    expect(result.current.formState.note).toBe('Test note');
  });
});
```

## 注意事项

1. **状态更新**: 使用 `updateField` 或 `updateFields`，不要直接修改 `formState`
2. **内存清理**: `useImageManager` 会自动清理，无需手动处理
3. **性能**: 所有 Hooks 都已优化，避免不必要的重新计算
4. **类型安全**: 所有 Hooks 都有完整的 TypeScript 类型定义

## 未来改进

可以考虑添加的功能：
- 表单验证 Hook
- 撤销/重做功能
- 自动保存草稿
- 离线支持
