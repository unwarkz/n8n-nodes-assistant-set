"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mem0AiTools = void 0;
const GenericFunctions_1 = require("./GenericFunctions");

/**
 * Load zod for schema definitions (available in n8n's runtime environment).
 */
let z = null;
try { z = require('zod'); } catch (_) { /* no zod */ }

/**
 * Load DynamicStructuredTool from LangChain (available in n8n's runtime environment).
 * DynamicStructuredTool accepts a structured zod-validated object as input, which
 * avoids the "Expected string, received object" validation error that occurs when
 * an LLM passes structured arguments to a DynamicTool (string-only schema).
 * Falls back to a minimal StructuredTool-compatible shim when not resolvable.
 */
let DynamicStructuredTool;
(function () {
    const candidates = ['@langchain/core/tools', 'langchain/tools'];
    for (const mod of candidates) {
        try {
            const exported = require(mod);
            if (exported && exported.DynamicStructuredTool) {
                DynamicStructuredTool = exported.DynamicStructuredTool;
                return;
            }
        } catch (_) { /* continue */ }
    }
    // Minimal shim: satisfies the structured-tool contract used by n8n AI Agent
    DynamicStructuredTool = class DynamicStructuredToolShim {
        constructor({ name, description, schema, func }) {
            this.name = name;
            this.description = description;
            this.schema = schema || (z ? z.object({}).passthrough() : null);
            this.func = func;
            this.returnDirect = false;
            this.verbose = false;
            this.lc_namespace = ['langchain_core', 'tools'];
            this.lc_serializable = true;
        }
        async invoke(input) {
            const inputObj = typeof input === 'string'
                ? (() => { try { return JSON.parse(input); } catch (_) { return { input }; } })()
                : (input || {});
            return this.func(inputObj);
        }
        async call(arg, _configArg) {
            return this.invoke(arg);
        }
        _type() { return 'structured'; }
    };
})();

/**
 * Mem0 AI Tools node
 *
 * Provides DynamicStructuredTool instances that an n8n AI Agent can call to search,
 * add, retrieve and delete memories stored in Mem0.
 *
 * Connect the "ai_tool" output to an AI Agent node's "Tools" input.
 */
class Mem0AiTools {
    constructor() {
        this.description = {
            displayName: 'Mem0 AI Tools',
            name: 'mem0AiTools',
            icon: 'file:mem0.svg',
            group: ['transform'],
            version: 1,
            description: 'Provides Mem0 memory tools (search, add, get, delete) to an AI Agent node',
            defaults: {
                name: 'Mem0 AI Tools',
            },
            inputs: [],
            outputs: ['ai_tool'],
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
                categories: ['AI'],
                subcategories: {
                    AI: ['Tools', 'Agents & LLMs'],
                },
                resources: {
                    primaryDocumentation: [
                        {
                            url: 'https://docs.mem0.ai/',
                        },
                    ],
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
                    description: 'Choose between Mem0 cloud or your own self-hosted instance',
                },
                {
                    displayName: 'User ID',
                    name: 'userId',
                    type: 'string',
                    default: '',
                    description: 'Default user ID to scope all memory operations. Can be overridden per tool call.',
                    placeholder: 'user_123',
                },
                {
                    displayName: 'Agent ID',
                    name: 'agentId',
                    type: 'string',
                    default: '',
                    description: 'Optional agent ID to scope memories to a specific agent',
                    placeholder: 'my_agent',
                },
                {
                    displayName: 'Run ID',
                    name: 'runId',
                    type: 'string',
                    default: '',
                    description: 'Optional run/session ID to scope memories to a specific session',
                    placeholder: 'session_001',
                },
                {
                    displayName: 'Tools to Enable',
                    name: 'enabledTools',
                    type: 'multiOptions',
                    options: [
                        {
                            name: 'Search Memory',
                            value: 'search',
                            description: 'Search memories using semantic similarity',
                        },
                        {
                            name: 'Add Memory',
                            value: 'add',
                            description: 'Store a new memory or conversation turn',
                        },
                        {
                            name: 'Get All Memories',
                            value: 'getAll',
                            description: 'Retrieve all stored memories for a user',
                        },
                        {
                            name: 'Delete Memory',
                            value: 'delete',
                            description: 'Delete a specific memory by its ID',
                        },
                        {
                            name: 'Get Memory History',
                            value: 'history',
                            description: 'Get the change history of a specific memory',
                        },
                    ],
                    default: ['search', 'add', 'getAll'],
                    description: 'Select which tools to expose to the AI Agent',
                },
                {
                    displayName: 'Tool Description',
                    name: 'toolDescription',
                    type: 'string',
                    default: 'Interact with Mem0 memory storage: search, add, retrieve, and delete memories for AI agents',
                    description: 'Describe the tool to help the AI agent understand when and how to use it',
                    typeOptions: { rows: 3 },
                },
                {
                    displayName: 'Search Options',
                    name: 'searchOptions',
                    type: 'collection',
                    placeholder: 'Add Option',
                    default: {},
                    displayOptions: {
                        show: {
                            enabledTools: ['search'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Top K',
                            name: 'topK',
                            type: 'number',
                            typeOptions: { minValue: 1 },
                            default: 10,
                            description: 'Maximum number of memories to return per search',
                        },
                        {
                            displayName: 'Rerank Results',
                            name: 'rerank',
                            type: 'boolean',
                            default: false,
                            description: 'Enable intelligent reranking to improve result relevance',
                        },
                    ],
                },
            ],
        };
    }

    /**
     * supplyData is called by the n8n AI Agent to obtain the tool objects.
     * Returns an array of DynamicStructuredTool instances so LangChain can properly
     * convert them to the LLM-specific function-calling format (Gemini
     * functionDeclarations, OpenAI functions, etc.).
     *
     * DynamicStructuredTool is used instead of DynamicTool to accept structured
     * object inputs from LLMs, avoiding "Expected string, received object" errors.
     */
    async supplyData(itemIndex) {
        const self = this;
        const userId = this.getNodeParameter('userId', itemIndex, '') || '';
        const agentId = this.getNodeParameter('agentId', itemIndex, '') || '';
        const runId = this.getNodeParameter('runId', itemIndex, '') || '';
        const enabledTools = this.getNodeParameter('enabledTools', itemIndex, ['search', 'add', 'getAll']);
        const searchOptions = this.getNodeParameter('searchOptions', itemIndex, {}) || {};

        function buildBaseParams() {
            const params = {};
            if (userId) params.user_id = userId;
            if (agentId) params.agent_id = agentId;
            if (runId) params.run_id = runId;
            return params;
        }

        // Build per-field zod schema helpers (gracefully degrade if zod unavailable)
        function strOpt(desc) { return z ? z.string().optional().describe(desc) : undefined; }
        function numOpt(desc) { return z ? z.number().optional().describe(desc) : undefined; }
        function recOpt(desc) { return z ? z.record(z.any()).optional().describe(desc) : undefined; }

        const tools = [];

        // ── Tool: mem0_search_memory ──────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('search')) {
            const topKDefault = searchOptions.topK || 10;
            tools.push(new DynamicStructuredTool({
                name: 'mem0_search_memory',
                description: 'Search Mem0 memories using semantic similarity. Returns relevant memory objects.',
                schema: z ? z.object({
                    query: z.string().describe('Natural language search query'),
                    user_id: strOpt('Override the default user ID'),
                    agent_id: strOpt('Override the default agent ID'),
                    run_id: strOpt('Override the default run/session ID'),
                    top_k: numOpt(`Max results to return (default: ${topKDefault})`),
                    filters: recOpt('Additional filters as key-value pairs'),
                }) : null,
                func: async ({ query, user_id, agent_id, run_id, top_k, filters } = {}) => {
                    try {
                        const body = Object.assign({ query: query || '' }, buildBaseParams());
                        if (user_id) body.user_id = user_id;
                        if (agent_id) body.agent_id = agent_id;
                        if (run_id) body.run_id = run_id;
                        if (top_k != null) body.top_k = Number(top_k);
                        else if (topKDefault) body.top_k = Number(topKDefault);
                        if (searchOptions.rerank !== undefined) body.rerank = Boolean(searchOptions.rerank);
                        if (filters) body.filters = filters;
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories/search', body);
                        return JSON.stringify(result);
                    } catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            }));
        }

        // ── Tool: mem0_add_memory ─────────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('add')) {
            tools.push(new DynamicStructuredTool({
                name: 'mem0_add_memory',
                description: 'Save a new memory or conversation turn to Mem0. Returns the saved memory object.',
                schema: z ? z.object({
                    content: z.string().describe('Text content to remember'),
                    role: strOpt('"user" | "assistant" | "system" (default: "user")'),
                    user_id: strOpt('Override the default user ID'),
                    agent_id: strOpt('Override the default agent ID'),
                    run_id: strOpt('Override the default run/session ID'),
                    metadata: recOpt('Additional metadata tags as key-value pairs'),
                }) : null,
                func: async ({ content, role, user_id, agent_id, run_id, metadata } = {}) => {
                    try {
                        const msgRole = role || 'user';
                        const msgContent = content || '';
                        const body = Object.assign({ messages: [{ role: msgRole, content: msgContent }] }, buildBaseParams());
                        if (user_id) body.user_id = user_id;
                        if (agent_id) body.agent_id = agent_id;
                        if (run_id) body.run_id = run_id;
                        if (metadata) body.metadata = metadata;
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories', body);
                        return JSON.stringify(result);
                    } catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            }));
        }

        // ── Tool: mem0_get_all_memories ───────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('getAll')) {
            tools.push(new DynamicStructuredTool({
                name: 'mem0_get_all_memories',
                description: 'Retrieve all stored memories for a user from Mem0. Returns an array of memory objects.',
                schema: z ? z.object({
                    user_id: strOpt('Override the default user ID'),
                    agent_id: strOpt('Filter by agent ID'),
                    run_id: strOpt('Filter by session/run ID'),
                }) : null,
                func: async ({ user_id, agent_id, run_id } = {}) => {
                    try {
                        const qs = Object.assign({}, buildBaseParams());
                        if (user_id) qs.user_id = user_id;
                        if (agent_id) qs.agent_id = agent_id;
                        if (run_id) qs.run_id = run_id;
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'GET', '/v1/memories', {}, qs);
                        return JSON.stringify(result);
                    } catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            }));
        }

        // ── Tool: mem0_delete_memory ──────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('delete')) {
            tools.push(new DynamicStructuredTool({
                name: 'mem0_delete_memory',
                description: 'Delete a specific memory from Mem0 by its ID. Returns a confirmation message.',
                schema: z ? z.object({
                    memory_id: z.string().describe('The unique ID of the memory to delete'),
                }) : null,
                func: async ({ memory_id } = {}) => {
                    try {
                        if (!memory_id) return JSON.stringify({ error: 'memory_id is required' });
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'DELETE', `/v1/memories/${memory_id}`);
                        return JSON.stringify(result || { message: 'Memory deleted successfully' });
                    } catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            }));
        }

        // ── Tool: mem0_get_memory_history ─────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('history')) {
            tools.push(new DynamicStructuredTool({
                name: 'mem0_get_memory_history',
                description: 'Get the change history of a specific memory from Mem0. Returns an array of history entries.',
                schema: z ? z.object({
                    memory_id: z.string().describe('The unique ID of the memory'),
                }) : null,
                func: async ({ memory_id } = {}) => {
                    try {
                        if (!memory_id) return JSON.stringify({ error: 'memory_id is required' });
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'GET', `/v1/memories/${memory_id}/history`);
                        return JSON.stringify(result);
                    } catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            }));
        }

        return {
            response: tools,
        };
    }

    // execute is called when the node is triggered as a regular node (not via AI Agent)
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            returnData.push({
                json: {
                    message: 'Mem0 AI Tools node is connected to an AI Agent. Use it by connecting the "ai_tool" output to an AI Agent node.',
                    enabledTools: this.getNodeParameter('enabledTools', i, []),
                },
            });
        }
        return [returnData];
    }
}
exports.Mem0AiTools = Mem0AiTools;
//# sourceMappingURL=Mem0AiTools.node.js.map
