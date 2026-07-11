/**
 * @file CollectionSettingsView.tsx
 * @input Collection data from DataContext plus edit handlers for logs and todos
 * @output A settings-level Collection list plus mixed-item detail timeline
 * @pos View (Settings sub-page)
 * @description Presents collections with compact title-led rows and a detail page that uses its own lightweight timeline cards instead of reusing the shared memoir timeline UI.
 * @updated 2026-06-06: Added a delete-impact confirmation step to Collection batch-management save so collection removals warn about how many membership links will be unbound before applying.
 * @updated 2026-07-11: Paused the collection-detail hardware-back handler while global log or todo detail overlays are open so Android back unwinds record > todo > collection detail > collection list in order.
 * @updated 2026-06-06: Added a dedicated Collection management sub-page with manual ordering, rename/create/delete controls, and delete-time unlink cleanup for related log/todo memberships.
 * @updated 2026-06-06: Made the Collection settings page use its own scroll container so long lists keep scrolling and newly opened create rows stay reachable past the first ten items.
 * @updated 2026-05-21: Collection add-modal todo browsing now opens at the category level, while log search stays empty until users explicitly search to avoid rendering huge record lists.
 * @updated 2026-05-21: Collection timeline preview-image taps now stop at the image button so zooming a cover no longer also opens the linked detail card.
 * @updated 2026-05-21: Collection timeline preview images now keep their source aspect ratio within a capped frame instead of forcing every cover into a square crop.
 * @updated 2026-05-21: Collection timeline todo entries now anchor to the latest linked log time, falling back to todo creation time and then collection membership time.
 * @updated 2026-05-14: Added a dual-tab Add modal to collection detail so users can search and multi-select logs or todos for batch membership insertion without leaving the page.
 * @updated 2026-05-13: Made mixed collection timeline entries clickable so linked logs/todos can open their shared detail overlays while leaving the collection page underneath for return navigation.
 * @updated 2026-05-12: Rebuilt Collection detail items as a standalone UI, tightened the create-row controls, compressed the header summary into a single line, switched entry media to a wrapped right-aligned preview layout, and aligned todo metadata with memoir/task tag rendering.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, PencilLine, Plus, Save, Search, Settings2, X } from 'lucide-react';
import { DataCollection, Log, Scope, TodoItem } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useCategoryScope } from '../../contexts/CategoryScopeContext';
import { appendDataCollectionEntries, buildDataCollectionCountMap, getCollectionTimelineTodoTimestamp, resolveDataCollectionItems } from '../../utils/dataCollectionUtils';
import { getDisplayIcon } from '../../utils/iconUtils';
import { useSettings } from '../../contexts/SettingsContext';
import { imageService } from '../../services/imageService';
import { ImagePreviewModal } from '../../components/ImagePreviewModal';
import { usePrivacy } from '../../contexts/PrivacyContext';
import { CollapsibleText } from '../../components/CollapsibleText';
import { IconRenderer } from '../../components/IconRenderer';
import { registerHardwareBackHandler } from '../../utils/hardwareBackHandlerStack';
import { ConfirmModal } from '../../components/ConfirmModal';
import { CollectionManageView } from '../CollectionManageView';
import { useNavigation } from '../../contexts/NavigationContext';

interface CollectionSettingsViewProps {
  onBack: () => void;
  onEditLog?: (log: Log) => void;
  onEditTodo?: (todo: TodoItem) => void;
}

interface CollectionDirectoryRowProps {
  collection: DataCollection;
  totalCount: number;
  logCount: number;
  todoCount: number;
  onOpen: () => void;
}

interface CollectionTimelineMediaItem {
  type: 'image';
  url: string;
}

interface CollectionTimelineRelatedTodo {
  title: string;
  isProgress?: boolean;
  progressIncrement?: number;
}

interface CollectionTimelineEntry {
  id: string;
  itemType: 'log' | 'task';
  sourceId: string;
  date: string;
  endDate?: string;
  title: string;
  content: string;
  metaLabel: string;
  media?: CollectionTimelineMediaItem[];
  tags?: string[];
  relatedTodos?: CollectionTimelineRelatedTodo[];
  domains?: string[];
}

type CollectionAddTab = 'todo' | 'log';

interface CollectionAddOption {
  id: string;
  title: string;
  content: string;
  metaLabel: string;
  searchText: string;
  sortValue: number;
  categoryId?: string;
  categoryLabel?: string;
  categoryIcon?: string;
}

interface CollectionAddTodoGroup {
  id: string;
  label: string;
  icon?: string;
  options: CollectionAddOption[];
}

interface PendingCollectionDeleteConfirmation {
  nextCollections: DataCollection[];
  deletedCount: number;
  unlinkedEntryCount: number;
}

const formatCountBadge = (count: number): string => String(count).padStart(2, '0');

const formatUpdatedAt = (timestamp: number): string => new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).format(timestamp);

const formatDateGroupLabel = (timestamp: number): { dateLabel: string; weekLabel: string } => {
  const date = new Date(timestamp);

  return {
    dateLabel: date.getDate().toString(),
    weekLabel: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  };
};

const getStartOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const formatEntryTime = (date: string, endDate?: string): string => {
  const format = (value: string) => new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const start = format(date);
  return endDate ? `${start} - ${format(endDate)}` : start;
};

const formatEntryDateWithTime = (date: string, endDate?: string): string => {
  const formattedDate = new Date(date).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });

  return `${formattedDate} ${formatEntryTime(date, endDate)}`;
};

const formatAccumulatedDurationCompact = (totalSeconds: number): string => {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}H${minutes}M`;
  }

  if (hours > 0) {
    return `${hours}H`;
  }

  return `${minutes}M`;
};

const buildCollectionSearchText = (title: string, content: string): string => `${title} ${content}`
  .trim()
  .toLocaleLowerCase();

const renderCollectionTagContent = (tagText: string) => {
  const parts = tagText.split(' / ');

  return parts.map((part, index) => {
    const match = part.match(/^(ui:\w+|[^\s]+)\s+(.+)$/);

    if (match) {
      const [, icon, text] = match;
      return (
        <React.Fragment key={`${tagText}-${index}`}>
          {index > 0 && <span className="mx-1 text-stone-300">/</span>}
          <IconRenderer icon={icon} className="text-xs" />
          <span className="ml-1">{text}</span>
        </React.Fragment>
      );
    }

    return (
      <React.Fragment key={`${tagText}-${index}`}>
        {index > 0 && <span className="mx-1 text-stone-300">/</span>}
        <span>{part}</span>
      </React.Fragment>
    );
  });
};

const CollectionTimelineImage: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
  const [imgUrl, setImgUrl] = useState('');
  const { isPrivacyMode } = usePrivacy();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (src.startsWith('http') || src.startsWith('data:')) {
        if (isMounted) {
          setImgUrl(src);
        }
        return;
      }

      try {
        const url = await imageService.getImageUrl(src, 'thumbnail');
        if (isMounted && url) {
          setImgUrl(url);
        }
      } catch (error) {
        console.error('Failed to load collection timeline image:', src, error);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!imgUrl) {
    return <div className={`block min-h-[96px] min-w-[96px] animate-pulse bg-stone-100 ${className}`} />;
  }

  return (
    <img
      src={imgUrl}
      alt={alt}
      className={`${className} ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
      loading="lazy"
    />
  );
};

const CollectionTimelineEntryCard: React.FC<{ entry: CollectionTimelineEntry; onOpen?: () => void }> = ({ entry, onOpen }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { isPrivacyMode } = usePrivacy();
  const hasMetadata = (entry.relatedTodos?.length || 0) + (entry.tags?.length || 0) + (entry.domains?.length || 0) > 0;
  const previewMedia = entry.media?.[0];
  const extraImageCount = Math.max(0, (entry.media?.length || 0) - 1);

  const handlePreviewImage = async (imageUrl: string) => {
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
      setPreviewImage(imageUrl);
      return;
    }

    const resolvedUrl = await imageService.getImageUrl(imageUrl, 'original');
    if (resolvedUrl) {
      setPreviewImage(resolvedUrl);
    }
  };

  const renderMedia = () => {
    if (!previewMedia) {
      return null;
    }

    return (
      <button
        type="button"
        className="relative overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-[0_1px_0_rgba(28,25,23,0.03)]"
        onClick={(event) => {
          event.stopPropagation();
          void handlePreviewImage(previewMedia.url);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <CollectionTimelineImage
          src={previewMedia.url}
          alt={entry.title}
          className="block h-auto max-h-28 w-auto max-w-24 object-contain transition-transform duration-500 hover:scale-[1.03] sm:max-h-32 sm:max-w-28"
        />
        {extraImageCount > 0 ? (
          <span className="absolute right-2 top-2 inline-flex min-w-7 items-center justify-center rounded-full bg-stone-900/78 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-white backdrop-blur-sm">
            +{extraImageCount}
          </span>
        ) : null}
      </button>
    );
  };

  const handleOpenEntry = () => {
    onOpen?.();
  };

  return (
    <div
      className={`relative pl-6 ${onOpen ? 'group cursor-pointer' : ''}`}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen ? handleOpenEntry : undefined}
      onKeyDown={onOpen ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenEntry();
        }
      } : undefined}
    >
      <div className="absolute left-[-6px] top-2 h-2.5 w-2.5 rounded-full border-2 border-[#faf9f6] bg-stone-900" />
      <div className={`pb-8 ${onOpen ? 'transition-opacity group-hover:opacity-90' : ''}`}>
        {previewMedia ? (
          <div className="float-right mb-2 ml-3">
            {renderMedia()}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] tracking-[0.08em] text-stone-400">
            <span className="inline-flex items-center rounded border border-stone-200/80 px-1.5 py-[1px] text-[8px] font-medium tracking-[0.14em] text-stone-400">
              {entry.itemType === 'log' ? 'LOG' : 'TASK'}
            </span>
            <span>{entry.metaLabel}</span>
          </div>
          <h3 className="mt-1 text-[16px] font-bold leading-tight text-stone-900">
            {entry.title}
          </h3>
          {entry.content ? (
            <CollapsibleText
              text={entry.content}
              threshold={140}
              className={`mt-2 text-[13px] leading-relaxed text-stone-500 ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}
            />
          ) : null}
          {hasMetadata ? (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {entry.relatedTodos?.map((todo, index) => (
                <span
                  key={`${entry.id}-todo-${index}`}
                  className="flex items-center gap-1 rounded border border-stone-200 bg-stone-50/30 px-2 py-0.5 text-[10px] font-medium text-stone-500"
                >
                  <span className="font-bold text-stone-400">@</span>
                  <span className="line-clamp-1">{todo.title}</span>
                  {todo.isProgress && todo.progressIncrement ? (
                    <span className="ml-0.5 font-mono text-stone-400">+{todo.progressIncrement}</span>
                  ) : null}
                </span>
              ))}
              {entry.tags?.map((tag, index) => (
                <span
                  key={`${entry.id}-tag-${index}`}
                  className="flex items-center gap-1 rounded border border-stone-200 bg-stone-50/30 px-2 py-0.5 text-[10px] font-medium text-stone-500"
                >
                  <span className="font-bold">#</span>
                  {renderCollectionTagContent(tag)}
                </span>
              ))}
              {entry.domains?.map((domain, index) => (
                <span
                  key={`${entry.id}-domain-${index}`}
                  className="flex items-center gap-1 rounded border border-stone-200 bg-stone-50/30 px-2 py-0.5 text-[10px] font-medium text-stone-500"
                >
                  <span className="font-bold text-stone-400">%</span>
                  {renderCollectionTagContent(domain)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="clear-both" />
      </div>
      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
};

const CollectionDirectoryRow: React.FC<CollectionDirectoryRowProps> = ({
  collection,
  totalCount,
  logCount,
  todoCount,
  onOpen
}) => (
  <button
    type="button"
    onClick={onOpen}
    className="flex w-full items-center justify-between gap-4 border-b border-stone-200 py-4 text-left transition-colors hover:bg-stone-50/60"
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 text-lg font-bold text-stone-900">
        <span className="text-sm font-normal text-stone-300">◬</span>
        <span className="truncate">{collection.name}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.16em] text-stone-400">
        <span>{formatCountBadge(logCount)} Log</span>
        <span>{formatCountBadge(todoCount)} Task</span>
        <span>{formatUpdatedAt(collection.updatedAt)}</span>
      </div>
    </div>

    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-stone-100 text-sm text-stone-500">
      {formatCountBadge(totalCount)}
    </div>
  </button>
);

interface CollectionAddModalProps {
  isOpen: boolean;
  collectionName: string;
  activeTab: CollectionAddTab;
  onTabChange: (tab: CollectionAddTab) => void;
  todoQuery: string;
  logQuery: string;
  appliedLogQuery: string;
  onTodoQueryChange: (value: string) => void;
  onLogQueryChange: (value: string) => void;
  onExecuteLogSearch: () => void;
  todoOptions: CollectionAddOption[];
  todoGroups: CollectionAddTodoGroup[];
  logOptions: CollectionAddOption[];
  expandedTodoCategoryIds: string[];
  onToggleTodoCategory: (categoryId: string) => void;
  selectedTodoIds: string[];
  selectedLogIds: string[];
  onToggleTodo: (todoId: string) => void;
  onToggleLog: (logId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const CollectionAddModal: React.FC<CollectionAddModalProps> = ({
  isOpen,
  collectionName,
  activeTab,
  onTabChange,
  todoQuery,
  logQuery,
  appliedLogQuery,
  onTodoQueryChange,
  onLogQueryChange,
  onExecuteLogSearch,
  todoOptions,
  todoGroups,
  logOptions,
  expandedTodoCategoryIds,
  onToggleTodoCategory,
  selectedTodoIds,
  selectedLogIds,
  onToggleTodo,
  onToggleLog,
  onClose,
  onConfirm
}) => {
  if (!isOpen) {
    return null;
  }

  const isTodoTab = activeTab === 'todo';
  const options = isTodoTab ? todoOptions : logOptions;
  const selectedIds = isTodoTab ? selectedTodoIds : selectedLogIds;
  const query = isTodoTab ? todoQuery : logQuery;
  const onQueryChange = isTodoTab ? onTodoQueryChange : onLogQueryChange;
  const onToggle = isTodoTab ? onToggleTodo : onToggleLog;
  const confirmLabel = isTodoTab ? '加入待办' : '加入记录';
  const normalizedTodoQuery = todoQuery.trim().toLocaleLowerCase();
  const trimmedLogQuery = logQuery.trim();
  const hasTodoSearchQuery = normalizedTodoQuery.length > 0;
  const hasAppliedLogQuery = appliedLogQuery.trim().length > 0;
  const visibleTodoOptions = hasTodoSearchQuery
    ? todoOptions.filter((option) => option.searchText.includes(normalizedTodoQuery))
    : todoOptions;
  const visibleLogOptions = hasAppliedLogQuery ? logOptions : [];
  const isLogSearchButtonDisabled = trimmedLogQuery.length === 0;
  const todoSelectionSet = new Set(selectedTodoIds);

  const renderOptionRow = (option: CollectionAddOption, selectionIds: string[]) => {
    const isSelected = selectionIds.includes(option.id);
    const shouldShowContent = activeTab === 'log' && Boolean(option.content);

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => onToggle(option.id)}
        className={`grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-x-3 px-2 py-3 text-left transition-colors ${
          isSelected
            ? 'bg-stone-100/85'
            : 'bg-transparent hover:bg-stone-50/70'
        }`}
      >
        <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          isSelected
            ? 'border-stone-900 bg-stone-900 text-white'
            : 'border-stone-300 text-transparent'
        }`}>
          <Check size={12} />
        </span>
        <div className="min-w-0">
          <span className={`block text-[15px] font-medium leading-6 text-stone-900 ${shouldShowContent ? 'truncate' : ''}`}>
            {option.title}
          </span>
        </div>
        <div className={`shrink-0 text-[10px] uppercase tracking-[0.14em] text-stone-400 ${shouldShowContent ? 'pt-0.5' : 'self-center'}`}>
          {option.metaLabel}
        </div>
        {shouldShowContent ? (
          <div className="col-[2/4] mt-1 min-w-0">
            <span
              className="block text-[12px] leading-5 text-stone-400 overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 3
              }}
            >
              {option.content}
            </span>
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/10 px-5 py-8 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="flex max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#faf9f6] shadow-[0_18px_70px_rgba(28,25,23,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-stone-200 px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Add to Collection</div>
              <div className="mt-1 truncate text-xl font-bold text-stone-900">{collectionName}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-[#faf9f6] text-stone-400 transition-colors hover:text-stone-700"
              aria-label="关闭添加条目弹窗"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-5 border-b border-stone-200">
            {([
              { id: 'todo', label: '待办' },
              { id: 'log', label: '记录' }
            ] as Array<{ id: CollectionAddTab; label: string }>).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`pb-3 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-stone-900 font-bold text-stone-900'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex flex-1 items-center gap-3 rounded-2xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-500">
              <Search size={15} className="shrink-0 text-stone-400" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (isTodoTab || event.key !== 'Enter') {
                    return;
                  }

                  event.preventDefault();
                  if (!isLogSearchButtonDisabled) {
                    onExecuteLogSearch();
                  }
                }}
                placeholder={isTodoTab ? '搜索待办标题、备注或分类' : '输入关键词后按回车或点搜索'}
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-300"
              />
            </label>
            {!isTodoTab ? (
              <button
                type="button"
                onClick={onExecuteLogSearch}
                disabled={isLogSearchButtonDisabled}
                className="inline-flex h-[46px] items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-300"
              >
                <Search size={14} />
                搜索
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {isTodoTab ? (
            todoOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-10 text-center text-sm italic text-stone-400">
                当前没有可加入的待办
              </div>
            ) : hasTodoSearchQuery ? (
              visibleTodoOptions.length > 0 ? (
                <div>
                  {visibleTodoOptions.map((option) => renderOptionRow(option, selectedTodoIds))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-10 text-center text-sm italic text-stone-400">
                  没有匹配的待办
                </div>
              )
            ) : todoGroups.length > 0 ? (
              <div className="space-y-2">
                {todoGroups.map((group) => {
                  const isExpanded = expandedTodoCategoryIds.includes(group.id);
                  const selectedCount = group.options.reduce((count, option) => (
                    todoSelectionSet.has(option.id) ? count + 1 : count
                  ), 0);
                  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

                  return (
                    <div key={group.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white/55">
                      <button
                        type="button"
                        onClick={() => onToggleTodoCategory(group.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50/80"
                      >
                        <ChevronIcon size={15} className="shrink-0 text-stone-400" />
                        {group.icon ? <IconRenderer icon={group.icon} className="shrink-0 text-sm text-stone-500" /> : null}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-medium text-stone-900">{group.label}</div>
                        </div>
                        <div className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-stone-400">
                          {selectedCount > 0 ? `${selectedCount}/` : ''}{group.options.length}
                        </div>
                      </button>
                      {isExpanded ? (
                        <div className="border-t border-stone-200/80 px-2 py-1">
                          {group.options.map((option) => renderOptionRow(option, selectedTodoIds))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-10 text-center text-sm italic text-stone-400">
                当前没有可加入的待办分类
              </div>
            )
          ) : !hasAppliedLogQuery ? (
            <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-10 text-center text-sm italic text-stone-400">
              输入关键词后点击搜索，再渲染记录结果
            </div>
          ) : visibleLogOptions.length > 0 ? (
            <div>
              {visibleLogOptions.map((option) => renderOptionRow(option, selectedLogIds))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-10 text-center text-sm italic text-stone-400">
              没有匹配的记录
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-stone-200 px-6 py-4">
          <div className="text-sm text-stone-500">
            已选择 <span className="font-semibold text-stone-900">{selectedIds.length}</span> 个条目
          </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors disabled:bg-stone-300"
          >
            <Plus size={14} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CollectionSettingsView: React.FC<CollectionSettingsViewProps> = ({
  onBack,
  onEditLog,
  onEditTodo
}) => {
  const { collections, setCollections, collectionEntries, setCollectionEntries, logs, todos, todoCategories } = useData();
  const { categories, scopes } = useCategoryScope();
  const { uiTheme } = useSettings();
  const {
    isAddModalOpen: isGlobalLogModalOpen,
    isTodoModalOpen: isGlobalTodoDetailOpen
  } = useNavigation();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editName, setEditName] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeAddTab, setActiveAddTab] = useState<CollectionAddTab>('todo');
  const [todoSearchQuery, setTodoSearchQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [appliedLogSearchQuery, setAppliedLogSearchQuery] = useState('');
  const [expandedTodoCategoryIds, setExpandedTodoCategoryIds] = useState<string[]>([]);
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const [isManagingCollections, setIsManagingCollections] = useState(false);
  const [pendingDeleteConfirmation, setPendingDeleteConfirmation] = useState<PendingCollectionDeleteConfirmation | null>(null);

  const sortedCollections = useMemo(
    () => collections,
    [collections]
  );
  const countMap = useMemo(
    () => buildDataCollectionCountMap(collections, collectionEntries, logs, todos),
    [collections, collectionEntries, logs, todos]
  );
  const selectedCollection = useMemo(
    () => collections.find((item) => item.id === selectedCollectionId) || null,
    [collections, selectedCollectionId]
  );
  const resolvedItems = useMemo(
    () => selectedCollectionId
      ? resolveDataCollectionItems(selectedCollectionId, collectionEntries, logs, todos)
      : [],
    [collectionEntries, logs, selectedCollectionId, todos]
  );
  const selectedSummary = selectedCollection ? countMap.get(selectedCollection.id) : undefined;
  const selectedCollectionLogIds = useMemo(
    () => new Set(
      collectionEntries
        .filter((entry) => entry.collectionId === selectedCollectionId && entry.itemType === 'log')
        .map((entry) => entry.itemId)
    ),
    [collectionEntries, selectedCollectionId]
  );
  const selectedCollectionTodoIds = useMemo(
    () => new Set(
      collectionEntries
        .filter((entry) => entry.collectionId === selectedCollectionId && entry.itemType === 'todo')
        .map((entry) => entry.itemId)
    ),
    [collectionEntries, selectedCollectionId]
  );

  useEffect(() => {
    if (!selectedCollection) {
      return;
    }

    setEditName(selectedCollection.name);
  }, [selectedCollection]);

  useEffect(() => {
    if (!selectedCollectionId || isGlobalLogModalOpen || isGlobalTodoDetailOpen) {
      return;
    }

    return registerHardwareBackHandler(() => {
      setSelectedCollectionId(null);
      return true;
    });
  }, [isGlobalLogModalOpen, isGlobalTodoDetailOpen, selectedCollectionId]);

  useEffect(() => {
    if (!isManagingCollections) {
      return;
    }

    return registerHardwareBackHandler(() => {
      setIsManagingCollections(false);
      return true;
    });
  }, [isManagingCollections]);

  useEffect(() => {
    if (!pendingDeleteConfirmation) {
      return;
    }

    return registerHardwareBackHandler(() => {
      setPendingDeleteConfirmation(null);
      return true;
    });
  }, [pendingDeleteConfirmation]);

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setTodoSearchQuery('');
    setLogSearchQuery('');
    setAppliedLogSearchQuery('');
    setExpandedTodoCategoryIds([]);
    setSelectedTodoIds([]);
    setSelectedLogIds([]);
    setActiveAddTab('todo');
  };

  useEffect(() => {
    if (!isAddModalOpen) {
      return;
    }

    return registerHardwareBackHandler(() => {
      closeAddModal();
      return true;
    });
  }, [isAddModalOpen]);

  useEffect(() => {
    if (!isCreating || selectedCollectionId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      createInputRef.current?.focus();
      createInputRef.current?.scrollIntoView({ block: 'nearest' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isCreating, selectedCollectionId]);

  const buildTagString = (
    categoryName: string | undefined,
    categoryIcon: string | undefined,
    categoryUiIcon: string | undefined,
    childName?: string,
    childIcon?: string,
    childUiIcon?: string
  ): string | undefined => {
    if (!categoryName) {
      return undefined;
    }

    const categoryDisplayIcon = categoryIcon
      ? getDisplayIcon(categoryIcon, categoryUiIcon, uiTheme)
      : '';
    const categoryLabel = `${categoryDisplayIcon} ${categoryName}`.trim();

    if (!childName) {
      return categoryLabel;
    }

    const childDisplayIcon = childIcon
      ? getDisplayIcon(childIcon, childUiIcon, uiTheme)
      : '';
    const childLabel = `${childDisplayIcon} ${childName}`.trim();

    return `${categoryLabel} / ${childLabel}`;
  };

  const buildScopeDomainStrings = (scopeIds: string[] | undefined): string[] | undefined => {
    const linkedScopes = (scopeIds || [])
      .map((scopeId) => scopes.find((scope) => scope.id === scopeId))
      .filter((value): value is Scope => Boolean(value));

    if (linkedScopes.length === 0) {
      return undefined;
    }

    return linkedScopes.map((scope) => {
      const scopeIcon = getDisplayIcon(scope.icon, scope.uiIcon, uiTheme);
      return `${scopeIcon} ${scope.name}`.trim();
    });
  };

  const investedSecondsByTodoId = useMemo(() => logs.reduce((accumulator, log) => {
    if (!log.linkedTodoId) {
      return accumulator;
    }

    const duration = Number.isFinite(log.duration)
      ? log.duration
      : Math.max(0, (log.endTime - log.startTime) / 1000);

    accumulator.set(log.linkedTodoId, (accumulator.get(log.linkedTodoId) || 0) + duration);
    return accumulator;
  }, new Map<string, number>()), [logs]);

  const todoCategoryDisplayMetaById = useMemo(() => new Map(
    todoCategories.map((category, index) => [
      category.id,
      {
        order: index,
        label: category.name,
        icon: getDisplayIcon(category.icon, category.uiIcon, uiTheme)
      }
    ])
  ), [todoCategories, uiTheme]);

  const availableTodoIds = useMemo(
    () => new Set(todos.filter((todo) => !selectedCollectionTodoIds.has(todo.id)).map((todo) => todo.id)),
    [selectedCollectionTodoIds, todos]
  );

  const availableLogIds = useMemo(
    () => new Set(logs.filter((log) => !selectedCollectionLogIds.has(log.id)).map((log) => log.id)),
    [logs, selectedCollectionLogIds]
  );

  const availableTodoOptions = useMemo(() => todos
    .filter((todo) => !selectedCollectionTodoIds.has(todo.id))
    .map((todo) => {
      const investedSeconds = investedSecondsByTodoId.get(todo.id) || 0;
      const statusLabel = todo.isCompleted ? 'Done' : 'Task';
      const durationLabel = investedSeconds > 0 ? ` · ${formatAccumulatedDurationCompact(investedSeconds)}` : '';
      const content = todo.note?.trim() || '';
      const categoryMeta = todoCategoryDisplayMetaById.get(todo.categoryId);
      const categoryLabel = categoryMeta?.label || '未分类';

      return {
        id: todo.id,
        title: todo.title,
        content,
        metaLabel: `${statusLabel}${durationLabel}`,
        searchText: buildCollectionSearchText(`${categoryLabel} ${todo.title}`, content),
        categoryId: todo.categoryId,
        categoryLabel,
        categoryIcon: categoryMeta?.icon,
        sortValue: todo.completedAt
          ? new Date(todo.completedAt).getTime()
          : todo.scheduledDate
            ? new Date(`${todo.scheduledDate}T12:00:00`).getTime()
            : 0
      };
    })
    .sort((left, right) => right.sortValue - left.sortValue || left.title.localeCompare(right.title)),
  [investedSecondsByTodoId, selectedCollectionTodoIds, todoCategoryDisplayMetaById, todos]);

  const availableTodoGroups = useMemo<CollectionAddTodoGroup[]>(() => {
    const groupedOptions = new Map<string, CollectionAddOption[]>();

    availableTodoOptions.forEach((option) => {
      const categoryId = option.categoryId || 'uncategorized';
      const bucket = groupedOptions.get(categoryId) || [];
      bucket.push(option);
      groupedOptions.set(categoryId, bucket);
    });

    return Array.from(groupedOptions.entries())
      .map(([categoryId, options]) => {
        const categoryMeta = todoCategoryDisplayMetaById.get(categoryId);
        return {
          id: categoryId,
          label: categoryMeta?.label || options[0]?.categoryLabel || '未分类',
          icon: categoryMeta?.icon || options[0]?.categoryIcon,
          options: [...options].sort((left, right) => right.sortValue - left.sortValue || left.title.localeCompare(right.title)),
          sortOrder: categoryMeta?.order ?? Number.MAX_SAFE_INTEGER
        };
      })
      .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label))
      .map(({ sortOrder: _sortOrder, ...group }) => group);
  }, [availableTodoOptions, todoCategoryDisplayMetaById]);

  const availableLogOptions = useMemo(() => {
    const normalizedQuery = appliedLogSearchQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return logs
      .filter((log) => !selectedCollectionLogIds.has(log.id))
      .map((log) => {
        const category = (categories || []).find((candidate) => candidate.id === log.categoryId);
        const activity = category?.activities.find((candidate) => candidate.id === log.activityId);
        const title = log.title?.trim() || [category?.name, activity?.name].filter(Boolean).join(' / ') || '记录';
        const content = log.note?.trim() || '';

        return {
          id: log.id,
          title,
          content,
          metaLabel: formatEntryDateWithTime(
            new Date(log.startTime).toISOString(),
            new Date(log.endTime).toISOString()
          ),
          searchText: buildCollectionSearchText(title, content),
          sortValue: log.startTime
        };
      })
      .filter((option) => option.searchText.includes(normalizedQuery))
      .sort((left, right) => right.sortValue - left.sortValue);
  }, [appliedLogSearchQuery, categories, logs, selectedCollectionLogIds]);

  useEffect(() => {
    setSelectedTodoIds((current) => current.filter((itemId) => availableTodoIds.has(itemId)));
  }, [availableTodoIds]);

  useEffect(() => {
    setSelectedLogIds((current) => current.filter((itemId) => availableLogIds.has(itemId)));
  }, [availableLogIds]);

  const handleLogSearchQueryChange = (value: string) => {
    setLogSearchQuery(value);
    setAppliedLogSearchQuery('');
  };

  const handleExecuteLogSearch = () => {
    const trimmedQuery = logSearchQuery.trim();
    if (!trimmedQuery) {
      setAppliedLogSearchQuery('');
      return;
    }

    setAppliedLogSearchQuery(trimmedQuery);
  };

  const handleToggleTodoCategory = (categoryId: string) => {
    setExpandedTodoCategoryIds((current) => (
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId]
    ));
  };

  const timelineEntries = useMemo<CollectionTimelineEntry[]>(() => {
    return resolvedItems
      .map((item) => {
        if (item.itemType === 'log') {
          const category = (categories || []).find((candidate) => candidate.id === item.log.categoryId);
          const activity = category?.activities.find((candidate) => candidate.id === item.log.activityId);
          const linkedTodo = item.log.linkedTodoId
            ? (todos || []).find((todo) => todo.id === item.log.linkedTodoId)
            : null;
          const fallbackTitle = [
            category?.name,
            activity?.name
          ].filter(Boolean).join(' / ') || '记录';

          const tagString = buildTagString(
            category?.name,
            category?.icon,
            category?.uiIcon,
            activity?.name,
            activity?.icon,
            activity?.uiIcon
          );

          return {
            id: item.log.id,
            itemType: 'log',
            sourceId: item.log.id,
            date: new Date(item.log.startTime).toISOString(),
            endDate: new Date(item.log.endTime).toISOString(),
            title: item.log.title?.trim() || fallbackTitle,
            content: item.log.note?.trim() || '',
            metaLabel: formatEntryTime(
              new Date(item.log.startTime).toISOString(),
              new Date(item.log.endTime).toISOString()
            ),
            media: item.log.images?.map((image) => ({ type: 'image' as const, url: image })),
            tags: tagString ? [tagString] : undefined,
            relatedTodos: linkedTodo ? [{
              title: linkedTodo.title,
              isProgress: linkedTodo.isProgress,
              progressIncrement: item.log.progressIncrement
            }] : undefined,
            domains: buildScopeDomainStrings(item.log.scopeIds)
          } satisfies CollectionTimelineEntry;
        }

        const todoTimestamp = getCollectionTimelineTodoTimestamp(item.todo, logs, item.entry.addedAt);
        const linkedCategory = item.todo.linkedCategoryId
          ? (categories || []).find((candidate) => candidate.id === item.todo.linkedCategoryId)
          : undefined;
        const linkedActivity = item.todo.linkedActivityId
          ? linkedCategory?.activities.find((candidate) => candidate.id === item.todo.linkedActivityId)
          : undefined;
        const investedSeconds = logs
          .filter((log) => log.linkedTodoId === item.todo.id)
          .reduce((total, log) => total + (Number.isFinite(log.duration) ? log.duration : Math.max(0, (log.endTime - log.startTime) / 1000)), 0);
        const tagString = buildTagString(
          linkedCategory?.name,
          linkedCategory?.icon,
          linkedCategory?.uiIcon,
          linkedActivity?.name,
          linkedActivity?.icon,
          linkedActivity?.uiIcon
        );

        return {
          id: `todo-${item.todo.id}`,
          itemType: 'task',
          sourceId: item.todo.id,
          date: new Date(todoTimestamp).toISOString(),
          title: item.todo.title,
          content: item.todo.note?.trim() || '',
          metaLabel: formatAccumulatedDurationCompact(investedSeconds),
          media: item.todo.coverImage ? [{ type: 'image' as const, url: item.todo.coverImage }] : undefined,
          tags: tagString ? [tagString] : undefined,
          domains: buildScopeDomainStrings(item.todo.defaultScopeIds)
        } satisfies CollectionTimelineEntry;
      })
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [resolvedItems, categories, uiTheme, scopes, logs]);

  const groupedTimeline = useMemo(() => {
    const dayMap = new Map<number, CollectionTimelineEntry[]>();

    timelineEntries.forEach((entry) => {
      const timestamp = new Date(entry.date).getTime();
      const dayKey = getStartOfDay(timestamp);
      const bucket = dayMap.get(dayKey) || [];
      bucket.push(entry);
      dayMap.set(dayKey, bucket);
    });

    return Array.from(dayMap.entries())
      .sort((first, second) => second[0] - first[0])
      .map(([dayKey, items]) => ({
        dayKey,
        ...formatDateGroupLabel(dayKey),
        items: items.sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
      }));
  }, [timelineEntries]);

  const handleCreateCollection = () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      return;
    }

    const now = Date.now();
    const nextCollection: DataCollection = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: now,
      updatedAt: now
    };

    setCollections((prev) => [nextCollection, ...prev]);
    setDraftName('');
    setIsCreating(false);
    setSelectedCollectionId(nextCollection.id);
  };

  const handleSaveCollectionMeta = () => {
    if (!selectedCollection) {
      return;
    }

    const trimmedName = editName.trim();
    if (!trimmedName) {
      return;
    }

    const now = Date.now();
    setCollections((prev) => prev.map((item) => (
      item.id === selectedCollection.id
        ? {
            ...item,
            name: trimmedName,
            updatedAt: now
          }
        : item
    )));
    setIsEditingCollection(false);
  };

  const handleOpenTimelineEntry = (entry: CollectionTimelineEntry) => {
    if (entry.itemType === 'log') {
      const targetLog = logs.find((log) => log.id === entry.sourceId);
      if (targetLog) {
        onEditLog?.(targetLog);
      }
      return;
    }

    const targetTodo = todos.find((todo) => todo.id === entry.sourceId);
    if (targetTodo) {
      onEditTodo?.(targetTodo);
    }
  };

  const handleOpenAddModal = () => {
    setTodoSearchQuery('');
    setLogSearchQuery('');
    setAppliedLogSearchQuery('');
    setExpandedTodoCategoryIds([]);
    setSelectedTodoIds([]);
    setSelectedLogIds([]);
    setActiveAddTab(availableTodoOptions.length > 0 || availableLogIds.size === 0 ? 'todo' : 'log');
    setIsAddModalOpen(true);
  };

  const handleConfirmAddItems = () => {
    if (!selectedCollection) {
      return;
    }

    const itemType = activeAddTab === 'todo' ? 'todo' : 'log';
    const itemIds = activeAddTab === 'todo' ? selectedTodoIds : selectedLogIds;
    if (itemIds.length === 0) {
      return;
    }

    const now = Date.now();
    setCollectionEntries((prev) => appendDataCollectionEntries({
      entries: prev,
      collectionId: selectedCollection.id,
      itemType,
      itemIds,
      addedAt: now
    }));
    setCollections((prev) => prev
      .map((item) => (
        item.id === selectedCollection.id
          ? { ...item, updatedAt: now }
          : item
      )));
    closeAddModal();
  };

  const applyCollectionManagementSave = (nextCollections: DataCollection[]) => {
    const previousCollectionIds = new Set(collections.map((collection) => collection.id));
    const nextCollectionIds = new Set(nextCollections.map((collection) => collection.id));
    const deletedCollectionIds = new Set(
      Array.from(previousCollectionIds).filter((collectionId) => !nextCollectionIds.has(collectionId))
    );
    const now = Date.now();

    setCollections(nextCollections.map((collection) => ({
      ...collection,
      name: collection.name.trim() || 'Untitled Collection',
      updatedAt: deletedCollectionIds.size > 0 || previousCollectionIds.has(collection.id) ? now : collection.updatedAt
    })));

    if (deletedCollectionIds.size > 0) {
      setCollectionEntries((prev) => prev.filter((entry) => !deletedCollectionIds.has(entry.collectionId)));

      if (selectedCollectionId && deletedCollectionIds.has(selectedCollectionId)) {
        setSelectedCollectionId(null);
      }
    }

    setIsManagingCollections(false);
  };

  const handleSaveCollectionManagement = (nextCollections: DataCollection[]) => {
    const previousCollectionIds = new Set(collections.map((collection) => collection.id));
    const nextCollectionIds = new Set(nextCollections.map((collection) => collection.id));
    const deletedCollectionIds = new Set(
      Array.from(previousCollectionIds).filter((collectionId) => !nextCollectionIds.has(collectionId))
    );

    if (deletedCollectionIds.size === 0) {
      applyCollectionManagementSave(nextCollections);
      return;
    }

    const unlinkedEntryCount = collectionEntries.filter((entry) => deletedCollectionIds.has(entry.collectionId)).length;

    setPendingDeleteConfirmation({
      nextCollections,
      deletedCount: deletedCollectionIds.size,
      unlinkedEntryCount
    });
  };

  const renderList = () => (
    <div className="min-h-full bg-[#faf9f6] px-7 pb-24 pt-4">
      <div className="space-y-0">
        {sortedCollections.length === 0 ? (
          <div className="border-b border-stone-200 py-4 text-sm text-stone-400">
            No collections yet
          </div>
        ) : (
          sortedCollections.map((collection) => {
            const countSummary = countMap.get(collection.id);

            return (
              <CollectionDirectoryRow
                key={collection.id}
                collection={collection}
                totalCount={countSummary?.total || 0}
                logCount={countSummary?.logCount || 0}
                todoCount={countSummary?.todoCount || 0}
                onOpen={() => setSelectedCollectionId(collection.id)}
              />
            );
          })
        )}

        {isCreating ? (
          <div className="border-b border-stone-200 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-stone-300">◬</span>
              <input
                ref={createInputRef}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="新建 Collection"
                className="min-w-0 flex-1 border-b border-stone-200 bg-transparent pb-2 text-lg font-bold text-stone-900 outline-none placeholder:text-stone-300"
              />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-stone-400">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                aria-label="取消新建 Collection"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50/70 transition-colors hover:border-stone-300 hover:text-stone-700"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={handleCreateCollection}
                aria-label="确认新建 Collection"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50/70 transition-colors hover:border-stone-300 hover:text-stone-700"
              >
                <Check size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center justify-between gap-4 border-b border-stone-200 py-4 text-left transition-colors hover:bg-stone-50/60"
          >
            <div className="flex items-center gap-2 text-lg font-bold text-stone-900">
              <span className="text-sm font-normal text-stone-300">◬</span>
              <span>新建 Collection</span>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-300">
              <Plus size={15} />
            </div>
          </button>
        )}
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedCollection) {
      return null;
    }

    return (
      <div className="h-full bg-[#faf9f6] overflow-y-auto no-scrollbar pb-24 px-7 pt-4">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {isEditingCollection ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-normal text-stone-300">◬</span>
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="min-w-0 flex-1 border-b border-stone-200 bg-transparent pb-2 text-2xl font-bold text-stone-900 outline-none"
                  />
                </div>
              ) : (
                <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900">
                  <span className="text-sm font-normal text-stone-300">◬</span>
                  <span className="truncate">{selectedCollection.name}</span>
                </h1>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <button
                type="button"
                onClick={isEditingCollection ? handleSaveCollectionMeta : () => setIsEditingCollection(true)}
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-400 transition-colors hover:text-stone-700"
              >
                {isEditingCollection ? <Save size={14} /> : <PencilLine size={14} />}
                {isEditingCollection ? 'Save' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-400 transition-colors hover:text-stone-700"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] uppercase tracking-[0.12em] text-stone-400">
            <span>Upd {formatUpdatedAt(selectedCollection.updatedAt)}</span>
            <span className="mx-3">{formatCountBadge(resolvedItems.length)} Items</span>
            <span className="mr-3">{formatCountBadge(selectedSummary?.logCount || 0)} Log</span>
            <span>{formatCountBadge(selectedSummary?.todoCount || 0)} Task</span>
          </div>
        </div>

        {groupedTimeline.length === 0 ? (
          <div className="border border-dashed border-stone-200 rounded-2xl py-10 text-center text-sm italic text-stone-400">
            No items yet
          </div>
        ) : (
          <div className="flex flex-col">
            {groupedTimeline.map((group) => (
              <div key={group.dayKey} className="flex w-full mb-6">
                <div className="relative w-12 flex-shrink-0">
                  <div className="sticky top-6 pr-3 text-right">
                    <span className="block font-serif text-xl md:text-2xl text-gray-900 font-semibold leading-none">
                      {group.dateLabel}
                    </span>
                    <span className="block font-sans text-[10px] font-bold text-stone-400 tracking-widest mt-1">
                      {group.weekLabel}
                    </span>
                  </div>
                  <div className="absolute top-0 right-0 w-px bg-gray-200 h-full" />
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  {group.items.map((entry) => (
                    <CollectionTimelineEntryCard
                      key={entry.id}
                      entry={entry}
                      onOpen={(onEditLog || onEditTodo) ? () => handleOpenTimelineEntry(entry) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#faf9f6] animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {!isManagingCollections ? (
        <div className="sticky top-0 z-10 border-b border-stone-200 bg-[#faf9f6]/96 backdrop-blur-sm">
        <div className="relative mx-auto flex h-14 max-w-5xl items-center px-5">
          <button
            type="button"
            onClick={selectedCollectionId ? () => setSelectedCollectionId(null) : onBack}
            className="inline-flex items-center gap-2 text-stone-400 transition-colors hover:text-stone-700"
            aria-label={selectedCollectionId ? '返回 Collection 列表' : '返回设置'}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="pointer-events-none absolute left-1/2 max-w-[70%] -translate-x-1/2 truncate text-center text-[1.15rem] font-medium text-stone-900">
            {selectedCollectionId ? 'Collection Detail' : 'Collection'}
          </div>
          {!selectedCollectionId ? (
            <button
              type="button"
              onClick={() => setIsManagingCollections(true)}
              className="group ml-auto inline-flex items-center justify-center text-[0px]"
              title="管理 Collection"
              aria-label="管理 Collection"
            >
              <Settings2 size={16} className="rotate-90 text-stone-400 transition-colors group-hover:text-stone-700" />
              管理
            </button>
          ) : null}
        </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        {isManagingCollections ? (
          <CollectionManageView
            collections={collections}
            onBack={() => setIsManagingCollections(false)}
            onSave={handleSaveCollectionManagement}
          />
        ) : selectedCollectionId ? renderDetail() : renderList()}
      </div>
      <CollectionAddModal
        isOpen={isAddModalOpen && Boolean(selectedCollection)}
        collectionName={selectedCollection?.name || ''}
        activeTab={activeAddTab}
        onTabChange={setActiveAddTab}
        todoQuery={todoSearchQuery}
        logQuery={logSearchQuery}
        appliedLogQuery={appliedLogSearchQuery}
        onTodoQueryChange={setTodoSearchQuery}
        onLogQueryChange={handleLogSearchQueryChange}
        onExecuteLogSearch={handleExecuteLogSearch}
        todoOptions={availableTodoOptions}
        todoGroups={availableTodoGroups}
        logOptions={availableLogOptions}
        expandedTodoCategoryIds={expandedTodoCategoryIds}
        onToggleTodoCategory={handleToggleTodoCategory}
        selectedTodoIds={selectedTodoIds}
        selectedLogIds={selectedLogIds}
        onToggleTodo={(todoId) => setSelectedTodoIds((current) => current.includes(todoId)
          ? current.filter((id) => id !== todoId)
          : [...current, todoId])}
        onToggleLog={(logId) => setSelectedLogIds((current) => current.includes(logId)
          ? current.filter((id) => id !== logId)
          : [...current, logId])}
        onClose={closeAddModal}
        onConfirm={handleConfirmAddItems}
      />
      <ConfirmModal
        isOpen={Boolean(pendingDeleteConfirmation)}
        onClose={() => setPendingDeleteConfirmation(null)}
        onConfirm={() => {
          if (!pendingDeleteConfirmation) {
            return;
          }

          applyCollectionManagementSave(pendingDeleteConfirmation.nextCollections);
          setPendingDeleteConfirmation(null);
        }}
        title="确认删除 Collection"
        description={pendingDeleteConfirmation
          ? `你删除了 ${pendingDeleteConfirmation.deletedCount} 个条目，将解除 ${pendingDeleteConfirmation.unlinkedEntryCount} 条和这些 collection 的关联关系，是否继续？`
          : ''}
        confirmText="继续"
        cancelText="取消"
        type="warning"
      />
    </div>
  );
};
