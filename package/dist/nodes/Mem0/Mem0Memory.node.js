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
            description: 'Expor memórias do Mem0 para a porta de memória do AI Agent',
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
                    displayName: 'Autenticação',
                    name: 'authType',
                    type: 'options',
                    options: [
                        { name: 'Nuvem (mem0.ai)', value: 'cloud' },
                        { name: 'Self-hosted', value: 'selfHosted' },
                    ],
                    default: 'cloud',
                },
                {
                    displayName: 'ID da Thread',
                    name: 'threadId',
                    type: 'string',
                    default: '={{ $json.threadId || $executionId }}',
                    description: 'Identificador único desta conversa/thread. Usado como user_id se nenhum ID explícito for informado.',
                },
                {
                    displayName: 'Modo de Recuperação de Contexto',
                    name: 'retrievalMode',
                    type: 'options',
                    options: [
                        { name: 'Básico', value: 'basic', description: 'Retorna memórias brutas (recentes ou todas)' },
                        { name: 'Resumo', value: 'summary', description: 'Retorna um resumo simples em texto' },
                        { name: 'Semântico (v1)', value: 'semantic', description: 'Busca semântica usando o endpoint v1 com opção de rerank' },
                        { name: 'Semântico (v2)', value: 'semanticV2', description: 'Busca semântica avançada com filtros (v2)' },
                        { name: 'Híbrido', value: 'hybrid', description: 'Combina memórias recentes com busca semântica (v2) usando time-decay e pontuação híbrida' },
                    ],
                    default: 'basic',
                },
                {
                    displayName: 'Consulta',
                    name: 'query',
                    type: 'string',
                    default: '={{ $json.query || $json.lastUserMessage || "" }}',
                    description: 'Consulta em linguagem natural para recuperar memórias relevantes',
                    displayOptions: {
                        show: {
                            retrievalMode: ['semantic', 'semanticV2', 'hybrid'],
                        },
                    },
                },
                {
                    displayName: 'Chave de Memória',
                    name: 'memoryKey',
                    type: 'string',
                    default: 'chat_history',
                    description: 'Chave sob a qual a memória será retornada',
                },
                {
                    displayName: 'Avançado',
                    name: 'advanced',
                    type: 'collection',
                    placeholder: 'Opções',
                    default: {},
                    options: [
                        { displayName: 'User ID', name: 'userId', type: 'string', default: '' },
                        { displayName: 'Agent ID', name: 'agentId', type: 'string', default: '' },
                        { displayName: 'App ID', name: 'appId', type: 'string', default: '' },
                        { displayName: 'Run ID', name: 'runId', type: 'string', default: '' },
                        { displayName: 'Top K', name: 'topK', type: 'number', typeOptions: { minValue: 1 }, default: 25, description: 'Quantidade de memórias a recuperar (modos semânticos e limites de recentes)' },
                        { displayName: 'Rerank', name: 'rerank', type: 'boolean', default: true, description: 'Reordenação por relevância (modos semânticos)', displayOptions: { show: { '/retrievalMode': ['semantic', 'semanticV2', 'hybrid'] } } },
                        { displayName: 'Fields (lista separada por vírgula)', name: 'fields', type: 'string', default: '', description: 'Campos específicos a retornar da API (modos semânticos)', displayOptions: { show: { '/retrievalMode': ['semantic', 'semanticV2', 'hybrid'] } } },
                        { displayName: 'Filters (JSON)', name: 'filters', type: 'json', default: '{}', description: 'Objeto de filtros avançados para busca v2', displayOptions: { show: { '/retrievalMode': ['semanticV2', 'hybrid'] } } },
                        { displayName: 'Last N (recentes)', name: 'lastN', type: 'number', default: 20, description: 'Se > 0, retorna apenas as últimas N memórias em Básico/Resumo e compõe a parte de recentes no Híbrido', displayOptions: { show: { '/retrievalMode': ['basic', 'summary', 'hybrid'] } } },
                        { displayName: 'Alpha (peso semântico)', name: 'alpha', type: 'number', typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 }, default: 0.65, description: 'Peso da relevância semântica na pontuação híbrida', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                        { displayName: 'Half-life (horas)', name: 'halfLifeHours', type: 'number', typeOptions: { minValue: 1 }, default: 48, description: 'Meia-vida (em horas) usada no decaimento temporal', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                        { displayName: 'Máximo a retornar', name: 'maxReturn', type: 'number', typeOptions: { minValue: 1 }, default: 30, description: 'Quantidade final de memórias retornadas ao agente', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                        { displayName: 'MMR (diversidade)', name: 'mmr', type: 'boolean', default: true, description: 'Aplicar diversidade de resultados (Maximal Marginal Relevance)', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                        { displayName: 'MMR Lambda', name: 'mmrLambda', type: 'number', typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 }, default: 0.5, description: 'Equilíbrio entre relevância e diversidade no MMR', displayOptions: { show: { '/retrievalMode': ['hybrid'] } } },
                    ],
                },
            ],
        };
    }
    // For AI connections, n8n reads from supplyData. We also
    // implement execute as a fallback to surface JSON data.
    async supplyData(itemIndex) {
        var _a, _b, _c, _d, _e, _f, _g;
        const memoryKey = this.getNodeParameter('memoryKey', itemIndex);
        const retrievalMode = this.getNodeParameter('retrievalMode', itemIndex);
        const threadId = this.getNodeParameter('threadId', itemIndex);
        const adv = (this.getNodeParameter('advanced', itemIndex, {}) || {});
        const query = this.getNodeParameter('query', itemIndex, '') || '';
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
                    body.filters = filters;
                }
                catch { }
            }
            const url = retrievalMode === 'semanticV2' || retrievalMode === 'hybrid' ? '/v2/memories/search/' : '/v1/memories/search/';
            const semRes = await GenericFunctions_1.mem0ApiRequest.call(this, 'POST', url, body);
            let semMemories = Array.isArray(semRes) ? semRes : [semRes];
            if (retrievalMode === 'hybrid') {
                // coletar recentes
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
                let recents = Array.isArray(recRes) ? recRes : [recRes];
                const lastN = Number((_a = adv.lastN) !== null && _a !== void 0 ? _a : 20);
                if (lastN > 0)
                    recents = recents.slice(-lastN);
                // scoring híbrido
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
                // add semantic part
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
                // add recents part
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
                    // MMR greedy (sem embeddings; usa score como proxy)
                    const selected = [];
                    const rest = [...ranked];
                    // pick top-1
                    selected.push(rest.shift());
                    while (selected.length < Math.min(maxReturn, ranked.length) && rest.length) {
                        let bestIdx = 0;
                        let bestScore = -Infinity;
                        for (let i = 0; i < rest.length; i++) {
                            const cand = rest[i];
                            const rel = cand.hybrid;
                            // diversidade simples: penaliza se muito parecido com já escolhidos (aproximação via diferença de score)
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
                qs.user_id = threadId; // default
            if (adv.agentId)
                qs.agent_id = String(adv.agentId);
            if (adv.appId)
                qs.app_id = String(adv.appId);
            if (adv.runId)
                qs.run_id = String(adv.runId);
            const res = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', '/v1/memories/', {}, qs);
            let memories = Array.isArray(res) ? res : [res];
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
        return {
            response: { [memoryKey]: payload },
        };
    }
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
            let payload;
            if (retrievalMode === 'semantic' || retrievalMode === 'semanticV2') {
                const body = { query };
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
                if (adv.topK)
                    body.top_k = Number(adv.topK);
                if (adv.rerank !== undefined)
                    body.rerank = Boolean(adv.rerank);
                if (typeof adv.fields === 'string' && adv.fields)
                    body.fields = String(adv.fields).split(',').map((f) => f.trim());
                if (retrievalMode === 'semanticV2') {
                    try {
                        const filters = typeof adv.filters === 'string' ? JSON.parse(adv.filters) : (adv.filters || {});
                        body.filters = filters;
                    }
                    catch { }
                }
                const url = retrievalMode === 'semanticV2' ? '/v2/memories/search/' : '/v1/memories/search/';
                const res = await GenericFunctions_1.mem0ApiRequest.call(this, 'POST', url, body);
                const memories = Array.isArray(res) ? res : [res];
                payload = memories.map((m) => { var _a, _b; return ({ role: 'system', content: (_b = (_a = m.memory) !== null && _a !== void 0 ? _a : m.text) !== null && _b !== void 0 ? _b : JSON.stringify(m) }); });
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
                let memories = Array.isArray(res) ? res : [res];
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
            const json = {};
            json[memoryKey] = payload;
            returnData.push({ json });
        }
        return [returnData];
    }
}
exports.Mem0Memory = Mem0Memory;
//# sourceMappingURL=Mem0Memory.node.js.map