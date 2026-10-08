/**
 * @file NodeDetailView.tsx
 * @updated 2026-10-08: Styles biography Markdown explicitly so headings and list markers survive the CSS reset.
 * @updated 2026-10-07: Renders daily, weekly and monthly linked answers as filtered independent review cards and routes each card to its matching guide view.
 * @updated 2026-10-07: Adds merging with primary-node choice and commits/invalidate pending biography edits.
 * @updated 2026-10-07: Reuses the print-style searchable category picker.
 * @updated 2026-10-07: Adds category selection/creation and validates syntax-safe aliases.
 * @input Node metadata, backlinks, co-occurrence and ordinary-text candidates
 * @output Tag-style node details, reusable timeline and candidate conversion
 * @pos View (Node Detail)
 * @updated 2026-10-06: Added node details, buffered biography editing, AI generation and rename.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Loader2, Pencil, Plus, Save, Sparkles, X } from 'lucide-react';
import type { DailyReview, Log, NoteNode } from '../types';
import { useNodes } from '../contexts/NodeContext';
import { useData } from '../contexts/DataContext';
import { useOptionalReview } from '../contexts/ReviewContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useToast } from '../contexts/ToastContext';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useBufferedRecord } from '../hooks/useBufferedRecord';
import { DetailTimelineCard } from '../components/DetailTimelineCard';
import { NodeText } from '../components/NodeText';
import { NodeCategoryCreator } from '../components/NodeCategoryCreator';
import { NodeCategorySelect } from '../components/NodeCategorySelect';
import { NodeMergePanel } from '../components/NodeMergePanel';
import { buildNodeReviewAnswers, getNodeCandidates, getNodeCategoryId, isValidNodeName } from '../utils/nodeUtils';
import type { NodeReviewAnswer, NodeReviewKind } from '../utils/nodeUtils';
import { formatNodeDescription, generateNodeDescriptionResult } from '../services/nodeDescriptionService';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

const NodeDetailsEditor: React.FC<{ node: NoteNode; logs: Log[]; reviewAnswers?: Array<{ date: string; kind: NodeReviewKind; question: string; answer: string }> }> = ({ node, logs, reviewAnswers = [] }) => {
  const { updateNode, nodeCategories, assignCategory } = useNodes();
  const { addToast } = useToast();
  const draft = useBufferedRecord(node, (value) => updateNode(value.id, { aliases: value.aliases, description: value.description }));
  const [alias, setAlias] = useState('');
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const aliasInput = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const descriptionBeforeEdit = useRef(node.description);
  const revision = useRef(0);
  const mounted = useRef(true);
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const addAlias = () => {
    const value = alias.trim();
    if (!value || value === node.name) return;
    if (!isValidNodeName(value)) { addToast('error', '别名不能包含方括号、竖线或换行'); return; }
    if (value !== editingAlias && draft.value.aliases.includes(value)) {
      addToast('info', '已有该别名');
      return;
    }
    const aliases = editingAlias ? draft.value.aliases.map((name) => name === editingAlias ? value : name) : [...draft.value.aliases, value];
    draft.update({ ...draft.value, aliases });
    draft.commit();
    setAlias('');
    setEditingAlias(null);
  };
  const generate = async () => {
    const before = revision.current;
    setGenerating(true);
    try {
      const result = await generateNodeDescriptionResult(draft.value, logs, reviewAnswers);
      if (!mounted.current) return;
      if (before !== revision.current) {
        addToast('info', '简介已修改，请重新生成');
        return;
      }
      latestDraft.current.update({ ...latestDraft.current.value, description: formatNodeDescription(latestDraft.current.value.description, result) });
      latestDraft.current.commit();
      setEditingDescription(false);
    } catch (error) {
      if (mounted.current) addToast('error', error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      if (mounted.current) setGenerating(false);
    }
  };
  return <div className="space-y-8">
    <section>
      <h2 className="mb-3 text-sm font-semibold text-stone-900">分类</h2>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-stone-200 pb-2">
        <NodeCategorySelect label="节点分类" value={getNodeCategoryId(node, nodeCategories)} onChange={(categoryId) => assignCategory(node.id, categoryId)} />
        <NodeCategoryCreator nodeId={node.id} />
      </div>
    </section>
    <section>
      <h2 className="mb-4 text-sm font-semibold text-stone-900">别名</h2>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2">
        {draft.value.aliases.map((name) => <span key={name} className="inline-flex items-center gap-2 text-sm text-stone-600">
          <button type="button" aria-label={`编辑别名：${name}`} className="break-words text-left hover:text-stone-900" onClick={() => { setEditingAlias(name); setAlias(name); aliasInput.current?.focus(); }}>{name}</button>
          <button type="button" aria-label={`删除别名：${name}`} className="p-1 text-stone-400 hover:text-stone-700" onClick={() => {
            draft.update({ ...draft.value, aliases: draft.value.aliases.filter((item) => item !== name) });
            draft.commit();
            if (editingAlias === name) { setEditingAlias(null); setAlias(''); }
          }}><X size={12} /></button>
        </span>)}
      </div>
      <form className="flex items-center gap-3 border-b border-stone-200 pb-2" onSubmit={(event) => { event.preventDefault(); addAlias(); }}>
        <input ref={aliasInput} aria-label="新别名" placeholder={editingAlias ? '修改别名' : '添加别名'} value={alias} onChange={(event) => setAlias(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-400" />
        <button type="submit" aria-label={editingAlias ? '保存别名' : '添加别名'} disabled={!alias.trim()} className="p-2 text-stone-500 disabled:opacity-30">{editingAlias ? <Check size={16} /> : <Plus size={16} />}</button>
        {editingAlias && <button type="button" aria-label="取消编辑别名" onClick={() => { setEditingAlias(null); setAlias(''); }} className="p-2 text-stone-400"><X size={16} /></button>}
      </form>
    </section>
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-stone-900">简介</h2>
        <div className="flex items-center gap-3">
          {!editingDescription && <button type="button" aria-label="编辑节点简介" onClick={() => { descriptionBeforeEdit.current = draft.value.description; setEditingDescription(true); }} className="flex items-center gap-1.5 py-1 text-xs text-stone-500 hover:text-stone-900"><Pencil size={13} />编辑</button>}
          {editingDescription && <button type="button" aria-label="保存节点简介" onClick={() => { draft.commit(); setEditingDescription(false); }} className="flex items-center gap-1.5 py-1 text-xs text-stone-500 hover:text-stone-900"><Save size={13} />保存</button>}
          {editingDescription && <button type="button" aria-label="取消编辑节点简介" onClick={() => { draft.update({ ...draft.value, description: descriptionBeforeEdit.current }); draft.commit(); setEditingDescription(false); }} className="py-1 text-xs text-stone-400 hover:text-stone-700">取消</button>}
          <button type="button" onClick={generate} disabled={generating || (!logs.length && !reviewAnswers.length)} className="flex items-center gap-1.5 py-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-40">{generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {generating ? '生成中' : 'AI 生成'}</button>
        </div>
      </div>
      {editingDescription ? <textarea aria-label="节点简介" placeholder="写下关于这个节点的简介…" value={draft.value.description} rows={10} onChange={(event) => { revision.current += 1; draft.update({ ...draft.value, description: event.target.value }); }} className="w-full resize-y rounded-none border border-stone-200 bg-transparent px-4 py-3 text-sm leading-7 text-stone-700 outline-none focus:border-stone-400 placeholder:text-stone-300" /> : (
        draft.value.description.trim() ? <div aria-label="节点简介预览" className="min-w-0 break-words text-sm leading-7 text-stone-700">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{
            h1: ({ node, ...props }) => <h1 className="mb-4 mt-6 text-xl font-semibold text-stone-900 first:mt-0" {...props} />,
            h2: ({ node, ...props }) => <h2 className="mb-3 mt-5 text-lg font-semibold text-stone-900 first:mt-0" {...props} />,
            h3: ({ node, ...props }) => <h3 className="mb-2 mt-4 text-base font-semibold text-stone-900 first:mt-0" {...props} />,
            h4: ({ node, ...props }) => <h4 className="mb-2 mt-4 font-semibold text-stone-900 first:mt-0" {...props} />,
            h5: ({ node, ...props }) => <h5 className="mb-2 mt-4 font-semibold text-stone-900 first:mt-0" {...props} />,
            h6: ({ node, ...props }) => <h6 className="mb-2 mt-4 font-semibold text-stone-900 first:mt-0" {...props} />,
            p: ({ node, ...props }) => <p className="my-2" {...props} />,
            ul: ({ node, ...props }) => <ul className="my-2 list-disc pl-5" {...props} />,
            ol: ({ node, ...props }) => <ol className="my-2 list-decimal pl-5" {...props} />,
            li: ({ node, ...props }) => <li className="my-0 pl-1" {...props} />,
            blockquote: ({ node, ...props }) => <blockquote className="my-3 border-l-2 border-stone-300 pl-4 text-stone-500" {...props} />,
            a: ({ node, ...props }) => <a className="underline decoration-stone-300 underline-offset-4 hover:decoration-stone-600" {...props} />,
            pre: ({ node, ...props }) => <pre className="my-3 overflow-x-auto bg-stone-100 p-3 text-xs" {...props} />,
            hr: ({ node, ...props }) => <hr className="my-5 border-stone-200" {...props} />
          }}>{draft.value.description}</ReactMarkdown>
        </div> : <button type="button" onClick={() => { descriptionBeforeEdit.current = ''; setEditingDescription(true); }} className="w-full border border-dashed border-stone-200 px-4 py-8 text-left text-sm text-stone-400 hover:border-stone-400">暂无简介，点击编辑</button>
      )}
    </section>
    <NodeMergePanel node={node} onBeforeMerge={() => { revision.current += 1; draft.commit(); }} />
  </div>;
};

const REVIEW_KIND_LABEL: Record<NodeReviewKind, string> = { daily: '日报', weekly: '周报', monthly: '月报' };

const reviewPeriodLabel = (review: Pick<NodeReviewAnswer, 'kind' | 'startDate' | 'endDate'>): string => {
  if (review.kind === 'daily') return review.startDate;
  if (review.kind === 'monthly') return review.startDate.slice(0, 7);
  return `${review.startDate} ~ ${review.endDate}`;
};

export const NodeDetailView: React.FC<{
  node: NoteNode;
  onEditLog: (log: Log) => void;
  onOpenDailyReview?: (date: string) => void;
  onOpenWeeklyReview?: (startDate: string, endDate: string) => void;
  onOpenMonthlyReview?: (startDate: string, endDate: string) => void;
}> = ({ node, onEditLog, onOpenDailyReview, onOpenWeeklyReview, onOpenMonthlyReview }) => {
  const { nodes, index, openNode, rename, associate, associateReviewAnswer } = useNodes();
  const { logs, todos } = useData();
  const reviewContext = useOptionalReview();
  const dailyReviews = reviewContext?.dailyReviews || [];
  const weeklyReviews = reviewContext?.weeklyReviews || [];
  const monthlyReviews = reviewContext?.monthlyReviews || [];
  const { categories } = useCategoryScope();
  const { addToast } = useToast();
  const { isPrivacyMode } = usePrivacy();
  const [tab, setTab] = useState<'details' | 'timeline' | 'related'>('timeline');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(node.name);
  const entry = index.get(node.id);
  const linkedLogs = entry?.logs || [];
  const linkedAnswers = entry?.reviewAnswers || [];
  const allReviewAnswers = useMemo(() => buildNodeReviewAnswers(dailyReviews, weeklyReviews, monthlyReviews), [dailyReviews, monthlyReviews, weeklyReviews]);
  const relatedNodes = useMemo(() => nodes.filter((item) => entry?.related.has(item.id)).sort((a, b) => (entry!.related.get(b.id)! - entry!.related.get(a.id)!) || a.name.localeCompare(b.name, 'zh-CN')), [nodes, entry]);
  const candidates = useMemo(() => [
    ...logs.flatMap((log) => {
      const candidate = getNodeCandidates(log.note || '', [node])[0];
      return candidate ? [{ kind: 'log' as const, log, matches: candidate.matches }] : [];
    }),
    ...allReviewAnswers.flatMap((reviewAnswer) => {
      const candidate = getNodeCandidates(reviewAnswer.answer.answer || '', [node])[0];
      return candidate ? [{ kind: 'review' as const, review: reviewAnswer, matches: candidate.matches }] : [];
    })
  ].sort((a, b) => (b.kind === 'log' ? b.log.startTime : new Date(`${b.review.endDate}T12:00:00`).getTime()) - (a.kind === 'log' ? a.log.startTime : new Date(`${a.review.endDate}T12:00:00`).getTime())), [allReviewAnswers, logs, node]);
  const saveName = () => {
    try { rename(node.id, name); setRenaming(false); }
    catch (error) { addToast('error', error instanceof Error ? error.message : '重命名失败'); }
  };
  return <div className="h-full overflow-y-auto bg-[#faf9f6] px-7 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 no-scrollbar">
    <div className="mx-auto max-w-3xl">
      <header className={`mb-6 ${isPrivacyMode ? 'blur-sm select-none' : ''}`}>
        {renaming ? <form className="flex items-center gap-3 border-b border-stone-300 pb-2" onSubmit={(event) => { event.preventDefault(); saveName(); }}>
          <input aria-label="节点名称" autoFocus value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 bg-transparent text-2xl font-bold text-stone-900 outline-none" />
          <button type="submit" aria-label="保存名称" className="p-2 text-stone-600"><Check size={18} /></button>
          <button type="button" aria-label="取消重命名" onClick={() => setRenaming(false)} className="p-2 text-stone-400"><X size={18} /></button>
        </form> : <div className="flex items-start gap-3">
          <span aria-hidden="true" className="pt-0.5 font-serif text-xl text-stone-300">[[]]</span>
          <h1 data-node-name className="min-w-0 break-words text-2xl font-bold text-stone-900">{node.name}</h1>
          <button type="button" aria-label="重命名节点" onClick={() => { setName(node.name); setRenaming(true); }} className="mt-0.5 shrink-0 p-1.5 text-stone-400 hover:text-stone-700"><Pencil size={14} /></button>
        </div>}
        <p className="mt-2 text-sm text-stone-400">{linkedLogs.length} 条记录{entry?.latestAt ? ` · 最近出现 ${new Date(entry.latestAt).toLocaleDateString('zh-CN')}` : ''}</p>
      </header>
      <nav aria-label="节点详情" className="mb-8 flex gap-6 overflow-x-auto border-b border-stone-200 no-scrollbar">
        {([['details', '细节'], ['timeline', '时间线'], ['related', '关联']] as const).map(([value, label]) => <button type="button" key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)} className={`whitespace-nowrap pb-3 font-serif text-sm tracking-wide ${tab === value ? 'border-b-2 border-stone-900 font-bold text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}>{label}</button>)}
      </nav>
      <div className={isPrivacyMode ? 'blur-sm select-none' : ''}>
        {tab === 'details' && <NodeDetailsEditor node={node} logs={linkedLogs} reviewAnswers={linkedAnswers.map((reviewAnswer) => ({ date: reviewPeriodLabel(reviewAnswer), kind: reviewAnswer.kind, question: reviewAnswer.answer.question, answer: reviewAnswer.answer.answer }))} />}
        {tab === 'timeline' && <DetailTimelineCard filteredLogs={linkedLogs} displayDate={displayDate} onDateChange={setDisplayDate} entityInfo={{ id: node.id, name: node.name, type: 'node' }} defaultViewMode="all" categories={categories} todos={todos} onEditLog={onEditLog} highlightNodeName={node.name} reviewEntries={linkedAnswers.map((reviewAnswer) => ({ id: `${reviewAnswer.kind}-${reviewAnswer.reviewId}-${reviewAnswer.answer.questionId}`, kind: reviewAnswer.kind, startDate: reviewAnswer.startDate, endDate: reviewAnswer.endDate, question: reviewAnswer.answer.question, answer: reviewAnswer.answer.answer, onOpen: () => {
          if (reviewAnswer.kind === 'daily') onOpenDailyReview?.(reviewAnswer.startDate);
          else if (reviewAnswer.kind === 'weekly') onOpenWeeklyReview?.(reviewAnswer.startDate, reviewAnswer.endDate);
          else onOpenMonthlyReview?.(reviewAnswer.startDate, reviewAnswer.endDate);
        } }))} />}
        {tab === 'related' && <div className="space-y-10">
          <section>
            <h2 className="mb-3 flex justify-between text-sm font-semibold text-stone-900">相关节点<span className="font-mono text-xs font-normal text-stone-400">{relatedNodes.length}</span></h2>
            <div className="divide-y divide-stone-200 border-y border-stone-200">{relatedNodes.map((other) => <button type="button" key={other.id} aria-label={`查看相关节点：${other.name}`} onClick={() => openNode(other.name)} className="flex w-full items-center gap-3 py-4 text-left text-sm text-stone-700"><span className="min-w-0 flex-1 break-words">{other.name}</span><span className="font-mono text-xs text-stone-400">{entry!.related.get(other.id)} 条</span><ChevronRight size={14} className="text-stone-300" /></button>)}</div>
            {!relatedNodes.length && <p className="py-6 text-sm text-stone-400">暂无相关节点</p>}
          </section>
          <section>
            <h2 className="mb-3 flex justify-between text-sm font-semibold text-stone-900">潜在关联<span className="font-mono text-xs font-normal text-stone-400">{candidates.length}</span></h2>
            <div className="divide-y divide-stone-200 border-y border-stone-200">{candidates.map((candidate) => candidate.kind === 'log' ? <article key={candidate.log.id} className="py-5">
              <div className="mb-2 flex items-center justify-between gap-3"><button type="button" aria-label="打开潜在关联记录" onClick={() => onEditLog(candidate.log)} className="font-mono text-xs text-stone-400 hover:text-stone-700">{new Date(candidate.log.startTime).toLocaleDateString('zh-CN')}</button><div className="flex items-center gap-3"><button type="button" aria-label="打开详情" onClick={() => onEditLog(candidate.log)} className="text-xs text-stone-500 hover:text-stone-900">打开详情</button><button type="button" onClick={() => associate(candidate.log.id, node.id)} className="text-xs font-medium text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900">关联</button></div></div>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-stone-600"><NodeText text={candidate.log.note || ''} /></p>
              <p className="mt-2 text-xs text-stone-400">匹配：{candidate.matches.join('、')}</p>
            </article> : <article key={`${candidate.review.kind}-${candidate.review.reviewId}-${candidate.review.answer.questionId}`} className="py-5">
              <div className="mb-2 flex items-center justify-between gap-3"><button type="button" aria-label={`打开${REVIEW_KIND_LABEL[candidate.review.kind]}：${reviewPeriodLabel(candidate.review)}`} onClick={() => {
                if (candidate.review.kind === 'daily') onOpenDailyReview?.(candidate.review.startDate);
                else if (candidate.review.kind === 'weekly') onOpenWeeklyReview?.(candidate.review.startDate, candidate.review.endDate);
                else onOpenMonthlyReview?.(candidate.review.startDate, candidate.review.endDate);
              }} className="font-mono text-xs text-stone-400 hover:text-stone-700">{REVIEW_KIND_LABEL[candidate.review.kind]} · {reviewPeriodLabel(candidate.review)}</button><div className="flex items-center gap-3"><button type="button" aria-label="打开详情" onClick={() => {
                if (candidate.review.kind === 'daily') onOpenDailyReview?.(candidate.review.startDate);
                else if (candidate.review.kind === 'weekly') onOpenWeeklyReview?.(candidate.review.startDate, candidate.review.endDate);
                else onOpenMonthlyReview?.(candidate.review.startDate, candidate.review.endDate);
              }} className="text-xs text-stone-500 hover:text-stone-900">打开详情</button><button type="button" onClick={() => associateReviewAnswer(candidate.review.kind, candidate.review.reviewId, candidate.review.answer.questionId, node.id)} className="text-xs font-medium text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900">关联</button></div></div>
              <p className="mb-1 text-xs text-stone-400">{candidate.review.answer.question}</p><p className="whitespace-pre-wrap break-words text-sm leading-7 text-stone-600"><NodeText text={candidate.review.answer.answer} /></p>
              <p className="mt-2 text-xs text-stone-400">匹配：{candidate.matches.join('、')}</p>
            </article>)}</div>
            {!candidates.length && <p className="py-6 text-sm text-stone-400">暂无潜在关联</p>}
          </section>
        </div>}
      </div>
    </div>
  </div>;
};
