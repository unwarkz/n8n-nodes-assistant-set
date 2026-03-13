"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mem0Memory = void 0;
const GenericFunctions_1 = require("./GenericFunctions");
class Mem0Memory {
    constructor() {
        this.description = {
            displayName: 'Mem0 Memory',
            name: 'mem0Memory',
            icon: 'file:mem0.svg',
            group: ['transform'],
            version: 1,
            description: 'Expose Mem0 memories to the AI Agent memory port',
            defaults: {
                name: 'Mem0 Memory',
            },
            // No main input; connects to AI Agent memory port
            inputs: [],
            outputs: ['ai_memory'],
            credentials: [
                {
                    name: 'mem0Api',
                    required: true,
                    displayOptions: {
                        show: {
                            authType: ['cloud'],
                        },
                    },
                },
                {
                    name: 'mem0SelfHostedApi',
                    required: true,
                    displayOptions: {
                        show: {
                            authType: ['selfHosted'],
                        },
                    },
                },
            ],
            codex: {
                categories: ['AI', 'Memory'],
                subcategories: {
                    AI: ['Memory', 'Agents & LLMs'],
                    Memory: ['AI Memory'],
                },
            },
            properties: [
                {
                    displayName: 'Authentication',
                    name: 'authType',
                    type: 'options',
                    options: [
                        { name: 'Cloud (mem0.ai)', value: 'cloud' },
                        { name: 'Self-Hosted', value: 'selfHosted' },
                    ],
                    default: 'cloud',
                },
                {
                    displayName: 'Thread ID',
                    name: 'threadId',
                    type: 'string',
                    default: '={{ $json.threadId || $executionId }}',
                    description: 'Unique identifier for this conversation/thread. Used as user_id if no explicit ID is provided.',
                },
                {
                    displayName: 'Context Retrieval Mode',
                    name: 'retrievalMode',
                    type: 'options',
                    options: [
                        { name: 'Basic', value: 'basic', description: 'Returns raw memories (recent or all)' },
                        { name: 'Summary', value: 'summary', description: 'Returns a simple text summary of memories' },
                        { name: 'Semantic (v1)', value: 'semantic', description: 'Semantic search using the v1 endpoint with rerank option' },
                        { name: 'Semantic (v2)', value: 'semanticV2', description: 'Advanced semantic search with filters (v2)' },
                        { name: 'Hybrid', value: 'hybrid', description: 'Combines recent memories with semantic search using time-decay and hybrid scoring' },
                    ],
                    default: 'basic',
                },
                {
                    displayName: 'Query',
                    name: 'query',
                    type: 'string',
                    default: '={{ $json.query || $json.lastUserMessage || "" }}',
                    description: 'Natural language query to retrieve relevant memories',
                    displayOptions: {
                        show: {
                            retrievalMode: ['semantic', 'semanticV2', 'hybrid'],
                        },
                    },
                },
                {
                    displayName: 'Memory Key',
                    name: 'memoryKey',
                    type: 'string',
                    default: 'chat_history',
                    description: 'Key under which the memory will be returned',
                },
                {
                    displayName: 'Advanced',
                    name: 'advanced',
                    type: 'collection',
                    placeholder: 'Options',
                    default: {},
                    options: [
                        { displayName: 'User ID', name: 'userId', type: 'string', default: '' },
                        { displayName: 'Agent ID', name: 'agentId', type: 'string', default: '' },
                        { displayName: 'App ID', name: 'appId', type: 'string', default: '' },
                        { displayName: 'Run ID', name: 'runId', type: 'string', default: '' },
                        { displayName: 'Top K', name: 'topK', type: 'number', typeOptions: { minValue: 1 }, default: 25, description: 'Number of memories to retrieve (semantic modes and recent limits)' },
                        { displayName: 'Rerank', name: 'rerank', type: 'boolean', default: true, description: 'Reranking by relevance (semantic modes)', displayOptions: { show: { '/retrievalMode': ['semantic', 'semanticV2', 'hybrid'] } } },
                        { displayName: 'Fields (comma-separated list)', name: 'fields', type: 'string', default: '', description: 'Specific fields to return from the API (semantic modes)', displayOptions: { show: { '/retrievalMode': ['semantic', 'semanticV2', 'hybrid'] } } },
                        { displayName: 'Filters (JSON)', name: 'filters', type: 'json', default: '{}', description: 'Advanced filters object for v2 search', displayOptions: { show: { '/retrievalMode': ['semanticV2', 'hybrid'] } } },
                        { displayName: 'Last N (recent)', name: 'lastN', type: 'number', default: 20, description: 'If > 0, returns only the last N memories in Basic/Summary mode and composes the recent part in Hybrid', displayOptions: { show: { '/retrievalMode': ['basic', 'summary', 'hybrid'] } } },
                        { displayName: 'Alpha (semantic weight)', name: 'alpha', type: 'number', typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 }, default: 0.65, description: 'Weight of semantic relevance in hybrid scoring', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                        { displayName: 'Half-life (hours)', name: 'halfLifeHours', type: 'number', typeOptions: { minValue: 1 }, default: 48, description: 'Half-life (in hours) used in time decay', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                        { displayName: 'Maximum to Return', name: 'maxReturn', type: 'number', typeOptions: { minValue: 1 }, default: 30, description: 'Final number of memories returned to the agent', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                        { displayName: 'MMR (diversity)', name: 'mmr', type: 'boolean', default: true, description: 'Apply result diversity (Maximal Marginal Relevance)', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                        { displayName: 'MMR Lambda', name: 'mmrLambda', type: 'number', typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 }, default: 0.5, description: 'Balance between relevance and diversity in MMR', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                        { displayName: 'Save Context', name: 'saveContext', type: 'boolean', default: true, description: 'When enabled, new conversation turns are automatically saved to Mem0' },
                    ],
                },
            ],
        };
    }

    /**
     * Fetches memories from Mem0 API and returns them as a formatted array.
     * Used by both supplyData (memory interface) and execute (fallback).
     */
    async _fetchMemories(retrievalMode, threadId, query, adv) {
        var _a, _b, _c, _d, _e, _f, _g;
        let payload;
        if (retrievalMode === 'semantic' || retrievalMode === 'semanticV2' || retrievalMode === 'hybrid') {
            const body = { query };
            // IDs
            if (adv.userId)
                body.user_id = String(adv.userId);
            else
                body.user_id = threadId;
            if (adv.agentId)
                body.agent_id = String(adv.agentId);
            if (adv.appId)
                body.app_id = String(adv.appId);
            if (adv.runId)
                body.run_id = String(adv.runId);
            // Options
            if (adv.topK)
                body.top_k = Number(adv.topK);
            if (adv.rerank !== undefined)
                body.rerank = Boolean(adv.rerank);
            if (typeof adv.fields === 'string' && adv.fields)
                body.fields = String(adv.fields).split(',').map((f) => f.trim());
            if (retrievalMode === 'semanticV2' || retrievalMode === 'hybrid') {
                try {
                    const filters = typeof adv.filters === 'string' ? JSON.parse(adv.filters) : (adv.filters || {});
                    if (Object.keys(filters).length) body.filters = filters;
                }
                catch { }
            }
            // Use /v1/memories/search/ for cloud, /search for self-hosted (translated by GenericFunctions)
            const semRes = await GenericFunctions_1.mem0ApiRequest.call(this, 'POST', '/v1/memories/search/', body);
            let semMemories = Array.isArray(semRes) ? semRes : (semRes ? [semRes] : []);
            if (retrievalMode === 'hybrid') {
                // Collect recent memories
                const qs = {};
                if (adv.userId)
                    qs.user_id = String(adv.userId);
                else
                    qs.user_id = threadId;
                if (adv.agentId)
                    qs.agent_id = String(adv.agentId);
                if (adv.appId)
                    qs.app_id = String(adv.appId);
                if (adv.runId)
                    qs.run_id = String(adv.runId);
                const recRes = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', '/v1/memories/', {}, qs);
                let recents = Array.isArray(recRes) ? recRes : (recRes ? [recRes] : []);
                const lastN = Number((_a = adv.lastN) !== null && _a !== void 0 ? _a : 20);
                if (lastN > 0)
                    recents = recents.slice(-lastN);
                // Hybrid scoring
                const alpha = Number((_b = adv.alpha) !== null && _b !== void 0 ? _b : 0.65);
                const halfLife = Number((_c = adv.halfLifeHours) !== null && _c !== void 0 ? _c : 48);
                const maxReturn = Number((_d = adv.maxReturn) !== null && _d !== void 0 ? _d : 30);
                const mmr = adv.mmr !== undefined ? Boolean(adv.mmr) : true;
                const mmrLambda = Number((_e = adv.mmrLambda) !== null && _e !== void 0 ? _e : 0.5);
                const LN2 = Math.log(2);
                const now = Date.now();
                const idOf = (m) => m.id || m.uuid || m._id || m.memory_id || m.pk || JSON.stringify(m).slice(0, 1000);
                const createdOf = (m) => m.created_at || m.createdAt || m.timestamp || m.time || m.date;
                const scoreOf = (m) => { var _a, _b, _c, _d; return (_d = (_c = (_b = (_a = m.score) !== null && _a !== void 0 ? _a : m.similarity) !== null && _b !== void 0 ? _b : m.relevance) !== null && _c !== void 0 ? _c : m.rank) !== null && _d !== void 0 ? _d : 1; };
                const merged = new Map();
                // Add semantic results
                for (const m of semMemories) {
                    const id = idOf(m);
                    const created = createdOf(m);
                    let recency = 0.5;
                    if (created) {
                        const t = new Date(created).getTime();
                        if (!isNaN(t)) {
                            const ageH = Math.max(0, (now - t) / 3600000);
                            recency = Math.exp(-LN2 * (ageH / Math.max(1, halfLife)));
                        }
                    }
                    const sem = Number(scoreOf(m));
                    const hybrid = alpha * sem + (1 - alpha) * recency;
                    merged.set(id, { m, semanticScore: sem, recencyScore: recency, hybrid });
                }
                // Add recent results
                for (const m of recents) {
                    const id = idOf(m);
                    const created = createdOf(m);
                    let recency = 0.7;
                    if (created) {
                        const t = new Date(created).getTime();
                        if (!isNaN(t)) {
                            const ageH = Math.max(0, (now - t) / 3600000);
                            recency = Math.exp(-LN2 * (ageH / Math.max(1, halfLife)));
                        }
                    }
                    const prev = merged.get(id);
                    const sem = (_f = prev === null || prev === void 0 ? void 0 : prev.semanticScore) !== null && _f !== void 0 ? _f : 0;
                    const hybrid = alpha * sem + (1 - alpha) * recency;
                    merged.set(id, { m: (_g = prev === null || prev === void 0 ? void 0 : prev.m) !== null && _g !== void 0 ? _g : m, semanticScore: sem, recencyScore: recency, hybrid });
                }
                let ranked = Array.from(merged.values());
                ranked.sort((a, b) => b.hybrid - a.hybrid);
                if (mmr && ranked.length > 2) {
                    // MMR greedy (without embeddings; uses score as proxy)
                    const selected = [];
                    const rest = [...ranked];
                    selected.push(rest.shift());
                    while (selected.length < Math.min(maxReturn, ranked.length) && rest.length) {
                        let bestIdx = 0;
                        let bestScore = -Infinity;
                        for (let i = 0; i < rest.length; i++) {
                            const cand = rest[i];
                            const rel = cand.hybrid;
                            const sim = Math.max(...selected.map((s) => 1 - Math.abs(s.hybrid - cand.hybrid)));
                            const mmrScore = mmrLambda * rel - (1 - mmrLambda) * sim;
                            if (mmrScore > bestScore) {
                                bestScore = mmrScore;
                                bestIdx = i;
                            }
                        }
                        selected.push(rest.splice(bestIdx, 1)[0]);
                    }
                    ranked = selected;
                }
                const finalMemories = ranked.slice(0, maxReturn).map((r) => r.m);
                payload = finalMemories.map((m) => { var _a, _b; return ({ role: 'system', content: (_b = (_a = m.memory) !== null && _a !== void 0 ? _a : m.text) !== null && _b !== void 0 ? _b : JSON.stringify(m) }); });
            }
            else {
                payload = semMemories.map((m) => { var _a, _b; return ({ role: 'system', content: (_b = (_a = m.memory) !== null && _a !== void 0 ? _a : m.text) !== null && _b !== void 0 ? _b : JSON.stringify(m) }); });
            }
        }
        else {
            const qs = {};
            if (adv.userId)
                qs.user_id = String(adv.userId);
            else
                qs.user_id = threadId;
            if (adv.agentId)
                qs.agent_id = String(adv.agentId);
            if (adv.appId)
                qs.app_id = String(adv.appId);
            if (adv.runId)
                qs.run_id = String(adv.runId);
            const res = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', '/v1/memories/', {}, qs);
            let memories = Array.isArray(res) ? res : (res ? [res] : []);
            // lastN limit
            if (adv.lastN && Number(adv.lastN) > 0)
                memories = memories.slice(-Number(adv.lastN));
            if (retrievalMode === 'summary') {
                const text = memories
                    .map((m) => m.memory || m.text || m.value)
                    .filter(Boolean)
                    .join('\n');
                payload = [{ role: 'system', content: `Summary of memories:\n${text}` }];
            }
            else {
                payload = memories.map((m) => { var _a, _b; return ({ role: 'system', content: (_b = (_a = m.memory) !== null && _a !== void 0 ? _a : m.text) !== null && _b !== void 0 ? _b : JSON.stringify(m) }); });
            }
        }
        return payload;
    }

    /**
     * supplyData is called by the AI Agent to get the memory object.
     * Returns a LangChain-compatible memory interface with loadMemoryVariables
     * and saveContext methods so the AI Agent can read and write memories.
     */
    async supplyData(itemIndex) {
        const self = this;
        const memoryKey = this.getNodeParameter('memoryKey', itemIndex);
        const retrievalMode = this.getNodeParameter('retrievalMode', itemIndex);
        const threadId = this.getNodeParameter('threadId', itemIndex);
        const adv = (this.getNodeParameter('advanced', itemIndex, {}) || {});
        const query = this.getNodeParameter('query', itemIndex, '') || '';
        const shouldSaveContext = adv.saveContext !== false;

        // Resolve effective user_id once (used in saveContext)
        const effectiveUserId = adv.userId ? String(adv.userId) : threadId;

        // Create a LangChain-compatible memory object
        const memoryObj = {
            memoryKeys: [memoryKey],

            async loadMemoryVariables(values) {
                try {
                    // Use the provided input as query when in semantic modes
                    const effectiveQuery = query || (values && (values.input || values.query || values.lastUserMessage || ''));
                    const payload = await self._fetchMemories(retrievalMode, threadId, effectiveQuery, adv);
                    return { [memoryKey]: payload };
                }
                catch (err) {
                    // Return empty on error so the agent can still operate
                    return { [memoryKey]: [] };
                }
            },

            async saveContext(inputValues, outputValues) {
                if (!shouldSaveContext) return;
                try {
                    const messages = [];
                    const userInput = inputValues && (inputValues.input || inputValues.human_input || inputValues.query);
                    const aiOutput = outputValues && (outputValues.output || outputValues.response || outputValues.text);
                    if (userInput) messages.push({ role: 'user', content: String(userInput) });
                    if (aiOutput) messages.push({ role: 'assistant', content: String(aiOutput) });
                    if (messages.length === 0) return;
                    const body = { messages };
                    if (adv.userId)
                        body.user_id = String(adv.userId);
                    else
                        body.user_id = effectiveUserId;
                    if (adv.agentId) body.agent_id = String(adv.agentId);
                    if (adv.appId) body.app_id = String(adv.appId);
                    if (adv.runId) body.run_id = String(adv.runId);
                    await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories/', body);
                }
                catch (err) {
                    // Silently ignore save errors to not disrupt the agent
                }
            },

            async clear() {
                try {
                    const qs = {};
                    if (adv.userId)
                        qs.user_id = String(adv.userId);
                    else
                        qs.user_id = effectiveUserId;
                    if (adv.agentId) qs.agent_id = String(adv.agentId);
                    if (adv.appId) qs.app_id = String(adv.appId);
                    if (adv.runId) qs.run_id = String(adv.runId);
                    await GenericFunctions_1.mem0ApiRequest.call(self, 'DELETE', '/v1/memories/', {}, qs);
                }
                catch (err) {
                    // Silently ignore clear errors
                }
            },
        };

        return {
            response: memoryObj,
        };
    }

    // execute is a fallback when the node is not connected to an AI Agent memory port
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const count = Math.max(items.length, 1);
        for (let i = 0; i < count; i++) {
            const memoryKey = this.getNodeParameter('memoryKey', i);
            const retrievalMode = this.getNodeParameter('retrievalMode', i);
            const threadId = this.getNodeParameter('threadId', i);
            const adv = (this.getNodeParameter('advanced', i, {}) || {});
            const query = this.getNodeParameter('query', i, '') || '';
            const payload = await this._fetchMemories(retrievalMode, threadId, query, adv);
            const json = {};
            json[memoryKey] = payload;
            returnData.push({ json });
        }
        return [returnData];
    }
}
exports.Mem0Memory = Mem0Memory;
//# sourceMappingURL=Mem0Memory.node.js.map
