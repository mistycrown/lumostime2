/**
 * @file TagStickerGroupSection.tsx
 * @input Tag sticker groups, tag names, import state, and management callbacks.
 * @output Tag-specific sticker group previews and create/import/edit actions.
 * @pos Component (Sponsorship customization)
 * @description Reuses the general sticker group's compact preview treatment for tag sticker management.
 * @updated 2026-10-02: Created for tag sticker ZIP uploads and group management.
 * @updated 2026-10-02: Caps every preview option at 96px and uses the Sticker collection's 64px minimum column width.
 * @updated 2026-10-02: Adds the shared contextual hint beside the tag sticker section title.
 */
import React from 'react';
import { Plus, Upload } from 'lucide-react';
import { IconRenderer } from './IconRenderer';
import { FeatureHint } from './FeatureHint';
import type { CustomStickerViewSet } from '../services/customStickerAssetService';

interface TagStickerGroupSectionProps {
  sets: CustomStickerViewSet[];
  activities: Array<{ id: string; name: string }>;
  isImporting: boolean;
  onCreate: () => void;
  onImport: () => void;
  onEdit: (setId: string) => void;
}

export const TagStickerGroupSection: React.FC<TagStickerGroupSectionProps> = ({ sets, activities, isImporting, onCreate, onImport, onEdit }) => (
  <section className="space-y-4">
    <div className="flex items-center gap-2">
      <h4 className="text-sm font-medium text-stone-600">标签专属贴纸</h4>
      <FeatureHint
        hintId="sponsorship-tag-stickers"
        title="标签贴纸使用提示"
        iconSize={13}
        message={'1. 上传 ZIP 压缩包，或新建贴纸组并上传图片，每组最多 16 张。\n\n2. 点击贴纸组，在「关联标签」中选择标签。\n\n3. 在标签详情的关键字色彩序列设置中，开启「使用标签贴纸」，再点击关键字，为它选择对应贴纸。\n\n4. 时间线日历根据记录中的关键字或作为关键字的属性自动显示贴纸，每天只显示第一张可用贴纸。未指定贴纸的关键字仍显示原来的颜色。'}
      />
    </div>
    <div className="grid justify-items-start gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', maxWidth: '600px' }}>
      <button type="button" onClick={onCreate} className="flex aspect-square w-full max-w-[96px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-200 bg-white text-stone-400 hover:border-stone-300" aria-label="新建标签贴纸组">
        <Plus size={22} /><span className="text-[10px] font-medium text-stone-500">新建组</span>
      </button>
      <button type="button" onClick={onImport} disabled={isImporting} className="flex aspect-square w-full max-w-[96px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-stone-200 bg-white text-stone-400 hover:border-stone-300 disabled:cursor-wait disabled:opacity-60" aria-label="从压缩包上传标签贴纸">
        <Upload size={20} /><span className="text-[10px] font-medium text-stone-500">{isImporting ? '导入中' : '压缩包'}</span>
      </button>
      {sets.map((set) => (
        <button key={set.id} type="button" onClick={() => onEdit(set.id)} className="w-full min-w-0 max-w-[96px] text-left" aria-label={`编辑标签贴纸组 ${set.name}`}>
          <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-lg border-2 border-stone-200 bg-white p-1.5 hover:border-stone-300">
            {Array.from({ length: 4 }, (_, index) => {
              const sticker = set.stickers[index];
              return <div key={index} className="flex min-h-0 items-center justify-center overflow-hidden rounded-md bg-stone-50 p-1">{sticker ? <IconRenderer icon={`image:${sticker.path}`} size="100%" /> : <Plus size={12} className="text-stone-200" />}</div>;
            })}
          </div>
          <span className="mt-1 block truncate text-[10px] font-medium text-stone-600">{set.name}</span>
          <span className="block truncate text-[10px] text-stone-400">{activities.find((activity) => activity.id === set.activityId)?.name || '未关联'}</span>
        </button>
      ))}
    </div>
  </section>
);
