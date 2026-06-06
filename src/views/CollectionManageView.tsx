/**
 * @file CollectionManageView.tsx
 * @input Current collection list plus save and close handlers
 * @output Dedicated management surface for reordering, renaming, creating, and deleting collections
 * @pos View (Management sub-page)
 * @description Mirrors the existing tag batch-management flow for Collection objects so users can adjust order and structure in one focused save step.
 * @updated 2026-06-06: Added first-pass Collection management UI with manual ordering, inline rename, creation, and delete-with-unlink support.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from 'lucide-react';
import { DataCollection } from '../types';

interface CollectionManageViewProps {
  collections: DataCollection[];
  onBack: () => void;
  onSave: (collections: DataCollection[]) => void;
}

export const CollectionManageView: React.FC<CollectionManageViewProps> = ({
  collections: initialCollections,
  onBack,
  onSave
}) => {
  const [collections, setCollections] = useState<DataCollection[]>(() => initialCollections.map((collection) => ({ ...collection })));

  const collectionCountLabel = useMemo(() => String(collections.length).padStart(2, '0'), [collections.length]);

  const moveCollection = (index: number, direction: 'up' | 'down') => {
    setCollections((current) => {
      const next = [...current];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleNameChange = (collectionId: string, name: string) => {
    setCollections((current) => current.map((collection) => (
      collection.id === collectionId
        ? { ...collection, name }
        : collection
    )));
  };

  const handleAddCollection = () => {
    const now = Date.now();
    const nextCollection: DataCollection = {
      id: crypto.randomUUID(),
      name: '新建 Collection',
      createdAt: now,
      updatedAt: now
    };

    setCollections((current) => [...current, nextCollection]);
  };

  const handleDeleteCollection = (collectionId: string) => {
    setCollections((current) => current.filter((collection) => collection.id !== collectionId));
  };

  return (
    <div className="h-full bg-[#faf9f6] flex flex-col">
      <div className="h-14 flex items-center justify-between px-5 bg-[#fdfbf7] border-b border-stone-100 sticky top-0 z-20">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors"
          aria-label="关闭 Collection 管理"
        >
          <X size={24} />
        </button>
        <div className="text-center">
          <h1 className="font-serif font-bold text-lg text-stone-800">Collection Management</h1>
          <div className="text-[10px] uppercase tracking-[0.16em] text-stone-400">{collectionCountLabel} Items</div>
        </div>
        <button
          type="button"
          onClick={() => onSave(collections)}
          className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition-colors"
          aria-label="保存 Collection 管理结果"
        >
          <Check size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40">
        {collections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white/70 px-5 py-12 text-center text-sm italic text-stone-400">
            No collections yet
          </div>
        ) : (
          collections.map((collection, index) => (
            <div key={collection.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  {String(index + 1).padStart(2, '0')}
                </div>

                <input
                  value={collection.name}
                  onChange={(event) => handleNameChange(collection.id, event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-stone-800 outline-none placeholder:text-stone-300"
                  placeholder="Collection 名称"
                />

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveCollection(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30"
                    aria-label="上移 Collection"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCollection(index, 'down')}
                    disabled={index === collections.length - 1}
                    className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-30"
                    aria-label="下移 Collection"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCollection(collection.id)}
                    className="p-1 text-stone-300 hover:text-red-500"
                    aria-label="删除 Collection"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        <button
          type="button"
          onClick={handleAddCollection}
          className="w-full py-3 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 text-sm font-bold hover:border-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>添加新 Collection</span>
        </button>
      </div>
    </div>
  );
};
