/**
 * @file aiService.ts
 * @input Unstructured Time Text, API Keys
 * @output Parsed Structured Time Entries
 * @pos Service (Business Logic)
 * @description Core service for communicating with AI Providers (OpenAI/Gemini). Handles prompt construction and response parsing for converting natural language into time logs and todo tasks.
 */
import { TodoCategory, Category, Scope } from '../types';
export interface AIConfig {
    provider: 'openai' | 'gemini';
    apiKey: string;
    baseUrl?: string; // For OpenAI Compatible
    modelName: string;
}

export interface ParsedTimeEntry {
    startTime: string; // ISO (完整日期时间)
    endTime: string;   // ISO (完整日期时间)
    description: string;
    categoryName: string;
    activityName: string;
    scopeIds?: string[]; // 可选：用户接受的关联领域ID
}

// AI返回的原始时间条目（只包含时间，不包含日期）
interface AIRawTimeEntry {
    startTime: string; // HH:mm格式
    endTime: string;   // HH:mm格式
    description: string;
    categoryName: string;
    activityName: string;
    scopeIds?: string[]; // AI inferred scopes
}

// AI返回的待办任务结构
export interface AIParsedTodo {
    title: string;
    categoryId?: string;
    linkedActivityId?: string;
    defaultScopeIds?: string[];
}

const AI_CONFIG_KEY = 'lumostime_ai_config';
const AI_PROFILES_KEY = 'lumostime_ai_profiles';

/**
 * @file aiService.ts
 * @input AI Configuration (OpenAI/Gemini keys), User Natural Language Input
 * @output Parsed Time Entries (JSON), Generated Narratives
 * @pos Service (AI Integration Layer)
 * @description Handles all interactions with AI providers, including configuration management, connection testing, and prompt execution.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { HTTP } from '@awesome-cordova-plugins/http';
import { Capacitor } from '@capacitor/core';

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
    },

    clearConfig: () => {
        localStorage.removeItem(AI_CONFIG_KEY);
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
            now: string; // YYYY-MM-DD格式的当前日期
            targetDate: string; // YYYY-MM-DD格式的目标日期（用户选择补记的日期）
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
User: "下午三点到五点阅读,五点半吃饭一个小时,七点到八点玩游戏"
Output:
[
  {"startTime": "15:00", "endTime": "17:00", "description": "阅读", "categoryName": "学习", "activityName": "书籍文献", "scopeIds": ["scope_id_for_growth"]},
  {"startTime": "17:30", "endTime": "18:30", "description": "吃饭", "categoryName": "生活", "activityName": "饮食", "scopeIds": ["scope_id_for_life"]},
  {"startTime": "19:00", "endTime": "20:00", "description": "玩游戏", "categoryName": "爱欲再生产", "activityName": "玩玩游戏", "scopeIds": []}
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

    parseTodoText: async (
        text: string,
        context: {
            todoCategories: TodoCategory[];
            activityCategories: Category[];
            scopes: Scope[];
        }
    ): Promise<AIParsedTodo[]> => {
        const config = aiService.getConfig();
        const fetchFn = Capacitor.isNativePlatform() ? nativeFetch : fetch;

        // Simplify context for AI
        const todoCats = context.todoCategories.map(c => ({ id: c.id, name: c.name }));
        const activityCats = context.activityCategories.map(c => ({
            categoryName: c.name,
            activities: c.activities.map(a => ({ id: a.id, name: a.name }))
        }));
        const scopeList = context.scopes.map(s => ({ id: s.id, name: s.name }));

        const systemPrompt = `
Role: You are a smart task organizer for a Todo app.
Task: Parse the user's natural language input into structured todo tasks.

Context Data:
1. **Todo Lists** (Assign 'categoryId'):
${JSON.stringify(todoCats)}

2. **Activity Tags** (Assign 'linkedActivityId'):
${JSON.stringify(activityCats)}
(Find the most relevant activity. If none fits well, leave it empty.)

3. **Professional Scopes** (Assign 'defaultScopeIds' array):
${JSON.stringify(scopeList)}
(Select all relevant scopes based on the context.)

Requirements:
1. **Extract Tasks**: Split the input into multiple tasks if the user mentions multiple things.
2. **Analyze**: For each task, infer the best Todo List, Activity Tag, and Scopes based on semantic meaning.
3. **Format**: Return a JSON Array of objects.
4. **Strict JSON**: Output ONLY valid JSON.
5. **Scope Inference**: Adopt a **Minimal Matching Principle**. Only suggest a Scope if you are highly confident it matches based on the user's explicit intent or strong semantic connection. **Better to leave 'defaultScopeIds' empty than to guess incorrectly.**

JSON Output Schema:
[
  {
    "title": "Task Name",
    "categoryId": "ID from Todo Lists (Required, pick best fit or default)",
    "linkedActivityId": "ID from Activity Tags (Optional)",
    "defaultScopeIds": ["ID from Scopes", ...]
  }
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

                const content = data.choices[0].message.content;
                const parsed = aiService.cleanAndParseJSON(content) as any[];
                return parsed.map(item => ({
                    ...item,
                    defaultScopeIds: item.defaultScopeIds || item.scopeIds || []
                })) as AIParsedTodo[];
            }

            if (config.provider === 'gemini') {
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

                return (aiService.cleanAndParseJSON(content) as any[]).map(item => ({
                    ...item,
                    defaultScopeIds: item.defaultScopeIds || item.scopeIds || []
                })) as AIParsedTodo[];
            }

            return [];
        } catch (error) {
            console.error('Todo Parsing Error', error);
            throw new Error('Failed to parse tasks');
        }
    },

    // 将AI返回的时间（HH:mm）与用户选择的日期组合成完整的ISO字符串
    combineWithDate: (rawEntries: AIRawTimeEntry[], targetDate: string): ParsedTimeEntry[] => {
        return rawEntries.map(entry => {
            // targetDate格式: YYYY-MM-DD
            // entry.startTime格式: HH:mm
            // 组合成: YYYY-MM-DDTHH:mm:ss
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
    }
};
