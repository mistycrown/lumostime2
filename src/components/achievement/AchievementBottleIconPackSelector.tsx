/**
 * @file AchievementBottleIconPackSelector.tsx
 * @description Compact preview-card selector for switching bundled achievement bottle icon packs in the sponsorship style tab.
 *
 * @updated 2026-03-28: Render each icon pack with a stable first-image preview and hide per-card labels for a cleaner preview grid.
 * @updated 2026-09-26: Supports ZIP import, custom pack selection, and deletion.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { CompactPreviewCardSelector } from '../CompactPreviewCardSelector';
import { imageService } from '../../services/imageService';
import { parseAchievementBottleIconPackZip } from '../../services/achievementBottleIconPackZipService';
import {
  ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS,
  ACHIEVEMENT_BOTTLE_ICON_PACKS_CHANGED_EVENT,
  AchievementBottleIconPackOption,
  DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK,
  removeCustomAchievementBottleIconPack,
  registerCustomAchievementBottleIconPack
} from '../../services/achievementBottleIconPackService';

const renderIconPackPreview = (option: AchievementBottleIconPackOption) => {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(135deg,#f8f4ec_0%,#efe7da_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_42%)]" />

      <div className="flex h-full items-center justify-center p-2.5">
        <div className="flex h-full w-full items-center justify-center rounded-[22px] border border-white/70 bg-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
          {option.previewImageSrc ? (
            <img
              src={option.previewImageSrc}
              alt=""
              className="h-11 w-11 object-contain drop-shadow-[0_6px_12px_rgba(120,113,108,0.18)]"
              loading="lazy"
            />
          ) : (
            <div className="h-10 w-10 rounded-full border border-stone-200/80 bg-stone-100/80" />
          )}
        </div>
      </div>
    </div>
  );
};

export const AchievementBottleIconPackSelector: React.FC = () => {
  const { achievementBottleIconPack, setAchievementBottleIconPack } = useSettings();
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [revision, setRevision] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener(ACHIEVEMENT_BOTTLE_ICON_PACKS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(ACHIEVEMENT_BOTTLE_ICON_PACKS_CHANGED_EVENT, refresh);
  }, []);

  const customOptions = ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS.filter((option) => (
    !['star1', 'flower1', 'sea', 'coin', 'candy', 'leaf', 'paper', 'planet', 'stone'].includes(option.value)
  ));

  const handleZipChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    const savedFilenames: string[] = [];
    try {
      const parsed = await parseAchievementBottleIconPackZip(file);
      for (const image of parsed.images) {
        savedFilenames.push(await imageService.saveImage(image.blob, 'theme'));
      }
      const packId = `custom-${crypto.randomUUID()}`;
      await registerCustomAchievementBottleIconPack(packId, savedFilenames, parsed.name);
      setAchievementBottleIconPack(packId);
      addToast('success', '成就瓶图标方案已添加');
    } catch (error) {
      await Promise.all(savedFilenames.map((filename) => imageService.deleteImage(filename).catch(() => undefined)));
      addToast('error', error instanceof Error ? error.message : '图标包导入失败');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = (option: AchievementBottleIconPackOption) => {
    if (!window.confirm(`删除“${option.label}”方案？`)) return;
    if (!removeCustomAchievementBottleIconPack(option.value)) return;
    if (achievementBottleIconPack === option.value) {
      setAchievementBottleIconPack(DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK);
    }
    addToast('success', '成就瓶图标方案已删除');
  };

  return (
    <>
      <CompactPreviewCardSelector
        title="成就瓶图标包"
        options={ACHIEVEMENT_BOTTLE_ICON_PACK_OPTIONS}
        selectedValue={achievementBottleIconPack}
        onSelect={setAchievementBottleIconPack}
        renderPreview={(option) => renderIconPackPreview(option as AchievementBottleIconPackOption)}
        showLabels={false}
        actionSlot={(
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={(event) => void handleZipChange(event)}
            />
            <button
              type="button"
              title="上传 ZIP 图标包"
              aria-label="上传 ZIP 图标包"
              disabled={isImporting}
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              {isImporting ? <Upload size={15} className="animate-pulse" /> : <Plus size={16} />}
            </button>
          </>
        )}
      />
      {customOptions.length > 0 && (
        <div key={revision} className="flex flex-wrap gap-x-4 gap-y-2 px-4 pt-2">
          {customOptions.map((option) => (
            <div key={option.value} className="flex min-w-0 items-center gap-1 text-xs text-stone-600">
              <span className="max-w-40 truncate">{option.label}</span>
              <button
                type="button"
                title={`删除${option.label}方案`}
                aria-label={`删除${option.label}方案`}
                onClick={() => handleDelete(option)}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-stone-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
