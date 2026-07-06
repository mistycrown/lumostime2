/**
 * @file aiService.ts
 * @input AI Configuration (OpenAI/Gemini keys), User Natural Language Input, Context Data (categories, scopes, todos)
 * @output Parsed Time Entries (ParsedTimeEntry[]), structured unified assistant turns, local tool-call payloads, generated narratives (string), and connection status (boolean)
 * @pos Service (AI Integration Layer)
 * @updated 2026-05-18: `create_todo` unified-turn tool calls can now carry nested `subtasks`, letting one assistant action create a parent todo together with its direct children in one pass.
 * @updated 2026-05-17: AI preset/config writes now mark the unified AI backup state as changed so provider/preset edits participate in the main backup and cloud-sync timestamp.
 * @updated 2026-05-17: Structured-JSON requests now expose provider-native reasoning metadata to custom normalizers, allowing report/newspaper writeback flows to persist the same collapsible thinking block used by ordinary chat.
 * @updated 2026-05-14: Enhanced debug error capture: responses are now read as text first to ensure non-JSON server replies (like HTML error pages) are preserved in `rawResponseText` for the debug viewer.
 * @updated 2026-05-14: Added provider-aware reasoning extraction so OpenAI-compatible and Gemini responses can surface native thinking content through the shared assistant message pipeline.
 * @updated 2026-05-14: Added named AI preset storage with current-preset switching, migration from older single-config/profile keys, and preset CRUD helpers for multi-provider quick switching in settings.
 Once I am updated, be sure to update my header comment and the folder's md.
 */
import { Scope, TodoKind, TodoRecurrenceRule } from '../types';
import type {
    AssistantLocalQueryRequest,
    AssistantLocalQueryTarget,
    AssistantReasoningSummary,
    AssistantMemoryPatch,
    AssistantReminderDraft,
    AssistantSilentReason,
    AssistantToolCall,
    AssistantUnifiedTurnOutput,
    AssistantTurnMode
} from '../types/assistant';
import { normalizeAIBackfillToolCalls } from '../utils/aiBackfillUtils';
import { buildAssistantReasoningSummary } from '../utils/assistantReasoning';
export interface AIConfig {
    provider: 'openai' | 'gemini';
    apiKey: string;
    baseUrl?: string; // For OpenAI Compatible
    modelName: string;
}

export interface AIPreset {
    id: string;
    name: string;
    config: AIConfig;
}

export interface ParsedTimeEntry {
    startTime: string; // ISO (闂佽娴烽幊鎾诲嫉椤掑嫬姹查柨婵嗩槸缁秹鏌曟径娑㈡闁糕晛鍊块弻锟犲礃閵娧冪厽濠?
    endTime: string;   // ISO (闂佽娴烽幊鎾诲嫉椤掑嫬姹查柨婵嗩槸缁秹鏌曟径娑㈡闁糕晛鍊块弻锟犲礃閵娧冪厽濠?
    description: string;
    categoryName: string;
    activityName: string;
    scopeIds?: string[]; // 闂備礁鎲￠悷顖炲垂閸洖鐒垫い鎺嗗亾妞ぱ€鍋撶紓浣稿綁閸楁娊骞冩禒瀣╅柨鏇楀亾闁绘挻娲熼弻鐔煎箒閹烘垵濮庨悷婊勬緲閻楁捇骞嗛崘顔肩妞ゆ劑鍨圭紞姗€姊洪懝浼村摵婵☆偄鍟撮妴鍌烆敃閿曗偓閺勩儵鏌ｉ幋鐘虫嚈
}

// AI闂佸搫顦弲婊堝蓟閵娿儍娲冀椤撶喎鍓梺鍛婃处閸嬪嫰寮閳规垿顢欑喊鍗炲壉濠碉紕鍋涢崐鍨潖閼姐倐鍋撳☉娅虫垿鎷忕€ｎ喗鐓熼柍鍝勶工濞呮瑧绱掓潏銊ф噰鐎规洩缍侀、鏃堝礋椤愩倖鈻夐梻浣告啞閸戝綊宕戦崨顓ф富闁稿瞼鍋為埛鎺楀级閸繂鈷旂紒鈧径濞炬闁规儳纾瓭闁诲骸鐏氶敃銏犵暦閵夆晩鏁冮柨婵嗘４缁辨岸姊洪崫鍕ⅱ闁革綇濡囧Σ?
interface AIRawTimeEntry {
    startTime: string; // HH:mm闂備礁鎼粔鍫曞储瑜忓Σ?
    endTime: string;   // HH:mm闂備礁鎼粔鍫曞储瑜忓Σ?
    description: string;
    categoryName: string;
    activityName: string;
    scopeIds?: string[]; // AI inferred scopes
}

export interface AIDebugExchange {
    provider: 'openai' | 'gemini';
    requestedAt: string;
    completedAt: string;
    request: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: unknown;
    };
    response: {
        status: number;
        ok: boolean;
        body: unknown;
    };
    cache?: {
        providerFamily: string;
        strategy: 'none' | 'automatic' | 'prompt_cache_key' | 'session_affinity' | 'explicit_cache_control' | 'top_level_cache_control';
        key?: string;
        metrics?: {
            cachedTokens?: number;
            promptCacheHitTokens?: number;
            promptCacheMissTokens?: number;
            cacheCreationInputTokens?: number;
            cacheReadInputTokens?: number;
            cacheWriteTokens?: number;
        };
    };
}

export interface AIAssistantUnifiedTurnResult {
    output: AssistantUnifiedTurnOutput;
    debug: AIDebugExchange;
}

export interface AIBackfillCreateLogArgs {
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    description: string;
    categoryId: string;
    activityId: string;
    scopeIds?: string[];
    linkedTodoId?: string;
    progressIncrement?: number;
}

export interface AIBackfillToolCall {
    toolName: 'create_log';
    args: AIBackfillCreateLogArgs;
}

export interface AITodoNestedSubtaskArgs {
    title: string;
    note?: string;
    scheduledDate?: string;
    deadlineDate?: string;
}

export interface AITodoCreateArgs {
    title: string;
    categoryId: string;
    kind?: TodoKind;
    linkedCategoryId?: string;
    linkedActivityId?: string;
    defaultScopeIds?: string[];
    note?: string;
    scheduledDate?: string;
    deadlineDate?: string;
    recurrenceRule?: TodoRecurrenceRule;
    subtasks?: AITodoNestedSubtaskArgs[];
}

export interface AITodoToolCall {
    toolName: 'create_todo';
    args: AITodoCreateArgs;
}

export interface AITodoUpdatePatch {
    title?: string;
    note?: string | null;
    kind?: TodoKind;
    categoryId?: string;
    linkedCategoryId?: string | null;
    linkedActivityId?: string | null;
    defaultScopeIds?: string[] | null;
    scheduledDate?: string | null;
    deadlineDate?: string | null;
    recurrenceRule?: TodoRecurrenceRule | null;
    pin?: boolean;
    isCompleted?: boolean;
}

export interface AITodoUpdateArgs {
    todoId: string;
    patch: AITodoUpdatePatch;
}

export interface AITodoUpdateToolCall {
    toolName: 'update_todo';
    args: AITodoUpdateArgs;
}

export interface AICreateSubtaskArgs {
    parentTodoId: string;
    title: string;
    note?: string;
    scheduledDate?: string;
    deadlineDate?: string;
}

export interface AICreateSubtaskToolCall {
    toolName: 'create_subtask';
    args: AICreateSubtaskArgs;
}

export interface AIEditLogPatch {
    date?: string;
    startTime?: string;
    endTime?: string;
    categoryId?: string;
    activityId?: string;
    note?: string | null;
    linkedTodoId?: string | null;
    scopeIds?: string[] | null;
}

export interface AIEditLogArgs {
    logId: string;
    patch: AIEditLogPatch;
}

export interface AIEditLogToolCall {
    toolName: 'edit_log';
    args: AIEditLogArgs;
}

export interface AIRequestOptions {
    signal?: AbortSignal;
}

export interface AIConversationTurn {
    role: 'user' | 'assistant';
    content: string;
    createdAt?: string;
}

interface AIPromptCacheHint {
    keySeed: string;
    scope?: string;
}

export interface AIStructuredJsonRequestParams<T> {
    systemPrompt: string;
    userPrompt: string;
    conversationHistory?: AIConversationTurn[];
    cacheHint?: {
        keySeed: string;
        scope?: string;
    };
    normalizeResult: (rawValue: any, meta?: AIResponseNormalizationMeta) => T;
}

interface AIResponseNormalizationMeta {
    reasoning?: AssistantReasoningSummary;
}

type OpenAICompatibleProviderFamily =
    | 'openai'
    | 'deepseek'
    | 'mistral'
    | 'fireworks'
    | 'groq'
    | 'xai'
    | 'dashscope'
    | 'moonshot'
    | 'openrouter'
    | 'unknown';

const AI_CONFIG_KEY = 'lumostime_ai_config';
const AI_PROFILES_KEY = 'lumostime_ai_profiles';
const AI_PRESETS_KEY = 'lumostime_ai_presets';
const AI_CURRENT_PRESET_KEY = 'lumostime_ai_current_preset';
const DEFAULT_AI_PRESET_ID = 'default';
const DEFAULT_AI_PRESET_NAME = '默认预设';

import { HTTP } from '@awesome-cordova-plugins/http';
import { Capacitor } from '@capacitor/core';
import AssistantAgent from '../plugins/AssistantAgentPlugin';
import { notifyAIBackupDataChanged } from '../utils/aiBackupChange';

const DEFAULT_AI_CONFIG: AIConfig = {
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    modelName: 'gpt-3.5-turbo'
};

const LEGACY_PROFILE_NAME_MAP: Record<string, string> = {
    gemini: 'Gemini',
    deepseek: 'DeepSeek',
    siliconflow: '硅基流动',
    openai: 'OpenAI'
};

interface AIPresetState {
    presets: AIPreset[];
    currentPresetId: string;
}

const cloneAIConfig = (config: AIConfig): AIConfig => ({
    provider: config.provider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    modelName: config.modelName
});

const normalizeAIConfig = (value: unknown): AIConfig => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ...DEFAULT_AI_CONFIG };
    }

    const raw = value as Partial<AIConfig>;
    const provider = raw.provider === 'gemini' ? 'gemini' : 'openai';
    const apiKey = typeof raw.apiKey === 'string' ? raw.apiKey : '';
    const baseUrl = typeof raw.baseUrl === 'string'
        ? raw.baseUrl
        : provider === 'gemini'
            ? 'https://generativelanguage.googleapis.com/v1beta/models'
            : DEFAULT_AI_CONFIG.baseUrl;
    const modelName = typeof raw.modelName === 'string' && raw.modelName.trim()
        ? raw.modelName
        : provider === 'gemini'
            ? 'gemini-2.5-flash'
            : DEFAULT_AI_CONFIG.modelName;

    return {
        provider,
        apiKey,
        baseUrl,
        modelName
    };
};

const sanitizePresetName = (value: unknown, fallback: string): string => {
    if (typeof value !== 'string') {
        return fallback;
    }

    const trimmed = value.trim();
    return trimmed || fallback;
};

const normalizeAIPreset = (
    value: unknown,
    fallbackId: string,
    fallbackName: string
): AIPreset | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    const raw = value as Partial<AIPreset>;
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : fallbackId;
    return {
        id,
        name: sanitizePresetName(raw.name, fallbackName),
        config: normalizeAIConfig(raw.config)
    };
};

const areConfigsEqual = (left: AIConfig, right: AIConfig): boolean => {
    return left.provider === right.provider
        && left.apiKey === right.apiKey
        && (left.baseUrl || '') === (right.baseUrl || '')
        && left.modelName === right.modelName;
};

const createDefaultPreset = (config?: AIConfig): AIPreset => ({
    id: DEFAULT_AI_PRESET_ID,
    name: DEFAULT_AI_PRESET_NAME,
    config: cloneAIConfig(config || DEFAULT_AI_CONFIG)
});

const buildPresetState = (
    rawPresets: unknown[],
    preferredCurrentPresetId?: string | null
): AIPresetState => {
    const dedupedPresets = new Map<string, AIPreset>();

    rawPresets.forEach((rawPreset, index) => {
        const normalizedPreset = normalizeAIPreset(
            rawPreset,
            `preset_${index + 1}`,
            `预设 ${index + 1}`
        );
        if (!normalizedPreset) {
            return;
        }
        dedupedPresets.set(normalizedPreset.id, normalizedPreset);
    });

    if (!dedupedPresets.has(DEFAULT_AI_PRESET_ID)) {
        dedupedPresets.set(DEFAULT_AI_PRESET_ID, createDefaultPreset());
    }

    const presets = Array.from(dedupedPresets.values());
    const currentPresetId = preferredCurrentPresetId && dedupedPresets.has(preferredCurrentPresetId)
        ? preferredCurrentPresetId
        : DEFAULT_AI_PRESET_ID;

    return {
        presets,
        currentPresetId
    };
};

const loadLegacyProfilePresets = (): AIPreset[] => {
    const stored = localStorage.getItem(AI_PROFILES_KEY);
    if (!stored) {
        return [];
    }

    try {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return [];
        }

        return Object.entries(parsed).map(([key, value], index) => ({
            id: `legacy_${key}_${index + 1}`,
            name: sanitizePresetName(LEGACY_PROFILE_NAME_MAP[key], `预设 ${index + 1}`),
            config: normalizeAIConfig(value)
        }));
    } catch (error) {
        console.error('[aiService] Failed to parse legacy AI profiles', error);
        return [];
    }
};

const readPresetState = (): AIPresetState => {
    const storedPresets = localStorage.getItem(AI_PRESETS_KEY);
    const storedCurrentPresetId = localStorage.getItem(AI_CURRENT_PRESET_KEY);

    if (storedPresets) {
        try {
            const parsed = JSON.parse(storedPresets);
            if (Array.isArray(parsed)) {
                const state = buildPresetState(parsed, storedCurrentPresetId);
                const currentPreset = state.presets.find(preset => preset.id === state.currentPresetId) || state.presets[0];
                localStorage.setItem(AI_PRESETS_KEY, JSON.stringify(state.presets));
                localStorage.setItem(AI_CURRENT_PRESET_KEY, state.currentPresetId);
                localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(currentPreset.config));
                return state;
            }
        } catch (error) {
            console.error('[aiService] Failed to parse AI presets, falling back to migration', error);
        }
    }

    let parsedLegacyConfig: unknown = DEFAULT_AI_CONFIG;
    const storedLegacyConfig = localStorage.getItem(AI_CONFIG_KEY);
    if (storedLegacyConfig) {
        try {
            parsedLegacyConfig = JSON.parse(storedLegacyConfig);
        } catch (error) {
            console.error('[aiService] Failed to parse legacy AI config, using defaults', error);
        }
    }

    const legacyConfig = normalizeAIConfig(parsedLegacyConfig);
    const legacyProfilePresets = loadLegacyProfilePresets()
        .filter(preset => !areConfigsEqual(preset.config, legacyConfig));
    const migratedState = buildPresetState(
        [createDefaultPreset(legacyConfig), ...legacyProfilePresets],
        DEFAULT_AI_PRESET_ID
    );

    localStorage.setItem(AI_PRESETS_KEY, JSON.stringify(migratedState.presets));
    localStorage.setItem(AI_CURRENT_PRESET_KEY, migratedState.currentPresetId);
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(legacyConfig));

    return migratedState;
};

const persistPresetState = (
    state: AIPresetState,
    syncNativeConfig: boolean = false
): AIPresetState => {
    localStorage.setItem(AI_PRESETS_KEY, JSON.stringify(state.presets));
    localStorage.setItem(AI_CURRENT_PRESET_KEY, state.currentPresetId);
    const currentPreset = state.presets.find(preset => preset.id === state.currentPresetId) || state.presets[0];
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(currentPreset.config));
    notifyAIBackupDataChanged();

    if (syncNativeConfig && Capacitor.isNativePlatform()) {
        void AssistantAgent.syncNativeAIConfig(currentPreset.config).catch((error) => {
            console.error('[aiService] Failed to sync native AI config', error);
        });
    }

    return state;
};

const createPresetId = (): string => `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createAbortError = (): Error => {
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';
    return error;
};

const normalizeNativeFetchError = (error: any) => {
    console.error('Native AI Request Error', error);

    let errMsg = error?.error || error?.message || JSON.stringify(error);
    if (typeof errMsg === 'string' && errMsg.startsWith('{')) {
        try {
            errMsg = JSON.parse(errMsg).error || errMsg;
        } catch (_parseError) {
            // Keep the original string when the native payload is not valid JSON.
        }
    }

    // Expose to global for UI alerts
    // @ts-ignore
    if (typeof window !== 'undefined') window.webdavLastError = `NativeAI: ${error?.status || 'Err'} - ${errMsg}`;

    if (error?.status) {
        let errorBody = {};
        if (error.error) {
            try {
                errorBody = JSON.parse(error.error);
            } catch (_parseError) {
                errorBody = { error: error.error };
            }
        }

        return {
            ok: false,
            status: error.status,
            json: async () => errorBody
        };
    }

    throw error;
};

// Helper for Native Requests
const nativeFetch = async (url: string, options: any) => {
    const signal = options?.signal as AbortSignal | undefined;
    const requestOptions = {
        method: (options.method || 'GET').toLowerCase(),
        data: options.body ? JSON.parse(options.body) : {},
        headers: options.headers,
        timeout: 60000 // 60s timeout for AI
    };

    if (signal?.aborted) {
        throw createAbortError();
    }

    try {
        HTTP.setDataSerializer('json');

        if (signal) {
            return await new Promise((resolve, reject) => {
                let settled = false;
                let requestId = '';

                const cleanup = () => {
                    signal.removeEventListener('abort', handleAbort);
                };

                const resolveOnce = (value: unknown) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    cleanup();
                    resolve(value);
                };

                const rejectOnce = (reason: unknown) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    cleanup();
                    reject(reason);
                };

                const handleAbort = () => {
                    if (settled) {
                        return;
                    }

                    if (requestId) {
                        void HTTP.abort(requestId).catch((abortFailure) => {
                            console.warn('[aiService] Failed to abort native AI request', abortFailure);
                        });
                    }
                    rejectOnce(createAbortError());
                };

                signal.addEventListener('abort', handleAbort, { once: true });

                requestId = HTTP.sendRequestSync(
                    url,
                    requestOptions,
                    (response) => {
                        resolveOnce({
                            ok: response.status >= 200 && response.status < 300,
                            status: response.status,
                            text: async () => response.data,
                            json: async () => JSON.parse(response.data)
                        });
                    },
                    (error) => {
                        try {
                            resolveOnce(normalizeNativeFetchError(error));
                        } catch (normalizedError) {
                            rejectOnce(normalizedError);
                        }
                    }
                );

                if (signal.aborted) {
                    handleAbort();
                }
            });
        }

        const response = await HTTP.sendRequest(url, requestOptions);

        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            text: async () => response.data,
            json: async () => JSON.parse(response.data)
        };
    } catch (error: any) {
        if (signal?.aborted) {
            throw createAbortError();
        }
        return normalizeNativeFetchError(error);
    }
};

const sanitizeDebugHeaders = (headers: Record<string, string>): Record<string, string> => (
    Object.fromEntries(
        Object.entries(headers).map(([key, value]) => {
            if (key.toLowerCase() === 'authorization') {
                return [key, 'Bearer [REDACTED]'];
            }
            return [key, value];
        })
    )
);

const sanitizeDebugUrl = (url: string): string => (
    url.replace(/([?&]key=)[^&]+/gi, '$1[REDACTED]')
);

const TODO_RECURRENCE_FREQUENCIES: Array<TodoRecurrenceRule['frequency']> = ['daily', 'weekly', 'monthly'];

const normalizeConversationHistory = (conversationHistory?: AIConversationTurn[]): AIConversationTurn[] => (
    Array.isArray(conversationHistory)
        ? conversationHistory
            .filter((turn): turn is AIConversationTurn => (
                Boolean(turn)
                && (turn.role === 'user' || turn.role === 'assistant')
                && typeof turn.content === 'string'
                && turn.content.trim().length > 0
            ))
            .map((turn) => ({
                role: turn.role,
                content: turn.content.trim()
            }))
        : []
);

const buildPersonaInstruction = (personaPrompt?: string): string => {
    if (!personaPrompt?.trim()) {
        return '';
    }

    return `

Persona Guidance:
${personaPrompt.trim()}

Apply the persona guidance only as a style/interaction layer. Do not break any required JSON schema, tool-planning rules, or field constraints.
`;
};

const buildOpenAIMessageList = (
    systemPrompt: string,
    userPrompt: string,
    conversationHistory?: AIConversationTurn[]
) => ([
    { role: 'system' as const, content: systemPrompt.trim() },
    ...normalizeConversationHistory(conversationHistory).map((turn) => ({
        role: turn.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: turn.content
    })),
    { role: 'user' as const, content: userPrompt.trim() }
]);

const buildOpenAIJsonMessageList = (
    systemPrompt: string,
    userPrompt: string,
    conversationHistory?: AIConversationTurn[]
) => {
    const messages = buildOpenAIMessageList(systemPrompt, userPrompt, conversationHistory);
    const jsonInstruction = 'Return a valid json object only.';

    if (!messages.length) {
        return [{ role: 'system' as const, content: jsonInstruction }];
    }

    const [firstMessage, ...remainingMessages] = messages;
    if (firstMessage.role === 'system') {
        return [{
            ...firstMessage,
            content: `${firstMessage.content.trim()}\n\n${jsonInstruction}`
        }, ...remainingMessages];
    }

    return [
        { role: 'system' as const, content: jsonInstruction },
        ...messages
    ];
};

const buildCacheControlContentParts = (
    stablePrefix: string,
    volatileSuffix: string
): Array<Record<string, unknown>> => {
    const parts: Array<Record<string, unknown>> = [];
    const trimmedStablePrefix = stablePrefix.trim();
    const trimmedVolatileSuffix = volatileSuffix.trim();

    if (trimmedStablePrefix) {
        parts.push({
            type: 'text',
            text: trimmedStablePrefix,
            cache_control: { type: 'ephemeral' }
        });
    }

    if (trimmedVolatileSuffix) {
        parts.push({
            type: 'text',
            text: trimmedVolatileSuffix
        });
    }

    return parts;
};

const splitExplicitCacheUserPrompt = (userPrompt: string): { stablePrefix: string; volatileSuffix: string } => {
    const marker = '\n=== Trigger ===\n';
    const markerIndex = userPrompt.indexOf(marker);

    if (markerIndex < 0) {
        return {
            stablePrefix: userPrompt.trim(),
            volatileSuffix: ''
        };
    }

    return {
        stablePrefix: userPrompt.slice(0, markerIndex).trim(),
        volatileSuffix: userPrompt.slice(markerIndex).trim()
    };
};

const supportsExplicitOpenAICompatibleCacheControl = (
    config: AIConfig,
    providerFamily: OpenAICompatibleProviderFamily
): boolean => {
    const modelName = (config.modelName || '').trim().toLowerCase();

    if (providerFamily === 'dashscope') {
        return true;
    }

    if (providerFamily === 'openrouter') {
        return modelName.startsWith('google/') || modelName.includes('gemini');
    }

    return false;
};

const supportsOpenRouterTopLevelCacheControl = (
    config: AIConfig,
    providerFamily: OpenAICompatibleProviderFamily
): boolean => {
    if (providerFamily !== 'openrouter') {
        return false;
    }

    const modelName = (config.modelName || '').trim().toLowerCase();
    return modelName.startsWith('anthropic/') || modelName.includes('claude');
};

const buildOpenAICompatibleJsonMessages = (
    config: AIConfig,
    systemPrompt: string,
    userPrompt: string,
    conversationHistory?: AIConversationTurn[]
) => {
    const providerFamily = detectOpenAICompatibleProviderFamily(config);
    const messages = buildOpenAIJsonMessageList(systemPrompt, userPrompt, conversationHistory);

    if (!supportsExplicitOpenAICompatibleCacheControl(config, providerFamily) || messages.length === 0) {
        return messages;
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'user' || typeof latestMessage.content !== 'string') {
        return messages;
    }

    const { stablePrefix, volatileSuffix } = splitExplicitCacheUserPrompt(latestMessage.content);
    const contentParts = buildCacheControlContentParts(stablePrefix, volatileSuffix);

    if (contentParts.length === 0) {
        return messages;
    }

    return [
        ...messages.slice(0, -1),
        {
            ...latestMessage,
            content: contentParts
        }
    ];
};

const buildGeminiContents = (
    userPrompt: string,
    conversationHistory?: AIConversationTurn[]
) => ([
    ...normalizeConversationHistory(conversationHistory).map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }]
    })),
    { role: 'user', parts: [{ text: userPrompt.trim() }] }
]);

const getBaseUrlHost = (baseUrl?: string): string => {
    if (!baseUrl?.trim()) {
        return '';
    }

    try {
        return new URL(baseUrl).host.toLowerCase();
    } catch (_error) {
        return '';
    }
};

const detectOpenAICompatibleProviderFamily = (config: AIConfig): OpenAICompatibleProviderFamily => {
    const host = getBaseUrlHost(config.baseUrl);
    const modelName = (config.modelName || '').trim().toLowerCase();

    if (host.includes('openai.com')) {
        return 'openai';
    }

    if (host.includes('deepseek.com') || modelName.startsWith('deepseek')) {
        return 'deepseek';
    }

    if (host.includes('mistral.ai') || modelName.startsWith('mistral')) {
        return 'mistral';
    }

    if (host.includes('fireworks.ai')) {
        return 'fireworks';
    }

    if (host.includes('groq.com') || modelName.startsWith('llama-') || modelName.startsWith('mixtral-')) {
        return 'groq';
    }

    if (host.includes('x.ai') || modelName.startsWith('grok-')) {
        return 'xai';
    }

    if (host.includes('aliyuncs.com') || host.includes('dashscope') || modelName.startsWith('qwen-')) {
        return 'dashscope';
    }

    if (host.includes('moonshot') || host.includes('kimi') || modelName.startsWith('kimi-')) {
        return 'moonshot';
    }

    if (host.includes('openrouter.ai')) {
        return 'openrouter';
    }

    return 'unknown';
};

const hashPromptCacheSeed = (value: string): string => {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
};

const buildPromptCacheKey = (
    config: AIConfig,
    providerFamily: OpenAICompatibleProviderFamily,
    cacheHint?: AIPromptCacheHint
): string | undefined => {
    if (!cacheHint?.keySeed.trim()) {
        return undefined;
    }

    const scope = cacheHint.scope?.trim() || 'default';
    const normalizedModel = (config.modelName || 'unknown-model').trim().toLowerCase();

    return `lumostime:${providerFamily}:${scope}:${normalizedModel}:${hashPromptCacheSeed(cacheHint.keySeed)}`;
};

const buildOpenAICompatiblePromptCacheConfig = (
    config: AIConfig,
    cacheHint?: AIPromptCacheHint
): {
    bodyExtras: Record<string, unknown>;
    headerExtras: Record<string, string>;
    debugCache: AIDebugExchange['cache'];
} => {
    const providerFamily = detectOpenAICompatibleProviderFamily(config);
    const cacheKey = buildPromptCacheKey(config, providerFamily, cacheHint);
    const debugCacheBase: AIDebugExchange['cache'] = {
        providerFamily,
        strategy: 'none',
        ...(cacheKey ? { key: cacheKey } : {})
    };

    if (!cacheKey) {
        return {
            bodyExtras: {},
            headerExtras: {},
            debugCache: debugCacheBase
        };
    }

    if (providerFamily === 'openai' || providerFamily === 'mistral') {
        return {
            bodyExtras: {
                prompt_cache_key: cacheKey
            },
            headerExtras: {},
            debugCache: {
                ...debugCacheBase,
                strategy: 'prompt_cache_key'
            }
        };
    }

    if (providerFamily === 'xai') {
        return {
            bodyExtras: {},
            headerExtras: {
                'x-grok-conv-id': cacheKey
            },
            debugCache: {
                ...debugCacheBase,
                strategy: 'session_affinity'
            }
        };
    }

    if (providerFamily === 'fireworks') {
        return {
            bodyExtras: {},
            headerExtras: {
                'x-session-affinity': cacheKey
            },
            debugCache: {
                ...debugCacheBase,
                strategy: 'session_affinity'
            }
        };
    }

    if (providerFamily === 'deepseek' || providerFamily === 'groq' || providerFamily === 'moonshot') {
        return {
            bodyExtras: {},
            headerExtras: {},
            debugCache: {
                ...debugCacheBase,
                strategy: 'automatic'
            }
        };
    }

    if (providerFamily === 'dashscope') {
        return {
            bodyExtras: {},
            headerExtras: {},
            debugCache: {
                ...debugCacheBase,
                strategy: 'explicit_cache_control'
            }
        };
    }

    if (supportsOpenRouterTopLevelCacheControl(config, providerFamily)) {
        return {
            bodyExtras: {
                cache_control: {
                    type: 'ephemeral'
                }
            },
            headerExtras: {},
            debugCache: {
                ...debugCacheBase,
                strategy: 'top_level_cache_control'
            }
        };
    }

    if (supportsExplicitOpenAICompatibleCacheControl(config, providerFamily)) {
        return {
            bodyExtras: {},
            headerExtras: {},
            debugCache: {
                ...debugCacheBase,
                strategy: 'explicit_cache_control'
            }
        };
    }

    return {
        bodyExtras: {},
        headerExtras: {},
        debugCache: debugCacheBase
    };
};

const readNumericMetric = (container: Record<string, unknown> | null | undefined, key: string): number | undefined => {
    if (!container || typeof container[key] !== 'number' || !Number.isFinite(container[key] as number)) {
        return undefined;
    }

    return container[key] as number;
};

const extractPromptCacheMetrics = (responseBody: unknown): AIDebugExchange['cache']['metrics'] | undefined => {
    const root = responseBody && typeof responseBody === 'object'
        ? responseBody as Record<string, unknown>
        : undefined;
    const usage = root?.usage && typeof root.usage === 'object'
        ? root.usage as Record<string, unknown>
        : undefined;
    const promptTokenDetails = usage?.prompt_tokens_details && typeof usage.prompt_tokens_details === 'object'
        ? usage.prompt_tokens_details as Record<string, unknown>
        : undefined;
    const metrics = {
        cachedTokens: readNumericMetric(promptTokenDetails, 'cached_tokens'),
        promptCacheHitTokens: readNumericMetric(usage, 'prompt_cache_hit_tokens') ?? readNumericMetric(root, 'prompt_cache_hit_tokens'),
        promptCacheMissTokens: readNumericMetric(usage, 'prompt_cache_miss_tokens') ?? readNumericMetric(root, 'prompt_cache_miss_tokens'),
        cacheCreationInputTokens: readNumericMetric(promptTokenDetails, 'cache_creation_input_tokens') ?? readNumericMetric(usage, 'cache_creation_input_tokens') ?? readNumericMetric(root, 'cache_creation_input_tokens'),
        cacheReadInputTokens: readNumericMetric(promptTokenDetails, 'cache_read_input_tokens') ?? readNumericMetric(usage, 'cache_read_input_tokens') ?? readNumericMetric(root, 'cache_read_input_tokens'),
        cacheWriteTokens: readNumericMetric(promptTokenDetails, 'cache_write_tokens') ?? readNumericMetric(usage, 'cache_write_tokens') ?? readNumericMetric(root, 'cache_write_tokens')
    };
    const filteredMetrics = Object.fromEntries(
        Object.entries(metrics).filter(([, value]) => value !== undefined)
    ) as AIDebugExchange['cache']['metrics'];

    return Object.keys(filteredMetrics).length > 0
        ? filteredMetrics
        : undefined;
};

const normalizeTodoRecurrenceRule = (value: unknown): TodoRecurrenceRule | undefined => {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const candidate = value as Record<string, unknown>;
    const frequency = candidate.frequency;
    const startDate = typeof candidate.startDate === 'string' ? candidate.startDate.trim() : '';

    if (!TODO_RECURRENCE_FREQUENCIES.includes(frequency as TodoRecurrenceRule['frequency']) || !startDate) {
        return undefined;
    }

    const normalized: TodoRecurrenceRule = {
        frequency: frequency as TodoRecurrenceRule['frequency'],
        startDate
    };

    if (typeof candidate.endDate === 'string' && candidate.endDate.trim()) {
        normalized.endDate = candidate.endDate.trim();
    }

    if (typeof candidate.interval === 'number' && Number.isFinite(candidate.interval) && candidate.interval > 0) {
        normalized.interval = Math.max(1, Math.round(candidate.interval));
    }

    if (Array.isArray(candidate.weekdays)) {
        const weekdays = candidate.weekdays
            .map((weekday) => Number(weekday))
            .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6);
        if (weekdays.length > 0) {
            normalized.weekdays = Array.from(new Set(weekdays));
        }
    }

    if (Array.isArray(candidate.monthDays)) {
        const monthDays = candidate.monthDays
            .map((monthDay) => Number(monthDay))
            .filter((monthDay) => Number.isInteger(monthDay) && monthDay >= 1 && monthDay <= 31);
        if (monthDays.length > 0) {
            normalized.monthDays = Array.from(new Set(monthDays));
        }
    }

    if (candidate.fallbackToMonthEnd === true) {
        normalized.fallbackToMonthEnd = true;
    }

    return normalized;
};

const normalizeOptionalDateString = (value: unknown): string | undefined => (
    typeof value === 'string' && value.trim()
        ? value.trim()
        : undefined
);

const normalizeNullableString = (value: unknown): string | null | undefined => {
    if (value === null) {
        return null;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    return value.trim();
};

const normalizeNullableStringArray = (value: unknown): string[] | null | undefined => {
    if (value === null) {
        return null;
    }

    if (!Array.isArray(value)) {
        return undefined;
    }

    return value.map((item) => String(item)).filter((item) => item.trim().length > 0);
};

const normalizeAssistantReminderDrafts = (value: unknown): AssistantReminderDraft[] => (
    Array.isArray(value)
        ? value.flatMap((item) => {
            if (!item || typeof item !== 'object') {
                return [];
            }

            const reminder = item as Record<string, unknown>;
            const dueAt = typeof reminder.dueAt === 'string'
                ? reminder.dueAt.trim()
                : typeof reminder.triggerAt === 'string'
                    ? reminder.triggerAt.trim()
                    : '';
            const text = typeof reminder.text === 'string' ? reminder.text.trim() : '';
            if (!dueAt || !text) {
                return [];
            }

            return [{
                ...(typeof reminder.type === 'string' && reminder.type.trim() ? { type: reminder.type.trim() as any } : {}),
                dueAt,
                text,
                ...(typeof reminder.todoId === 'string' && reminder.todoId.trim() ? { todoId: reminder.todoId.trim() } : {})
            }];
        })
        : []
);

const ASSISTANT_SILENT_REASONS: AssistantSilentReason[] = [
    'active_focus_protection',
    'likely_do_not_disturb',
    'state_still_clear',
    'insufficient_confidence',
    'waiting_for_stronger_signal',
    'followup_already_scheduled'
];

const normalizeAssistantSilentReason = (value: unknown): AssistantSilentReason | undefined => (
    typeof value === 'string' && ASSISTANT_SILENT_REASONS.includes(value as AssistantSilentReason)
        ? value as AssistantSilentReason
        : undefined
);

const ASSISTANT_LOCAL_QUERY_TARGETS: AssistantLocalQueryTarget[] = [
    'logs',
    'todos',
    'reviews',
    'categories',
    'activities',
    'scopes',
    'all'
];

const normalizeAssistantLocalQueryRequest = (value: unknown): AssistantLocalQueryRequest | undefined => {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const candidate = value as Record<string, unknown>;
    const mode = candidate.mode === 'filter_expression' || candidate.mode === 'keyword_search'
        ? candidate.mode
        : undefined;
    const query = typeof candidate.query === 'string' ? candidate.query.trim() : '';
    const targets = Array.isArray(candidate.targets)
        ? candidate.targets
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter((item): item is AssistantLocalQueryTarget => ASSISTANT_LOCAL_QUERY_TARGETS.includes(item as AssistantLocalQueryTarget))
        : [];

    if (!mode || !query || targets.length === 0) {
        return undefined;
    }

    const normalized: AssistantLocalQueryRequest = {
        mode,
        query,
        targets: Array.from(new Set(targets))
    };

    if (typeof candidate.limit === 'number' && Number.isFinite(candidate.limit)) {
        normalized.limit = Math.round(candidate.limit);
    }

    return normalized;
};

const normalizeStringList = (value: unknown): string[] => (
    Array.isArray(value)
        ? value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter((item) => item && !['null', 'undefined'].includes(item.toLowerCase()))
            .filter(Boolean)
        : []
);

const normalizeFlexibleStringList = (value: unknown): string[] => {
    if (typeof value === 'string' && value.trim().length > 0) {
        return [value.trim()];
    }

    return normalizeStringList(value);
};

const normalizeTodoKind = (value: unknown): TodoKind | undefined => (
    value === 'quick' || value === 'project' ? value : undefined
);

const normalizeAssistantMemoryPatch = (value: unknown): AssistantMemoryPatch | undefined => {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const candidate = value as Record<string, unknown>;
    const normalized: AssistantMemoryPatch = {};

    const profileMemory = normalizeFlexibleStringList(candidate.profileMemory);
    if (profileMemory.length > 0) {
        normalized.profileMemory = profileMemory;
    }

    const preferenceMemory = normalizeFlexibleStringList(candidate.preferenceMemory);
    if (preferenceMemory.length > 0) {
        normalized.preferenceMemory = preferenceMemory;
    }

    const recentDecisions = normalizeFlexibleStringList(candidate.recentDecisions);
    if (recentDecisions.length > 0) {
        normalized.recentDecisions = recentDecisions;
    }

    if (Array.isArray(candidate.activeReminders) && candidate.activeReminders.length > 0) {
        normalized.activeReminders = candidate.activeReminders as AssistantMemoryPatch['activeReminders'];
    }

    const lastKnownState = normalizeNullableString(candidate.lastKnownState);
    if (lastKnownState !== undefined) {
        normalized.lastKnownState = lastKnownState;
    }

    const workingMemorySummary = normalizeNullableString(candidate.workingMemorySummary);
    if (workingMemorySummary !== undefined) {
        normalized.workingMemorySummary = workingMemorySummary;
    }

    const lastAgentRunAt = normalizeNullableString(candidate.lastAgentRunAt);
    if (lastAgentRunAt !== undefined) {
        normalized.lastAgentRunAt = lastAgentRunAt;
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeAssistantToolCalls = (value: unknown): AssistantToolCall[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        if (!item || typeof item !== 'object') {
            return [];
        }

        const toolCall = item as Record<string, any>;
        const toolName = String(toolCall.toolName || '').trim();
        const args = toolCall.args || {};

        if (toolName === 'create_log') {
            const normalized = {
                toolName: 'create_log' as const,
                args: {
                    date: normalizeOptionalDateString(args.date) || '',
                    startTime: typeof args.startTime === 'string' ? args.startTime.trim() : '',
                    endTime: typeof args.endTime === 'string' ? args.endTime.trim() : '',
                    description: typeof args.description === 'string' ? args.description.trim() : '',
                    categoryId: typeof args.categoryId === 'string' ? args.categoryId.trim() : '',
                    activityId: typeof args.activityId === 'string' ? args.activityId.trim() : '',
                    ...(Array.isArray(args.scopeIds) ? { scopeIds: args.scopeIds.map((scopeId: unknown) => String(scopeId).trim()).filter(Boolean) } : {}),
                    ...(typeof args.linkedTodoId === 'string' && args.linkedTodoId.trim() ? { linkedTodoId: args.linkedTodoId.trim() } : {}),
                    ...(typeof args.progressIncrement === 'number' && Number.isFinite(args.progressIncrement)
                        ? { progressIncrement: Math.max(1, Math.round(args.progressIncrement)) }
                        : {})
                }
            };

            return (
                normalized.args.date
                && normalized.args.startTime
                && normalized.args.endTime
                && normalized.args.categoryId
                && normalized.args.activityId
            )
                ? [normalized]
                : [];
        }

        if (toolName === 'create_todo') {
            const normalizedRecurrenceRule = normalizeTodoRecurrenceRule(args.recurrenceRule);
            const normalizedKind = normalizeTodoKind(args.kind) || 'project';
            const normalizedSubtasks = Array.isArray(args.subtasks)
                ? args.subtasks.flatMap((subtask: unknown) => {
                    if (!subtask || typeof subtask !== 'object' || Array.isArray(subtask)) {
                        return [];
                    }

                    const candidate = subtask as Record<string, unknown>;
                    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
                    if (!title) {
                        return [];
                    }

                    return [{
                        title,
                        ...(typeof candidate.note === 'string' && candidate.note.trim() ? { note: candidate.note.trim() } : {}),
                        ...(normalizeOptionalDateString(candidate.scheduledDate) ? { scheduledDate: normalizeOptionalDateString(candidate.scheduledDate)! } : {}),
                        ...(normalizeOptionalDateString(candidate.deadlineDate) ? { deadlineDate: normalizeOptionalDateString(candidate.deadlineDate)! } : {})
                    }];
                })
                : [];
            const normalized = {
                toolName: 'create_todo' as const,
                args: {
                    title: typeof args.title === 'string' ? args.title.trim() : '',
                    categoryId: typeof args.categoryId === 'string' ? args.categoryId.trim() : '',
                    kind: normalizedKind,
                    ...(normalizeNullableString(args.linkedCategoryId) ? { linkedCategoryId: normalizeNullableString(args.linkedCategoryId)! } : {}),
                    ...(normalizeNullableString(args.linkedActivityId) ? { linkedActivityId: normalizeNullableString(args.linkedActivityId)! } : {}),
                    ...(Array.isArray(args.defaultScopeIds) ? { defaultScopeIds: args.defaultScopeIds.map((scopeId: unknown) => String(scopeId).trim()).filter(Boolean) } : {}),
                    ...(typeof args.note === 'string' && args.note.trim() ? { note: args.note.trim() } : {}),
                    ...(!normalizedRecurrenceRule && normalizeOptionalDateString(args.scheduledDate) ? { scheduledDate: normalizeOptionalDateString(args.scheduledDate)! } : {}),
                    ...(!normalizedRecurrenceRule && normalizeOptionalDateString(args.deadlineDate) ? { deadlineDate: normalizeOptionalDateString(args.deadlineDate)! } : {}),
                    ...(normalizedRecurrenceRule ? { recurrenceRule: normalizedRecurrenceRule } : {}),
                    ...(normalizedSubtasks.length > 0 ? { subtasks: normalizedSubtasks } : {})
                }
            };
            const isValid = normalized.args.title
                && normalized.args.categoryId
                && (normalizedKind === 'quick' || normalized.args.linkedActivityId);
            return isValid ? [normalized] : [];
        }

        if (toolName === 'update_todo') {
            const patch = args.patch || {};
            const normalizedRecurrenceRule = normalizeTodoRecurrenceRule(patch.recurrenceRule);
            const normalizedPatch = {
                ...(typeof patch.title === 'string' ? { title: patch.title.trim() } : {}),
                ...(normalizeNullableString(patch.note) !== undefined ? { note: normalizeNullableString(patch.note) } : {}),
                ...(normalizeTodoKind(patch.kind) ? { kind: normalizeTodoKind(patch.kind)! } : {}),
                ...(typeof patch.categoryId === 'string' && patch.categoryId.trim() ? { categoryId: patch.categoryId.trim() } : {}),
                ...(normalizeNullableString(patch.linkedCategoryId) !== undefined ? { linkedCategoryId: normalizeNullableString(patch.linkedCategoryId) } : {}),
                ...(normalizeNullableString(patch.linkedActivityId) !== undefined ? { linkedActivityId: normalizeNullableString(patch.linkedActivityId) } : {}),
                ...(normalizeNullableStringArray(patch.defaultScopeIds) !== undefined ? { defaultScopeIds: normalizeNullableStringArray(patch.defaultScopeIds) } : {}),
                ...(patch.recurrenceRule === undefined && normalizeNullableString(patch.scheduledDate) !== undefined ? { scheduledDate: normalizeNullableString(patch.scheduledDate) } : {}),
                ...(patch.recurrenceRule === undefined && normalizeNullableString(patch.deadlineDate) !== undefined ? { deadlineDate: normalizeNullableString(patch.deadlineDate) } : {}),
                ...(patch.recurrenceRule === null
                    ? { recurrenceRule: null }
                    : normalizedRecurrenceRule
                        ? { recurrenceRule: normalizedRecurrenceRule }
                        : {}),
                ...(typeof patch.pin === 'boolean' ? { pin: patch.pin } : {}),
                ...(typeof patch.isCompleted === 'boolean' ? { isCompleted: patch.isCompleted } : {})
            };
            return typeof args.todoId === 'string' && args.todoId.trim() && Object.keys(normalizedPatch).length > 0
                ? [{
                    toolName: 'update_todo' as const,
                    args: {
                        todoId: args.todoId.trim(),
                        patch: normalizedPatch
                    }
                }]
                : [];
        }

        if (toolName === 'create_subtask') {
            const normalized = {
                toolName: 'create_subtask' as const,
                args: {
                    parentTodoId: typeof args.parentTodoId === 'string' ? args.parentTodoId.trim() : '',
                    title: typeof args.title === 'string' ? args.title.trim() : '',
                    ...(typeof args.note === 'string' && args.note.trim() ? { note: args.note.trim() } : {}),
                    ...(normalizeOptionalDateString(args.scheduledDate) ? { scheduledDate: normalizeOptionalDateString(args.scheduledDate)! } : {}),
                    ...(normalizeOptionalDateString(args.deadlineDate) ? { deadlineDate: normalizeOptionalDateString(args.deadlineDate)! } : {})
                }
            };
            return normalized.args.parentTodoId && normalized.args.title ? [normalized] : [];
        }

        if (toolName === 'edit_log') {
            const patch = args.patch || {};
            const normalizedPatch = {
                ...(normalizeNullableString(patch.date) !== undefined ? { date: normalizeNullableString(patch.date) } : {}),
                ...(normalizeNullableString(patch.startTime) !== undefined ? { startTime: normalizeNullableString(patch.startTime) } : {}),
                ...(normalizeNullableString(patch.endTime) !== undefined ? { endTime: normalizeNullableString(patch.endTime) } : {}),
                ...(normalizeNullableString(patch.categoryId) !== undefined ? { categoryId: normalizeNullableString(patch.categoryId) } : {}),
                ...(normalizeNullableString(patch.activityId) !== undefined ? { activityId: normalizeNullableString(patch.activityId) } : {}),
                ...(normalizeNullableString(patch.note) !== undefined ? { note: normalizeNullableString(patch.note) } : {}),
                ...(normalizeNullableString(patch.linkedTodoId) !== undefined ? { linkedTodoId: normalizeNullableString(patch.linkedTodoId) } : {}),
                ...(normalizeNullableStringArray(patch.scopeIds) !== undefined ? { scopeIds: normalizeNullableStringArray(patch.scopeIds) } : {})
            };
            return typeof args.logId === 'string' && args.logId.trim() && Object.keys(normalizedPatch).length > 0
                ? [{
                    toolName: 'edit_log' as const,
                    args: {
                        logId: args.logId.trim(),
                        patch: normalizedPatch
                    }
                }]
                : [];
        }

        return [];
    });
};

const cleanAndParseJSONObjectContent = (content: string): any => {
    if (content.includes('```json')) {
        content = content.replace(/```json\n?|\n?```/g, '');
    } else if (content.includes('```')) {
        content = content.replace(/```\n?|\n?```/g, '');
    }

    const objectStart = content.indexOf('{');
    const objectEnd = content.lastIndexOf('}') + 1;
    if (objectStart >= 0 && objectEnd > objectStart) {
        content = content.substring(objectStart, objectEnd);
    }

    try {
        return JSON.parse(content);
    } catch (error) {
        console.error('JSON Object Parse Error', error);
        return {};
    }
};

const isReasoningLikeType = (value: unknown): boolean => {
    if (typeof value !== 'string') {
        return false;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === 'reasoning'
        || normalized === 'thinking'
        || normalized === 'thought'
        || normalized === 'reasoning_content';
};

const extractOpenAICompatibleReasoning = (
    responseBody: unknown,
    providerLabel: string
): AssistantReasoningSummary | undefined => {
    const root = responseBody && typeof responseBody === 'object'
        ? responseBody as Record<string, unknown>
        : null;
    const choice = Array.isArray(root?.choices) && root?.choices[0] && typeof root.choices[0] === 'object'
        ? root.choices[0] as Record<string, unknown>
        : null;
    const message = choice?.message && typeof choice.message === 'object'
        ? choice.message as Record<string, unknown>
        : null;
    const delta = choice?.delta && typeof choice.delta === 'object'
        ? choice.delta as Record<string, unknown>
        : null;
    const messageContentParts = Array.isArray(message?.content)
        ? (message?.content as unknown[])
            .filter((part) => {
                if (!part || typeof part !== 'object' || Array.isArray(part)) {
                    return false;
                }
                return isReasoningLikeType((part as Record<string, unknown>).type);
            })
        : [];

    return buildAssistantReasoningSummary([
        message?.reasoning_content,
        message?.reasoning,
        message?.thinking,
        ...messageContentParts.map((part) => {
            const candidate = part as Record<string, unknown>;
            return candidate.text ?? candidate.content ?? candidate.reasoning ?? candidate.thinking;
        }),
        delta?.reasoning_content,
        delta?.reasoning,
        delta?.thinking
    ], providerLabel);
};

const extractGeminiReasoning = (
    responseBody: unknown
): AssistantReasoningSummary | undefined => {
    const root = responseBody && typeof responseBody === 'object'
        ? responseBody as Record<string, unknown>
        : null;
    const candidate = Array.isArray(root?.candidates) && root?.candidates[0] && typeof root.candidates[0] === 'object'
        ? root.candidates[0] as Record<string, unknown>
        : null;
    const content = candidate?.content && typeof candidate.content === 'object'
        ? candidate.content as Record<string, unknown>
        : null;
    const parts = Array.isArray(content?.parts)
        ? content?.parts as unknown[]
        : [];
    const reasoningParts = parts.filter((part) => {
        if (!part || typeof part !== 'object' || Array.isArray(part)) {
            return false;
        }

        const candidatePart = part as Record<string, unknown>;
        return candidatePart.thought === true || isReasoningLikeType(candidatePart.type);
    });

    return buildAssistantReasoningSummary([
        candidate?.reasoning,
        candidate?.thinking,
        ...reasoningParts.map((part) => (part as Record<string, unknown>).text)
    ], 'gemini');
};

const hasMeaningfulAssistantUnifiedTurnSignal = (mode: AssistantTurnMode, rawOutput: unknown): boolean => {
    if (!rawOutput || typeof rawOutput !== 'object' || Array.isArray(rawOutput)) {
        return false;
    }

    const candidate = rawOutput as Record<string, unknown>;
    const outcome = typeof candidate.outcome === 'string' ? candidate.outcome.trim() : '';
    if (outcome) {
        return true;
    }

    const assistantReply = typeof candidate.assistantReply === 'string' ? candidate.assistantReply.trim() : '';
    if (assistantReply && !['null', 'undefined'].includes(assistantReply.toLowerCase())) {
        return true;
    }

    if (normalizeAssistantReminderDrafts(candidate.reminders).length > 0) {
        return true;
    }

    if (mode === 'foreground' && normalizeAssistantToolCalls(candidate.toolCalls).length > 0) {
        return true;
    }

    if (mode === 'foreground' && normalizeAssistantLocalQueryRequest(candidate.localQueryRequest)) {
        return true;
    }

    if (candidate.memoryAction === 'update_memory') {
        return true;
    }

    if (normalizeAssistantMemoryPatch(candidate.memoryPatch)) {
        return true;
    }

    if (typeof candidate.decisionSummary === 'string' && candidate.decisionSummary.trim()) {
        return true;
    }

    if (normalizeAssistantSilentReason(candidate.silentReason)) {
        return true;
    }

    if (normalizeStringList(candidate.silentSideEffects).length > 0) {
        return true;
    }

    return false;
};

const requestJsonObjectWithDebug = async <T>(
    config: AIConfig,
    fetchFn: any,
    params: {
        systemPrompt: string;
        userPrompt: string;
        conversationHistory?: AIConversationTurn[];
        cacheHint?: AIPromptCacheHint;
        normalizeResult: (rawValue: any, meta?: AIResponseNormalizationMeta) => T;
        options?: AIRequestOptions;
    }
): Promise<{ result: T; debug: AIDebugExchange }> => {
    if (config.provider === 'openai') {
        const url = `${config.baseUrl}/chat/completions`;
        const promptCacheConfig = buildOpenAICompatiblePromptCacheConfig(config, params.cacheHint);
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
            ...promptCacheConfig.headerExtras
        };
        const body = {
            model: config.modelName,
            messages: buildOpenAICompatibleJsonMessages(config, params.systemPrompt, params.userPrompt, params.conversationHistory),
            response_format: { type: 'json_object' },
            ...promptCacheConfig.bodyExtras
        };
        const requestedAt = new Date().toISOString();
        let responseStatus = 0;
        let responseOk = false;
        let responseBody: unknown = null;

        try {
            const response = await fetchFn(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                ...(params.options?.signal ? { signal: params.options.signal } : {})
            });
            responseStatus = response.status || 0;
            responseOk = Boolean(response.ok);
            const responseText = await response.text();
            try {
                responseBody = JSON.parse(responseText);
            } catch (parseError) {
                responseBody = {
                    rawResponseText: responseText,
                    transportError: parseError instanceof Error ? parseError.message : String(parseError)
                };
                throw parseError;
            }

            const debug: AIDebugExchange = {
                provider: 'openai',
                requestedAt,
                completedAt: new Date().toISOString(),
                request: {
                    url: sanitizeDebugUrl(url),
                    method: 'POST',
                    headers: sanitizeDebugHeaders(headers),
                    body
                },
                response: {
                    status: responseStatus,
                    ok: responseOk,
                    body: responseBody
                },
                cache: {
                    ...promptCacheConfig.debugCache,
                    ...(extractPromptCacheMetrics(responseBody) ? { metrics: extractPromptCacheMetrics(responseBody) } : {})
                }
            };

            if ((responseBody as any)?.error) {
                const error = new Error((responseBody as any).error.message || 'AI request failed');
                (error as Error & { debug?: AIDebugExchange }).debug = debug;
                throw error;
            }

            const rawContent = (responseBody as any)?.choices?.[0]?.message?.content || '{}';
            const reasoning = extractOpenAICompatibleReasoning(
                responseBody,
                detectOpenAICompatibleProviderFamily(config)
            );
            return {
                result: params.normalizeResult(cleanAndParseJSONObjectContent(rawContent), {
                    ...(reasoning ? { reasoning } : {})
                }),
                debug
            };
        } catch (error) {
            const debug: AIDebugExchange = {
                provider: 'openai',
                requestedAt,
                completedAt: new Date().toISOString(),
                request: {
                    url: sanitizeDebugUrl(url),
                    method: 'POST',
                    headers: sanitizeDebugHeaders(headers),
                    body
                },
                response: {
                    status: responseStatus,
                    ok: responseOk,
                    body: responseBody || {
                        transportError: error instanceof Error ? error.message : String(error)
                    }
                },
                cache: promptCacheConfig.debugCache
            };

            const finalError = error instanceof Error ? error : new Error(String(error));
            (finalError as Error & { debug?: AIDebugExchange }).debug = debug;
            throw finalError;
        }
    }

    if (config.provider === 'gemini') {
        const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
        const url = `${baseUrl}/${config.modelName}:generateContent?key=${config.apiKey}`;
        const headers = {
            'Content-Type': 'application/json'
        };
        const body = {
            contents: buildGeminiContents(params.userPrompt, params.conversationHistory),
            system_instruction: { parts: [{ text: params.systemPrompt.trim() }] },
            generationConfig: {
                response_mime_type: 'application/json'
            }
        };
        const requestedAt = new Date().toISOString();
        let responseStatus = 0;
        let responseOk = false;
        let responseBody: unknown = null;

        try {
            const response = await fetchFn(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                ...(params.options?.signal ? { signal: params.options.signal } : {})
            });
            responseStatus = response.status || 0;
            responseOk = Boolean(response.ok);
            const responseText = await response.text();
            try {
                responseBody = JSON.parse(responseText);
            } catch (parseError) {
                responseBody = {
                    rawResponseText: responseText,
                    transportError: parseError instanceof Error ? parseError.message : String(parseError)
                };
                throw parseError;
            }

            const debug: AIDebugExchange = {
                provider: 'gemini',
                requestedAt,
                completedAt: new Date().toISOString(),
                request: {
                    url: sanitizeDebugUrl(url),
                    method: 'POST',
                    headers: sanitizeDebugHeaders(headers),
                    body
                },
                response: {
                    status: responseStatus,
                    ok: responseOk,
                    body: responseBody
                }
            };

            if ((responseBody as any)?.error) {
                const error = new Error((responseBody as any).error.message || 'AI request failed');
                (error as Error & { debug?: AIDebugExchange }).debug = debug;
                throw error;
            }

            const rawContent = (((responseBody as any)?.candidates?.[0]?.content?.parts?.[0]?.text) || '{}');
            const reasoning = extractGeminiReasoning(responseBody);
            return {
                result: params.normalizeResult(cleanAndParseJSONObjectContent(rawContent), {
                    ...(reasoning ? { reasoning } : {})
                }),
                debug
            };
        } catch (error) {
            const debug: AIDebugExchange = {
                provider: 'gemini',
                requestedAt,
                completedAt: new Date().toISOString(),
                request: {
                    url: sanitizeDebugUrl(url),
                    method: 'POST',
                    headers: sanitizeDebugHeaders(headers),
                    body
                },
                response: {
                    status: responseStatus,
                    ok: responseOk,
                    body: responseBody || {
                        transportError: error instanceof Error ? error.message : String(error)
                    }
                }
            };

            const finalError = error instanceof Error ? error : new Error(String(error));
            (finalError as Error & { debug?: AIDebugExchange }).debug = debug;
            throw finalError;
        }
    }

    throw new Error('AI provider not supported');
};

export const aiService = {
    getConfig: (): AIConfig => {
        const state = readPresetState();
        const currentPreset = state.presets.find(preset => preset.id === state.currentPresetId);
        return cloneAIConfig(currentPreset?.config || DEFAULT_AI_CONFIG);
    },

    getPresets: (): AIPreset[] => {
        return readPresetState().presets.map(preset => ({
            ...preset,
            config: cloneAIConfig(preset.config)
        }));
    },

    getCurrentPresetId: (): string => {
        return readPresetState().currentPresetId;
    },

    getCurrentPreset: (): AIPreset => {
        const state = readPresetState();
        const currentPreset = state.presets.find(preset => preset.id === state.currentPresetId) || state.presets[0];
        return {
            ...currentPreset,
            config: cloneAIConfig(currentPreset.config)
        };
    },

    setCurrentPreset: (presetId: string): AIPreset | null => {
        const state = readPresetState();
        if (!state.presets.some(preset => preset.id === presetId)) {
            return null;
        }

        const nextState = persistPresetState({
            presets: state.presets,
            currentPresetId: presetId
        }, true);
        const currentPreset = nextState.presets.find(preset => preset.id === presetId) || nextState.presets[0];
        return {
            ...currentPreset,
            config: cloneAIConfig(currentPreset.config)
        };
    },

    createPreset: (name: string, config?: AIConfig): AIPreset => {
        const state = readPresetState();
        const preset: AIPreset = {
            id: createPresetId(),
            name: sanitizePresetName(name, `预设 ${state.presets.length + 1}`),
            config: cloneAIConfig(config || aiService.getConfig())
        };

        persistPresetState({
            presets: [...state.presets, preset],
            currentPresetId: preset.id
        }, true);

        return {
            ...preset,
            config: cloneAIConfig(preset.config)
        };
    },

    updatePreset: (presetId: string, updates: Partial<Pick<AIPreset, 'name' | 'config'>>): AIPreset | null => {
        const state = readPresetState();
        const targetPreset = state.presets.find(preset => preset.id === presetId);
        if (!targetPreset) {
            return null;
        }

        const updatedPreset: AIPreset = {
            ...targetPreset,
            name: updates.name !== undefined
                ? sanitizePresetName(updates.name, targetPreset.name)
                : targetPreset.name,
            config: updates.config ? normalizeAIConfig(updates.config) : targetPreset.config
        };

        const nextState = persistPresetState({
            presets: state.presets.map(preset => preset.id === presetId ? updatedPreset : preset),
            currentPresetId: state.currentPresetId
        }, state.currentPresetId === presetId);
        const persistedPreset = nextState.presets.find(preset => preset.id === presetId) || updatedPreset;

        return {
            ...persistedPreset,
            config: cloneAIConfig(persistedPreset.config)
        };
    },

    deletePreset: (presetId: string): { deleted: boolean; currentPreset: AIPreset } => {
        const state = readPresetState();
        if (presetId === DEFAULT_AI_PRESET_ID || !state.presets.some(preset => preset.id === presetId)) {
            const currentPreset = state.presets.find(preset => preset.id === state.currentPresetId) || state.presets[0];
            return {
                deleted: false,
                currentPreset: {
                    ...currentPreset,
                    config: cloneAIConfig(currentPreset.config)
                }
            };
        }

        const nextPresets = state.presets.filter(preset => preset.id !== presetId);
        const nextCurrentPresetId = state.currentPresetId === presetId
            ? DEFAULT_AI_PRESET_ID
            : state.currentPresetId;
        const nextState = persistPresetState({
            presets: nextPresets,
            currentPresetId: nextCurrentPresetId
        }, true);
        const currentPreset = nextState.presets.find(preset => preset.id === nextState.currentPresetId) || nextState.presets[0];

        return {
            deleted: true,
            currentPreset: {
                ...currentPreset,
                config: cloneAIConfig(currentPreset.config)
            }
        };
    },

    saveConfig: (config: AIConfig) => {
        const normalizedConfig = normalizeAIConfig(config);
        const state = readPresetState();
        const nextPresets = state.presets.map((preset) => (
            preset.id === state.currentPresetId
                ? { ...preset, config: normalizedConfig }
                : preset
        ));
        persistPresetState({
            presets: nextPresets,
            currentPresetId: state.currentPresetId
        }, true);
    },

    clearConfig: () => {
        localStorage.removeItem(AI_CONFIG_KEY);
        localStorage.removeItem(AI_PRESETS_KEY);
        localStorage.removeItem(AI_CURRENT_PRESET_KEY);
        notifyAIBackupDataChanged();
        if (Capacitor.isNativePlatform()) {
            void AssistantAgent.clearNativeAIConfig().catch((error) => {
                console.error('[aiService] Failed to clear native AI config', error);
            });
        }
    },

    saveProfile: (key: string, config: AIConfig) => {
        const stored = localStorage.getItem(AI_PROFILES_KEY);
        const profiles = stored ? JSON.parse(stored) : {};
        profiles[key] = normalizeAIConfig(config);
        localStorage.setItem(AI_PROFILES_KEY, JSON.stringify(profiles));
        notifyAIBackupDataChanged();
    },

    getProfile: (key: string): AIConfig | null => {
        const stored = localStorage.getItem(AI_PROFILES_KEY);
        const profiles = stored ? JSON.parse(stored) : {};
        return profiles[key] ? normalizeAIConfig(profiles[key]) : null;
    },


    // Check connection by sending a simple "hello"
    checkConnection: async (config: AIConfig): Promise<boolean> => {
        try {
            const fetchFn = Capacitor.isNativePlatform() ? nativeFetch : fetch;

            if (config.provider === 'openai') {
                const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.modelName,
                        messages: [{ role: 'user', content: 'Hello' }],
                        max_tokens: 5
                    })
                });
                return response.ok;
            } else if (config.provider === 'gemini') {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelName}:generateContent?key=${config.apiKey}`;
                const response = await fetchFn(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Hello" }] }]
                    })
                });
                return response.ok;
            }
            return false;
        } catch (e) {
            console.error('AI Connection Failed', e);
            return false;
        }
    },

    parseNaturalLanguage: async (
        text: string,
        context: {
            now: string; // YYYY-MM-DD闂備礁鎼粔鍫曞储瑜忓Σ鎰版晸閻樺啿鍓梺鍛婃处閸嬪棛绮旀總鍛婄厱闁规儳纾牎濠碘槅鍋€閺呯姴顕?
            targetDate: string; // YYYY-MM-DD闂備礁鎼粔鍫曞储瑜忓Σ鎰版晸閻樺啿鍓梺鍛婃处閸樼晫绮ｅΔ鍛厸鐎广儱鎳忔径鍕繆椤愮喐娅婄€殿喚鏁婚幃銈夊磼濠婂拋妲遍梻浣规た濞煎潡宕濆澶婃槬婵炴垯鍨洪悞璇差熆鐠轰警鍎忔い蹇嬪劦閹泛鈽夐弽褍濮ゅ銈嗘煥濞差參骞嗛崘顔肩妞ゆ帊绶ょ槐姘舵⒑閸濆嫮澧㈤柛锝忓濡?
            categories: any[]; // Pass simplified structure
            scopes?: Scope[]; // Optional scopes for context
        }
    ): Promise<ParsedTimeEntry[]> => {
        const config = aiService.getConfig();
        const fetchFn = Capacitor.isNativePlatform() ? nativeFetch : fetch;

        // ... context preparation ...
        const tagList = context.categories.map(c => ({
            name: c.name,
            activities: c.activities.map((a: any) => a.name)
        }));

        const scopeContext = context.scopes ? context.scopes.map(s => ({ id: s.id, name: s.name })) : [];

        const systemPrompt = `
角色：你是一位专业的时间管理助手。
任务：从用户的自然语言描述里提取时间记录。

上下文：
- 当前时间：${context.now}（用于理解“现在”或“到现在为止”）
- 目标日期：${context.targetDate}（用户希望把活动记录到哪一天）
- 现有标签列表：${JSON.stringify(tagList)}
- 可用 Scopes：${JSON.stringify(scopeContext)}

要求：
1. **你只需要返回时间（小时和分钟），不要返回日期。**
2. 时间一律使用 24 小时制："HH:mm"（例如 "09:00"、"15:30"、"23:45"）
3. **关键：所有记录都必须落在同一天内（00:00 到 23:59）。**
4. **禁止跨天记录。** 如果某个时间段会跨过午夜，就把结束时间截断为 "23:59"。
5. 如果用户说 "3 PM"，返回 "15:00"；如果用户说 "9 AM"，返回 "09:00"。
6. **如果用户说“直到现在”或“到现在为止”**，就使用上方上下文里的当前时间 ${context.now}。
7. 如果只给了时长（例如“读了 2 小时书”），你可以估算一个合理的时间区间。
8. 尽可能把活动匹配到已提供的标签。
9. **推断 Scopes**：根据活动描述和可用 scopes，给出相关的 "scopeIds" 建议；如果没有合适匹配，就留空。
10. 返回格式必须是纯 JSON Array。
11. **关键：在 "description" 字段中保留用户输入里的全部细节。**
12. **不要总结、简化或省略用户提供的任何信息。**
13. **在描述字段里尽量保留用户原本的措辞。**

JSON Output Schema:
[
  {
    "startTime": "HH:mm",
    "endTime": "HH:mm",
    "description": "String",
    "categoryName": "String (Top Level Name)",
    "activityName": "String (Activity Name)",
    "scopeIds": ["String (Scope ID)"]
  }
]

Example 1:
User: "下午三点到五点写周报，五点半到六点半去散步，晚上七点到八点读论文"
Output:
[
  {"startTime": "15:00", "endTime": "17:00", "description": "下午三点到五点写周报", "categoryName": "工作", "activityName": "写作", "scopeIds": ["scope_id_for_growth"]},
  {"startTime": "17:30", "endTime": "18:30", "description": "五点半到六点半去散步", "categoryName": "生活", "activityName": "运动", "scopeIds": ["scope_id_for_life"]},
  {"startTime": "19:00", "endTime": "20:00", "description": "晚上七点到八点读论文", "categoryName": "学习", "activityName": "阅读", "scopeIds": []}
]
`;


        try {
            if (config.provider === 'openai') {
                const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.modelName,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: text }
                        ],
                        response_format: { type: "json_object" }
                    })
                });
                const data = await response.json();

                if (data.error) throw new Error(data.error.message);

                let content = data.choices[0].message.content;
                const rawEntries = aiService.cleanAndParseJSON(content) as AIRawTimeEntry[];
                return aiService.combineWithDate(rawEntries, context.targetDate);
            }

            if (config.provider === 'gemini') {
                // REST API for Gemini (v1beta)
                // Docs: https://ai.google.dev/api/rest/v1beta/models/generateContent
                const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
                const url = `${baseUrl}/${config.modelName}:generateContent?key=${config.apiKey}`;

                const body = {
                    contents: [{ role: 'user', parts: [{ text: text }] }],
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    generationConfig: {
                        response_mime_type: "application/json"
                    }
                };

                const response = await fetchFn(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const data = await response.json();

                if (data.error) throw new Error(data.error.message);

                const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!content) throw new Error('No content in Gemini response');

                const rawEntries = aiService.cleanAndParseJSON(content) as AIRawTimeEntry[];
                return aiService.combineWithDate(rawEntries, context.targetDate);
            }

            return [];
        } catch (error) {
            console.error(error);
            throw new Error('Failed to parse time entries');
        }
    },

    requestAssistantUnifiedTurnWithDebug: async (
        params: {
            mode: AssistantTurnMode;
            systemPrompt: string;
            userPrompt: string;
            conversationHistory?: AIConversationTurn[];
            cacheHint?: AIPromptCacheHint;
        },
        options: AIRequestOptions = {}
    ): Promise<AIAssistantUnifiedTurnResult> => {
        const config = aiService.getConfig();
        const fetchFn = Capacitor.isNativePlatform() ? nativeFetch : fetch;

        if (!config.apiKey?.trim()) {
            throw new Error('Please configure AI settings first.');
        }

        const normalizeOutput = (rawOutput: any, meta?: AIResponseNormalizationMeta): AssistantUnifiedTurnOutput => {
            if (!hasMeaningfulAssistantUnifiedTurnSignal(params.mode, rawOutput)) {
                throw new Error('AI returned no assistant decision.');
            }

            const mode = params.mode;
            const rawOutcome = typeof rawOutput?.outcome === 'string' ? rawOutput.outcome.trim() : '';
            const outcome = rawOutcome === 'clarify'
                ? (mode === 'foreground' ? 'clarify' : 'silent')
                : rawOutcome === 'silent'
                    ? (mode === 'background' ? 'silent' : 'reply')
                    : 'reply';

            const normalized: AssistantUnifiedTurnOutput = {
                mode,
                outcome,
                memoryAction: (
                    rawOutput?.memoryAction === 'update_memory'
                    || (rawOutput?.memoryPatch && typeof rawOutput.memoryPatch === 'object')
                )
                    ? 'update_memory'
                    : 'no_update'
            };

            if (
                typeof rawOutput?.assistantReply === 'string'
                && rawOutput.assistantReply.trim()
                && !['null', 'undefined'].includes(rawOutput.assistantReply.trim().toLowerCase())
            ) {
                normalized.assistantReply = rawOutput.assistantReply.trim();
            }

            if (meta?.reasoning) {
                normalized.reasoning = meta.reasoning;
            }

            const localQueryRequest = normalizeAssistantLocalQueryRequest(rawOutput?.localQueryRequest);
            if (mode === 'foreground' && localQueryRequest) {
                normalized.localQueryRequest = localQueryRequest;
            }

            const reminders = normalizeAssistantReminderDrafts(rawOutput?.reminders);
            if (reminders.length > 0) {
                normalized.reminders = reminders;
            }

            const normalizedMemoryPatch = normalizeAssistantMemoryPatch(rawOutput?.memoryPatch);
            if (normalizedMemoryPatch) {
                normalized.memoryPatch = normalizedMemoryPatch;
            }

            if (typeof rawOutput?.decisionSummary === 'string' && rawOutput.decisionSummary.trim()) {
                normalized.decisionSummary = rawOutput.decisionSummary.trim();
            }

            const silentReason = normalizeAssistantSilentReason(rawOutput?.silentReason);
            if (silentReason) {
                normalized.silentReason = silentReason;
            }

            const silentSideEffects = normalizeStringList(rawOutput?.silentSideEffects);
            if (silentSideEffects.length > 0) {
                normalized.silentSideEffects = silentSideEffects;
            }

            if (mode === 'foreground') {
                const toolCalls = normalizeAssistantToolCalls(rawOutput?.toolCalls);
                if (toolCalls.length > 0) {
                    normalized.toolCalls = toolCalls;
                }
            }

            return normalized;
        };

        const { result, debug } = await requestJsonObjectWithDebug(config, fetchFn, {
            systemPrompt: params.systemPrompt,
            userPrompt: params.userPrompt,
            conversationHistory: params.conversationHistory,
            cacheHint: params.cacheHint,
            normalizeResult: normalizeOutput,
            options
        });

        return {
            output: result,
            debug
        };
    },


    // 闂佽绻愮换鎰板箰濞ｆ岸鏌℃径鍡樻珕闁哄被鍔岀叅闁哄稁鍘介崕宥夋煕閺囥劌澧い蟻鍥ㄢ拻闁稿本绻冭ぐ褏绱掓潏銊㈡敜H:mm闂備焦瀵х粙鎴λ囬鍓х當鐎光偓閸曨剙浠洪梺闈涱煭缁犳垿鎮￠弴銏♀拺妞ゆ劑鍩勫Σ褰掓倵濮樸儱濮傞柟顖氬暣瀹曠喖顢楁笟濠勭闂備礁鎼悧蹇涘窗閹捐泛鍨濈€广儱顦憴锕傛煕椤愩倕鏋庨柣蹇撴喘閹鎮烽悧鍫熸嫳闂佸搫妫寸紞渚€骞嗛崘顔肩妞ゃ劎鐡岄梺璇插缁嬫帡銆冮崼銉晞濞达絽婀遍埢?
    requestStructuredJsonWithDebug: async <T>(
        params: AIStructuredJsonRequestParams<T>,
        options: AIRequestOptions = {}
    ): Promise<{ result: T; debug: AIDebugExchange }> => {
        const config = aiService.getConfig();
        const fetchFn = Capacitor.isNativePlatform() ? nativeFetch : fetch;

        if (!config.apiKey?.trim()) {
            throw new Error('Please configure AI settings first.');
        }

        return requestJsonObjectWithDebug(config, fetchFn, {
            systemPrompt: params.systemPrompt,
            userPrompt: params.userPrompt,
            conversationHistory: params.conversationHistory,
            cacheHint: params.cacheHint,
            normalizeResult: params.normalizeResult,
            options
        });
    },

    combineWithDate: (rawEntries: AIRawTimeEntry[], targetDate: string): ParsedTimeEntry[] => {
        return rawEntries.map(entry => {
            // targetDate闂備礁鎼粔鍫曞储瑜忓Σ? YYYY-MM-DD
            // entry.startTime闂備礁鎼粔鍫曞储瑜忓Σ? HH:mm
            // 缂傚倸鍊风粈浣衡偓姘煎墴楠炲啯鎯旈妸銉ь吅? YYYY-MM-DDTHH:mm:ss
            const startISO = `${targetDate}T${entry.startTime}:00`;
            const endISO = `${targetDate}T${entry.endTime}:00`;

            return {
                startTime: startISO,
                endTime: endISO,
                description: entry.description,
                categoryName: entry.categoryName,
                activityName: entry.activityName,
                scopeIds: entry.scopeIds || []
            };
        });
    },

    // Generate general content (for Narrative, etc.)
    generateNarrative: async (prompt: string, systemPrompt?: string): Promise<string> => {
        const config = aiService.getConfig();
        const fetchFn = Capacitor.isNativePlatform() ? nativeFetch : fetch;

        const effectiveSystemPrompt = systemPrompt || '你是一位有帮助的写作助手，会基于提供的数据生成人的、细腻的个人复盘叙事。';

        try {
            if (config.provider === 'openai') {
                const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: config.modelName,
                        messages: [
                            { role: 'system', content: effectiveSystemPrompt },
                            { role: 'user', content: prompt }
                        ]
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.choices?.[0]?.message?.content || '';
            }

            if (config.provider === 'gemini') {
                const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
                const url = `${baseUrl}/${config.modelName}:generateContent?key=${config.apiKey}`;

                const response = await fetchFn(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        system_instruction: { parts: [{ text: effectiveSystemPrompt }] }
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }

            return 'AI Configuration Error: Unknown provider';
        } catch (error: any) {
            console.error('AI Generation Error', error);
            throw new Error(error.message || 'Failed to generate narrative');
        }
    },

    cleanAndParseJSON: (content: string): any => {
        // Clean markdown if present
        if (content.includes('```json')) {
            content = content.replace(/```json\n?|\n?```/g, '');
        } else if (content.includes('```')) {
            content = content.replace(/```\n?|\n?```/g, '');
        }

        // Keep only array part if some text preamble exists
        const arrayStart = content.indexOf('[');
        const arrayEnd = content.lastIndexOf(']') + 1;
        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            content = content.substring(arrayStart, arrayEnd);
        }

        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) return parsed;
            if (parsed.entries && Array.isArray(parsed.entries)) return parsed.entries;
            return [];
        } catch (e) {
            console.error('JSON Parse Error', e);
            return [];
        }
    },

};
