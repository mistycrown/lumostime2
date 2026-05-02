/**
 * @file aiService.ts
 * @input AI Configuration (OpenAI/Gemini keys), User Natural Language Input, Context Data (categories, scopes, todos)
 * @output Parsed Time Entries (ParsedTimeEntry[]), structured unified assistant turns, local tool-call payloads, generated narratives (string), and connection status (boolean)
 * @pos Service (AI Integration Layer)
 * @description AI 闂備礁鎼悧鍡欑矓鐎涙ɑ鍙?- 濠电姰鍨煎▔娑氣偓姘煎櫍楠炲啯绻濋崘顏佹灃?AI 闂備礁婀辩划顖炲礉閹烘梹顐介柣銏㈩焾閻ゎ噣鏌涢埥鍡楀箻缂佲偓閸戠晝enAI/Gemini闂備焦瀵х粙鎴λ囬崡鐐╂灁闁硅揪绠戠粻銉╂煃瑜滈崜鐔奉嚕閸偄绶炲璺侯儏閺€顓熺箾鐎涙鐭嬮悽顖ｄ簽濡cljs劕鈹戠€ｎ亞顦遍梺鍛婁緱閸犳牠顢旈鍫熲拺闁哄娉曡倴闂佹眹鍊曞Λ娑氬垝婵犳碍鏅柛鏇ㄥ墮閳ь剛鍋ら弻鏇㈠幢閺囩喓銈扮紓浣虹帛閻╊垶鐛幒妤€唯闁挎柧鍕橀崑鐐烘煟閻樺弶澶勬繛鍙夌墵楠炲繑瀵奸弶鎴狀唽闂佸綊鍋婇崰鎾寸濞戙垺鐓欑紒妤佺☉濡參寮? * @updated 2026-04-27: Extended unified assistant-turn normalization with decision summaries, silent reasons, side effects, and structured multi-bubble reply parts.
 * @updated 2026-04-27: Normalized malformed unified-turn memoryPatch fields such as single-string recentDecisions so durable memory updates are not silently dropped downstream.
 * @updated 2026-04-27: Removed retired intent-router and multi-planner assistant endpoints so the service now centers on the shared unified-turn path plus still-used parsing and narrative helpers.
 * @updated 2026-04-26: Consolidated assistant inference around the shared unified-turn endpoint so foreground chat and Android-first background runs reuse the same provider/debug pipeline and explicit memory-action schema.
 
 * @updated 2026-04-26: Guaranteed a lowercase json instruction on every OpenAI json_object request so structured assistant and tool-planning calls do not fail provider-side validation.
 * @updated 2026-04-25: Expanded AI intent routing and tool planning with dedicated edit-log, update-todo, and create-subtask flows that return id-plus-patch payloads for local application.
 * @updated 2026-04-25: Tightened subtask planning so scheduled or deadline dates are only emitted when the user explicitly asked for them.
 * @updated 2026-04-22: Simplified unified-chat intent classification into a message-only lightweight routing step without extra runtime context.
 * @updated 2026-04-22: Added persona-aware formal prompts plus optional cached conversation history for unified AI chat sessions.
 * @updated 2026-04-22: Added two-stage AI chat support with lightweight intent classification, debug-aware chat replies, and direct todo tool planning alongside backfill planning.
 * @updated 2026-04-22: AI backfill planning now supports per-call dates, latest-log context, todo hierarchy hints, and local cross-midnight normalization.
 * 
 * 闂備礁鎼粔鍫曗€﹂崼銏㈢处濡わ絽鍟粈澶愭煟閺冨浂鍤欓柛妯绘尦閺?
 * - 闂備胶鍘ч〃搴㈢閻愬搫绀夌憸蹇涘箯閻樻椿鏁囬柍閿亾闁哄鎳橀幃宄扳枎濞嗘垹蓱闂佽姘︽慨銈囩矙婢舵劖鍊绘俊顖涙た濡差垶姊婚崒姘偓濠毸夐幇閭︽晩闁搞儺浜楁禍?
 * - 闁诲骸鐏氬姗€骞婃惔銏″弿婵炲棙鍔楅々鐑芥偣閸ャ劌绲绘い顐犲€濋弻锟犲川鐎靛摜绐楅梺绋跨箲閿曘垽鐛幘璇茬疀妞ゆ巻鍋撶紒?
 * - AI 闂備礁鎲￠悷锕傛偡閵堝洩濮抽柕濞炬櫆閸嬨劑鏌ｉ弮鍌ょ劸闁?
 * - 濠?AI 闂備礁婀辩划顖炲礉閹烘梹顐介柣銏㈩焾閻ゎ噣鏌涢埄鍏╂垿寮冲鍫熺厵?
 * - 闂傚倷鐒﹀妯肩矓閸洘鍋柛鈩冪☉濡﹢鏌涢妷顖炴妞ゆ劗鏅槐鎺楁偑閸涱垳锛熼梺?
 * 
 * 闂備礁鐤囧▔鏇熷垔鐎靛摜绠?Once I am updated, be sure to update my header comment and the folder's md.
 */
import { Scope, TodoRecurrenceRule } from '../types';
import type {
    AssistantMemoryPatch,
    AssistantReminderDraft,
    AssistantSilentReason,
    AssistantToolCall,
    AssistantUnifiedTurnOutput,
    AssistantTurnMode
} from '../types/assistant';
import { normalizeAIBackfillToolCalls } from '../utils/aiBackfillUtils';
export interface AIConfig {
    provider: 'openai' | 'gemini';
    apiKey: string;
    baseUrl?: string; // For OpenAI Compatible
    modelName: string;
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

export interface AITodoCreateArgs {
    title: string;
    categoryId: string;
    linkedCategoryId?: string;
    linkedActivityId?: string;
    defaultScopeIds?: string[];
    note?: string;
    scheduledDate?: string;
    deadlineDate?: string;
    recurrenceRule?: TodoRecurrenceRule;
}

export interface AITodoToolCall {
    toolName: 'create_todo';
    args: AITodoCreateArgs;
}

export interface AITodoUpdatePatch {
    title?: string;
    note?: string | null;
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
}

const AI_CONFIG_KEY = 'lumostime_ai_config';
const AI_PROFILES_KEY = 'lumostime_ai_profiles';

import { HTTP } from '@awesome-cordova-plugins/http';
import { Capacitor } from '@capacitor/core';
import AssistantAgent from '../plugins/AssistantAgentPlugin';

// Helper for Native Requests
const nativeFetch = async (url: string, options: any) => {
    try {
        // HTTP plugin expects headers in 'headers', data in 'data'
        // fetch options puts body in 'body'
        const method = (options.method || 'GET').toLowerCase();
        const data = options.body ? JSON.parse(options.body) : {};

        HTTP.setDataSerializer('json');

        const response = await HTTP.sendRequest(url, {
            method: method,
            data: data,
            headers: options.headers,
            timeout: 60000 // 60s timeout for AI
        });

        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            json: async () => JSON.parse(response.data)
        };
    } catch (error: any) {
        console.error("Native AI Request Error", error);

        // Try parsing inner JSON error from native HTTP plugin
        let errMsg = error.error || error.message || JSON.stringify(error);
        if (typeof errMsg === 'string' && errMsg.startsWith('{')) {
            try { errMsg = JSON.parse(errMsg).error || errMsg; } catch (e) { }
        }

        // Expose to global for UI alerts
        // @ts-ignore
        if (typeof window !== 'undefined') window.webdavLastError = `NativeAI: ${error.status || 'Err'} - ${errMsg}`;

        // Normalize error to resemble fetch response if possible, or throw
        if (error.status) {
            const errorBody = error.error ? JSON.parse(error.error) : {};
            return {
                ok: false,
                status: error.status,
                json: async () => errorBody
            };
        }
        throw error;
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
            const normalized = {
                toolName: 'create_todo' as const,
                args: {
                    title: typeof args.title === 'string' ? args.title.trim() : '',
                    categoryId: typeof args.categoryId === 'string' ? args.categoryId.trim() : '',
                    ...(normalizeNullableString(args.linkedCategoryId) ? { linkedCategoryId: normalizeNullableString(args.linkedCategoryId)! } : {}),
                    ...(normalizeNullableString(args.linkedActivityId) ? { linkedActivityId: normalizeNullableString(args.linkedActivityId)! } : {}),
                    ...(Array.isArray(args.defaultScopeIds) ? { defaultScopeIds: args.defaultScopeIds.map((scopeId: unknown) => String(scopeId).trim()).filter(Boolean) } : {}),
                    ...(typeof args.note === 'string' && args.note.trim() ? { note: args.note.trim() } : {}),
                    ...(!normalizedRecurrenceRule && normalizeOptionalDateString(args.scheduledDate) ? { scheduledDate: normalizeOptionalDateString(args.scheduledDate)! } : {}),
                    ...(!normalizedRecurrenceRule && normalizeOptionalDateString(args.deadlineDate) ? { deadlineDate: normalizeOptionalDateString(args.deadlineDate)! } : {}),
                    ...(normalizedRecurrenceRule ? { recurrenceRule: normalizedRecurrenceRule } : {})
                }
            };
            return normalized.args.title && normalized.args.categoryId ? [normalized] : [];
        }

        if (toolName === 'update_todo') {
            const patch = args.patch || {};
            const normalizedRecurrenceRule = normalizeTodoRecurrenceRule(patch.recurrenceRule);
            const normalizedPatch = {
                ...(typeof patch.title === 'string' ? { title: patch.title.trim() } : {}),
                ...(normalizeNullableString(patch.note) !== undefined ? { note: normalizeNullableString(patch.note) } : {}),
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

const requestJsonObjectWithDebug = async <T>(
    config: AIConfig,
    fetchFn: any,
    params: {
        systemPrompt: string;
        userPrompt: string;
        conversationHistory?: AIConversationTurn[];
        normalizeResult: (rawValue: any) => T;
        options?: AIRequestOptions;
    }
): Promise<{ result: T; debug: AIDebugExchange }> => {
    if (config.provider === 'openai') {
        const url = `${config.baseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        };
        const body = {
            model: config.modelName,
            messages: buildOpenAIJsonMessageList(params.systemPrompt, params.userPrompt, params.conversationHistory),
            response_format: { type: 'json_object' }
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
            responseBody = await response.json();

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
                }
            };

            if ((responseBody as any)?.error) {
                const error = new Error((responseBody as any).error.message || 'AI request failed');
                (error as Error & { debug?: AIDebugExchange }).debug = debug;
                throw error;
            }

            const rawContent = (responseBody as any)?.choices?.[0]?.message?.content || '{}';
            return {
                result: params.normalizeResult(cleanAndParseJSONObjectContent(rawContent)),
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
                }
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
            responseBody = await response.json();

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
            return {
                result: params.normalizeResult(cleanAndParseJSONObjectContent(rawContent)),
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
        const stored = localStorage.getItem(AI_CONFIG_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            provider: 'openai',
            apiKey: '',
            baseUrl: 'https://api.openai.com/v1',
            modelName: 'gpt-3.5-turbo'
        };
    },

    saveConfig: (config: AIConfig) => {
        localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
        if (Capacitor.isNativePlatform()) {
            void AssistantAgent.syncNativeAIConfig(config).catch((error) => {
                console.error('[aiService] Failed to sync native AI config', error);
            });
        }
    },

    clearConfig: () => {
        localStorage.removeItem(AI_CONFIG_KEY);
        if (Capacitor.isNativePlatform()) {
            void AssistantAgent.clearNativeAIConfig().catch((error) => {
                console.error('[aiService] Failed to clear native AI config', error);
            });
        }
    },

    saveProfile: (key: string, config: AIConfig) => {
        const stored = localStorage.getItem(AI_PROFILES_KEY);
        const profiles = stored ? JSON.parse(stored) : {};
        profiles[key] = config;
        localStorage.setItem(AI_PROFILES_KEY, JSON.stringify(profiles));
    },

    getProfile: (key: string): AIConfig | null => {
        const stored = localStorage.getItem(AI_PROFILES_KEY);
        const profiles = stored ? JSON.parse(stored) : {};
        return profiles[key] || null;
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
Role: You are a professional time management assistant.
Task: Extract time records from the user's natural language description.

Context:
- Current Time: ${context.now} (for understanding "now" or "until now")
- Target Date: ${context.targetDate} (the date user wants to log activities for)
- Existing Tag List: ${JSON.stringify(tagList)}
- Available Scopes: ${JSON.stringify(scopeContext)}

Requirements:
1. **You ONLY need to return the TIME (hour and minute), NOT the date.**
2. Return time in 24-hour format: "HH:mm" (e.g., "09:00", "15:30", "23:45")
3. **CRITICAL: All records must be within the same day (00:00 to 23:59).**
4. **NO cross-day records allowed.** If a time range would cross midnight, end it at "23:59".
5. If user says "3 PM", return "15:00". If user says "9 AM", return "09:00".
6. **If user says "until now" or "to now"**, use the CURRENT TIME (${context.now}) from the context above.
7. If only duration is given (e.g., "read for 2 hours"), you can estimate a reasonable time range.
8. Match activities to provided tags where possible.
9. **Infer Scopes**: Based on the activity description and available scopes, suggest relevant 'scopeIds'. If no scope matches well, leave it empty.
10. Return format must be a pure JSON Array.
11. **CRITICAL: Preserve ALL details from user input in the 'description' field.**
12. **DO NOT summarize, simplify, or omit any information provided by the user.**
13. **Copy the user's original wording as much as possible for descriptions.**


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
User: "濠电偞鍨堕幐鎼侇敄閸涱厾鏆︾€广儱妫涢埢鏂款熆鐠洪缚瀚板ù鐙€鍨堕弻娑㈠箳濡ゅ﹥娈ョ紓浣靛妽閻擄繝骞冨▎鎺嬩汗闁圭儤鎼╁鎰版煟?濠电偛鐡ㄧ划宥咁潖婵犳艾纾婚柨婵嗩槸绾偓婵犵數濮撮崐褰掑磹閺嶎灛鏂课旀繝鍌氱缂備焦鏌ㄩ悺銊х矙婢舵劦鏁傞柛鏇ㄥ幗閻︽捇姊?濠电偞鍨堕幐鎼佸疮娴兼潙纾婚柨婵嗩槸缁€鍡涙煛婢跺﹦浠㈢憸鏉垮閺岋綁骞囬浣界闁汇埄鍨伴幖顐﹀Υ閹烘宸濆┑鐘插€绘禍?
Output:
[
  {"startTime": "15:00", "endTime": "17:00", "description": "闂傚倸鍊搁崯顐﹀箠閹炬椿鏁?, "categoryName": "闂佽瀛╅崘鑽ょ磽濮樺崬濮?, "activityName": "濠电偞鍨跺Λ鎴炰繆閸ヮ剚鍎撻柛鏇ㄥ灠濡﹢鏌涢妷銏℃珔闁烩斁鍋?, "scopeIds": ["scope_id_for_growth"]},
  {"startTime": "17:30", "endTime": "18:30", "description": "闂備礁鎲￠懝楣冨疮閹绢喖围?, "categoryName": "闂備焦鐪归崹濠氬窗閹邦剦娓?, "activityName": "濠德板€栭〃蹇涘闯閿濆＆?, "scopeIds": ["scope_id_for_life"]},
  {"startTime": "19:00", "endTime": "20:00", "description": "闂備胶绮竟鏇㈠疾濠婂牊鍋夐柛顐ｆ礀缁?, "categoryName": "闂備胶绮悧鐐淬仈閹间緡鏁勭€广儱顦粈鍐偓骞垮劚濞诧箓寮茬粙妫?, "activityName": "闂備胶绮竟鏇㈠疾濠靛牊鏆滈柛婵嗗閳ь剚甯″畷銊︾節閸屾粈绨?, "scopeIds": []}
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
        },
        options: AIRequestOptions = {}
    ): Promise<AIAssistantUnifiedTurnResult> => {
        const config = aiService.getConfig();
        const fetchFn = Capacitor.isNativePlatform() ? nativeFetch : fetch;

        if (!config.apiKey?.trim()) {
            throw new Error('Please configure AI settings first.');
        }

        const normalizeOutput = (rawOutput: any): AssistantUnifiedTurnOutput => {
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

            const assistantReplyParts = normalizeStringList(rawOutput?.assistantReplyParts);
            if (assistantReplyParts.length > 0) {
                normalized.assistantReplyParts = assistantReplyParts;
            }

            if (
                typeof rawOutput?.assistantReply === 'string'
                && rawOutput.assistantReply.trim()
                && !['null', 'undefined'].includes(rawOutput.assistantReply.trim().toLowerCase())
            ) {
                normalized.assistantReply = rawOutput.assistantReply.trim();
            } else if (assistantReplyParts.length > 0) {
                normalized.assistantReply = assistantReplyParts.join('\n');
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
            normalizeResult: normalizeOutput,
            options
        });

        return {
            output: result,
            debug
        };
    },


    // 闂佽绻愮换鎰板箰濞ｆ岸鏌℃径鍡樻珕闁哄被鍔岀叅闁哄稁鍘介崕宥夋煕閺囥劌澧い蟻鍥ㄢ拻闁稿本绻冭ぐ褏绱掓潏銊㈡敜H:mm闂備焦瀵х粙鎴λ囬鍓х當鐎光偓閸曨剙浠洪梺闈涱煭缁犳垿鎮￠弴銏♀拺妞ゆ劑鍩勫Σ褰掓倵濮樸儱濮傞柟顖氬暣瀹曠喖顢楁笟濠勭闂備礁鎼悧蹇涘窗閹捐泛鍨濈€广儱顦憴锕傛煕椤愩倕鏋庨柣蹇撴喘閹鎮烽悧鍫熸嫳闂佸搫妫寸紞渚€骞嗛崘顔肩妞ゃ劎鐡岄梺璇插缁嬫帡銆冮崼銉晞濞达絽婀遍埢?
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

        const effectiveSystemPrompt = systemPrompt || 'You are a helpful assistant that generates personal daily review narratives based on provided data.';

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

