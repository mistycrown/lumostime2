/**
 * @file CheckTemplateManageView.tsx
 * @input Check templates plus daily review history for optional batch rename/delete operations
 * @output Updated daily check templates and optional historical review mutations
 * @pos Settings > Daily Review > Check Templates
 * @description 日课模板管理页，支持增删改排序、历史数据批量修正，以及赞赏码校验后的 UI icon 编辑入口。
 * @updated 2026-07-21: Added semantic dark-mode styles for historical daily-check batch operations.
 * @updated 2026-05-03: Rewrote the view in UTF-8 and added supporter-gated template/item UI icon editing.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  PlusCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  GripVertical,
  Save,
  Database,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { CheckTemplate, CheckTemplateItem } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { IconRenderer } from '../components/IconRenderer';
import { UIIconSelectorCompact } from '../components/UIIconSelector';
import { CheckTemplateItemRow } from '../components/CheckTemplateItemRow';
import { DEFAULT_CHECK_TEMPLATES, DEFAULT_MANUAL_CHECK_TEMPLATES } from '../constants';
import {
  batchDeleteCheckItems,
  batchRenameCheckItems,
  scanCheckItems
} from '../utils/checkItemBatchOperations';
import { RedemptionService } from '../services/redemptionService';
import { uiIconService } from '../services/uiIconService';
import { useSettings } from '../contexts/SettingsContext';

interface CheckTemplateManageViewProps {
  templates: CheckTemplate[];
  onUpdateTemplates: (templates: CheckTemplate[]) => void;
  onBack: () => void;
  dailyReviews: any[];
  onBatchUpdateDailyReviewItems: (updates: any[]) => void;
}

const createDefaultTemplateItem = (): CheckTemplateItem => ({
  id: crypto.randomUUID(),
  content: '',
  icon: '🔵',
  type: 'manual',
  manualMode: 'binary'
});

const createDefaultTemplate = (templates: CheckTemplate[]): CheckTemplate => ({
  id: crypto.randomUUID(),
  title: '新日课',
  icon: '🔵',
  items: [
    {
      id: crypto.randomUUID(),
      content: '日课 1',
      icon: '🔵',
      type: 'manual',
      manualMode: 'binary'
    }
  ],
  enabled: true,
  order: (templates.length > 0 ? Math.max(...templates.map((template) => template.order)) : 0) + 1,
  isDaily: true
});

export const CheckTemplateManageView: React.FC<CheckTemplateManageViewProps> = (props) => {
  const { templates, onUpdateTemplates, onBack, dailyReviews, onBatchUpdateDailyReviewItems } = props;
  const { uiIconTheme } = useSettings();
  const redemptionService = useMemo(() => new RedemptionService(), []);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<CheckTemplate | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [sortingMode, setSortingMode] = useState(false);
  const [showTemplateIconSelector, setShowTemplateIconSelector] = useState(false);
  const [canUseUiIcon, setCanUseUiIcon] = useState(false);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchTab, setBatchTab] = useState<'rename' | 'delete'>('rename');
  const [batchTargetContent, setBatchTargetContent] = useState('');
  const [batchNewContent, setBatchNewContent] = useState('');
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [batchStep, setBatchStep] = useState<'input' | 'confirm'>('input');
  const [scanCount, setScanCount] = useState(0);

  const [showRenameConfirmModal, setShowRenameConfirmModal] = useState(false);
  const [pendingRenames, setPendingRenames] = useState<Array<{
    oldContent: string;
    newContent: string;
    matchCount: number;
  }>>([]);
  const [pendingTemplate, setPendingTemplate] = useState<CheckTemplate | null>(null);
  const [errors, setErrors] = useState<{ title?: string }>({});

  useEffect(() => {
    setBatchStep('input');
    setScanCount(0);
    setBatchResult(null);
  }, [batchTab, showBatchModal]);

  useEffect(() => {
    let cancelled = false;

    const verifyUiIconSupport = async () => {
      if (!uiIconService.isCustomTheme() || uiIconTheme === 'default') {
        if (!cancelled) {
          setCanUseUiIcon(false);
        }
        return;
      }

      try {
        const result = await redemptionService.isVerified();
        if (!cancelled) {
          setCanUseUiIcon(result.isVerified);
        }
      } catch (error) {
        console.error('[CheckTemplateManageView] Failed to verify UI icon support', error);
        if (!cancelled) {
          setCanUseUiIcon(false);
        }
      }
    };

    void verifyUiIconSupport();

    return () => {
      cancelled = true;
    };
  }, [redemptionService, uiIconTheme]);

  const resetEditingState = () => {
    setEditingTemplateId(null);
    setTemplateForm(null);
    setErrors({});
    setSortingMode(false);
    setShowTemplateIconSelector(false);
  };

  const handleAddTemplate = () => {
    setTemplateForm(createDefaultTemplate(templates));
    setEditingTemplateId('NEW');
  };

  const handleEditTemplate = (template: CheckTemplate) => {
    setTemplateForm({ ...template, items: template.items.map((item) => ({ ...item })) });
    setEditingTemplateId(template.id);
    setErrors({});
    setSortingMode(false);
    setShowTemplateIconSelector(false);
  };

  const saveTemplateDirectly = (finalTemplate: CheckTemplate) => {
    if (editingTemplateId === 'NEW') {
      onUpdateTemplates([...templates, finalTemplate]);
    } else {
      onUpdateTemplates(
        templates.map((template) => (template.id === finalTemplate.id ? finalTemplate : template))
      );
    }

    resetEditingState();
  };

  const handleSave = () => {
    if (!templateForm) return;

    if (!templateForm.title.trim()) {
      setErrors({ title: '标题不能为空' });
      return;
    }

    const cleanItems = templateForm.items.filter((item) => item.content.trim());
    const invalidAutoItems = cleanItems.filter((item) => item.type === 'auto' && !item.autoConfig);
    const invalidCountItems = cleanItems.filter(
      (item) => item.type !== 'auto' && item.manualMode === 'count' && (!item.targetCount || item.targetCount < 1)
    );

    if (invalidAutoItems.length > 0) {
      setErrors({ title: `还有 ${invalidAutoItems.length} 个自动日课未配置规则，请先完成设置` });
      return;
    }

    if (invalidCountItems.length > 0) {
      setErrors({ title: `还有 ${invalidCountItems.length} 个次数日课未设置有效目标次数（至少为 1）` });
      return;
    }

    const finalTemplate = { ...templateForm, items: cleanItems };

    if (editingTemplateId !== 'NEW') {
      const originalTemplate = templates.find((template) => template.id === finalTemplate.id);
      if (originalTemplate) {
        const modifiedItems: Array<{ oldContent: string; newContent: string; matchCount: number }> = [];
        const originalItemsMap = new Map(originalTemplate.items.map((item) => [item.id, item.content]));

        finalTemplate.items.forEach((item) => {
          const originalContent = originalItemsMap.get(item.id);
          if (originalContent && originalContent !== item.content) {
            const scanResult = scanCheckItems(dailyReviews, originalContent);
            if (scanResult.totalMatches > 0) {
              modifiedItems.push({
                oldContent: originalContent,
                newContent: item.content,
                matchCount: scanResult.totalMatches
              });
            }
          }
        });

        if (modifiedItems.length > 0) {
          setPendingRenames(modifiedItems);
          setPendingTemplate(finalTemplate);
          setShowRenameConfirmModal(true);
          return;
        }
      }
    }

    saveTemplateDirectly(finalTemplate);
  };

  const handleConfirmBatchRename = () => {
    if (!pendingTemplate || pendingRenames.length === 0) return;

    let updatedReviews = [...dailyReviews];
    let totalAffected = 0;

    pendingRenames.forEach(({ oldContent, newContent }) => {
      const result = batchRenameCheckItems(updatedReviews, oldContent, newContent);
      updatedReviews = result.updatedReviews;
      totalAffected += result.affectedCount;
    });

    if (totalAffected > 0) {
      onBatchUpdateDailyReviewItems(updatedReviews);
    }

    saveTemplateDirectly(pendingTemplate);
    setShowRenameConfirmModal(false);
    setPendingRenames([]);
    setPendingTemplate(null);
  };

  const handleSkipBatchRename = () => {
    if (!pendingTemplate) return;
    saveTemplateDirectly(pendingTemplate);
    setShowRenameConfirmModal(false);
    setPendingRenames([]);
    setPendingTemplate(null);
  };

  const handleAddItem = () => {
    if (!templateForm) return;
    setTemplateForm({
      ...templateForm,
      items: [...templateForm.items, createDefaultTemplateItem()]
    });
  };

  const handleUpdateItem = (index: number, updatedItem: CheckTemplateItem) => {
    if (!templateForm) return;
    const nextItems = [...templateForm.items];
    nextItems[index] = updatedItem;
    setTemplateForm({ ...templateForm, items: nextItems });
  };

  const handleDeleteItem = (index: number) => {
    if (!templateForm) return;
    setTemplateForm({
      ...templateForm,
      items: templateForm.items.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const handleMoveItemUp = (index: number) => {
    if (!templateForm || index === 0) return;
    const nextItems = [...templateForm.items];
    [nextItems[index - 1], nextItems[index]] = [nextItems[index], nextItems[index - 1]];
    setTemplateForm({ ...templateForm, items: nextItems });
  };

  const handleMoveItemDown = (index: number) => {
    if (!templateForm || index === templateForm.items.length - 1) return;
    const nextItems = [...templateForm.items];
    [nextItems[index], nextItems[index + 1]] = [nextItems[index + 1], nextItems[index]];
    setTemplateForm({ ...templateForm, items: nextItems });
  };

  const handleTemplateUiIconSelect = (_emoji: string, uiIcon: string) => {
    if (!templateForm) return;
    setTemplateForm({
      ...templateForm,
      uiIcon: uiIcon || undefined
    });
    setShowTemplateIconSelector(false);
  };

  const confirmDelete = () => {
    if (!deletingTemplateId) return;
    onUpdateTemplates(templates.filter((template) => template.id !== deletingTemplateId));
    setDeletingTemplateId(null);
  };

  const handleToggleEnabled = (template: CheckTemplate, event: React.MouseEvent) => {
    event.stopPropagation();
    onUpdateTemplates(
      templates.map((item) => (
        item.id === template.id ? { ...template, enabled: !template.enabled } : item
      ))
    );
  };

  const handleBatchProcess = () => {
    if (!batchTargetContent.trim()) return;

    if (batchStep === 'input') {
      const scanResult = scanCheckItems(dailyReviews, batchTargetContent.trim());
      const count = scanResult.totalMatches;
      setScanCount(count);

      if (count > 0) {
        setBatchStep('confirm');
        setBatchResult(`扫描到 ${count} 条包含“${batchTargetContent.trim()}”的记录，确认后会执行修改。`);
      } else {
        setBatchResult('未找到匹配的日课记录');
        setTimeout(() => setBatchResult(null), 2000);
      }
      return;
    }

    const target = batchTargetContent.trim();
    const result = batchTab === 'rename'
      ? batchRenameCheckItems(dailyReviews, target, batchNewContent.trim())
      : batchDeleteCheckItems(dailyReviews, target);

    if (result.affectedCount > 0) {
      onBatchUpdateDailyReviewItems(result.updatedReviews);
      setBatchResult(`成功${batchTab === 'rename' ? '重命名' : '删除'}了 ${result.affectedCount} 条日课记录`);
      setTimeout(() => {
        setShowBatchModal(false);
        setBatchResult(null);
        setBatchTargetContent('');
        setBatchNewContent('');
        setBatchStep('input');
        setScanCount(0);
      }, 1500);
      return;
    }

    setBatchResult('执行时未找到记录，可能已经被修改');
    setBatchStep('input');
    setTimeout(() => setBatchResult(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-stone-400 hover:text-stone-600 p-1">
            <ChevronLeft size={24} />
          </button>
          <span className="text-stone-800 font-bold text-lg">日课模板</span>
        </div>
        {!editingTemplateId && (
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="p-2 text-stone-400 hover:text-red-500 transition-colors"
            title="重置为默认"
          >
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {!editingTemplateId && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={handleAddTemplate}
                className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-stone-700 active:scale-95 transition-all"
              >
                <PlusCircle size={14} />
                <span>新建模板</span>
              </button>
              <button
                onClick={() => setShowBatchModal(true)}
                className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-50 active:scale-95 transition-all"
              >
                <Database size={14} />
                <span>批量修改数据</span>
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="p-12 text-center text-stone-400 bg-white rounded-2xl shadow-sm border border-stone-100">
                <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无日课模板</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${template.enabled ? 'border-stone-100' : 'border-stone-100 opacity-60'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {(template.icon || template.uiIcon) && (
                            <IconRenderer icon={template.icon || ''} uiIcon={template.uiIcon} className="text-lg" />
                          )}
                          <h3 className="font-bold text-stone-800 text-base">{template.title}</h3>
                          {!template.enabled && (
                            <span className="px-1.5 py-0.5 bg-stone-100 text-stone-400 text-[10px] rounded">已停用</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {template.items.map((item) => (
                            <div
                              key={item.id}
                              className="px-2 py-1.5 rounded-lg text-[10px] font-medium text-center border transition-colors flex items-center justify-center gap-1.5 bg-stone-50 text-stone-500 border-stone-100"
                            >
                              {(item.icon || item.uiIcon) && (
                                <IconRenderer icon={item.icon || ''} uiIcon={item.uiIcon} className="text-xs" />
                              )}
                              <span className="truncate">{item.content}</span>
                              {item.type !== 'auto' && item.manualMode === 'count' && (
                                <span className="text-[9px] text-stone-400">
                                  ({Math.max(1, Math.floor(Number(item.targetCount) || 1))}次)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(event) => handleToggleEnabled(template, event)}
                          className={`daily-template-enabled-toggle ${template.enabled ? 'daily-template-enabled-toggle-on text-green-500 bg-green-50 hover:bg-green-100' : 'text-stone-300 hover:bg-stone-50'} p-2 rounded-lg transition-colors`}
                          title={template.enabled ? '点击停用' : '点击启用'}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingTemplateId(template.id)}
                          className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {editingTemplateId && templateForm && (
          <div className="min-w-0 bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h3 className="font-bold text-stone-800">
                {editingTemplateId === 'NEW' ? '新建模板' : '编辑模板'}
              </h3>
              <button onClick={resetEditingState} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">模板名称</label>
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    type="text"
                    value={`${templateForm.icon || ''}${templateForm.title}`}
                    onChange={(event) => {
                      const value = event.target.value;
                      const firstChar = Array.from(value)[0] || '';
                      const icon = firstChar;
                      const title = value.slice(firstChar.length).trim();
                      setTemplateForm({ ...templateForm, icon, title });
                    }}
                    className={`min-w-0 flex-1 bg-stone-50 border ${errors.title ? 'border-red-300 focus:border-red-500' : 'border-stone-200 focus:border-stone-400'} rounded-xl px-4 py-2.5 text-sm outline-none transition-colors`}
                    placeholder="🔵 输入模板名称（首字符作为 emoji 图标）..."
                  />
                  {canUseUiIcon && (
                    <button
                      type="button"
                      onClick={() => setShowTemplateIconSelector((prev) => !prev)}
                      className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center shrink-0 ${
                        showTemplateIconSelector
                          ? 'bg-[var(--accent-color)]/10'
                          : 'border border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                      style={showTemplateIconSelector ? { border: '0.5px solid var(--accent-color)' } : undefined}
                      title="选择模板 UI 图标"
                    >
                      {templateForm.uiIcon ? (
                        <IconRenderer icon={templateForm.icon || '•'} uiIcon={templateForm.uiIcon} size={18} />
                      ) : (
                        <span className="text-stone-300 text-xs">+</span>
                      )}
                    </button>
                  )}
                </div>
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                {canUseUiIcon && showTemplateIconSelector && (
                  <div className="mt-3 rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                    <UIIconSelectorCompact
                      currentIcon={templateForm.icon || ''}
                      currentUiIcon={templateForm.uiIcon}
                      onSelectDual={handleTemplateUiIconSelect}
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap justify-between items-end gap-2 mb-2">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">日课列表</label>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => setSortingMode((prev) => !prev)}
                      className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                        sortingMode
                          ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                          : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      <GripVertical size={12} />
                      {sortingMode ? '完成排序' : '调整排序'}
                    </button>
                    <button
                      onClick={handleAddItem}
                      className="text-xs text-stone-500 hover:text-stone-800 font-bold flex items-center gap-1 px-2 py-1 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      <PlusCircle size={12} />
                      添加项
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {templateForm.items.map((item, index) => (
                    <CheckTemplateItemRow
                      key={item.id || index}
                      item={item}
                      index={index}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      sortingMode={sortingMode}
                      onMoveUp={handleMoveItemUp}
                      onMoveDown={handleMoveItemDown}
                      canUseUiIcon={canUseUiIcon}
                    />
                  ))}
                  {templateForm.items.length === 0 && (
                    <div className="text-center py-4 text-xs text-stone-300 border-2 border-dashed border-stone-100 rounded-lg">
                      暂无日课
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex flex-col">
                    <span className="text-sm font-bold text-stone-700">同步到时间轴</span>
                    <span className="text-[10px] text-stone-400 break-words">开启后，这个日课分组会显示在时间轴底部。</span>
                  </div>
                  <button
                    onClick={() => setTemplateForm({ ...templateForm, syncToTimeline: !templateForm.syncToTimeline })}
                    className={`shrink-0 p-2 rounded-lg transition-colors ${templateForm.syncToTimeline ? 'text-[#2F4F4F]' : 'text-stone-300'}`}
                  >
                    {templateForm.syncToTimeline ? <LucideIcons.ToggleRight size={28} /> : <LucideIcons.ToggleLeft size={28} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-3">
              <button
                onClick={resetEditingState}
                className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-200/50 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-lg shadow-stone-200 active:scale-95 transition-all flex items-center gap-2"
              >
                <Save size={16} />
                保存模板
              </button>
            </div>
          </div>
        )}
      </div>

      {showBatchModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="daily-batch-modal bg-white rounded-2xl w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h3 className="font-bold text-stone-800">批量修改历史日课</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-stone-100">
              <button
                onClick={() => setBatchTab('rename')}
                className={`daily-batch-tab flex-1 py-3 text-sm font-bold transition-colors ${batchTab === 'rename' ? 'daily-batch-tab-selected text-stone-800 border-b-2 border-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
              >
                批量重命名
              </button>
              <button
                onClick={() => setBatchTab('delete')}
                className={`daily-batch-tab flex-1 py-3 text-sm font-bold transition-colors ${batchTab === 'delete' ? 'daily-batch-tab-selected text-red-600 border-b-2 border-red-600' : 'text-stone-400 hover:text-stone-600'}`}
              >
                批量删除
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="daily-batch-warning bg-amber-50 text-amber-700 text-xs p-3 rounded-xl flex gap-2 items-start">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>这个操作会遍历历史日报，修改或删除指定的日课条目，请谨慎操作。</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">目标日课名称</label>
                <input
                  type="text"
                  value={batchTargetContent}
                  onChange={(event) => setBatchTargetContent(event.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-400 transition-all font-serif"
                  placeholder="例如：早起喝水"
                  autoFocus
                />
              </div>

              {batchTab === 'rename' && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">重命名为</label>
                  <input
                    type="text"
                    value={batchNewContent}
                    onChange={(event) => setBatchNewContent(event.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-400 transition-all font-serif"
                    placeholder="例如：晨起喝水"
                  />
                </div>
              )}

              {batchResult && (
                <div className={`text-center text-sm font-bold py-2 ${batchResult.includes('成功') ? 'text-green-600' : 'text-stone-400'}`}>
                  {batchResult}
                </div>
              )}

              <button
                onClick={handleBatchProcess}
                disabled={!batchTargetContent.trim() || (batchTab === 'rename' && !batchNewContent.trim())}
                className={`daily-batch-action ${batchTab === 'delete' ? 'daily-batch-action-danger' : ''} w-full py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                  batchTab === 'delete'
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                    : 'bg-stone-800 hover:bg-stone-700 shadow-stone-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {batchStep === 'input' ? (
                  <span>扫描匹配项</span>
                ) : (
                  <>
                    {batchTab === 'rename' ? <Edit2 size={14} /> : <Trash2 size={14} />}
                    {batchTab === 'rename' ? `确认重命名 (${scanCount})` : `确认删除 (${scanCount})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameConfirmModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-amber-50/50">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-600" />
                <h3 className="font-bold text-stone-800">检测到日课条目改名</h3>
              </div>
              <button
                onClick={() => setShowRenameConfirmModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-xl flex gap-2 items-start">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>你修改了模板里的日课名称。为了保持统计和历史数据一致，建议同时批量更新历史日报中的旧名称。</p>
              </div>

              <div className="bg-stone-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-stone-800 mb-1">
                  {pendingRenames.reduce((sum, item) => sum + item.matchCount, 0)}
                </div>
                <div className="text-xs text-stone-500">
                  历史数据中找到 {pendingRenames.reduce((sum, item) => sum + item.matchCount, 0)} 条记录
                </div>
                <div className="text-xs text-stone-400 mt-2">
                  涉及 {pendingRenames.length} 个条目修改
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleConfirmBatchRename}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-stone-800 hover:bg-stone-700 shadow-lg shadow-stone-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} />
                  批量更新历史数据并保存
                </button>
                <button
                  onClick={handleSkipBatchRename}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-all active:scale-[0.98]"
                >
                  跳过，仅保存模板
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingTemplateId}
        onClose={() => setDeletingTemplateId(null)}
        onConfirm={confirmDelete}
        title="删除模板"
        description="确定要删除这个日课模板吗？此操作不会影响已经生成的历史记录。"
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          onUpdateTemplates([...DEFAULT_CHECK_TEMPLATES, ...DEFAULT_MANUAL_CHECK_TEMPLATES]);
          setIsResetConfirmOpen(false);
        }}
        title="重置日课模板"
        description="确定要把所有日课模板恢复成默认状态吗？这会覆盖你当前的修改，且无法撤销。"
        confirmText="重置"
        cancelText="取消"
        type="danger"
      />
    </div>
  );
};
