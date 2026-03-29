/**
 * @file AchievementCollectionsTab.tsx
 * @input Achievement collection catalog, owned collection records, and redemption handlers from the achievement context
 * @output Collection exchange manager and shelf-style owned collection display used inside the achievement ledger
 * @pos Component (Achievement Collection Tab)
 * @description Renders collectible bottle exchange controls, a visual bottle picker inspired by the emoji selector, and a tightly packed shelf view for redeemed collections.
 *
 * @updated 2026-03-28: Changed the add-collection entry into a preview-based bottle picker for star redemption while keeping collection editing separate.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gift, ImageOff, Pencil, Plus, X } from 'lucide-react';
import { DEFAULT_ACHIEVEMENT_COLLECTION_COST } from '../../constants/achievementCollections';
import { AchievementCollection, AchievementCollectionRecord } from '../../types';
import { formatAchievementStars, normalizeAchievementStarValue } from '../../utils/achievementUtils';
import { AchievementDialog } from './AchievementDialog';

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

const chunkCollectionRecords = (records: AchievementCollectionRecord[], shelfSize: number): AchievementCollectionRecord[][] => {
  const result: AchievementCollectionRecord[][] = [];

  for (let index = 0; index < records.length; index += shelfSize) {
    result.push(records.slice(index, index + shelfSize));
  }

  return result;
};

const BottlePreview: React.FC<{
  imagePath?: string;
  alt: string;
  size?: 'sm' | 'lg' | 'picker';
}> = ({ imagePath, alt, size = 'sm' }) => {
  const wrapperClassName = size === 'lg'
    ? 'flex h-28 items-end justify-center rounded-[1.75rem] bg-white/75 px-4 pb-3 pt-4'
    : size === 'picker'
      ? 'flex h-24 items-end justify-center rounded-[1.6rem] bg-stone-50 px-3 pb-3 pt-4 transition-all'
      : 'flex h-14 w-14 items-end justify-center rounded-2xl bg-stone-100/80 px-2 pb-1 pt-2';
  const imageClassName = size === 'lg'
    ? 'max-h-[90px] w-auto max-w-none object-contain drop-shadow-[0_10px_16px_rgba(120,113,108,0.18)]'
    : size === 'picker'
      ? 'max-h-[72px] w-auto max-w-none object-contain drop-shadow-[0_10px_16px_rgba(120,113,108,0.16)]'
      : 'max-h-[42px] w-auto max-w-none object-contain drop-shadow-[0_8px_12px_rgba(120,113,108,0.14)]';
  const placeholderClassName = size === 'lg'
    ? 'flex h-[90px] w-[58px] items-center justify-center rounded-[1.4rem] border border-dashed border-stone-300 text-stone-400'
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

  const orderedCollections = useMemo(() => {
    return [...collections].sort((first, second) => second.updatedAt - first.updatedAt);
  }, [collections]);

  const ownedCollections = useMemo(() => {
    return [...collectionRecords].sort((first, second) => first.redeemedAt - second.redeemedAt);
  }, [collectionRecords]);

  const ownedCollectionIds = useMemo(() => {
    return new Set(collectionRecords.map((record) => record.collectionId));
  }, [collectionRecords]);

  const collectionShelves = useMemo(() => chunkCollectionRecords(ownedCollections, 4), [ownedCollections]);

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

  const canRedeemCollection = (collection: AchievementCollection) => (
    availableStars >= collection.cost && !ownedCollectionIds.has(collection.id)
  );

  const canRedeemSelected = Boolean(
    dialogMode === 'redeem'
      && selectedCollection
      && canRedeemCollection(selectedCollection)
  );

  const pickerModal = dialogMode === 'picker' ? createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeDialog}
    >
      <div
        className="relative w-full max-w-md rounded-[2rem] bg-white px-6 pb-6 pt-7 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeDialog}
          className="absolute right-4 top-4 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          aria-label="关闭收藏选择器"
        >
          <X size={18} />
        </button>

        <h3 className="text-center text-[2rem] font-normal tracking-tight text-stone-900">
          Pick A Bottle
        </h3>
        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.26em] text-stone-400">
          SELECT YOUR COLLECTION
        </p>
        <div className="mt-4 text-center text-sm text-stone-500">
          当前可用 {formatAchievementStars(availableStars)} 光点
        </div>

        <div className="mt-6 grid max-h-[min(60vh,28rem)] grid-cols-4 gap-3 overflow-y-auto pr-1">
          {orderedCollections.map((collection) => {
            const isOwned = ownedCollectionIds.has(collection.id);
            const canRedeem = canRedeemCollection(collection);

            return (
              <button
                key={collection.id}
                type="button"
                disabled={!canRedeem}
                onClick={() => {
                  setSelectedCollectionId(collection.id);
                  setDialogMode('redeem');
                }}
                className={`relative rounded-[1.7rem] border p-2 transition-all ${
                  canRedeem
                    ? 'border-stone-200 bg-white hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_16px_28px_rgba(120,113,108,0.12)]'
                    : 'border-stone-200 bg-stone-50/80 opacity-70'
                }`}
                aria-label={`选择兑换 ${collection.name}`}
              >
                <div className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium text-stone-500 bg-white/90 shadow-sm">
                  {isOwned ? '已藏' : formatAchievementStars(collection.cost)}
                </div>
                <BottlePreview imagePath={collection.imagePath} alt={collection.name} size="picker" />
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
            Collections / {orderedCollections.length}
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

        {orderedCollections.length === 0 ? (
          <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
            还没有可兑换的收藏瓶子。后续补充瓶子资源后，这里会直接显示可选预览。
          </div>
        ) : (
          <div className="mt-[14px] divide-y divide-stone-200">
            {orderedCollections.map((collection) => {
              const canRedeem = canRedeemCollection(collection);
              const isOwned = ownedCollectionIds.has(collection.id);

              return (
                <div key={collection.id} className="flex items-center justify-between gap-4 py-[14px]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <BottlePreview imagePath={collection.imagePath} alt={collection.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] leading-none text-stone-900">{collection.name}</div>
                      <div className="mt-[6px] text-[13px] leading-6 text-stone-500">
                        {isOwned ? '已收藏' : `成本 ${formatAchievementStars(collection.cost)} 光点`}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <button
                      type="button"
                      disabled={!canRedeem}
                      onClick={() => {
                        setRedeemError(null);
                        setSelectedCollectionId(collection.id);
                        setDialogMode('redeem');
                      }}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                        canRedeem ? 'text-stone-900' : 'bg-stone-200 text-stone-400'
                      }`}
                      style={canRedeem ? {
                        backgroundColor: '#e7e5e4',
                        boxShadow: '0 8px 18px rgba(120, 113, 108, 0.14)'
                      } : undefined}
                      aria-label="兑换收藏"
                    >
                      <Gift size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCollectionId(collection.id);
                        setDialogMode('edit');
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors"
                      style={{
                        color: '#57534e',
                        borderColor: '#d6d3d1',
                        backgroundColor: '#fafaf9'
                      }}
                      aria-label="编辑收藏"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-[14px]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
            My Collection / {ownedCollections.length}
          </div>
        </header>

        {collectionShelves.length === 0 ? (
          <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
            还没有收藏瓶子。点击“新增收藏”后，会打开预览选择器让你直接挑瓶子兑换。
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {collectionShelves.map((shelf, shelfIndex) => (
              <div
                key={`shelf-${shelfIndex}`}
                className="rounded-[2rem] border border-stone-200/70 bg-white/60 px-4 pb-3 pt-4 shadow-[0_18px_40px_rgba(120,113,108,0.06)]"
              >
                <div className="flex items-end gap-2 overflow-x-auto pb-3">
                  {shelf.map((record) => (
                    <div key={record.id} className="flex shrink-0 items-end justify-end">
                      <BottlePreview imagePath={record.imagePath} alt={record.collectionName} size="lg" />
                    </div>
                  ))}
                </div>
                <div className="h-[4px] rounded-full bg-[linear-gradient(90deg,rgba(214,211,209,0.3),rgba(168,162,158,0.7),rgba(214,211,209,0.3))]" />
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
              {selectedCollection && ownedCollectionIds.has(selectedCollection.id) ? '已经收藏' : '确认兑换'}
            </button>
          </div>
        )}
      >
        {selectedCollection && (
          <div className="space-y-5">
            <BottlePreview imagePath={selectedCollection.imagePath} alt={selectedCollection.name} size="lg" />
            <p className="text-sm leading-6 text-stone-500">
              {ownedCollectionIds.has(selectedCollection.id)
                ? '这个瓶子已经在你的收藏货架上了。'
                : canRedeemSelected
                  ? `兑换成功后剩余 ${formatAchievementStars(normalizeAchievementStarValue(availableStars - selectedCollection.cost))} 光点，这个瓶子会立刻摆进你的收藏货架。`
                  : '当前光点不足，暂时无法兑换这个收藏瓶子。'}
            </p>
            {redeemError && (
              <div className="text-sm text-rose-500">{redeemError}</div>
            )}
          </div>
        )}
      </AchievementDialog>
    </div>
  );
};
