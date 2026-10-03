/**
 * @file TagStickerCalendar.test.tsx
 * @input Tag sticker settings, linked groups, and same-day attribute records.
 * @output Component rendering coverage for availability, calendar stickers, and color fallback.
 * @pos Component test
 * @description Verifies the actual settings and calendar components render the tag sticker workflow.
 * @updated 2026-10-02: Created for tag-specific calendar rendering.
 * @updated 2026-10-02: Verifies only the earliest available daily sticker is shown and the shared tag picker is reused.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Activity, ActivityKeyword, Category, CustomStickerRecord, CustomStickerSetRecord, Log } from '../types';
import { DetailTimelineCard } from './DetailTimelineCard';
import { KeywordColorSequenceModal } from './KeywordColorSequenceModal';
import { StickerSetEditModal } from './StickerSetEditModal';

const state = vi.hoisted(() => ({ sets: [] as CustomStickerSetRecord[], stickers: [] as CustomStickerRecord[] }));
vi.mock('../contexts/SettingsContext', () => ({ useSettings: () => ({
  timelineStyleTheme: 'default', timelineStyleConfigs: { default: {} }, customStickerSets: state.sets, customStickers: state.stickers
}), useOptionalSettings: () => ({ associationSelectorColumns: 4 }) }));
vi.mock('../contexts/DataContext', () => ({ useData: () => ({ collections: [], collectionEntries: [] }) }));
vi.mock('../contexts/PrivacyContext', () => ({ usePrivacy: () => ({ isPrivacyMode: false }) }));
vi.mock('./IconRenderer', () => ({ IconRenderer: ({ icon, alt }: { icon: string; alt?: string }) => <span data-icon={icon} aria-label={alt} /> }));
vi.mock('./TimelineImage', () => ({ TimelineImage: () => null }));
vi.mock('./FeatureHint', () => ({ FeatureHint: () => null }));
vi.mock('./ChartPaletteSelector', () => ({ ChartPaletteSelector: () => null }));

const keywords: ActivityKeyword[] = [
  { label: 'Chest', source: 'attribute', attributeId: 'parts', optionId: 'chest', stickerId: 'chest', color: '#123456' },
  { label: 'Back', source: 'attribute', attributeId: 'parts', optionId: 'back', stickerId: 'back', color: '#654321' }
];
const makeLog = (id: string, optionIds: string[], options: Partial<Log> = {}): Log => ({
  id, activityId: 'gym', categoryId: 'health', startTime: new Date(2026, 9, 2, 9).getTime(),
  endTime: new Date(2026, 9, 2, 10).getTime(), duration: 3600, attributeValues: [{ attributeId: 'parts', optionIds }], ...options
});
const renderCalendar = (logs: Log[], enabled = true) => renderToStaticMarkup(<DetailTimelineCard
  filteredLogs={logs} displayDate={new Date(2026, 9, 2)} onDateChange={() => undefined}
  entityInfo={{ id: 'gym', type: 'activity', name: 'Gym' }} keywords={keywords} keywordRecords={keywords} tagStickerEnabled={enabled}
/>);

beforeEach(() => {
  state.sets = [{ id: 'fitness', name: 'Fitness', purpose: 'tag', activityId: 'gym', stickerIds: ['chest', 'back'], status: 'active', createdAt: 1, updatedAt: 1 }];
  state.stickers = ['chest', 'back'].map((id, index) => ({ id, setId: 'fitness', imageFilename: `${id}.png`, sortOrder: index, status: 'active', createdAt: 1, updatedAt: 1 }));
});

describe('tag sticker component rendering', () => {
  it('shows only the first same-day sticker while keeping the complete legend', () => {
    const html = renderCalendar([makeLog('one', ['chest', 'back']), makeLog('two', ['chest'])]);
    expect(html).toContain('aria-label="标签贴纸"');
    expect(html.match(/data-icon="image:chest.png"/g)).toHaveLength(2);
    expect(html.match(/data-icon="image:back.png"/g)).toHaveLength(1);
    expect(html).toContain('absolute bottom-1 right-1 z-10 text-[8px]');
    expect(html).not.toContain('bg-stone-50 p-1 pt-4');
  });

  it('uses record time to choose the first sticker even when logs are supplied newest first', () => {
    const html = renderCalendar([makeLog('later', ['back'], { startTime: new Date(2026, 9, 2, 15).getTime() }), makeLog('earlier', ['chest'])]);
    expect(html.match(/data-icon="image:chest.png"/g)).toHaveLength(2);
    expect(html.match(/data-icon="image:back.png"/g)).toHaveLength(1);
  });

  it('skips an unassigned keyword to show the first available daily sticker', () => {
    state.stickers = state.stickers.filter((sticker) => sticker.id !== 'back');
    const html = renderCalendar([makeLog('one', ['back']), makeLog('two', ['chest'])]);
    expect(html.match(/data-icon="image:chest.png"/g)).toHaveLength(2);
  });

  it('excludes planned records from daily stickers', () => {
    const html = renderCalendar([makeLog('one', ['chest']), makeLog('planned', ['back'], { isPlanned: true })]);
    expect(html.match(/data-icon="image:back.png"/g)).toHaveLength(1);
  });

  it('falls back to the keyword color after a sticker is removed', () => {
    state.stickers = [];
    const html = renderCalendar([makeLog('one', ['chest'])]);
    expect(html).not.toContain('data-icon="image:chest.png"');
    expect(html).toContain('background-color:#123456');
  });

  it('does not render sticker assignments after the group is reassigned', () => {
    state.sets[0].activityId = 'another-tag';
    const html = renderCalendar([makeLog('one', ['chest'])]);
    expect(html).not.toContain('data-icon="image:chest.png"');
    expect(html).toContain('background-color:#123456');
  });

  it('disables the tag sticker switch until a group is associated', () => {
    const renderSettings = (hasTagStickerSets: boolean) => renderToStaticMarkup(<KeywordColorSequenceModal
      isOpen activity={{ id: 'gym', tagStickerEnabled: true } as Activity} customSequences={[]} effectiveSequenceId="default" unlocked
      hasTagStickerSets={hasTagStickerSets} onChange={() => undefined} onClose={() => undefined}
    />);
    expect(renderSettings(false)).toMatch(/aria-label="使用标签贴纸"[^>]*disabled=""/);
    expect(renderSettings(false)).not.toMatch(/aria-label="使用标签贴纸"[^>]*checked=""/);
    expect(renderSettings(true)).toMatch(/aria-label="使用标签贴纸"[^>]*checked=""/);
    expect(renderSettings(true)).not.toMatch(/aria-label="使用标签贴纸"[^>]*disabled=""/);
  });

  it('shows the saved tag association in the group editor', () => {
    const html = renderToStaticMarkup(<StickerSetEditModal isOpen setId="fitness" initialName="Fitness" stickers={[]}
      categories={[{ id: 'health', name: 'Health', icon: '💪', activities: [{ id: 'gym', name: 'Gym', icon: '🏋', color: '#123456' }] } as Category]} activityId="gym" onActivityChange={() => undefined}
      onClose={() => undefined} onSaveName={() => undefined} onUploadToSlot={() => undefined} onRemoveSticker={() => undefined}
    />);
    expect(html).toContain('关联标签');
    expect(html).toContain('Gym');
    expect(html).toContain('record-association-activity-selected');
    expect(html).toContain('association-option-grid');
    expect(html).not.toContain('<select');
  });
});
