/**
 * @file NFCSettingsView.tsx
 * @description Configures NFC tag read and write actions.
 * @updated 2026-08-26: Uses “打卡” wording for daily-check NFC actions while keeping quick punch as “快速打点”.
 * @updated 2026-07-21: Unified dark-mode NFC action buttons and disabled states.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Nfc, Crosshair, Tag, Search, Trash2, CheckCircle2 } from 'lucide-react';
import { ToastType } from '../../components/Toast';
import { Category, CheckTemplate } from '../../types';
import {
  NfcReadTestResultPayload,
  NFC_READ_TEST_MODE_EVENT,
  NFC_READ_TEST_RESULT_EVENT,
  NfcService
} from '../../services/NfcService';
import { CustomSelect } from '../../components/CustomSelect';
import { IconRenderer } from '../../components/IconRenderer';
import { getEligibleNfcDailyCheckItems } from '../../utils/dailyCheckUtils';
import { parseLumosTimeUrl } from '../../utils/lumosTimeUrlParser';
import { getActiveActivities } from '../../utils/archiveUtils';

interface NFCSettingsViewProps {
  onBack: () => void;
  onToast: (type: ToastType, message: string) => void;
  categories: Category[];
  checkTemplates: CheckTemplate[];
}

type NfcWritePrompt = {
  title: string;
  description: string;
  successMessage: string;
  errorPrefix: string;
};

type NfcPage = 'menu' | 'readTest';

type ParsedReadTestResult = {
  title: string;
  subtitle: string;
  details: Array<{ label: string; value: string }>;
};

const defaultWritePrompt: NfcWritePrompt = {
  title: '准备写入标签',
  description: '请将手机贴近要写入的 NFC 标签。',
  successMessage: 'NFC 标签写入成功',
  errorPrefix: '写入失败：'
};

const buildRecordUrl = (action: string, params: Record<string, string> = {}) => {
  const url = new URL('lumostime://record');
  url.searchParams.set('action', action);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
};

const dispatchReadTestMode = (enabled: boolean) => {
  window.dispatchEvent(new CustomEvent<{ enabled: boolean }>(NFC_READ_TEST_MODE_EVENT, {
    detail: { enabled }
  }));
};

const parseReadTestResult = (result: NfcReadTestResultPayload | null): ParsedReadTestResult | null => {
  if (!result) {
    return null;
  }

  const scannedAtText = new Date(result.scannedAt).toLocaleString('zh-CN');
  const baseDetails = [
    { label: '来源', value: result.source === 'scan' ? 'NFC 扫描' : '深链' },
    { label: '扫描时间', value: scannedAtText }
  ];

  if (result.type === 'error') {
    return {
      title: '读取失败',
      subtitle: result.message || '未获取到具体错误信息',
      details: baseDetails
    };
  }

  if (result.type !== 'uri' || !result.value) {
    return {
      title: '未识别到可执行内容',
      subtitle: result.message || '该标签中没有可解析的 URI 内容',
      details: baseDetails
    };
  }

  const details = [
    ...baseDetails,
    { label: '标签内容', value: result.value }
  ];

  const parsed = parseLumosTimeUrl(result.value);
  if (parsed) {
    if (parsed.type === 'record') {
      const actionLabelMap: Record<string, string> = {
        quick_punch: '快速打点',
        start: '开始活动',
        daily_check: '日课打卡',
        unknown: parsed.rawAction || 'unknown'
      };

      details.push({ label: '识别结果', value: 'LumosTime 标签' });
      details.push({ label: '动作类型', value: actionLabelMap[parsed.action] || parsed.action });

      if (parsed.action === 'start') {
        details.push({ label: '分类 ID', value: parsed.catId || '-' });
        details.push({ label: '活动 ID', value: parsed.actId || '-' });
      }

      if (parsed.action === 'daily_check') {
        details.push({ label: '日课项目 ID', value: parsed.checkItemId || '-' });
      }
    } else {
      details.push({ label: '识别结果', value: 'LumosTime 标签' });
      details.push({ label: '动作类型', value: parsed.action || 'widget' });
    }

    return {
      title: 'LumosTime 标签',
      subtitle: '已识别标签内容，但测试模式下不会自动执行任何动作。',
      details
    };
  }

  try {
    new URL(result.value);
    return {
      title: '普通 URI 标签',
      subtitle: '这不是 LumosTime 专用标签，当前仅展示内容，不会执行任何动作。',
      details
    };
  } catch {
    return {
      title: '文本标签',
      subtitle: '读取到了标签内容，但它不是合法的 URI。',
      details
    };
  }
};

export const NFCSettingsView: React.FC<NFCSettingsViewProps> = ({
  onBack,
  onToast,
  categories,
  checkTemplates
}) => {
  const [currentPage, setCurrentPage] = useState<NfcPage>('menu');
  const [isWritingNfc, setIsWritingNfc] = useState(false);
  const [writePrompt, setWritePrompt] = useState<NfcWritePrompt>(defaultWritePrompt);
  const [nfcSelectedCatId, setNfcSelectedCatId] = useState<string>('');
  const [nfcSelectedActId, setNfcSelectedActId] = useState<string>('');
  const [nfcSelectedCheckItemId, setNfcSelectedCheckItemId] = useState<string>('');
  const [readTestResult, setReadTestResult] = useState<NfcReadTestResultPayload | null>(null);

  const safeCategories = useMemo(() => {
    return (Array.isArray(categories) ? categories : []).map((category) => ({
      ...category,
      activities: getActiveActivities(category)
    }));
  }, [categories]);

  const dailyCheckOptions = useMemo(() => {
    return getEligibleNfcDailyCheckItems(checkTemplates).map((item) => ({
      value: item.checkItemId,
      icon: (item.icon || item.uiIcon)
        ? <IconRenderer icon={item.icon || ''} uiIcon={item.uiIcon} size={16} />
        : undefined,
      label: item.manualMode === 'count'
        ? `${item.category} / ${item.content}（目标 ${item.targetCount} 次）`
        : `${item.category} / ${item.content}`
    }));
  }, [checkTemplates]);

  const parsedReadTestResult = useMemo(() => parseReadTestResult(readTestResult), [readTestResult]);

  useEffect(() => {
    const handleReadTestResult = (event: Event) => {
      const customEvent = event as CustomEvent<NfcReadTestResultPayload>;
      setReadTestResult(customEvent.detail);
    };

    window.addEventListener(NFC_READ_TEST_RESULT_EVENT, handleReadTestResult as EventListener);
    return () => {
      window.removeEventListener(NFC_READ_TEST_RESULT_EVENT, handleReadTestResult as EventListener);
    };
  }, []);

  useEffect(() => {
    dispatchReadTestMode(currentPage === 'readTest');
    return () => {
      dispatchReadTestMode(false);
    };
  }, [currentPage]);

  const handleWriteNfc = async (uri: string, prompt: NfcWritePrompt) => {
    setWritePrompt(prompt);
    setIsWritingNfc(true);

    try {
      const success = await NfcService.writeTag(uri);
      if (success) {
        onToast('success', prompt.successMessage);
      }
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes('Session stopped')) {
        return;
      }

      onToast('error', `${prompt.errorPrefix}${error.message || '未知错误'}`);
    } finally {
      setIsWritingNfc(false);
    }
  };

  const handleCancelNfc = async () => {
    await NfcService.cancelWrite();
    setIsWritingNfc(false);
  };

  const handleBack = () => {
    if (currentPage === 'readTest') {
      setCurrentPage('menu');
      return;
    }

    onBack();
  };

  const renderReadTestPage = () => (
    <div className="flex-1 overflow-y-auto px-5 py-6 pb-40 space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
            <Search size={20} />
          </div>
          <div>
            <h3 className="font-bold text-stone-800">读取测试</h3>
            <p className="text-xs text-stone-400">
              请将手机贴近任意 NFC 标签。测试模式下只展示内容，不会执行标签动作。
            </p>
          </div>
        </div>
        <div className="p-4 bg-stone-50 rounded-xl text-xs text-stone-500 border border-dashed border-stone-200">
          扫描结果会显示在下方独立面板中。离开此页面后，NFC 才会恢复正常执行逻辑。
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-stone-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-800">标签内容</h3>
            <p className="text-xs text-stone-400">最近一次扫描结果</p>
          </div>
          <button
            onClick={() => setReadTestResult(null)}
            className="px-3 py-1.5 text-xs rounded-lg bg-stone-100 text-stone-500 active:scale-95 transition-all"
          >
            清空结果
          </button>
        </div>

        {!parsedReadTestResult ? (
          <div className="p-6 rounded-xl bg-stone-50 text-sm text-stone-500 text-center border border-dashed border-stone-200">
            暂无扫描结果，等待读取标签。
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-100">
              <div className="text-base font-bold text-stone-800">{parsedReadTestResult.title}</div>
              <div className="text-sm text-stone-500 mt-1">{parsedReadTestResult.subtitle}</div>
            </div>
            <div className="space-y-3">
              {parsedReadTestResult.details.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-xl border border-stone-100 p-4 bg-white">
                  <div className="text-xs text-stone-400 mb-1">{item.label}</div>
                  <div className="text-sm text-stone-700 break-all whitespace-pre-wrap">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMenuPage = () => (
    <div className="flex-1 overflow-y-auto px-5 py-6 pb-40 space-y-6">
      {isWritingNfc ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-lg border border-stone-100 animate-in fade-in zoom-in">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Nfc size={40} className="text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-stone-800 mb-2">{writePrompt.title}</h3>
          <p className="text-stone-500 text-center mb-8">{writePrompt.description}</p>
          <button
            onClick={handleCancelNfc}
            className="px-8 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold active:scale-95 transition-all"
          >
            取消
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <Crosshair size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-800">快速打点</h3>
                <p className="text-xs text-stone-400">
                  将标签写入为快速打点，扫描后可立即补记一段空档时间。
                </p>
              </div>
            </div>
            <button
              onClick={() => handleWriteNfc(buildRecordUrl('quick_punch'), {
                title: '准备写入快速打点标签',
                description: '请将手机贴近要写入的 NFC 标签。',
                successMessage: '快速打点标签写入成功',
                errorPrefix: '快速打点标签写入失败：'
              })}
              className="nfc-action-button w-full py-3 bg-stone-800 text-white rounded-xl font-bold shadow-lg shadow-stone-200 active:scale-[0.98] transition-all"
            >
              写入快速打点标签
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Tag size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-800">指定活动</h3>
                <p className="text-xs text-stone-400">
                  将标签写入为某个活动，扫描后可直接开始或切换该活动。
                </p>
              </div>
            </div>

            <CustomSelect
              label="分类"
              placeholder="请选择分类"
              value={nfcSelectedCatId}
              onChange={(val) => {
                setNfcSelectedCatId(val);
                setNfcSelectedActId('');
              }}
              options={safeCategories.map((cat: Category) => ({
                value: cat.id,
                label: cat.name,
                icon: <span className="text-lg">{cat.icon}</span>
              }))}
            />

            <CustomSelect
              label="活动"
              placeholder="请选择活动"
              value={nfcSelectedActId}
              onChange={(val) => setNfcSelectedActId(val)}
              disabled={!nfcSelectedCatId}
              options={
                safeCategories
                  .find((category) => category.id === nfcSelectedCatId)
                  ?.activities.map((activity) => ({
                    value: activity.id,
                    label: activity.name,
                    icon: <span className="text-lg">{activity.icon}</span>
                  })) || []
              }
            />

            <button
              disabled={!nfcSelectedCatId || !nfcSelectedActId}
              onClick={() => handleWriteNfc(
                buildRecordUrl('start', {
                  cat_id: nfcSelectedCatId,
                  act_id: nfcSelectedActId
                }),
                {
                  title: '准备写入活动标签',
                  description: '请将手机贴近要写入的 NFC 标签。',
                  successMessage: '活动标签写入成功',
                  errorPrefix: '活动标签写入失败：'
                }
              )}
              className="nfc-action-button w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
            >
              写入活动标签
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-800">日课打卡</h3>
                <p className="text-xs text-stone-400">
                  将标签写入为某项日课，扫描后可完成或递增对应计数。
                </p>
              </div>
            </div>

            <CustomSelect
              label="日课项目"
              placeholder={dailyCheckOptions.length > 0 ? '请选择日课项目' : '暂无可用日课项目'}
              value={nfcSelectedCheckItemId}
              onChange={(val) => setNfcSelectedCheckItemId(val)}
              options={dailyCheckOptions}
            />

            <button
              disabled={!nfcSelectedCheckItemId}
              onClick={() => handleWriteNfc(
                buildRecordUrl('daily_check', {
                  check_item_id: nfcSelectedCheckItemId
                }),
                {
                  title: '准备写入日课标签',
                  description: '请将手机贴近要写入的 NFC 标签。',
                  successMessage: '日课标签写入成功',
                  errorPrefix: '日课标签写入失败：'
                }
              )}
              className="nfc-action-button w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
            >
              写入日课标签
            </button>

            {dailyCheckOptions.length === 0 && (
              <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-500 border border-dashed border-stone-200">
                暂无启用的手动日课项目，请先在日课模板中启用可手动打卡的项目。
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-stone-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                <Search size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-800">读取测试</h3>
                <p className="text-xs text-stone-400">
                  进入独立测试页后，扫描标签只会展示内容，不会执行动作。
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentPage('readTest')}
              className="w-full py-3 bg-stone-700 text-white rounded-xl font-bold shadow-lg shadow-stone-200 active:scale-[0.98] transition-all"
            >
              进入读取测试
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border border-red-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-800">清除标签</h3>
                <p className="text-xs text-stone-400">
                  移除标签中的已有内容，让它恢复为空白标签。
                </p>
              </div>
            </div>
            <button
              onClick={() => handleWriteNfc('lumostime://clear', {
                title: '准备清除标签',
                description: '请将手机贴近要清除的 NFC 标签。',
                successMessage: '标签内容已清除',
                errorPrefix: '清除失败：'
              })}
              className="nfc-action-button nfc-danger-action w-full py-3 bg-red-50 text-red-500 border border-red-100 rounded-xl font-bold active:scale-[0.98] transition-all"
            >
              清除标签内容
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[var(--app-safe-area-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={handleBack}
          className="text-stone-400 hover:text-stone-600 p-1"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-stone-800 font-bold text-lg">
          {currentPage === 'readTest' ? 'NFC 读取测试' : 'NFC 标签'}
        </span>
      </div>

      {currentPage === 'readTest' ? renderReadTestPage() : renderMenuPage()}
    </div>
  );
};
