/**
 * @file AchievementCollectionsTab.tsx
 * @input Achievement collection catalog, owned collection records, and redemption handlers from the achievement context
 * @output Collection exchange manager and shelf-style owned collection display used inside the achievement ledger
 * @pos Component (Achievement Collection Tab)
 * @description Renders collectible bottle exchange controls, a visual bottle picker inspired by the emoji selector, and a tightly packed shelf view for redeemed collections.
 *
 * @updated 2026-03-29: Bottle picker allows repeat redemption; shelf wraps into grid; redeem dialog now uses a side-by-side preview and copy layout.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageOff, Plus, X } from 'lucide-react';
import { DEFAULT_ACHIEVEMENT_COLLECTION_COST } from '../../constants/achievementCollections';
import { AchievementCollection, AchievementCollectionRecord } from '../../types';
import { formatAchievementStars, normalizeAchievementStarValue } from '../../utils/achievementUtils';
import { AchievementDialog } from './AchievementDialog';

// 添加瓶子入场动画样式
if (typeof document !== 'undefined') {
  const styleId = 'achievement-bottle-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

interface AchievementCollectionsTabProps {
  availableStars: number;
  collections: AchievementCollection[];
  collectionRecords: AchievementCollectionRecord[];
  onUpdateCollection: (collection: AchievementCollection) => void;
  onDeleteCollection: (collectionId: string) => void;
  onRedeemCollection: (collection: AchievementCollection, note?: string) => { ok: boolean; message?: string };
}

type DialogMode = 'picker' | 'edit' | 'redeem' | null;

interface CollectionDraft {
  name: string;
  cost: number;
  imagePath: string;
  description: string;
}

const createCollectionDraft = (collection?: AchievementCollection | null): CollectionDraft => ({
  name: collection?.name || '',
  cost: collection?.cost || DEFAULT_ACHIEVEMENT_COLLECTION_COST,
  imagePath: collection?.imagePath || '',
  description: collection?.description || ''
});

const isSameCollectionDraft = (left: CollectionDraft, right: CollectionDraft) => (
  left.name === right.name
  && left.cost === right.cost
  && left.imagePath === right.imagePath
  && left.description === right.description
);

const BottlePreview: React.FC<{
  imagePath?: string;
  alt: string;
  size?: 'sm' | 'lg' | 'picker';
  transparent?: boolean;
}> = ({ imagePath, alt, size = 'sm', transparent = false }) => {
  const wrapperClassName = size === 'lg'
    ? transparent
      ? 'flex h-20 items-end justify-center px-3 pb-0 pt-3'
      : 'flex h-20 items-end justify-center rounded-[1.5rem] bg-white/75 px-3 pb-2 pt-3'
    : size === 'picker'
      ? 'flex h-24 items-end justify-center rounded-[1.6rem] bg-stone-50 px-3 pb-3 pt-4 transition-all'
      : 'flex h-14 w-14 items-end justify-center rounded-2xl bg-stone-100/80 px-2 pb-1 pt-2';
  const imageClassName = size === 'lg'
    ? 'max-h-[70px] w-auto max-w-none object-contain drop-shadow-[0_8px_12px_rgba(120,113,108,0.16)]'
    : size === 'picker'
      ? 'max-h-[72px] w-auto max-w-none object-contain drop-shadow-[0_10px_16px_rgba(120,113,108,0.16)]'
      : 'max-h-[42px] w-auto max-w-none object-contain drop-shadow-[0_8px_12px_rgba(120,113,108,0.14)]';
  const placeholderClassName = size === 'lg'
    ? 'flex h-[70px] w-[46px] items-center justify-center rounded-[1.2rem] border border-dashed border-stone-300 text-stone-400'
    : size === 'picker'
      ? 'flex h-[72px] w-[44px] items-center justify-center rounded-[1.1rem] border border-dashed border-stone-300 text-stone-400'
      : 'flex h-[42px] w-[28px] items-center justify-center rounded-[0.9rem] border border-dashed border-stone-300 text-stone-400';

  return (
    <div className={wrapperClassName}>
      {imagePath ? (
        <img src={imagePath} alt={alt} className={imageClassName} />
      ) : (
        <div className={placeholderClassName}>
          <ImageOff size={size === 'sm' ? 14 : 18} />
        </div>
      )}
    </div>
  );
};

export const AchievementCollectionsTab: React.FC<AchievementCollectionsTabProps> = ({
  availableStars,
  collections,
  collectionRecords,
  onUpdateCollection,
  onDeleteCollection,
  onRedeemCollection
}) => {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CollectionDraft>(createCollectionDraft());
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [bottlesPerRow, setBottlesPerRow] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);

  const ownedCollections = useMemo(() => {
    return [...collectionRecords].sort((first, second) => first.redeemedAt - second.redeemedAt);
  }, [collectionRecords]);

  const ownedCollectionIds = useMemo(() => {
    return new Set(collectionRecords.map((record) => record.collectionId));
  }, [collectionRecords]);

  // 动态计算每行瓶子数量
  useEffect(() => {
    const calculateBottlesPerRow = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const padding = 32; // px-4 = 16px * 2
      const availableWidth = containerWidth - padding;
      const bottleWidth = 76; // 固定瓶子容器宽度（缩小后）
      
      const count = Math.floor(availableWidth / bottleWidth);
      setBottlesPerRow(Math.max(3, count));
    };

    calculateBottlesPerRow();
    window.addEventListener('resize', calculateBottlesPerRow);
    return () => window.removeEventListener('resize', calculateBottlesPerRow);
  }, []);

  const bottleRows = useMemo(() => {
    const rows: AchievementCollectionRecord[][] = [];
    for (let i = 0; i < ownedCollections.length; i += bottlesPerRow) {
      rows.push(ownedCollections.slice(i, i + bottlesPerRow));
    }
    return rows;
  }, [ownedCollections, bottlesPerRow]);

  const selectedCollection = selectedCollectionId
    ? collections.find((collection) => collection.id === selectedCollectionId) || null
    : null;

  useEffect(() => {
    if (dialogMode === 'edit' && selectedCollection) {
      const nextDraft = createCollectionDraft(selectedCollection);
      setDraft((previous) => (isSameCollectionDraft(previous, nextDraft) ? previous : nextDraft));
    }
  }, [dialogMode, selectedCollection]);

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedCollectionId(null);
    setDraft(createCollectionDraft());
    setRedeemError(null);
  };

  const handleCollectionSave = () => {
    if (!draft.name.trim() || !selectedCollection) {
      return;
    }

    onUpdateCollection({
      ...selectedCollection,
      name: draft.name.trim(),
      cost: Math.max(0.1, normalizeAchievementStarValue(Number(draft.cost) || DEFAULT_ACHIEVEMENT_COLLECTION_COST)),
      imagePath: draft.imagePath.trim() || undefined,
      description: draft.description.trim() || undefined,
      enabled: true
    });
    closeDialog();
  };

  const handleRedeem = () => {
    if (!selectedCollection) {
      return;
    }

    const result = onRedeemCollection(selectedCollection);
    if (!result.ok) {
      setRedeemError(result.message || '兑换失败，请稍后重试');
      return;
    }

    closeDialog();
  };

  // 只检查光点是否足够，不限制重复兑换
  const canRedeemCollection = (collection: AchievementCollection) => (
    availableStars >= collection.cost
  );

  const canRedeemSelected = Boolean(
    dialogMode === 'redeem'
      && selectedCollection
      && canRedeemCollection(selectedCollection)
  );

  const pickerCollections = useMemo(() => {
    return [...collections].sort((a, b) => a.createdAt - b.createdAt);
  }, [collections]);

  const pickerModal = dialogMode === 'picker' ? createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeDialog}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeDialog}
          className="absolute right-4 top-4 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
          aria-label="关闭收藏选择器"
        >
          <X size={20} />
        </button>

        <h3 className="text-center text-2xl font-bold text-stone-900">
          Pick A Bottle
        </h3>
        <p className="mt-1 text-center text-xs font-bold uppercase tracking-widest text-stone-400">
          SELECT YOUR COLLECTION
        </p>
        <p className="mt-3 text-center text-sm text-stone-500">
          当前可用 <span className="font-medium text-stone-700">{formatAchievementStars(availableStars)}</span> 光点
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2 max-h-[min(55vh,26rem)] overflow-y-auto">
          {pickerCollections.map((collection) => {
            const isOwned = ownedCollectionIds.has(collection.id);
            const canRedeem = canRedeemCollection(collection);

            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => {
                  setSelectedCollectionId(collection.id);
                  setDialogMode('redeem');
                }}
                disabled={!canRedeem}
                className={`relative flex flex-col items-center p-2 rounded-2xl transition-all ${
                  canRedeem
                    ? 'hover:bg-stone-50 cursor-pointer'
                    : 'opacity-50 cursor-default'
                }`}
                aria-label={`选择兑换 ${collection.name}`}
              >
                <div className="relative flex items-center justify-center w-16 h-16">
                  {collection.imagePath ? (
                    <img
                      src={collection.imagePath}
                      alt={collection.name}
                      className="max-h-[56px] w-auto object-contain drop-shadow-[0_6px_10px_rgba(120,113,108,0.18)]"
                    />
                  ) : (
                    <div className="flex h-14 w-10 items-center justify-center rounded-xl border border-dashed border-stone-300 text-stone-400">
                      <ImageOff size={14} />
                    </div>
                  )}
                  {isOwned && (
                    <div className="absolute -right-1 -top-1 rounded-full bg-stone-400 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      已藏
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[10px] leading-tight text-stone-500 text-center line-clamp-1 w-full">
                  {`${formatAchievementStars(collection.cost)}✦`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="space-y-8">
      <section>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-[14px]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
            My Collection / {ownedCollections.length}
          </div>
          <button
            type="button"
            onClick={() => setDialogMode('picker')}
            className="inline-flex items-center gap-2 text-sm text-stone-900 transition-colors hover:text-stone-600"
          >
            <Plus size={15} />
            新增收藏
          </button>
        </header>

        {ownedCollections.length === 0 ? (
          <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
            还没有收藏瓶子。点击"新增收藏"后，会打开预览选择器让你直接挑瓶子兑换。
          </div>
        ) : (
          <div ref={containerRef} className="relative mt-3 space-y-4">
            {/* 动态分组的多层货架 */}
            {bottleRows.map((rowBottles, rowIndex) => (
              <div key={`row-${rowIndex}`} className="relative">
                {/* 瓶子行 - 网格布局，固定大小，居中对齐 */}
                <div className="relative z-10 grid gap-0.5 px-4 -mb-3 justify-center" style={{ gridTemplateColumns: `repeat(${bottlesPerRow}, 76px)` }}>
                  {rowBottles.map((record, colIndex) => {
                    const index = rowIndex * bottlesPerRow + colIndex;
                    return (
                      <div 
                        key={record.id} 
                        className="group flex items-end justify-center transition-all duration-300 hover:-translate-y-2 hover:z-20" 
                        style={{ 
                          animation: `fadeInUp 0.4s ease-out ${index * 0.06}s both`,
                          filter: 'drop-shadow(0 8px 12px rgba(120, 80, 50, 0.25))'
                        }}
                      >
                        <BottlePreview 
                          imagePath={record.imagePath} 
                          alt={record.collectionName} 
                          size="lg"
                          transparent={true}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* 木板货架 - 浅色，在瓶子下方 */}
                <div className="relative z-0 mx-2">
                  {/* 木板主体 */}
                  <div className="h-4 rounded-lg bg-gradient-to-b from-amber-600/50 via-amber-500/55 to-amber-700/60 shadow-[0_6px_20px_rgba(120,80,50,0.35)]">
                    {/* 木纹 */}
                    <div 
                      className="h-full rounded-lg opacity-20" 
                      style={{
                        backgroundImage: `
                          repeating-linear-gradient(
                            90deg,
                            transparent,
                            transparent 5px,
                            rgba(139, 69, 19, 0.4) 5px,
                            rgba(139, 69, 19, 0.4) 6px
                          )
                        `
                      }} 
                    />
                  </div>
                  
                  {/* 木板顶部高光 */}
                  <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-lg bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
                  
                  {/* 木板前缘立体感 */}
                  <div className="absolute inset-x-0 -bottom-1 h-2 rounded-b-lg bg-gradient-to-b from-amber-800/40 to-amber-900/50 shadow-[0_3px_8px_rgba(0,0,0,0.3)]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {pickerModal}

      <AchievementDialog
        isOpen={dialogMode === 'edit' && !!selectedCollection}
        title={selectedCollection?.name || '编辑收藏'}
        subtitle="修改收藏信息不会影响已经兑换过的收藏记录。"
        onClose={closeDialog}
        footer={(
          <div className="flex items-center justify-between gap-3">
            {selectedCollection ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteCollection(selectedCollection.id);
                  closeDialog();
                }}
                className="text-sm text-rose-500 transition-colors hover:text-rose-600"
              >
                删除收藏
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCollectionSave}
                disabled={!draft.name.trim()}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors disabled:bg-stone-300"
              >
                保存
              </button>
            </div>
          </div>
        )}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <div className="space-y-5">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">收藏名称</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
                  className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
                  placeholder="例如：鎏金细颈瓶"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">成本（光点）</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={draft.cost}
                  onChange={(event) => setDraft((previous) => ({ ...previous, cost: Number(event.target.value) }))}
                  className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
                />
                <div className="mt-2 text-xs text-stone-400">Current: {formatAchievementStars(draft.cost)} 光点</div>
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">图片路径</span>
                <input
                  value={draft.imagePath}
                  onChange={(event) => setDraft((previous) => ({ ...previous, imagePath: event.target.value }))}
                  className="mt-2 w-full border-b border-stone-300 bg-transparent px-0 py-2 text-[1rem] text-stone-900 outline-none focus:border-stone-900"
                  placeholder="/bottle/01.png"
                />
              </label>
            </div>
            <BottlePreview imagePath={draft.imagePath.trim() || undefined} alt={draft.name.trim() || '收藏预览'} size="lg" />
          </div>
        </div>
      </AchievementDialog>

      <AchievementDialog
        isOpen={dialogMode === 'redeem' && !!selectedCollection}
        title={selectedCollection ? `兑换 ${selectedCollection.name}` : '兑换收藏'}
        subtitle={selectedCollection ? `需要 ${formatAchievementStars(selectedCollection.cost)} 光点 · 当前可用 ${formatAchievementStars(availableStars)} 光点` : undefined}
        onClose={closeDialog}
        footer={(
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleRedeem}
              disabled={!canRedeemSelected}
              className="rounded-full px-4 py-2 text-sm text-stone-900 transition-all disabled:bg-stone-300 disabled:text-white"
              style={canRedeemSelected ? {
                backgroundColor: '#e7e5e4',
                boxShadow: '0 10px 24px rgba(120, 113, 108, 0.14)'
              } : undefined}
            >
              确认兑换
            </button>
          </div>
        )}
      >
        {selectedCollection && (
          <div className="flex items-center gap-4 rounded-[1.75rem] bg-stone-50/70 px-4 py-4">
            <div className="w-[120px] shrink-0">
              <BottlePreview imagePath={selectedCollection.imagePath} alt={selectedCollection.name} size="lg" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm leading-6 text-stone-500">
                {canRedeemSelected
                  ? `兑换成功后剩余 ${formatAchievementStars(normalizeAchievementStarValue(availableStars - selectedCollection.cost))} 光点，这个瓶子会立刻摆进你的收藏货架。`
                  : '当前光点不足，暂时无法兑换这个收藏瓶子。'}
              </p>
              {redeemError && (
                <div className="text-sm text-rose-500">{redeemError}</div>
              )}
            </div>
          </div>
        )}
      </AchievementDialog>
    </div>
  );
};
