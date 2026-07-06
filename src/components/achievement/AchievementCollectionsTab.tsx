/**
 * @file AchievementCollectionsTab.tsx
 * @input Bottle catalog, archived bottles, and seal/shatter handlers from the achievement context
 * @output Archived bottle shelf plus a two-step seal dialog used inside the achievement page
 * @pos Component (Achievement Collection Tab)
 * @description Renders the history shelf, a compact seal entry button, a two-step seal modal, and archived bottle detail with shatter support.
 *
 * @updated 2026-07-06: Moved the archived bottle shatter action to the left side of the detail dialog footer to reduce accidental taps.
 * @updated 2026-06-30: Blocks sealing when the active bottle balance is negative and surfaces the shared validation message before opening the seal flow.
 * @updated 2026-05-18: Added a render-time fallback that repairs stale default bottle file URLs back to the current bundled asset path before showing a placeholder.
 * @updated 2026-04-06: Simplified the collections page into a history shelf and moved sealing into a two-step modal flow.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Check, ChevronLeft, ChevronRight, Hammer, ImageOff, Plus, Sparkles } from 'lucide-react';
import {
  AchievementArchivedBottle,
  AchievementCollection,
  AchievementSealPreview
} from '../../types';
import {
  getDefaultAchievementCollectionPresetFromReference,
  repairAchievementCollectionImagePath,
  resolveAchievementCollectionImagePath
} from '../../constants/achievementCollections';
import { useToast } from '../../contexts/ToastContext';
import { getLocalDateTimeStr } from '../../utils/dateUtils';
import {
  formatAchievementSignedStars,
  formatAchievementStars,
  getAchievementSealBlockedReason
} from '../../utils/achievementUtils';
import { AchievementDialog } from './AchievementDialog';

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
  archivedBottles: AchievementArchivedBottle[];
  sealPreview: AchievementSealPreview | null;
  onSealBottle: (collection: AchievementCollection) => { ok: boolean; message?: string; archivedBottleId?: string };
  onShatterBottle: (bottleId: string) => { ok: boolean; message?: string };
}

type SealStep = 1 | 2;

const BottlePreview: React.FC<{
  collectionId?: string;
  imagePath?: string;
  alt: string;
  size?: 'sm' | 'lg';
  shattered?: boolean;
  transparent?: boolean;
}> = ({ collectionId, imagePath, alt, size = 'sm', shattered = false, transparent = false }) => {
  const resolvedImagePath = imagePath
    ? resolveAchievementCollectionImagePath(imagePath)
    : imagePath;
  const fallbackImagePath = useMemo(() => repairAchievementCollectionImagePath({
    collectionId,
    imagePath,
    name: alt
  }), [alt, collectionId, imagePath]);
  const [currentImagePath, setCurrentImagePath] = useState<string | undefined>(resolvedImagePath || undefined);

  useEffect(() => {
    setCurrentImagePath(resolvedImagePath || undefined);
  }, [resolvedImagePath]);

  const wrapperClassName = size === 'lg'
    ? transparent
      ? 'relative flex h-24 items-end justify-center px-2 pb-0 pt-4'
      : 'relative flex h-24 items-end justify-center px-2 pb-2 pt-4'
    : 'relative flex h-16 w-16 items-end justify-center rounded-2xl bg-stone-100/80 px-2 pb-1 pt-2';
  const imageClassName = size === 'lg'
    ? 'max-h-[86px] w-auto max-w-none object-contain drop-shadow-[0_8px_16px_rgba(120,113,108,0.18)]'
    : 'max-h-[52px] w-auto max-w-none object-contain drop-shadow-[0_6px_12px_rgba(120,113,108,0.16)]';
  const placeholderClassName = size === 'lg'
    ? 'flex h-[86px] w-[54px] items-center justify-center rounded-[1rem] border border-dashed border-stone-300 text-stone-400'
    : 'flex h-[52px] w-[34px] items-center justify-center rounded-[1rem] border border-dashed border-stone-300 text-stone-400';

  return (
    <div className={wrapperClassName}>
      {currentImagePath ? (
        <img
          src={currentImagePath}
          alt={alt}
          className={`${imageClassName} ${shattered ? 'opacity-70 grayscale-[0.35]' : ''}`}
          onError={() => {
            const repairedPreset = getDefaultAchievementCollectionPresetFromReference({
              collectionId,
              imagePath: currentImagePath,
              name: alt
            });
            const nextImagePath = repairedPreset?.imagePath || fallbackImagePath;

            if (nextImagePath && nextImagePath !== currentImagePath) {
              setCurrentImagePath(nextImagePath);
              return;
            }

            setCurrentImagePath(undefined);
          }}
        />
      ) : (
        <div className={placeholderClassName}>
          <ImageOff size={size === 'lg' ? 18 : 14} />
        </div>
      )}

      {shattered && (
        <>
          <div className="pointer-events-none absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rotate-[18deg] bg-stone-500/50" />
          <div className="pointer-events-none absolute inset-y-5 left-[38%] w-px rotate-[-20deg] bg-stone-500/40" />
          <div className="pointer-events-none absolute inset-x-4 bottom-3 h-px rotate-[8deg] bg-stone-500/40" />
        </>
      )}
    </div>
  );
};

export const AchievementCollectionsTab: React.FC<AchievementCollectionsTabProps> = ({
  availableStars,
  collections,
  archivedBottles,
  sealPreview,
  onSealBottle,
  onShatterBottle
}) => {
  const { addToast } = useToast();
  const [isSealDialogOpen, setIsSealDialogOpen] = useState(false);
  const [sealStep, setSealStep] = useState<SealStep>(1);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedArchivedBottleId, setSelectedArchivedBottleId] = useState<string | null>(null);
  const [bottlesPerRow, setBottlesPerRow] = useState(4);
  const shelfContainerRef = useRef<HTMLDivElement>(null);

  const sortedCollections = useMemo(() => {
    return [...collections]
      .filter((collection) => collection.enabled)
      .sort((first, second) => first.createdAt - second.createdAt);
  }, [collections]);

  const shelfBottles = useMemo(() => {
    return [...archivedBottles].sort((first, second) => first.sealedAt - second.sealedAt);
  }, [archivedBottles]);

  useEffect(() => {
    const calculateBottlesPerRow = () => {
      if (!shelfContainerRef.current) {
        return;
      }

      const containerWidth = shelfContainerRef.current.offsetWidth;
      const padding = 32;
      const availableWidth = containerWidth - padding;
      const bottleWidth = 76;
      const count = Math.floor(availableWidth / bottleWidth);

      setBottlesPerRow(Math.max(3, count));
    };

    calculateBottlesPerRow();
    window.addEventListener('resize', calculateBottlesPerRow);

    return () => window.removeEventListener('resize', calculateBottlesPerRow);
  }, []);

  const shelfRows = useMemo(() => {
    const rows: AchievementArchivedBottle[][] = [];

    for (let index = 0; index < shelfBottles.length; index += bottlesPerRow) {
      rows.push(shelfBottles.slice(index, index + bottlesPerRow));
    }

    return rows;
  }, [bottlesPerRow, shelfBottles]);

  const selectedCollection = selectedCollectionId
    ? sortedCollections.find((collection) => collection.id === selectedCollectionId) || null
    : null;
  const selectedArchivedBottle = selectedArchivedBottleId
    ? archivedBottles.find((bottle) => bottle.id === selectedArchivedBottleId) || null
    : null;

  const sealBlockedReason = getAchievementSealBlockedReason({
    sealPreview,
    availableStars
  });
  const canOpenSealDialog = !sealBlockedReason;
  const canGoToStepTwo = !sealBlockedReason;
  const canConfirmSeal = Boolean(canGoToStepTwo && selectedCollection);

  const closeSealDialog = () => {
    setIsSealDialogOpen(false);
    setSealStep(1);
    setSelectedCollectionId(null);
  };

  const handleSeal = () => {
    if (!selectedCollection) {
      return;
    }

    const result = onSealBottle(selectedCollection);
    if (!result.ok) {
      addToast('error', result.message || '封瓶失败，请稍后重试');
      return;
    }

    if (sealPreview) {
      addToast('success', `已将 ${sealPreview.startDate} 到 ${sealPreview.endDate} 的光点封成新瓶`);
    }
    closeSealDialog();
    if (result.archivedBottleId) {
      setSelectedArchivedBottleId(result.archivedBottleId);
    }
  };

  const handleShatter = () => {
    if (!selectedArchivedBottle) {
      return;
    }

    const result = onShatterBottle(selectedArchivedBottle.id);
    if (!result.ok) {
      addToast('error', result.message || '砸碎失败，请稍后重试');
      return;
    }

    addToast('success', `已把 ${formatAchievementStars(selectedArchivedBottle.sealedAmount)} 光点返还到当前瓶子`);
  };

  return (
    <>
      <section>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-[14px]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
            Archive Shelf / {shelfBottles.length}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!canOpenSealDialog) {
                addToast('info', sealBlockedReason || '昨天之前还没有新的内容可以封瓶');
                return;
              }
              setIsSealDialogOpen(true);
              setSealStep(1);
            }}
            className="inline-flex items-center gap-2 text-sm text-stone-900 transition-colors hover:text-stone-600"
          >
            <Plus size={15} />
            封瓶
          </button>
        </header>

        {shelfBottles.length === 0 ? (
          <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
            还没有历史瓶子。点击“封瓶”后，昨天之前的阶段记录会被封进一只历史瓶，并陈列在这里。
          </div>
        ) : (
          <div ref={shelfContainerRef} className="relative mt-3 space-y-4">
            {shelfRows.map((rowBottles, rowIndex) => (
              <div key={`shelf-row-${rowIndex}`} className="relative">
                <div
                  className="relative z-10 grid gap-0.5 px-4 -mb-3 justify-center"
                  style={{ gridTemplateColumns: `repeat(${bottlesPerRow}, 76px)` }}
                >
                  {rowBottles.map((bottle, colIndex) => {
                    const index = rowIndex * bottlesPerRow + colIndex;

                    return (
                      <button
                        key={bottle.id}
                        type="button"
                        onClick={() => setSelectedArchivedBottleId(bottle.id)}
                        className="group flex items-end justify-center transition-all duration-300 hover:-translate-y-2 hover:z-20"
                        style={{
                          filter: 'drop-shadow(0 8px 12px rgba(120, 80, 50, 0.25))',
                          opacity: bottle.status === 'shattered' ? 0.9 : 1,
                          animation: `fadeInUp 0.4s ease-out ${index * 0.06}s both`
                        }}
                        aria-label={bottle.collectionName}
                      >
                        <BottlePreview
                          collectionId={bottle.collectionId}
                          imagePath={bottle.imagePath}
                          alt={bottle.collectionName}
                          size="lg"
                          shattered={bottle.status === 'shattered'}
                          transparent={true}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="relative z-0 mx-2">
                  <div className="h-4 rounded-lg bg-gradient-to-b from-amber-600/50 via-amber-500/55 to-amber-700/60 shadow-[0_6px_20px_rgba(120,80,50,0.35)]">
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
                  <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-lg bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
                  <div className="absolute inset-x-0 -bottom-1 h-2 rounded-b-lg bg-gradient-to-b from-amber-800/40 to-amber-900/50 shadow-[0_3px_8px_rgba(0,0,0,0.3)]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AchievementDialog
        isOpen={isSealDialogOpen}
        title="封瓶"
        subtitle={
          sealStep === 1
            ? '是否将这段时间的光点封装成瓶？封装之后只能通过砸碎取出。'
            : '选择一只瓶子作为这段历史的封存容器。'
        }
        onClose={closeSealDialog}
        footer={(
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-stone-400">
              第 {sealStep} / 2 步
            </div>
            <div className="flex items-center gap-3">
              {sealStep === 2 && (
                <button
                  type="button"
                  onClick={() => setSealStep(1)}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
                >
                  <ChevronLeft size={14} />
                  上一步
                </button>
              )}
              {sealStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setSealStep(2)}
                  disabled={!canGoToStepTwo}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors disabled:bg-stone-300"
                >
                  下一步
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSeal}
                  disabled={!canConfirmSeal}
                  className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors disabled:bg-stone-300"
                >
                  确认封瓶
                </button>
              )}
            </div>
          </div>
        )}
      >
        {sealStep === 1 ? (
          sealPreview ? (
            <div className="space-y-5 text-stone-900">
              <div className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Period</div>
              <div className="text-[1.5rem] leading-none">
                {sealPreview.startDate} 至 {sealPreview.endDate}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3 border-t border-stone-200 pt-5 text-[15px] leading-7">
                <div className="text-stone-500">当前活跃瓶余额</div>
                <div>{formatAchievementStars(availableStars)} 光点</div>

                <div className="text-stone-500">这段时间获得了</div>
                <div>{formatAchievementStars(sealPreview.earnedStars)} 光点</div>

                <div className="text-stone-500">这段时间消费了</div>
                <div>{formatAchievementStars(sealPreview.spentStars)} 光点</div>

                <div className="text-stone-500">真正会被封进瓶里的余额</div>
                <div>{formatAchievementStars(sealPreview.sealableStars)} 光点</div>
              </div>

              <div className="border-t border-stone-200 pt-5 text-sm leading-7 text-stone-500">
                封存后，这段时间的每日记录和奖励兑换记录会从主账本移入历史瓶。
                如果之后余额不够，想重新动用它们，就只能砸碎这只瓶子取回。
              </div>
            </div>
          ) : (
            <div className="text-sm leading-7 text-stone-500">
              昨天之前还没有新的内容可以封瓶。
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Choose Bottle</div>
            <div className="grid grid-cols-4 gap-3">
              {sortedCollections.map((collection) => {
                const isSelected = collection.id === selectedCollectionId;

                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => setSelectedCollectionId(collection.id)}
                    className={`relative flex items-center justify-center rounded-[1.4rem] px-1 py-2 transition-all ${
                      isSelected
                        ? 'scale-[1.06]'
                        : 'opacity-78 hover:opacity-100'
                    }`}
                    aria-label={collection.name}
                  >
                    {isSelected && (
                      <div className="pointer-events-none absolute inset-[8%] rounded-[1.25rem] bg-stone-200/75 shadow-[0_12px_30px_rgba(15,23,42,0.10)]" />
                    )}
                    {isSelected && (
                      <div className="absolute right-2 top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white shadow-[0_6px_16px_rgba(15,23,42,0.16)]">
                        <Check size={12} />
                      </div>
                    )}
                    <div className="relative z-10">
                      <BottlePreview
                        collectionId={collection.id}
                        imagePath={collection.imagePath}
                        alt={collection.name}
                        size="lg"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </AchievementDialog>

      <AchievementDialog
        isOpen={!!selectedArchivedBottle}
        title={selectedArchivedBottle?.collectionName || '历史瓶'}
        subtitle={selectedArchivedBottle ? `${selectedArchivedBottle.periodStartDate} 至 ${selectedArchivedBottle.periodEndDate}` : undefined}
        onClose={() => setSelectedArchivedBottleId(null)}
        footer={selectedArchivedBottle ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleShatter}
                disabled={selectedArchivedBottle.status === 'shattered'}
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition-colors disabled:bg-stone-300"
              >
                <Hammer size={14} />
                砸碎
              </button>
            </div>
            <div className="flex-1 text-right text-xs text-stone-400">
              {selectedArchivedBottle.status === 'shattered'
                ? `已于 ${selectedArchivedBottle.shatteredAt ? getLocalDateTimeStr(new Date(selectedArchivedBottle.shatteredAt)) : ''} 砸碎`
                : '封存后只能通过砸碎把光点返还到当前瓶子'}
            </div>
          </div>
        ) : undefined}
      >
        {selectedArchivedBottle && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)]">
              <div className="flex justify-center">
                <BottlePreview
                  collectionId={selectedArchivedBottle.collectionId}
                  imagePath={selectedArchivedBottle.imagePath}
                  alt={selectedArchivedBottle.collectionName}
                  size="lg"
                  shattered={selectedArchivedBottle.status === 'shattered'}
                />
              </div>
              <div className="space-y-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Poster</div>
                <div className="text-[2rem] leading-none text-stone-900">
                  {formatAchievementStars(selectedArchivedBottle.sealedAmount)}
                </div>
                <div className="text-sm leading-7 text-stone-500">
                  {selectedArchivedBottle.periodStartDate.slice(0, 7)}，你封存了
                  <span className="mx-1 font-medium text-stone-900">{formatAchievementStars(selectedArchivedBottle.sealedAmount)}</span>
                  点星光。
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2 border-t border-stone-200 pt-4 text-sm leading-7">
                  <div className="text-stone-500">获得</div>
                  <div>{formatAchievementStars(selectedArchivedBottle.earnedStars)} 光点</div>
                  <div className="text-stone-500">消费</div>
                  <div>{formatAchievementStars(selectedArchivedBottle.spentStars)} 光点</div>
                  <div className="text-stone-500">状态</div>
                  <div>{selectedArchivedBottle.status === 'shattered' ? '已砸碎' : '已封存'}</div>
                </div>
              </div>
            </div>

            <section>
              <div className="flex items-center gap-2 border-b border-stone-200 pb-[14px]">
                <Sparkles size={15} className="text-stone-400" />
                <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                  Daily Records / {selectedArchivedBottle.dailySnapshots.length}
                </div>
              </div>

              {selectedArchivedBottle.dailySnapshots.length === 0 ? (
                <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
                  这只瓶子里没有每日快照记录。
                </div>
              ) : (
                <div className="mt-[14px] divide-y divide-stone-200">
                  {selectedArchivedBottle.dailySnapshots
                    .slice()
                    .sort((first, second) => second.date.localeCompare(first.date))
                    .map((snapshot) => (
                      <div key={snapshot.id} className="flex items-center justify-between gap-4 py-[14px]">
                        <div className="min-w-0 flex-1">
                          <div className="text-[16px] leading-none text-stone-900">{snapshot.date}</div>
                          <div className="mt-[6px] text-[13px] leading-6 text-stone-500">
                            命中 {snapshot.ruleBreakdown.length} 条规则，封存前最后更新于 {getLocalDateTimeStr(new Date(snapshot.computedAt))}
                          </div>
                        </div>
                        <div className="text-[1rem] leading-none text-stone-900">
                          {formatAchievementSignedStars(snapshot.netDelta)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 border-b border-stone-200 pb-[14px]">
                <Archive size={15} className="text-stone-400" />
                <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                  Reward Records / {selectedArchivedBottle.redemptionRecords.length}
                </div>
              </div>

              {selectedArchivedBottle.redemptionRecords.length === 0 ? (
                <div className="mt-[14px] rounded-2xl border border-dashed border-stone-300 bg-white/50 px-5 py-6 text-sm leading-7 text-stone-500">
                  这段时间没有奖励兑换记录被封进来。
                </div>
              ) : (
                <div className="mt-[14px] divide-y divide-stone-200">
                  {selectedArchivedBottle.redemptionRecords
                    .slice()
                    .sort((first, second) => second.redeemedAt - first.redeemedAt)
                    .map((record) => (
                      <div key={record.id} className="flex items-center justify-between gap-4 py-[14px]">
                        <div className="min-w-0 flex-1">
                          <div className="text-[16px] leading-none text-stone-900">{record.rewardName}</div>
                          <div className="mt-[6px] text-[13px] leading-6 text-stone-500">
                            花费 {formatAchievementStars(record.cost)} 光点 · {getLocalDateTimeStr(new Date(record.redeemedAt))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>
        )}
      </AchievementDialog>
    </>
  );
};
