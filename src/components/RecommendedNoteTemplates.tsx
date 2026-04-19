/**
 * @file RecommendedNoteTemplates.tsx
 * @input Recommended note templates and apply callback
 * @output Inline note template suggestion chips
 * @pos Component
 * @description Shows context-aware note template recommendations below note fields so users can insert prepared text with one tap instead of opening a selector modal.
 * @updated 2026-04-19: Added inline recommended note template strip for note entry flows.
 */
import React from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import { RecommendedNoteTemplate } from '../utils/noteTemplateUtils';

interface RecommendedNoteTemplatesProps {
  templates: RecommendedNoteTemplate[];
  onApply: (template: RecommendedNoteTemplate) => void;
  className?: string;
}

export const RecommendedNoteTemplates: React.FC<RecommendedNoteTemplatesProps> = ({
  templates,
  onApply,
  className = ''
}) => {
  if (templates.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-xl p-3 animate-in slide-in-from-top-2 ${className}`.trim()}
      style={{
        backgroundColor: 'var(--secondary-button-bg)',
        borderColor: 'var(--secondary-button-border)',
        borderWidth: '1px'
      }}
    >
      <div className="flex items-start gap-2">
        <FileText size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-color)' }} />
        <div className="flex-1">
          <p className="mb-2 text-xs font-bold" style={{ color: 'var(--accent-color)' }}>推荐模板</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.key}
                onClick={() => onApply(template)}
                title={template.content}
                className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-medium transition-colors active:scale-95"
                style={{ borderColor: 'var(--accent-color)', borderWidth: '1px', color: 'var(--accent-color)' }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = 'var(--secondary-button-hover-bg)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = 'white';
                }}
              >
                <span className="mr-0.5 text-[10px] opacity-70">[{template.sourceLabel}]</span>
                <span>{template.name}</span>
                <CheckCircle2 size={12} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
