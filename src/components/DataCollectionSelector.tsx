/**
 * @file DataCollectionSelector.tsx
 * @input Target item metadata plus collection state from DataContext
 * @output Inline collection membership editing for a single log or todo
 * @pos Component (Inline selector)
 * @description Renders a compact page-inline Collection selector with hidden-by-default tag-like chips, immediate membership updates, and a one-line collection creator.
 * @updated 2026-05-12: Rebuilt the selector into a compact selected-first capsule flow with a list-style chooser icon, one-line name-only creation, and tighter chip rounding.
 *
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useMemo, useState } from 'react';
import { Check, List, Plus, X } from 'lucide-react';
import { DataCollection, DataCollectionItemType } from '../types';
import { useData } from '../contexts/DataContext';
import { getDataCollectionIdsForItem, upsertDataCollectionEntriesForItem } from '../utils/dataCollectionUtils';

interface DataCollectionSelectorProps {
  itemType: DataCollectionItemType;
  itemId: string;
}

export const DataCollectionSelector: React.FC<DataCollectionSelectorProps> = ({
  itemType,
  itemId
}) => {
  const { collections, setCollections, collectionEntries, setCollectionEntries } = useData();
  const [isCreating, setIsCreating] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [draftName, setDraftName] = useState('');

  const selectedCollectionIds = useMemo(
    () => getDataCollectionIdsForItem(collectionEntries, itemType, itemId),
    [collectionEntries, itemId, itemType]
  );
  const sortedCollections = useMemo(
    () => [...collections].sort((left, right) => right.updatedAt - left.updatedAt),
    [collections]
  );
  const selectedCollections = useMemo(
    () => sortedCollections.filter((collection) => selectedCollectionIds.includes(collection.id)),
    [selectedCollectionIds, sortedCollections]
  );
  const unselectedCollections = useMemo(
    () => sortedCollections.filter((collection) => !selectedCollectionIds.includes(collection.id)),
    [selectedCollectionIds, sortedCollections]
  );
  const orderedCollections = useMemo(
    () => [...selectedCollections, ...unselectedCollections],
    [selectedCollections, unselectedCollections]
  );

  const updateMembership = (nextCollectionIds: string[]) => {
    const now = Date.now();
    const touchedCollectionIds = new Set<string>([
      ...selectedCollectionIds,
      ...nextCollectionIds
    ]);

    setCollectionEntries((prev) => upsertDataCollectionEntriesForItem({
      entries: prev,
      collectionIds: nextCollectionIds,
      itemType,
      itemId,
      addedAt: now
    }));

    setCollections((prev) => [...prev]
      .map((collection) => (
        touchedCollectionIds.has(collection.id)
          ? { ...collection, updatedAt: now }
          : collection
      ))
      .sort((left, right) => right.updatedAt - left.updatedAt));
  };

  const toggleCollection = (collectionId: string) => {
    const nextCollectionIds = selectedCollectionIds.includes(collectionId)
      ? selectedCollectionIds.filter((id) => id !== collectionId)
      : [...selectedCollectionIds, collectionId];

    updateMembership(nextCollectionIds);
  };

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

    setCollections((prev) => [nextCollection, ...prev].sort((left, right) => right.updatedAt - left.updatedAt));
    setCollectionEntries((prev) => upsertDataCollectionEntriesForItem({
      entries: prev,
      collectionIds: [...selectedCollectionIds, nextCollection.id],
      itemType,
      itemId,
      addedAt: now
    }));
    setDraftName('');
    setIsCreating(false);
    setIsSelecting(false);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Collection</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsCreating((prev) => !prev);
              if (!isCreating) {
                setIsSelecting(false);
              }
            }}
            className="inline-flex items-center gap-1 text-stone-400 transition-colors hover:text-stone-700"
            aria-label={isCreating ? '关闭 Collection 新建表单' : '新建 Collection'}
          >
            {isCreating ? <X size={16} /> : <Plus size={16} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSelecting((prev) => !prev);
              if (!isSelecting) {
                setIsCreating(false);
              }
            }}
            className="inline-flex items-center gap-1 text-stone-400 transition-colors hover:text-stone-700"
            aria-label={isSelecting ? '收起 Collection 列表' : '选择已有 Collection'}
          >
            {isSelecting ? <X size={16} /> : <List size={16} />}
          </button>
        </div>
      </div>

      {selectedCollections.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedCollections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              onClick={() => toggleCollection(collection.id)}
              className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-color) 24%, white)',
                backgroundColor: 'color-mix(in srgb, var(--accent-color) 14%, white)',
                color: 'var(--text-deep)'
              }}
            >
              <Check size={11} />
              <span className="truncate">{collection.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="pb-3 pt-1 text-xs italic text-stone-300">No collections yet</div>
      )}

      {isCreating && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/70 p-3">
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Collection 名称"
            className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 outline-none transition-colors focus:border-stone-400"
          />
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-400 transition-colors hover:text-stone-700"
            aria-label="取消新建 Collection"
          >
            <X size={15} />
          </button>
          <button
            type="button"
            onClick={handleCreateCollection}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white transition-colors hover:bg-stone-800"
            aria-label="确认新建 Collection"
          >
            <Check size={15} />
          </button>
        </div>
      )}

      {isSelecting && (
        <div className="flex flex-wrap gap-2">
          {orderedCollections.map((collection) => {
            const isSelected = selectedCollectionIds.includes(collection.id);

            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => toggleCollection(collection.id)}
                className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors"
                style={isSelected ? {
                  borderColor: 'color-mix(in srgb, var(--accent-color) 24%, white)',
                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 14%, white)',
                  color: 'var(--text-deep)'
                } : {
                  borderColor: '#e7e5e4',
                  backgroundColor: '#fafaf9',
                  color: '#78716c'
                }}
              >
                {isSelected && <Check size={11} />}
                <span className="truncate">{collection.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
