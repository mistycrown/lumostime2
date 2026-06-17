# Custom Hooks

> `useSyncManager.ts` now treats confirmed pending local auto-sync edits as upload-worthy even when the local/cloud timestamps are still within the equal-tolerance window, so creating a new todo right after a sync no longer gets skipped.
> `useSyncManager.ts` now also compares the full local/cloud backup JSON sizes before overwrite operations, so any timestamp decision that would let a smaller payload replace a larger one now opens an explicit conflict chooser instead of silently overwriting data.
> `useSyncManager.ts` now includes data collections and collection entries in unified cloud sync payloads, restores them from backups that explicitly contain them, and treats collection-only edits as auto-sync-relevant user data.
> `useTodoQuickActions.ts` now exposes a shared title update helper (`handleQuickActionUpdateTitle`) to edit todo titles directly from the quick actions modal on blur.
> `useTodoManager.ts` now clears `coverImage` when duplicating a todo, so quick-copy tasks start clean instead of inheriting the original cover artwork.
> `useWidgetBridgeSync.ts` now catches both synchronous and async native widget bridge failures during payload sync, so newly extended todo recurrence fields such as month-end fallback cannot white-screen the app if the Android bridge rejects them.
> `useFloatingWindow.ts` now consumes Android floating-window stop actions through the Capacitor plugin listener only, while still reconciling persisted pending stops on resume, so one native stop tap cannot be double-consumed through both plugin and window event bridges.
> `useTodoManager.ts` now canonicalizes recurrence rules during save/duplicate/batch-add, so month-end fallback toggles and older invalid monthly payloads settle into one stable persisted shape before downstream views react to the todo update.
> `useSyncManager.ts` now classifies local-vs-cloud timestamps through a shared helper and uses a 1-second tolerance, so desktop edits made shortly after the previous sync are no longer misclassified as already equal.
> `useSyncManager.ts` now includes the unified nested `achievementData` backup block in cloud/upload payloads and restores that achievement state during imports/downloads, while still preserving the local achievement bottle data whenever an older backup file simply does not include that block.
> `useSyncManager.ts` now includes the unified nested `aiData` backup block in cloud/upload payloads, restores that AI state during imports/downloads, and listens for AI-only persistence change events so chat/memory/Dream updates can auto-sync even without timeline or todo edits.
> `useLogManager.ts` now rejects brand-new log insertions whose `startTime`, `endTime`, and normalized `note` exactly match an existing record, so floating-window stop races and repeated backfill inserts cannot append identical timeline items twice.
> `useLogManager.ts` now dispatches a shared submitted-log event only for brand-new log saves, letting the globally mounted AI assistant react to selected completed tags without firing again on log edits.
> `useTodoManager.ts` now normalizes future-only `maybeDates` plus deduplicated recurrence `skipDates` whenever todos are saved, duplicated, or batch-created, so tentative candidate dates do not accumulate stale past entries in persisted data.
> `useTodoQuickActions.ts` now also exposes a shared `Maybe` quick action that writes normalized multi-date `maybeDates`, so list-row quick actions can edit tentative future dates for ordinary and recurring tasks alike.
> `useAppInitialization.ts` now imports the Android EdgeToEdge plugin from its ESM entry instead of calling `require()`, so Capacitor production bundles can initialize edge-to-edge support inside the WebView without a browser-side `require is not defined` crash.
> `useDeepLink.ts` now keeps a stable NFC/deep-link listener registration, consumes launch URLs for NFC actions on cold start, and surfaces native NFC read errors to toasts.
> `useDeepLink.ts` now also routes NFC scans and LumosTime app links through a shared compatibility parser so older tags and WebView-specific custom-scheme variations still execute reliably.
> `useDeepLink.ts` now dedupes equivalent NFC and app-link timer URLs by their parsed action key, so `appUrlOpen` and `nfcTagScanned` can share one stop/start path without leaving behind duplicate same-activity sessions.
> `useDeepLink.ts` now also suppresses cross-source replays of the same NFC `start` action, so a timer stopped by scanning its own tag cannot be immediately restarted by a delayed `appUrlOpen` or launch-url echo from that same scan.
> `useDeepLink.ts` now stops only the scanned tag's own active sessions, so scanning A then B starts concurrent timers and only a repeat scan of A or B stops that specific activity.
> `useDeepLink.ts` now ignores stale listener instances, so React StrictMode or delayed native listener cleanup in dev builds cannot leave an old NFC/deep-link callback around to process the same scan twice.
> `useLogManager.ts` now lets callers override the date used for new backfill defaults, so the Android widget supplement-log shortcut can always open against today even if the timeline was last left on a past date.
> `useTodoManager.ts` now keeps a nested todo-detail history stack, and `useHardwareBackButton.ts` now consumes Android back presses through that same stack so child-task details return to their parent detail page before closing back to the main todo surface.
> `useHardwareBackButton.ts` now also lets collection-launched log/todo details consume Android back before the underlying settings stack unwinds, so `设置 > Collections` stays in place beneath those topmost overlays.
> `useTodoManager.ts` now exposes an idempotent complete-only helper so focus-log flows can save first and then mark the linked unfinished todo done without toggling completed tasks back open.
> `useWidgetBridgeSync.ts` now mirrors TODAY + PIN source todos/categories alongside the rendered payload so Android-side refresh actions and cross-day first-open rebuilds can recompute the widget list natively.
> `useHardwareBackButton.ts` now exposes a shared overlay back-handler stack so transient sheets can consume Android hardware back before the app-level navigation ladder reaches view changes or `exitApp()`.
> `useHardwareBackButton.ts` now delegates Android hardware back presses into the shared AI chat window first, so nested AI panels unwind one layer at a time before the root AI chat closes or the app exits.

> `useSearchManager.ts` 和 `useHardwareBackButton.ts` 现在会保留“设置页 -> 搜索全部”的来源状态，关闭搜索或按 Android 硬件返回键时会统一回到设置主列表页；同时支持脉络页直接打开“自定义筛选器”时的详情页 -> 列表 -> 脉络页返回链。

> `useScopeStats.ts` now follows the shared scope aggregation rule: one log linked to multiple scopes contributes its full duration to each linked scope.
> `useAppInitialization.ts` now uses the shared floating-window startup guard so Android can still restore the overlay when notification permission is disabled, while logging that notification-based stability is reduced.
> `useTodoManager.ts` now supports configurable todo duplication so copy flows can rename the duplicate first and optionally clear dates, tags, or scopes before saving.
> `useWidgetBridgeSync.ts` now ignores native runtime echoes whose source is already `app`, so NFC stop flows cannot clear a local timer and then have the stale app-owned native runtime immediately restore it.
> `useTodoManager.ts` now supports one-level subtasks, including child draft creation, parent-field inheritance sync, and cascade delete for direct children.
> `useTodoManager.ts` now blocks subtask creation for recurring parent todos, matching the detail-page rule that recurring tasks do not expose a child-task tab.
> `useTodoQuickActions.ts` now centralizes lightweight todo quick-actions state so todo-list taps and week-plan badges open the same scheduling/completion sheet behavior.
> `useTodoQuickActions.ts` now also routes shared delete requests into the existing todo deletion flow, so the quick-actions sheet can trigger the same task-removal rules as the detail editor.
> `useTodoQuickActions.ts` also exposes a shared pin/unpin action, and `useTodoManager.ts` now initializes duplicated/new todos with `pin: false` by default.
> `useTodoQuickActions.ts` now also requires quick reminders to choose a target standard todo category before `升级为项目`, instead of silently falling back to a default project bucket.
> `useTodoQuickActions.ts` now also exposes a shared category-move action for non-subtask todos, so the quick-actions sheet can switch a task into another standard todo category without opening the full detail editor.
> `useTodoQuickActions.ts` now also exposes the sheet open timestamp plus a shared guard helper, so the bottom-sheet actions can ignore the same synthetic touch click that opened them from a lower todo row.

> `useTodoStats.ts` 优先使用 `TodoCategory.color` 作为待办环形图颜色；旧分类没有保存颜色时，继续回退到历史默认调色板。

这个目录包含从 AddLogModal.tsx 提取的可复用自定义 Hooks。

## 文件说明

### `useSyncManager.ts`
同步恢复时会规整自定义筛选器的 `order`，确保云端/本地恢复后的筛选器顺序稳定。

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
  handleAddImages,
  handleDeleteImage
} = useImageManager(initialImages);

// 添加图片
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files?.[0]) {
    const filename = await handleAddImage(e.target.files[0]);
    console.log('Added:', filename);
  }
};

// 鎵归噺娣诲姞鍥剧墖
const files = Array.from(e.target.files || []);
const result = await handleAddImages(files);
console.log('Added:', result.added.length, 'Failed:', result.failed.length);

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
