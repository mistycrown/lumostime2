/**
 * @file lumosTimeUrlParser.ts
 * @input Raw LumosTime deep-link or NFC URI strings
 * @output Normalized LumosTime target/action metadata for runtime execution and read-test display
 * @pos Utility (Deep Link Parsing)
 * @description Normalizes LumosTime custom-scheme URLs across WebView parsing differences so NFC scans and app deep links share one compatible parser.
 * @updated 2026-05-14: Added normalized execution keys so NFC scans and app deep links that resolve to the same action can share one dedupe path.
 */

export type LumosTimeRecordAction = 'quick_punch' | 'start' | 'daily_check' | 'unknown';

export type ParsedLumosTimeRecordUrl = {
  type: 'record';
  rawValue: string;
  action: LumosTimeRecordAction;
  rawAction: string | null;
  catId: string | null;
  actId: string | null;
  checkItemId: string | null;
};

export type ParsedLumosTimeWidgetUrl = {
  type: 'widget';
  rawValue: string;
  action: string | null;
};

export type ParsedLumosTimeQuickTodoUrl = {
  type: 'quick_todo';
  rawValue: string;
  action: 'new';
};

export type ParsedLumosTimeUrl = ParsedLumosTimeRecordUrl | ParsedLumosTimeWidgetUrl | ParsedLumosTimeQuickTodoUrl;

const LUMOS_SCHEME = 'lumostime:';
const RECORD_ACTION_ALIASES = new Map<string, LumosTimeRecordAction>([
  ['quick_punch', 'quick_punch'],
  ['quick_log', 'quick_punch'],
  ['quickpunch', 'quick_punch'],
  ['quicklog', 'quick_punch'],
  ['start', 'start'],
  ['daily_check', 'daily_check'],
  ['dailycheck', 'daily_check']
]);

const normalizePathSegment = (value: string): string | null => {
  const normalized = value.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  return normalized || null;
};

const getFirstParam = (params: URLSearchParams, aliases: string[]): string | null => {
  for (const alias of aliases) {
    const value = params.get(alias);
    if (value) {
      return value;
    }
  }

  return null;
};

const getQueryString = (value: string): string => {
  const trimmed = value.trim();
  const queryIndex = trimmed.indexOf('?');
  if (queryIndex === -1) {
    return '';
  }

  const hashIndex = trimmed.indexOf('#', queryIndex);
  return hashIndex === -1 ? trimmed.slice(queryIndex + 1) : trimmed.slice(queryIndex + 1, hashIndex);
};

const getManualSegments = (value: string): string[] => {
  const trimmed = value.trim();
  const body = trimmed.slice(LUMOS_SCHEME.length).replace(/^\/+/, '');
  const queryIndex = body.search(/[?#]/);
  const targetPart = queryIndex === -1 ? body : body.slice(0, queryIndex);

  return targetPart
    .split('/')
    .map((segment) => normalizePathSegment(segment))
    .filter((segment): segment is string => !!segment);
};

const getUrlSegments = (value: string): string[] => {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol.toLowerCase() !== LUMOS_SCHEME) {
      return [];
    }

    return [
      normalizePathSegment(parsed.host),
      ...parsed.pathname
        .split('/')
        .map((segment) => normalizePathSegment(segment))
    ].filter((segment): segment is string => !!segment);
  } catch {
    return [];
  }
};

const resolveTargetAndPathAction = (segments: string[]): { target: 'record' | 'widget' | 'quick_todo'; pathAction: string | null } | null => {
  const [first, second] = segments;
  if (!first) {
    return null;
  }

  if (first === 'record' || first === 'widget') {
    return {
      target: first,
      pathAction: second || null
    };
  }

  if ((first === 'quick-todo' || first === 'quick_todo') && second === 'new') {
    return { target: 'quick_todo', pathAction: second };
  }

  if (RECORD_ACTION_ALIASES.has(first)) {
    return {
      target: 'record',
      pathAction: first
    };
  }

  return null;
};

const normalizeRecordAction = (value: string | null): { action: LumosTimeRecordAction; rawAction: string | null } => {
  if (!value) {
    return { action: 'unknown', rawAction: null };
  }

  const normalized = value.trim().toLowerCase();
  return {
    action: RECORD_ACTION_ALIASES.get(normalized) || 'unknown',
    rawAction: normalized
  };
};

export const parseLumosTimeUrl = (value: string | null | undefined): ParsedLumosTimeUrl | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || !trimmed.toLowerCase().startsWith(LUMOS_SCHEME)) {
    return null;
  }

  const urlSegments = getUrlSegments(trimmed);
  const manualSegments = getManualSegments(trimmed);
  const resolved = resolveTargetAndPathAction(urlSegments) || resolveTargetAndPathAction(manualSegments);
  if (!resolved) {
    return null;
  }

  const params = new URLSearchParams(getQueryString(trimmed));
  if (resolved.target === 'quick_todo') {
    return { type: 'quick_todo', rawValue: trimmed, action: 'new' };
  }

  if (resolved.target === 'widget') {
    return {
      type: 'widget',
      rawValue: trimmed,
      action: getFirstParam(params, ['action']) || resolved.pathAction
    };
  }

  const { action, rawAction } = normalizeRecordAction(getFirstParam(params, ['action']) || resolved.pathAction);

  return {
    type: 'record',
    rawValue: trimmed,
    action,
    rawAction,
    catId: getFirstParam(params, ['cat_id', 'catId', 'categoryId', 'category_id']),
    actId: getFirstParam(params, ['act_id', 'actId', 'activityId', 'activity_id']),
    checkItemId: getFirstParam(params, ['check_item_id', 'checkItemId'])
  };
};

export const buildLumosTimeExecutionKey = (parsedUrl: ParsedLumosTimeUrl): string => {
  if (parsedUrl.type === 'widget') {
    return `widget:${parsedUrl.action || 'unknown'}`;
  }

  if (parsedUrl.type === 'quick_todo') {
    return 'quick_todo:new';
  }

  if (parsedUrl.action === 'start') {
    return `record:start:${parsedUrl.catId || ''}:${parsedUrl.actId || ''}`;
  }

  if (parsedUrl.action === 'daily_check') {
    return `record:daily_check:${parsedUrl.checkItemId || ''}`;
  }

  return `record:${parsedUrl.action}:${parsedUrl.rawAction || ''}`;
};
