/**
 * @file lazyViews.ts
 * @input Dynamic import loaders for lazily rendered views
 * @output Preloadable lazy view components and app-level preload scheduler
 * @pos Utility Layer (View Loading)
 * @description Centralizes lazy-loaded view declarations so the app can both render them lazily and preload their code in the background after startup.
 *
 * 修改历史:
 * - 2026-03-11: 新增统一的懒加载/预加载入口，支持应用启动后的分层代码预热。
 */
import React from 'react';

type LazyModule<T extends React.ComponentType<any>> = Promise<{ default: T }>;
type LazyFactory<T extends React.ComponentType<any>> = () => LazyModule<T>;
type PreloadableLazyComponent<T extends React.ComponentType<any>> = React.LazyExoticComponent<T> & {
  preload: LazyFactory<T>;
};

const lazyWithPreload = <T extends React.ComponentType<any>>(factory: LazyFactory<T>): PreloadableLazyComponent<T> => {
  const Component = React.lazy(factory) as PreloadableLazyComponent<T>;
  Component.preload = factory;
  return Component;
};

const loadSearchView = () => import('../views/SearchView').then((module) => ({ default: module.SearchView }));
const loadFocusDetailView = () => import('../views/FocusDetailView').then((module) => ({ default: module.FocusDetailView }));
const loadShareView = () => import('../views/ShareView').then((module) => ({ default: module.ShareView }));
const loadAutoLinkView = () => import('../views/AutoLinkView').then((module) => ({ default: module.AutoLinkView }));
const loadSettingsView = () => import('../views/SettingsView').then((module) => ({ default: module.SettingsView }));
const loadStatsView = () => import('../views/StatsView').then((module) => ({ default: module.StatsView }));

const loadReviewTemplateManageView = () => import('../views/ReviewTemplateManageView').then((module) => ({ default: module.ReviewTemplateManageView }));
const loadCheckTemplateManageView = () => import('../views/CheckTemplateManageView').then((module) => ({ default: module.CheckTemplateManageView }));
const loadAutoRecordSettingsView = () => import('../views/AutoRecordSettingsView').then((module) => ({ default: module.AutoRecordSettingsView }));
const loadObsidianExportView = () => import('../views/ObsidianExportView').then((module) => ({ default: module.ObsidianExportView }));
const loadMemoirSettingsView = () => import('../views/MemoirSettingsView').then((module) => ({ default: module.MemoirSettingsView }));
const loadBatchFocusRecordManageView = () => import('../views/BatchFocusRecordManageView').then((module) => ({ default: module.BatchFocusRecordManageView }));
const loadSponsorshipView = () => import('../views/SponsorshipView').then((module) => ({ default: module.SponsorshipView }));
const loadAISettingsView = () => import('../views/settings/AISettingsView').then((module) => ({ default: module.AISettingsView }));
const loadPreferencesSettingsView = () => import('../views/settings/PreferencesSettingsView').then((module) => ({ default: module.PreferencesSettingsView }));
const loadEmojiSettingsView = () => import('../views/settings/EmojiSettingsView').then((module) => ({ default: module.EmojiSettingsView }));
const loadPrincipleLibraryView = () => import('../views/settings/PrincipleLibraryView').then((module) => ({ default: module.PrincipleLibraryView }));
const loadNarrativeSettingsView = () => import('../views/settings/NarrativeSettingsView').then((module) => ({ default: module.NarrativeSettingsView }));
const loadNFCSettingsView = () => import('../views/settings/NFCSettingsView').then((module) => ({ default: module.NFCSettingsView }));
const loadUserGuideView = () => import('../views/settings/UserGuideView').then((module) => ({ default: module.UserGuideView }));
const loadFiltersSettingsView = () => import('../views/settings/FiltersSettingsView').then((module) => ({ default: module.FiltersSettingsView }));
const loadCloudSyncSettingsView = () => import('../views/settings/CloudSyncSettingsView').then((module) => ({ default: module.CloudSyncSettingsView }));
const loadS3SyncSettingsView = () => import('../views/settings/S3SyncSettingsView').then((module) => ({ default: module.S3SyncSettingsView }));
const loadDataManagementView = () => import('../views/settings/DataManagementView').then((module) => ({ default: module.DataManagementView }));
const loadWidgetSettingsView = () => import('../views/settings/WidgetSettingsView').then((module) => ({ default: module.WidgetSettingsView }));

export const SearchViewLazy = lazyWithPreload(loadSearchView);
export const FocusDetailViewLazy = lazyWithPreload(loadFocusDetailView);
export const ShareViewLazy = lazyWithPreload(loadShareView);
export const AutoLinkViewLazy = lazyWithPreload(loadAutoLinkView);
export const SettingsViewLazy = lazyWithPreload(loadSettingsView);
export const StatsViewLazy = lazyWithPreload(loadStatsView);

export const ReviewTemplateManageViewLazy = lazyWithPreload(loadReviewTemplateManageView);
export const CheckTemplateManageViewLazy = lazyWithPreload(loadCheckTemplateManageView);
export const AutoRecordSettingsViewLazy = lazyWithPreload(loadAutoRecordSettingsView);
export const ObsidianExportViewLazy = lazyWithPreload(loadObsidianExportView);
export const MemoirSettingsViewLazy = lazyWithPreload(loadMemoirSettingsView);
export const BatchFocusRecordManageViewLazy = lazyWithPreload(loadBatchFocusRecordManageView);
export const SponsorshipViewLazy = lazyWithPreload(loadSponsorshipView);
export const AISettingsViewLazy = lazyWithPreload(loadAISettingsView);
export const PreferencesSettingsViewLazy = lazyWithPreload(loadPreferencesSettingsView);
export const EmojiSettingsViewLazy = lazyWithPreload(loadEmojiSettingsView);
export const PrincipleLibraryViewLazy = lazyWithPreload(loadPrincipleLibraryView);
export const NarrativeSettingsViewLazy = lazyWithPreload(loadNarrativeSettingsView);
export const NFCSettingsViewLazy = lazyWithPreload(loadNFCSettingsView);
export const UserGuideViewLazy = lazyWithPreload(loadUserGuideView);
export const FiltersSettingsViewLazy = lazyWithPreload(loadFiltersSettingsView);
export const CloudSyncSettingsViewLazy = lazyWithPreload(loadCloudSyncSettingsView);
export const S3SyncSettingsViewLazy = lazyWithPreload(loadS3SyncSettingsView);
export const DataManagementViewLazy = lazyWithPreload(loadDataManagementView);
export const WidgetSettingsViewLazy = lazyWithPreload(loadWidgetSettingsView);

type Preloader = () => Promise<unknown>;

const primaryPreloaders: Preloader[] = [
  SettingsViewLazy.preload,
  SearchViewLazy.preload,
  StatsViewLazy.preload,
  ShareViewLazy.preload
];

const secondaryPreloaders: Preloader[] = [
  AutoLinkViewLazy.preload,
  FocusDetailViewLazy.preload,
  DataManagementViewLazy.preload,
  BatchFocusRecordManageViewLazy.preload,
  SponsorshipViewLazy.preload,
  CloudSyncSettingsViewLazy.preload,
  PreferencesSettingsViewLazy.preload,
  ObsidianExportViewLazy.preload,
  ReviewTemplateManageViewLazy.preload,
  CheckTemplateManageViewLazy.preload,
  AutoRecordSettingsViewLazy.preload,
  MemoirSettingsViewLazy.preload,
  AISettingsViewLazy.preload,
  EmojiSettingsViewLazy.preload,
  PrincipleLibraryViewLazy.preload,
  NarrativeSettingsViewLazy.preload,
  NFCSettingsViewLazy.preload,
  UserGuideViewLazy.preload,
  FiltersSettingsViewLazy.preload,
  S3SyncSettingsViewLazy.preload,
  WidgetSettingsViewLazy.preload
];

let hasStartedAppViewPreload = false;

const safePreload = (preload: Preloader) => {
  void preload().catch((error) => {
    console.warn('[lazyViews] preload failed:', error);
  });
};

export const startLazyViewPreload = (): (() => void) => {
  if (typeof window === 'undefined' || hasStartedAppViewPreload) {
    return () => {};
  }

  hasStartedAppViewPreload = true;
  const timeoutIds: number[] = [];

  primaryPreloaders.forEach((preload, index) => {
    const timeoutId = window.setTimeout(() => {
      safePreload(preload);
    }, 1200 + index * 500);
    timeoutIds.push(timeoutId);
  });

  secondaryPreloaders.forEach((preload, index) => {
    const timeoutId = window.setTimeout(() => {
      safePreload(preload);
    }, 4200 + index * 700);
    timeoutIds.push(timeoutId);
  });

  return () => {
    timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
  };
};
