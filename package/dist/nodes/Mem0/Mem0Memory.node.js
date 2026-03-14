"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mem0Memory = void 0;
const GenericFunctions_1 = require("./GenericFunctions");

/**
 * Load HumanMessage / AIMessage / SystemMessage from LangChain.
 * Falls back to minimal shims so the node works even if @langchain/core is
 * not directly resolvable from the community-node install path.
 */
let HumanMessage, AIMessage, SystemMessage;
(function () {
    const candidates = ['@langchain/core/messages', 'langchain/messages'];
    for (const mod of candidates) {
        try {
            const m = require(mod);
            if (m && m.HumanMessage) {
                HumanMessage = m.HumanMessage;
                AIMessage = m.AIMessage;
                SystemMessage = m.SystemMessage || m.HumanMessage;
                return;
            }
        } catch (_) { /* continue */ }
    }
    // Minimal shim — satisfies type checks n8n's AI Agent performs on messages
    class BaseMsg {
        constructor(content) {
            this.content = content;
            this.lc_namespace = ['langchain_core', 'messages'];
            this.lc_serializable = true;
            this.additional_kwargs = {};
        }
    }
    HumanMessage = class extends BaseMsg { _getType() { return 'human'; } get type() { return 'human'; } };
    AIMessage = class extends BaseMsg { _getType() { return 'ai'; } get type() { return 'ai'; } };
    SystemMessage = class extends BaseMsg { _getType() { return 'system'; } get type() { return 'system'; } };
})();

/**
 * Resolve the session key from node parameters using the supplied execution context.
 * Defined as a module-level function so it works correctly when n8n calls
 * supplyData/execute with an execution context as `this` (not the class instance).
 *
 * The session key maps to run_id in Mem0 to represent a specific conversation session.
 * For "fromInput" mode the function reads runId / sessionId / chatId from the item JSON.
 */
function resolveSessionKey(ctx, itemIndex) {
    const sessionIdType = ctx.getNodeParameter('sessionIdType', itemIndex, 'fromInput');
    if (sessionIdType === 'customKey') {
        return String(ctx.getNodeParameter('sessionKey', itemIndex, '') || `session_${ctx.getNode().id}`);
    }
    // fromInput: look for common session/run fields in the current item
    try {
        const items = ctx.getInputData();
        const item = (items && (items[itemIndex] || items[0]));
        const json = item && item.json;
        if (json) {
            const key = json.runId || json.run_id || json.sessionId || json.session_id || json.chatId;
            if (key) return String(key);
        }
    } catch (_) { /* ignore */ }
    return `session_${ctx.getNode().id}`;
}

/**
 * Mem0 Chat Memory node
 *
 * Stores and retrieves chat conversation history using Mem0 as the backend.
 * Works like the Redis Chat Memory node — connect the "ai_memory" output to
 * an AI Agent node's "Memory" input.
 *
 * Each conversation is scoped by a Session Key (maps to run_id in Mem0).
 * Optionally scope by user_id and agent_id for richer memory organisation.
 */
class Mem0Memory {
    constructor() {
        this.description = {
            displayName: 'Mem0 Chat Memory',
            name: 'mem0Memory',
            icon: 'file:mem0.svg',
            group: ['transform'],
            version: 1,
            description: 'Store and retrieve chat conversation history using Mem0 as the backend. Connect the "ai_memory" output to an AI Agent memory input.',
            defaults: {
                name: 'Mem0 Chat Memory',
            },
            inputs: [],
            outputs: ['ai_memory'],
            credentials: [
                {
                    name: 'mem0Api',
                    required: true,
                    displayOptions: {
                        show: { authType: ['cloud'] },
                    },
                },
                {
                    name: 'mem0SelfHostedApi',
                    required: true,
                    displayOptions: {
                        show: { authType: ['selfHosted'] },
                    },
                },
            ],
            codex: {
                categories: ['AI'],
                subcategories: {
                    AI: ['Memory'],
                },
                resources: {
                    primaryDocumentation: [
                        { url: 'https://docs.mem0.ai/' },
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
                },
                {
                    displayName: 'Session ID Type',
                    name: 'sessionIdType',
                    type: 'options',
                    options: [
                        {
                            name: 'Take from Previous Node Automatically',
                            value: 'fromInput',
                            description: 'Reads runId / sessionId / chatId from the incoming node data',
                        },
                        {
                            name: 'Define Below',
                            value: 'customKey',
                            description: 'Provide your own session key (supports expressions)',
                        },
                    ],
                    default: 'fromInput',
                    description: 'How to determine the session identifier (run_id) used to scope chat history in Mem0',
                },
                {
                    displayName: 'Session Key',
                    name: 'sessionKey',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: { sessionIdType: ['customKey'] },
                    },
                    description: 'Unique identifier for this conversation session. Maps to run_id in Mem0. Supports expressions, e.g. ={{ $json.message.chat.id }}',
                    placeholder: '={{ $json.message.chat.id }}',
                },
                {
                    displayName: 'User ID',
                    name: 'userId',
                    type: 'string',
                    default: '',
                    description: 'Optional user ID to scope memories to a specific user. Supports expressions.',
                    placeholder: 'user_123',
                },
                {
                    displayName: 'Agent ID',
                    name: 'agentId',
                    type: 'string',
                    default: '',
                    description: 'Optional agent ID to scope memories to a specific agent. Supports expressions.',
                    placeholder: 'my_agent',
                },
                {
                    displayName: 'Context Window Length',
                    name: 'contextWindowLength',
                    type: 'number',
                    default: 10,
                    typeOptions: { minValue: 0 },
                    description: 'Number of recent messages to load into context (0 = all messages). Each exchange counts as 2 messages (human + AI).',
                },
            ],
        };
    }

    /**
     * Fetch stored messages from Mem0 and return them as LangChain BaseMessage instances.
     * Messages are stored with metadata.role so we can reconstruct human/AI types.
     */
    async _loadMessages(memParams, contextWindowLength) {
        // Use the dedicated /user/{user_id} path when user_id is provided to match
        // the GET /v1/memories/user/{user_id} endpoint. Other params remain as qs.
        const { user_id, ...otherParams } = memParams;
        const endpoint = user_id ? `/v1/memories/user/${user_id}` : '/v1/memories';
        const qs = user_id ? otherParams : memParams;
        const res = await GenericFunctions_1.mem0ApiRequest.call(this, 'GET', endpoint, {}, qs);
        let memories = Array.isArray(res) ? res : (res ? [res] : []);
        // Apply context window (0 = unlimited)
        if (contextWindowLength > 0) {
            memories = memories.slice(-contextWindowLength * 2);
        }
        return memories.map((m) => {
            const content = m.memory || m.text || m.content || JSON.stringify(m);
            const role = (m.metadata && m.metadata.role) || m.role || 'system';
            if (role === 'user' || role === 'human') return new HumanMessage(content);
            if (role === 'assistant' || role === 'ai') return new AIMessage(content);
            return new SystemMessage(content);
        });
    }

    /**
     * supplyData is called by the n8n AI Agent to get the memory object.
     * Returns a BaseChatMemory-compatible interface that the AI Agent chain
     * uses to load context (loadMemoryVariables) and save exchanges (saveContext).
     */
    async supplyData(itemIndex) {
        const self = this;
        // Use module-level resolveSessionKey to avoid 'this' context issues
        const sessionKey = resolveSessionKey(this, itemIndex);
        const userId = this.getNodeParameter('userId', itemIndex, '') || '';
        const agentId = this.getNodeParameter('agentId', itemIndex, '') || '';
        const contextWindowLength = Number(this.getNodeParameter('contextWindowLength', itemIndex, 10));

        // Build the base params for all Mem0 API calls.
        // Session key maps to run_id (a specific conversation session).
        function buildMemParams() {
            const p = { run_id: sessionKey };
            if (userId) p.user_id = userId;
            if (agentId) p.agent_id = agentId;
            return p;
        }

        const memoryObj = {
            memoryKeys: ['chat_history'],
            chatHistory: {
                async getMessages() {
                    try {
                        return await self._loadMessages(buildMemParams(), contextWindowLength);
                    } catch (_) {
                        return [];
                    }
                },
                async addUserMessage(message) {
                    try {
                        await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories', Object.assign({
                            messages: [{ role: 'user', content: String(message) }],
                            infer: false,
                            metadata: { source: 'agent_interaction' },
                        }, buildMemParams()));
                    } catch (_) { /* ignore */ }
                },
                async addAIChatMessage(message) {
                    try {
                        await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories', Object.assign({
                            messages: [{ role: 'assistant', content: String(message) }],
                            infer: false,
                            metadata: { source: 'agent_interaction' },
                        }, buildMemParams()));
                    } catch (_) { /* ignore */ }
                },
                async clear() {
                    try {
                        await GenericFunctions_1.mem0ApiRequest.call(self, 'DELETE', '/v1/memories', {}, buildMemParams());
                    } catch (_) { /* ignore */ }
                },
            },

            async loadMemoryVariables(_values) {
                try {
                    const messages = await self._loadMessages(buildMemParams(), contextWindowLength);
                    return { chat_history: messages };
                } catch (_) {
                    return { chat_history: [] };
                }
            },

            async saveContext(inputValues, outputValues) {
                try {
                    const messages = [];
                    const userInput = inputValues && (inputValues.input || inputValues.human_input || inputValues.query || inputValues.chatInput);
                    const aiOutput = outputValues && (outputValues.output || outputValues.response || outputValues.text);
                    if (userInput) messages.push({ role: 'user', content: String(userInput) });
                    if (aiOutput) messages.push({ role: 'assistant', content: String(aiOutput) });
                    if (messages.length === 0) return;
                    // infer: false preserves raw messages without LLM extraction
                    await GenericFunctions_1.mem0ApiRequest.call(self, 'POST', '/v1/memories', Object.assign({
                        messages,
                        infer: false,
                        metadata: { source: 'agent_interaction' },
                    }, buildMemParams()));
                } catch (_) { /* silently ignore to not disrupt the agent */ }
            },

            async clear() {
                try {
                    await GenericFunctions_1.mem0ApiRequest.call(self, 'DELETE', '/v1/memories', {}, buildMemParams());
                } catch (_) { /* ignore */ }
            },
        };

        return { response: memoryObj };
    }

    // execute fallback when node is not connected to an AI Agent memory port
    async execute() {
        const items = this.getInputData();
        return [items.map((_item, i) => ({
            json: {
                message: 'Mem0 Chat Memory is ready. Connect the "ai_memory" output to an AI Agent node.',
                sessionKey: resolveSessionKey(this, i),
            },
        }))];
    }
}
exports.Mem0Memory = Mem0Memory;
