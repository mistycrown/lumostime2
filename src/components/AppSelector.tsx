/**
 * @file AppSelector.tsx
 * @description 应用选择器组件 - 用于选择要启动的外部应用
 */
import React, { useState, useEffect } from 'react';
import { Search, Smartphone, X } from 'lucide-react';
import { AppLauncherService, InstalledApp } from '../services/AppLauncherService';

interface AppSelectorProps {
  selectedPackageName?: string;
  selectedAppName?: string;
  onSelect: (packageName: string, appName: string) => void;
  onClose: () => void;
}

export const AppSelector: React.FC<AppSelectorProps> = ({
  selectedPackageName,
  selectedAppName,
  onSelect,
  onClose
}) => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const installedApps = await AppLauncherService.getInstalledApps();
      // 按应用名称排序
      const sortedApps = installedApps.sort((a, b) => 
        a.appName.localeCompare(b.appName, 'zh-CN')
      );
      setApps(sortedApps);
    } catch (error) {
      console.error('加载应用列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = apps.filter(app =>
    app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectApp = (app: InstalledApp) => {
    onSelect(app.packageName, app.appName);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold">选择应用</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索应用名称或包名..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 应用列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-12">
              <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">无法获取应用列表</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredApps.map((app) => (
                <button
                  key={app.packageName}
                  onClick={() => handleSelectApp(app)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-gray-50 ${
                    selectedPackageName === app.packageName
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  {app.icon ? (
                    <img src={app.icon} alt={app.appName} className="w-10 h-10 rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{app.appName}</div>
                    <div className="text-sm text-gray-500 truncate">{app.packageName}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        {selectedPackageName && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 truncate flex-1 mr-4">
                已选择: <span className="font-medium">{selectedAppName}</span>
              </div>
              <button
                onClick={() => {
                  onSelect('', '');
                  onClose();
                }}
                className="text-sm text-red-500 hover:text-red-600 flex-shrink-0"
              >
                清除选择
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
