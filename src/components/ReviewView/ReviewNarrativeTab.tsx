/**
 * @file ReviewNarrativeTab.tsx
 * @description Shared Narrative Tab component for Review Views with Reading/Editing modes
 * @updated 2026-06-07: Made the newspaper row reusable for weekly and monthly reviews by allowing custom labels and empty-state copy while keeping the daily mood flow intact.
 * @updated 2026-05-16: Split the narrative page into summary, newspaper, and AI narrative sections with a single-line newspaper card.
 */
import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Sparkles, Trash2, Smile } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { MoodPickerModal } from '../MoodPicker';
import { IconRenderer } from '../IconRenderer';

interface ReviewNarrativeTabProps {
  summary: string;
  narrative: string;
  isGenerating: boolean;
  isReadingMode: boolean;
  moodEmoji?: string;
  newspaperTitle?: string;
  newspaperLabel?: string;
  newspaperEmptyText?: string;
  date?: string;
  onSummaryChange: (value: string) => void;
  onNarrativeChange: (value: string) => void;
  onMoodChange?: (emoji: string) => void;
  onMoodClear?: () => void;
  onOpenNewspaper?: () => void;
  onGenerateNewspaper?: () => void;
  onDeleteNewspaper?: () => void;
  onGenerateNarrative: () => void;
  onDeleteSummary: () => void;
  onDeleteNarrative: () => void;
}

export const ReviewNarrativeTab: React.FC<ReviewNarrativeTabProps> = ({
  summary,
  narrative,
  isGenerating,
  isReadingMode,
  moodEmoji,
  newspaperTitle,
  newspaperLabel = 'AI 小报',
  newspaperEmptyText = '暂无小报，点击生成',
  date,
  onSummaryChange,
  onNarrativeChange,
  onMoodChange,
  onMoodClear,
  onOpenNewspaper,
  onGenerateNewspaper,
  onDeleteNewspaper,
  onGenerateNarrative,
  onDeleteSummary,
  onDeleteNarrative
}) => {
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const summaryTimeoutRef = useRef<NodeJS.Timeout>();
  const narrativeTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSummaryChange = (value: string) => {
    onSummaryChange(value);

    if (summaryTimeoutRef.current) {
      clearTimeout(summaryTimeoutRef.current);
    }

    summaryTimeoutRef.current = setTimeout(() => {
      // Autosave is handled upstream in onSummaryChange.
    }, 500);
  };

  const handleNarrativeChange = (value: string) => {
    onNarrativeChange(value);

    if (narrativeTimeoutRef.current) {
      clearTimeout(narrativeTimeoutRef.current);
    }

    narrativeTimeoutRef.current = setTimeout(() => {
      // Autosave is handled upstream in onNarrativeChange.
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (summaryTimeoutRef.current) {
        clearTimeout(summaryTimeoutRef.current);
      }
      if (narrativeTimeoutRef.current) {
        clearTimeout(narrativeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-8 min-w-0 max-w-full">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-600">一句话总结</h3>
          {summary && isReadingMode && (
            <button
              onClick={onDeleteSummary}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-500"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {isReadingMode ? (
          summary ? (
            <div className="flex items-start gap-2 text-[15px] leading-relaxed text-stone-800">
              {moodEmoji && (
                <span className="mt-0.5 flex items-center justify-center text-lg leading-none">
                  <IconRenderer icon={moodEmoji} />
                </span>
              )}
              <span className="flex-1">{summary}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-200 py-8 text-center text-sm text-stone-400">
              暂无内容
            </div>
          )
        ) : (
          <div className="flex min-w-0 max-w-full items-center gap-3">
            <input
              type="text"
              value={summary}
              onChange={(event) => handleSummaryChange(event.target.value)}
              className="h-[42px] min-w-0 max-w-full flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[15px] leading-relaxed text-stone-800 shadow-sm outline-none transition-colors focus:border-stone-400"
              placeholder="用一句话总结..."
            />
            {onMoodChange && (
              <button
                onClick={() => setIsMoodModalOpen(true)}
                className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                  moodEmoji
                    ? 'bg-stone-100 hover:bg-stone-200'
                    : 'border border-stone-200 bg-white hover:border-stone-300'
                }`}
                title="选择今日心情"
              >
                {moodEmoji ? (
                  <span className="flex items-center justify-center text-2xl leading-none">
                    <IconRenderer icon={moodEmoji} />
                  </span>
                ) : (
                  <Smile size={20} className="text-stone-400" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-stone-200" />

      {onMoodChange && date && (
        <MoodPickerModal
          isOpen={isMoodModalOpen}
          date={date}
          selectedMood={moodEmoji}
          summary={summary}
          onSelect={onMoodChange}
          onClear={onMoodClear}
          onSummaryChange={onSummaryChange}
          onClose={() => setIsMoodModalOpen(false)}
        />
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-600">{newspaperLabel}</h3>
          {newspaperTitle && onDeleteNewspaper && (
            <button
              type="button"
              onClick={onDeleteNewspaper}
              className="flex shrink-0 items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-500"
              title="删除小报"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={newspaperTitle ? onOpenNewspaper : onGenerateNewspaper}
          disabled={!newspaperTitle && !onGenerateNewspaper}
          className="block w-full rounded-2xl border border-stone-200 bg-[#faf8f4] px-4 py-3 text-left transition-colors hover:border-stone-300 hover:bg-[#f6f2eb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="line-clamp-1 font-serif text-[1.02rem] leading-7 text-stone-900">
            {newspaperTitle || newspaperEmptyText}
          </div>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-600">AI 叙事</h3>
          {narrative ? (
            <button
              onClick={onDeleteNarrative}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-500"
            >
              <Trash2 size={12} />
            </button>
          ) : (
            <button
              onClick={onGenerateNarrative}
              disabled={isGenerating}
              className="p-1 text-stone-400 transition-colors hover:text-stone-600 disabled:cursor-not-allowed disabled:opacity-50"
              title="与 AI 共创叙事"
            >
              {isGenerating ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
            </button>
          )}
        </div>

        {isReadingMode ? (
          narrative ? (
            <div className="prose prose-stone min-w-0 max-w-none px-1 text-[15px] leading-relaxed prose-headings:my-5 prose-headings:font-bold prose-headings:text-stone-800 prose-strong:text-stone-900">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="mt-8 mb-4 flex items-center gap-2 text-xl font-bold text-stone-900" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="mt-6 mb-3 flex items-center gap-2 text-lg font-bold text-stone-800" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="mt-5 mb-2 text-base font-bold text-stone-800" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-6 last:mb-0" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="my-6 rounded-r border-l-4 border-stone-300 bg-stone-50 py-2 pr-2 pl-4 font-serif italic text-stone-600" {...props} />,
                  ul: ({ node, ...props }) => <ul className="my-4 list-disc space-y-1 pl-5 text-stone-700" {...props} />,
                  ol: ({ node, ...props }) => <ol className="my-4 list-decimal space-y-1 pl-5 text-stone-700" {...props} />,
                  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                  hr: ({ node, ...props }) => <hr className="my-10 border-stone-300" {...props} />
                }}
              >
                {narrative}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-200 py-8 text-center text-sm text-stone-400">
              暂无内容
            </div>
          )
        ) : (
          <textarea
            value={narrative}
            onChange={(event) => handleNarrativeChange(event.target.value)}
            className="block w-full min-w-0 max-w-full resize-none rounded-2xl border border-stone-200 bg-white p-6 text-[15px] leading-relaxed text-stone-800 shadow-sm outline-none transition-colors focus:border-stone-400"
            rows={16}
            placeholder="在此开始写作..."
          />
        )}
      </div>
    </div>
  );
};
