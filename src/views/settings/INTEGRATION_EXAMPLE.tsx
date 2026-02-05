/**
 * @file INTEGRATION_EXAMPLE.tsx
 * @description 展示如何在主 SettingsView 中集成子设置页面的示例
 * 
 * 这个文件展示了重构后的 SettingsView 应该如何导入和使用子组件
 */

import React, { useState } from 'react';
import { X, ChevronRight, /* ... 其他图标 */ } from 'lucide-react';

// 导入子设置页面组件
import { CloudSyncSettingsView } from './CloudSyncSettingsView';
import { AISettingsView } from './AISettingsView';
import { S3SyncSettingsView } from './S3SyncSettingsView';
import { DataManagementView } from './DataManagementView';
// import { PreferencesSettingsView } from './PreferencesSettingsView';
// import { NarrativeSettingsView } from './NarrativeSettingsView';
// import { NFCSettingsView } from './NFCSettingsView';
// import { UserGuideView } from './UserGuideView';

// 导入已有的子页面
import { AutoRecordSettingsView } from '../AutoRecordSettingsView';
import { AutoLinkView } from '../AutoLinkView';
import { ObsidianExportView } from '../ObsidianExportView';
import { ReviewTemplateManageView } from '../ReviewTemplateManageView';
import { CheckTemplateManageView } from '../CheckTemplateManageView';
import { MemoirSettingsView } from '../MemoirSettingsView';
import { BatchFocusRecordManageView } from '../BatchFocusRecordManageView';
import { SponsorshipView } from '../SponsorshipView';

interface SettingsViewProps {
    onClose: () => void;
    // ... 其他 props
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClose, /* ... 其他 props */ }) => {
    const [activeSubmenu, setActiveSubmenu] = useState<string>('main');
    
    // 状态管理
    const [webdavConfig, setWebdavConfig] = useState(null);
    const [s3Config, setS3Config] = useState(null);
    // ... 其他状态

    // ============================================
    // 子页面路由 - 使用独立组件
    // ============================================

    // AI 配置页
    if (activeSubmenu === 'ai') {
        return (
            <AISettingsView
                onBack={() => setActiveSubmenu('main')}
                onToast={onToast}
            />
        );
    }

    // WebDAV 云同步页
    if (activeSubmenu === 'cloud') {
        return (
            <CloudSyncSettingsView
                onBack={() => setActiveSubmenu('main')}
                onToast={onToast}
                webdavConfig={webdavConfig}
                setWebdavConfig={setWebdavConfig}
                onSyncUpload={handleSyncUpload}
                onSyncDownload={handleSyncDownload}
            />
        );
    }

    // S3 云同步页
    if (activeSubmenu === 's3') {
        return (
            <S3SyncSettingsView
                onBack={() => setActiveSubmenu('main')}
                onToast={onToast}
                s3Config={s3Config}
                setS3Config={setS3Config}
                onS3SyncUpload={handleS3SyncUpload}
                onS3SyncDownload={handleS3SyncDownload}
            />
        );
    }

    // 数据管理页
    if (activeSubmenu === 'data') {
        return (
            <DataManagementView
                onBack={() => setActiveSubmenu('main')}
                onExport={onExport}
                onImport={onImport}
                onReset={onReset}
                onClearData={onClearData}
                onToast={onToast}
                logs={logs}
                categories={categories}
                todos={todos}
                todoCategories={todoCategories}
                scopes={scopes}
                onCleanupCloudBackups={handleCleanupCloudBackups}
            />
        );
    }

    // 偏好设置页（待创建）
    // if (activeSubmenu === 'preferences') {
    //     return (
    //         <PreferencesSettingsView
    //             onBack={() => setActiveSubmenu('main')}
    //             // ... props
    //         />
    //     );
    // }

    // AI 叙事设定页（待创建）
    // if (activeSubmenu === 'narrative_prompt') {
    //     return (
    //         <NarrativeSettingsView
    //             onBack={() => setActiveSubmenu('main')}
    //             // ... props
    //         />
    //     );
    // }

    // NFC 标签页（待创建）
    // if (activeSubmenu === 'nfc') {
    //     return (
    //         <NFCSettingsView
    //             onBack={() => setActiveSubmenu('main')}
    //             // ... props
    //         />
    //     );
    // }

    // 用户指南页（待创建）
    // if (activeSubmenu === 'guide') {
    //     return (
    //         <UserGuideView
    //             onBack={() => setActiveSubmenu('main')}
    //         />
    //     );
    // }

    // 已有的子页面保持不变
    if (activeSubmenu === 'auto_record') {
        return <AutoRecordSettingsView onBack={() => setActiveSubmenu('main')} categories={categories || []} />;
    }

    if (activeSubmenu === 'autolink') {
        return <AutoLinkView onClose={() => setActiveSubmenu('main')} /* ... */ />;
    }

    if (activeSubmenu === 'obsidian_export') {
        return <ObsidianExportView onBack={() => setActiveSubmenu('main')} /* ... */ />;
    }

    if (activeSubmenu === 'templates') {
        return <ReviewTemplateManageView /* ... */ onBack={() => setActiveSubmenu('main')} />;
    }

    if (activeSubmenu === 'check_templates') {
        return <CheckTemplateManageView /* ... */ onBack={() => setActiveSubmenu('main')} />;
    }

    if (activeSubmenu === 'memoir_filter') {
        return <MemoirSettingsView onBack={() => setActiveSubmenu('main')} />;
    }

    if (activeSubmenu === 'batch_manage') {
        return <BatchFocusRecordManageView onBack={() => setActiveSubmenu('main')} /* ... */ />;
    }

    if (activeSubmenu === 'sponsorship_preview') {
        return <SponsorshipView onBack={() => setActiveSubmenu('main')} onToast={onToast} />;
    }

    // ============================================
    // 主设置页面 - 菜单列表
    // ============================================
    return (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col font-serif animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-stone-100 bg-[#fdfbf7]/80 backdrop-blur-md sticky top-0">
                <button onClick={onClose} className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition-colors">
                    <X size={24} />
                </button>
                <span className="text-stone-800 font-bold text-lg">设置</span>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
                {/* Section: General */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">通用</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem label="AI API" onClick={() => setActiveSubmenu('ai')} />
                        <MenuItem label="自定义筛选器" onClick={() => setActiveSubmenu('filters')} />
                        <MenuItem label="标签关联领域规则" onClick={() => setActiveSubmenu('autolink')} />
                        <MenuItem label="NFC Tags" onClick={() => setActiveSubmenu('nfc')} />
                        <MenuItem label="AI 叙事设定" onClick={() => setActiveSubmenu('narrative_prompt')} isLast />
                    </div>
                </div>

                {/* Section: Data & Sync */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">数据与同步</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem label="批量管理记录" onClick={() => setActiveSubmenu('batch_manage')} />
                        <MenuItem label="WebDAV 云同步" onClick={() => setActiveSubmenu('cloud')} />
                        <MenuItem label="S3 云同步" onClick={() => setActiveSubmenu('s3')} />
                        <MenuItem label="数据导出导入" onClick={() => setActiveSubmenu('data')} />
                        <MenuItem label="导出到 Obsidian" onClick={() => setActiveSubmenu('obsidian_export')} isLast />
                    </div>
                </div>

                {/* Section: Preferences */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">偏好设置</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem label="偏好设置" onClick={() => setActiveSubmenu('preferences')} isLast />
                    </div>
                </div>

                {/* Section: About */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2">关于</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                        <MenuItem label="检查更新" onClick={handleCheckUpdate} />
                        <MenuItem label="用户指南" onClick={() => setActiveSubmenu('guide')} />
                        <MenuItem label="请我喝杯咖啡 ☕" onClick={() => setShowDonationModal(true)} isLast />
                    </div>
                </div>
            </div>
        </div>
    );
};

// 菜单项组件
const MenuItem: React.FC<{ label: string; onClick?: () => void; isLast?: boolean }> = ({ label, onClick, isLast }) => (
    <div
        onClick={onClick}
        className={`flex items-center justify-between p-4 active:bg-stone-50 transition-colors cursor-pointer ${!isLast ? 'border-b border-stone-50' : ''}`}
    >
        <span className="text-[15px] font-medium text-stone-700">{label}</span>
        <ChevronRight size={16} className="text-stone-300" />
    </div>
);
