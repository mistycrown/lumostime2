/**
 * @file AutoRecordSettingsView.tsx
 * @input Installed apps list and activity categories
 * @output Accessibility permission request plus app association rule editing
 * @pos View (Settings Sub-page)
 * @description Allows users to grant accessibility permissions, configure app-to-activity associations, and mark apps to be ignored by floating-window detection.
 * @updated 2026-06-21: Removed duplicated app-awareness override copy and refreshed the visible Chinese labels with UTF-8-safe text.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ShieldAlert, Smartphone, ChevronRight, X, Search, Trash2 } from 'lucide-react';
import AppUsage from '../plugins/AppUsagePlugin';
import { Category } from '../types';

interface Props {
  onBack: () => void;
  categories: Category[];
}

interface InstalledApp {
  packageName: string;
  label: string;
  icon: string;
}

export const AutoRecordSettingsView: React.FC<Props> = ({ onBack, categories }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [rules, setRules] = useState<{ [key: string]: string }>({});
  const [ignoredApps, setIgnoredApps] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void checkPermission();
    void loadData();
  }, []);

  useEffect(() => {
    const handleResume = () => {
      void checkPermission();
    };

    document.addEventListener('resume', handleResume);
    return () => document.removeEventListener('resume', handleResume);
  }, []);

  const checkPermission = async () => {
    try {
      const res = await AppUsage.checkAccessibilityPermission();
      setHasPermission(res.granted);
    } catch (error) {
      console.error(error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const rulesRes = await AppUsage.getAppRules();
      setRules(rulesRes.rules || {});
      setIgnoredApps(rulesRes.ignoredApps || {});

      const appsRes = await AppUsage.getInstalledApps();
      const sorted = (appsRes.apps || []).sort((a, b) => {
        const isConfiguredA = !!rulesRes.rules[a.packageName] || !!rulesRes.ignoredApps?.[a.packageName];
        const isConfiguredB = !!rulesRes.rules[b.packageName] || !!rulesRes.ignoredApps?.[b.packageName];
        if (isConfiguredA && !isConfiguredB) {
          return -1;
        }
        if (!isConfiguredA && isConfiguredB) {
          return 1;
        }
        return a.label.localeCompare(b.label, 'zh-CN');
      });
      setInstalledApps(sorted);
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
  };

  const handlePermissionClick = async () => {
    if (hasPermission) {
      return;
    }

    try {
      await AppUsage.requestAccessibilityPermission();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAppClick = (app: InstalledApp) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const handleSaveRule = async (activityId: string) => {
    if (!selectedApp) {
      return;
    }

    try {
      const activity = getActivityById(activityId);
      await AppUsage.saveAppRule({
        packageName: selectedApp.packageName,
        activityId,
        activityName: activity?.name
      });
      setRules((prev) => ({ ...prev, [selectedApp.packageName]: activityId }));
      setIsModalOpen(false);
      setSelectedApp(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleIgnored = async (app: InstalledApp, ignored: boolean) => {
    try {
      await AppUsage.setAppIgnored({ packageName: app.packageName, ignored });
      setIgnoredApps((prev) => ({
        ...prev,
        [app.packageName]: ignored
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveRule = async () => {
    if (!selectedApp) {
      return;
    }

    try {
      await AppUsage.removeAppRule({ packageName: selectedApp.packageName });
      setRules((prev) => {
        const next = { ...prev };
        delete next[selectedApp.packageName];
        return next;
      });
      setIsModalOpen(false);
      setSelectedApp(null);
    } catch (error) {
      console.error(error);
    }
  };

  const renderIgnoreButton = (isIgnored: boolean, onClick: () => void, compact = false) => (
    <button
      type="button"
      aria-pressed={isIgnored}
      onClick={onClick}
      className={`rounded-full font-medium transition-colors ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${
        isIgnored
          ? 'bg-stone-800 text-white'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
    >
      {isIgnored ? '忽略中' : '开启'}
    </button>
  );

  const getActivityById = (id: string) => {
    for (const category of categories) {
      const activity = category.activities.find((item) => item.id === id);
      if (activity) {
        return activity;
      }
    }
    return null;
  };

  const filteredApps = useMemo(() => {
    if (!searchQuery) {
      return installedApps;
    }

    const query = searchQuery.toLowerCase();
    return installedApps.filter((app) =>
      app.label.toLowerCase().includes(query) || app.packageName.toLowerCase().includes(query)
    );
  }, [installedApps, searchQuery]);

  const renderModal = () => {
    if (!isModalOpen || !selectedApp) {
      return null;
    }

    const currentRuleId = rules[selectedApp.packageName];

    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col bg-[#fdfbf7] font-serif animate-in slide-in-from-bottom duration-200"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div
          className="box-border flex items-center justify-between border-b border-stone-100 bg-[#fdfbf7]/80 px-4 backdrop-blur-md shrink-0"
          style={{
            height: 'calc(3.5rem + env(safe-area-inset-top))',
            paddingTop: 'env(safe-area-inset-top)'
          }}
        >
          <button onClick={() => setIsModalOpen(false)} className="p-2 -ml-2 text-stone-400 hover:text-stone-600">
            <X size={24} />
          </button>
          <div className="flex items-center gap-2 font-bold text-stone-800">
            {selectedApp.icon && <img src={selectedApp.icon} className="h-6 w-6 rounded-md" />}
            {selectedApp.label}
          </div>
          {currentRuleId ? (
            <button onClick={handleRemoveRule} className="p-2 -mr-2 rounded-lg text-red-500 hover:bg-red-50">
              <Trash2 size={20} />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-stone-800">忽略此应用</div>
                <div className="mt-1 text-xs leading-relaxed text-stone-500">
                  开启后，悬浮球不会识别、展示或提醒这个应用，但已关联的标签会保留。
                </div>
              </div>
              {renderIgnoreButton(
                !!ignoredApps[selectedApp.packageName],
                () => handleToggleIgnored(selectedApp, !ignoredApps[selectedApp.packageName])
              )}
            </div>
          </div>

          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-stone-400">选择关联标签</h3>

          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.id}>
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-bold text-stone-700">{category.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {category.activities.map((activity) => {
                    const isSelected = currentRuleId === activity.id;
                    return (
                      <button
                        key={activity.id}
                        onClick={() => handleSaveRule(activity.id)}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-stone-300 bg-stone-50'
                            : 'border-stone-100 bg-white hover:border-stone-300 active:scale-95'
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${activity.color || 'bg-stone-100 text-stone-500'}`}>
                          {activity.icon}
                        </div>
                        <span className={`flex-1 truncate text-sm font-medium ${isSelected ? 'text-stone-900' : 'text-stone-700'}`}>
                          {activity.name}
                        </span>
                        {isSelected && <Check size={16} className="text-stone-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex h-full flex-col bg-[#fdfbf7] font-serif text-stone-900"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div
        className="sticky top-0 z-10 box-border flex items-center gap-3 border-b border-stone-100 bg-[#fdfbf7]/80 px-4 backdrop-blur-md shrink-0"
        style={{
          height: 'calc(3.5rem + env(safe-area-inset-top))',
          paddingTop: 'env(safe-area-inset-top)'
        }}
      >
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full transition-transform hover:bg-stone-100 active:scale-95"
        >
          <ArrowLeft size={20} className="text-stone-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-stone-800">应用关联标签规则</h1>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4 pb-20">
          <div className="rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-blue-700">
            <p className="mb-1 font-bold">功能说明</p>
            <p>需要先开启无障碍权限。进入对应应用后，悬浮球会根据这里的规则识别和关联活动标签。</p>
          </div>

          {!hasPermission && (
            <div
              onClick={handlePermissionClick}
              className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-amber-600" size={24} />
                <div>
                  <div className="font-bold text-amber-900">需要无障碍服务权限</div>
                  <div className="text-xs text-amber-700">点击授权以启用实时应用检测</div>
                </div>
              </div>
              <ChevronRight size={20} className="text-amber-400" />
            </div>
          )}

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="pl-2 text-sm font-semibold uppercase tracking-wider text-stone-400">
                已安装应用 ({installedApps.length})
              </h2>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                type="text"
                placeholder="搜索应用..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-stone-100 bg-white py-2 pl-9 pr-4 text-sm text-stone-800 placeholder-stone-400 transition-colors focus:border-stone-300 focus:outline-none"
              />
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-stone-300">加载中...</div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                {filteredApps.map((app, index) => {
                  const ruleId = rules[app.packageName];
                  const matched = ruleId ? getActivityById(ruleId) : null;
                  const isIgnored = !!ignoredApps[app.packageName];
                  const isLast = index === filteredApps.length - 1;

                  return (
                    <div
                      key={app.packageName}
                      onClick={() => handleAppClick(app)}
                      className={`flex cursor-pointer items-center gap-3 p-4 transition-colors active:bg-stone-50 ${
                        !isLast ? 'border-b border-stone-50' : ''
                      }`}
                    >
                      <div className="h-10 w-10 shrink-0">
                        {app.icon ? (
                          <img src={app.icon} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-stone-100">
                            <Smartphone size={16} className="text-stone-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-stone-800">{app.label}</div>
                        <div className="truncate text-[10px] text-stone-400">{app.packageName}</div>
                      </div>

                      {renderIgnoreButton(
                        isIgnored,
                        () => handleToggleIgnored(app, !isIgnored),
                        true
                      )}

                      {matched ? (
                        <div className="flex items-center gap-2 rounded-lg bg-stone-100 px-2 py-1">
                          <span className="text-lg">{matched.icon}</span>
                          <span className="max-w-[80px] truncate text-xs font-bold text-stone-600">
                            {matched.name}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-stone-50 px-2 py-1">
                          <span className="text-xs text-stone-400">未关联</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredApps.length === 0 && !isLoading && (
                  <div className="py-10 text-center text-stone-300">未找到应用</div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {renderModal()}
    </div>
  );
};
