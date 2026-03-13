"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mem0AiTools = void 0;
const GenericFunctions_1 = require("./GenericFunctions");

/**
 * Mem0 AI Tools node
 *
 * Provides a set of DynamicTool-compatible tool objects that an n8n AI Agent
 * can call to search, add, retrieve and delete memories stored in Mem0.
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
     * Returns an array of DynamicTool-compatible objects.
     */
    async supplyData(itemIndex) {
        const self = this;
        const userId = this.getNodeParameter('userId', itemIndex, '') || '';
        const agentId = this.getNodeParameter('agentId', itemIndex, '') || '';
        const runId = this.getNodeParameter('runId', itemIndex, '') || '';
        const enabledTools = this.getNodeParameter('enabledTools', itemIndex, ['search', 'add', 'getAll']);
        const searchOptions = this.getNodeParameter('searchOptions', itemIndex, {}) || {};

        /**
         * Build the base filter params shared by all memory operations.
         * If user provides a JSON string like {"user_id":"alice"}, we merge those.
         */
        function buildBaseParams(extraJson) {
            const params = {};
            if (userId) params.user_id = userId;
            if (agentId) params.agent_id = agentId;
            if (runId) params.run_id = runId;
            if (extraJson) {
                try {
                    const extra = typeof extraJson === 'string' ? JSON.parse(extraJson) : extraJson;
                    Object.assign(params, extra);
                }
                catch { }
            }
            return params;
        }

        const tools = [];

        // ── Tool: search_memory ───────────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('search')) {
            tools.push({
                name: 'mem0_search_memory',
                description: `Search Mem0 memories using semantic similarity.
Input: JSON string with fields:
  - query (required): natural language search query
  - user_id (optional): override the default user ID
  - top_k (optional): max results to return (default: ${searchOptions.topK || 10})
  - filters (optional): JSON object with additional filters
Returns: array of relevant memory objects.`,
                func: async (input) => {
                    try {
                        let params;
                        try {
                            params = typeof input === 'string' ? JSON.parse(input) : input;
                        }
                        catch {
                            params = { query: String(input) };
                        }
                        const query = params.query || params.q || String(input);
                        const body = { query };
                        const base = buildBaseParams(null);
                        Object.assign(body, base);
                        if (params.user_id) body.user_id = params.user_id;
                        if (params.agent_id) body.agent_id = params.agent_id;
                        if (params.run_id) body.run_id = params.run_id;
                        if (params.top_k) body.top_k = Number(params.top_k);
                        else if (searchOptions.topK) body.top_k = Number(searchOptions.topK);
                        if (searchOptions.rerank !== undefined) body.rerank = Boolean(searchOptions.rerank);
                        if (params.filters) {
                            try {
                                body.filters = typeof params.filters === 'string'
                                    ? JSON.parse(params.filters)
                                    : params.filters;
                            }
                            catch { }
                        }
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories/search/', body);
                        return JSON.stringify(result);
                    }
                    catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            });
        }

        // ── Tool: add_memory ─────────────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('add')) {
            tools.push({
                name: 'mem0_add_memory',
                description: `Save a new memory or conversation turn to Mem0.
Input: JSON string with fields:
  - content (required): text content to remember
  - role (optional): "user" | "assistant" | "system" (default: "user")
  - user_id (optional): override the default user ID
  - metadata (optional): JSON object with additional metadata tags
Returns: saved memory object.`,
                func: async (input) => {
                    try {
                        let params;
                        try {
                            params = typeof input === 'string' ? JSON.parse(input) : input;
                        }
                        catch {
                            params = { content: String(input) };
                        }
                        const content = params.content || params.text || params.memory || String(input);
                        const role = params.role || 'user';
                        const body = {
                            messages: [{ role, content }],
                        };
                        const base = buildBaseParams(null);
                        Object.assign(body, base);
                        if (params.user_id) body.user_id = params.user_id;
                        if (params.agent_id) body.agent_id = params.agent_id;
                        if (params.run_id) body.run_id = params.run_id;
                        if (params.metadata) {
                            try {
                                body.metadata = typeof params.metadata === 'string'
                                    ? JSON.parse(params.metadata)
                                    : params.metadata;
                            }
                            catch { }
                        }
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories/', body);
                        return JSON.stringify(result);
                    }
                    catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            });
        }

        // ── Tool: get_all_memories ────────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('getAll')) {
            tools.push({
                name: 'mem0_get_all_memories',
                description: `Retrieve all stored memories for a user from Mem0.
Input: JSON string with optional fields:
  - user_id (optional): override the default user ID
  - agent_id (optional): filter by agent ID
  - run_id (optional): filter by session/run ID
Returns: array of all memory objects for the specified scope.`,
                func: async (input) => {
                    try {
                        let params = {};
                        if (input) {
                            try {
                                params = typeof input === 'string' ? JSON.parse(input) : input;
                            }
                            catch { }
                        }
                        const qs = Object.assign({}, buildBaseParams(null));
                        if (params.user_id) qs.user_id = params.user_id;
                        if (params.agent_id) qs.agent_id = params.agent_id;
                        if (params.run_id) qs.run_id = params.run_id;
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'GET', '/v1/memories/', {}, qs);
                        return JSON.stringify(result);
                    }
                    catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            });
        }

        // ── Tool: delete_memory ───────────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('delete')) {
            tools.push({
                name: 'mem0_delete_memory',
                description: `Delete a specific memory from Mem0 by its ID.
Input: JSON string with fields:
  - memory_id (required): the unique ID of the memory to delete
Returns: confirmation message.`,
                func: async (input) => {
                    try {
                        let params;
                        try {
                            params = typeof input === 'string' ? JSON.parse(input) : input;
                        }
                        catch {
                            params = { memory_id: String(input) };
                        }
                        const memoryId = params.memory_id || params.id || String(input);
                        if (!memoryId) return JSON.stringify({ error: 'memory_id is required' });
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'DELETE', `/v1/memories/${memoryId}/`);
                        return JSON.stringify(result || { message: 'Memory deleted successfully' });
                    }
                    catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            });
        }

        // ── Tool: get_memory_history ──────────────────────────────────────────
        if (Array.isArray(enabledTools) && enabledTools.includes('history')) {
            tools.push({
                name: 'mem0_get_memory_history',
                description: `Get the change history of a specific memory from Mem0.
Input: JSON string with fields:
  - memory_id (required): the unique ID of the memory
Returns: array of history entries showing how the memory changed over time.`,
                func: async (input) => {
                    try {
                        let params;
                        try {
                            params = typeof input === 'string' ? JSON.parse(input) : input;
                        }
                        catch {
                            params = { memory_id: String(input) };
                        }
                        const memoryId = params.memory_id || params.id || String(input);
                        if (!memoryId) return JSON.stringify({ error: 'memory_id is required' });
                        const result = await GenericFunctions_1.mem0ApiRequest.call(self, 'GET', `/v1/memories/${memoryId}/history/`);
                        return JSON.stringify(result);
                    }
                    catch (err) {
                        return JSON.stringify({ error: err.message || String(err) });
                    }
                },
            });
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
